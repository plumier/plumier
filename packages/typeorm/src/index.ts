
import { DefaultFacility, Class, route, val, domain, RouteMetadata, generateRoutes } from "@plumier/core"
import { getMetadataArgsStorage, ConnectionOptions, createConnection, Repository, getManager, } from "typeorm"
import reflect, { noop, generic, GenericTypeDecorator } from "tinspector"
import pluralize from "pluralize"

export class TypeORMFacility extends DefaultFacility {
    protected entities: Class[] = []
    constructor(private option?: ConnectionOptions) { super() }

    setup() {
        const storage = getMetadataArgsStorage();
        for (const col of storage.columns) {
            Reflect.decorate([noop()], (col.target as Function).prototype, col.propertyName, void 0)
        }
        for (const col of storage.relations) {
            const rawType: Class = (col.type as Function)()
            const type = col.relationType === "one-to-many" || col.relationType === "many-to-many" ? [rawType] : rawType
            Reflect.decorate([noop(x => type)], (col.target as Function).prototype, col.propertyName, void 0)
        }
        this.entities = storage.tables.filter(x => typeof x.target !== "string").map(x => x.target as Class)
    }

    async initialize() {
        if (this.option)
            await createConnection(this.option)
        else
            await createConnection()
    }
}

export class CRUDTypeORMFacility extends TypeORMFacility {
    async generateRoutes(): Promise<RouteMetadata[]> {
        const controllers = []
        for (const entity of this.entities) {
            controllers.push(createController(entity))
            const meta = reflect(entity)
            for (const prop of meta.properties) {
                if(Array.isArray(prop.type)){
                    const childType = prop.type[0]
                    controllers.push(createNestedController(entity, childType))
                }
            }
        }
        return generateRoutes(controllers, { overridable: true })
    }
}

// --------------------------------------------------------------------- //
// ------------------------------ HELPERS ------------------------------ //
// --------------------------------------------------------------------- //

function createControllerName(entity:Class){
    const name = entity.name.replace(/entity$/i, "").replace(/model$/i, "")
    return pluralize.plural(name)
}

function createController(entity: Class) {
    const Controller = generic.create(GenericController, entity)
    const name = createControllerName(entity)
    // add root decorator
    Reflect.decorate([route.root(name)], Controller)
    return Controller
}

function createNestedController(parent:Class, child:Class){
    const Controller = generic.create(NestedGenericController, parent, child)
    const parentName = createControllerName(parent)
    const childName = createControllerName(child)
    Reflect.decorate([route.root(`${parentName}/:parentId/${childName}`)], Controller)
    return Controller
}

function getGenericTypeParameters(instance: object) {
    const meta = reflect(instance.constructor as Class)
    const genericDecorator = meta.decorators
        .find((x: GenericTypeDecorator):x is GenericTypeDecorator => x.kind == "GenericType" && x.target === instance.constructor)
    if(!genericDecorator)
        throw new Error(`${instance.constructor.name} require @generic.type(), but not provided`)
    return genericDecorator.types.map(x => Array.isArray(x) ? x[0] : x)
}

// --------------------------------------------------------------------- //
// ------------------------ GENERIC CONTROLLERS ------------------------ //
// --------------------------------------------------------------------- //

@domain()
export class IdentifierResult {
    constructor(
        public id: number
    ) { }
}

@generic.template("T")
export class GenericController<T> {
    private readonly repo: Repository<T>
    constructor() {
        const genericParameters = getGenericTypeParameters(this)
        this.repo = getManager().getRepository(genericParameters[0])
    }

    @route.get("")
    @reflect.type(["T"])
    list(offset: number = 0, limit: number = 50): Promise<T[]> {
        return this.repo.find({ skip: offset, take: limit })
    }

    @route.post("")
    @reflect.type(IdentifierResult)
    async save(@reflect.type("T") data: T) {
        const result = await this.repo.insert(data)
        return new IdentifierResult(result.raw as any)
    }

    @route.get(":id")
    @reflect.type("T")
    get(@val.required() id: number) {
        return this.repo.findOne(id)
    }

    @route.put(":id")
    @route.patch(":id")
    @reflect.type(IdentifierResult)
    async modify(@val.required() id: number, @reflect.type("T") data: T) {
        await this.repo.update(id, data)
        return new IdentifierResult(id)
    }

    @route.delete(":id")
    @reflect.type(IdentifierResult)
    async delete(@val.required() id: number) {
        await this.repo.delete(id)
        return new IdentifierResult(id)
    }
}

@generic.template("P", "T")
class NestedGenericController<P, T> {
    private readonly repo: Repository<T>
    private readonly parentRepo:Repository<P>
    constructor() {
        const genericParameters = getGenericTypeParameters(this)
        if(!genericParameters[1])
            throw new Error(`${this.constructor.name} require generic parameter T but not provided`)
        this.repo = getManager().getRepository(genericParameters[0])
        this.parentRepo = getManager().getRepository(genericParameters[1])
    }

    @route.get("")
    @reflect.type(["T"])
    list(@val.required() parentId:number, offset: number = 0, limit: number = 50): Promise<T[]> {
        return this.repo.find({ skip: offset, take: limit })
    }

    @route.post("")
    @reflect.type(IdentifierResult)
    async save(@val.required() parentId:number, @reflect.type("T") data: T) {
        const result = await this.repo.insert(data)
        return new IdentifierResult(result.raw as any)
    }

    @route.get(":id")
    @reflect.type("T")
    get(@val.required() parentId:number, @val.required() id: number) {
        return this.repo.findOne(id)
    }

    @route.put(":id")
    @route.patch(":id")
    @reflect.type(IdentifierResult)
    async modify(@val.required() parentId:number, @val.required() id: number, @reflect.type("T") data: T) {
        await this.repo.update(id, data)
        return new IdentifierResult(id)
    }

    @route.delete(":id")
    @reflect.type(IdentifierResult)
    async delete(@val.required() parentId:number, @val.required() id: number) {
        await this.repo.delete(id)
        return new IdentifierResult(id)
    }
}