
import { DefaultFacility, Class, route, val, domain, RouteMetadata, generateRoutes } from "@plumier/core"
import { getMetadataArgsStorage, ConnectionOptions, createConnection, Repository, getManager } from "typeorm"
import reflect, { noop, generic, GenericTypeDecorator } from "tinspector"

export class TypeORMFacility extends DefaultFacility {
    protected entities: Class[] = []
    constructor(private option?: ConnectionOptions) { super() }

    setup() {
        const entitiesSet = new Set<Class>()
        const storage = getMetadataArgsStorage();
        for (const col of storage.columns) {
            Reflect.decorate([noop()], (col.target as Function).prototype, col.propertyName, void 0)
            entitiesSet.add(col.target as Class)
        }
        for (const col of storage.relations) {
            const rawType: Class = (col.type as Function)()
            const type = col.relationType === "one-to-many" || col.relationType === "many-to-many" ? [rawType] : rawType
            Reflect.decorate([noop(x => type)], (col.target as Function).prototype, col.propertyName, void 0)
            entitiesSet.add(rawType)
        }
        this.entities = Array.from(entitiesSet)
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
        return generateRoutes(this.entities.map(x => createController(x)), { overridable: true })
    }
}

// --------------------------------------------------------------------- //
// ------------------------------ HELPERS ------------------------------ //
// --------------------------------------------------------------------- //

function createController(entity:Class){
    const Controller = generic.create(GenericCRUDBaseController, entity)
    const name = entity.name.replace(/entity$/i, "").replace(/model$/i, "")
    // add root decorator
    Reflect.decorate([route.root(name)], Controller)
    return Controller
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
export class GenericCRUDBaseController<T> {
    private readonly repo: Repository<T>
    constructor() {
        const meta = reflect(this.constructor as Class)
        const genericDecorator = meta.decorators
            .find((x: GenericTypeDecorator) => x.kind == "GenericType" && x.target === this.constructor)
        this.repo = getManager().getRepository(genericDecorator.types[0])
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
        return new IdentifierResult(result.identifiers[0] as any)
    }

    @route.get(":id")
    @reflect.type("T")
    get(id: number) {
        return this.repo.findOne(id)
    }

    @route.put(":id")
    @route.patch(":id")
    @reflect.type(IdentifierResult)
    async modify(id: number, @reflect.type("T") data: T) {
        await this.repo.update(id, data)
        return new IdentifierResult(id)
    }

    @route.delete(":id")
    @reflect.type(IdentifierResult)
    async delete(id: number) {
        await this.repo.delete(id)
        return new IdentifierResult(id)
    }
}