
import { DefaultFacility, Class, route, val, domain, RouteMetadata, generateRoutes, HttpStatusError } from "@plumier/core"
import { getMetadataArgsStorage, ConnectionOptions, createConnection, Repository, getManager } from "typeorm"
import reflect, { noop, generic, GenericTypeDecorator, PropertyReflection, decorateClass, metadata } from "tinspector"
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
            const rawType: Class = (col as any).type()
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
        const relations = getMetadataArgsStorage().relations
        for (const entity of this.entities) {
            controllers.push(createController(entity))
            const meta = reflect(entity)
            for (const prop of meta.properties) {
                if (relations.find(x => x.target === entity && x.propertyName === prop.name && x.relationType === "one-to-many")) {
                    controllers.push(createNestedController(entity, prop))
                }
            }
        }
        return generateRoutes(controllers, { overridable: true })
    }
}

// --------------------------------------------------------------------- //
// ------------------------------ HELPERS ------------------------------ //
// --------------------------------------------------------------------- //

function createControllerName(entity: Class) {
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

function createNestedController(parent: Class, prop: PropertyReflection) {
    const Controller = generic.create(NestedGenericController, parent, prop.type[0])
    const parentName = createControllerName(parent)
    Reflect.decorate([
        route.root(`${parentName}/:pid/${prop.name}`),
        decorateClass(<NestedGenericControllerDecorator>{ kind: "NestedGenericControllerDecorator", propName: prop.name })],
        Controller)
    return Controller
}

function getGenericTypeParameters(instance: object) {
    const meta = reflect(instance.constructor as Class)
    const genericDecorator = meta.decorators
        .find((x: GenericTypeDecorator): x is GenericTypeDecorator => x.kind == "GenericType" && x.target === instance.constructor)
    return {
        types: genericDecorator!.types.map(x => x as Class),
        meta
    }
}

// --------------------------------------------------------------------- //
// ------------------------ GENERIC CONTROLLERS ------------------------ //
// --------------------------------------------------------------------- //

interface NestedGenericControllerDecorator {
    kind: "NestedGenericControllerDecorator"
    propName: string
}

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
        const { types: genericParameters } = getGenericTypeParameters(this)
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
    @route.ignore()
    protected async findOneOrThrowNotFound(id: number) {
        const data = await this.repo.findOne(id)
        if (!data) throw new HttpStatusError(404)
        return data
    }

    @route.get(":id")
    @reflect.type("T")
    get(@val.required() id: number) {
        return this.findOneOrThrowNotFound(id)
    }

    @route.put(":id")
    @route.patch(":id")
    @reflect.type(IdentifierResult)
    async modify(@val.required() id: number, @reflect.type("T") data: T) {
        await this.findOneOrThrowNotFound(id)
        await this.repo.update(id, data)
        return new IdentifierResult(id)
    }

    @route.delete(":id")
    @reflect.type(IdentifierResult)
    async delete(@val.required() id: number) {
        await this.findOneOrThrowNotFound(id)
        await this.repo.delete(id)
        return new IdentifierResult(id)
    }
}

@generic.template("P", "T")
export class NestedGenericController<P, T> {
    protected readonly repo: Repository<T>
    protected readonly parentRepo: Repository<P>
    protected propertyName: string
    protected inversePropertyName: string
    constructor() {
        const { types: genericParameters, meta } = getGenericTypeParameters(this)
        this.parentRepo = getManager().getRepository(genericParameters[0])
        this.repo = getManager().getRepository(genericParameters[1])
        const decorator: NestedGenericControllerDecorator = meta.decorators.find((x: NestedGenericControllerDecorator) => x.kind === "NestedGenericControllerDecorator")
        this.propertyName = decorator.propName
        const join = this.parentRepo.metadata.relations.find(x => x.propertyName === this.propertyName)
        this.inversePropertyName = join!.inverseSidePropertyPath;
    }

    @route.get("")
    @reflect.type(["T"])
    list(@val.required() pid: number, offset: number = 0, limit: number = 50): Promise<T[]> {
        return this.repo.find({ where: { [this.inversePropertyName]: pid }, skip: offset, take: limit })
    }

    @route.post("")
    @reflect.type(IdentifierResult)
    async save(@val.required() pid: number, @reflect.type("T") data: T) {
        const parent = await this.parentRepo.findOne(pid)
        if (!parent) throw new HttpStatusError(404, `Parent not found`)
        const inserted = await this.repo.insert(data);
        await this.parentRepo.createQueryBuilder()
            .relation(this.propertyName)
            .of(parent)
            .add(inserted.raw)
        return new IdentifierResult(inserted.raw)
    }

    @route.ignore()
    protected async findOneOrThrowNotFound(id: number) {
        const data = await this.repo.findOne(id)
        if (!data) throw new HttpStatusError(404)
        return data
    }

    @route.get(":id")
    @reflect.type("T")
    get(@val.required() pid: number, @val.required() id: number) {
        return this.findOneOrThrowNotFound(id)
    }

    @route.put(":id")
    @route.patch(":id")
    @reflect.type(IdentifierResult)
    async modify(@val.required() pid: number, @val.required() id: number, @reflect.type("T") data: T) {
        await this.findOneOrThrowNotFound(id)
        await this.repo.update(id, data)
        return new IdentifierResult(id)
    }

    @route.delete(":id")
    @reflect.type(IdentifierResult)
    async delete(@val.required() pid: number, @val.required() id: number) {
        await this.findOneOrThrowNotFound(id)
        await this.repo.delete(id)
        return new IdentifierResult(id)
    }
}