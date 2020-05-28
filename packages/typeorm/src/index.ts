import {
    Class,
    createRoutesFromEntities,
    DefaultFacility,
    entity,
    GenericController,
    GenericOneToManyController,
    HttpStatusError,
    IdentifierResult,
    route,
    RouteMetadata,
} from "@plumier/core"
import pluralize from "pluralize"
import reflect, { generic, noop } from "tinspector"
import { ConnectionOptions, createConnection, getManager, getMetadataArgsStorage, Repository } from "typeorm"

export class TypeORMFacility extends DefaultFacility {
    protected entities: Class[] = []
    constructor(private option?: ConnectionOptions) { super() }

    setup() {
        const storage = getMetadataArgsStorage();
        for (const col of storage.generations) {
            Reflect.decorate([entity.id()], (col.target as Function).prototype, col.propertyName, void 0)
        }
        for (const col of storage.columns) {
            Reflect.decorate([noop()], (col.target as Function).prototype, col.propertyName, void 0)
        }
        for (const col of storage.relations) {
            const rawType: Class = (col as any).type()
            const type = col.relationType === "one-to-many" || col.relationType === "many-to-many" ? [rawType] : rawType
            Reflect.decorate([reflect.type(x => type)], (col.target as Function).prototype, col.propertyName, void 0)
            if (col.relationType === "one-to-many")
                Reflect.decorate([entity.oneToMany(col.propertyName, rawType)], (col.target as Function).prototype, col.propertyName, void 0)
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
        return createRoutesFromEntities(this.entities, TypeOrmGenericController, TypeOrmGenericOneToManyController, x => pluralize.plural(x))
    }
}


// --------------------------------------------------------------------- //
// ------------------------ GENERIC CONTROLLERS ------------------------ //
// --------------------------------------------------------------------- //

@generic.template("T", "TID")
@generic.type("T", "TID")
export class TypeOrmGenericController<T, TID> extends GenericController<T, TID>{
    private readonly repo: Repository<T>
    constructor() {
        super()
        this.repo = getManager().getRepository(this.entityType)
    }

    list(offset: number = 0, limit: number = 50, query: T): Promise<T[]> {
        return this.repo.find({ skip: offset, take: limit, where: { ...query } })
    }


    async save(data: T): Promise<IdentifierResult<TID>> {
        const result = await this.repo.insert(data)
        return new IdentifierResult(result.raw as any)
    }

    @route.ignore()
    protected async findOneOrThrowNotFound(id: TID) {
        const data = await this.repo.findOne(id)
        if (!data) throw new HttpStatusError(404)
        return data
    }

    get(id: TID): Promise<T> {
        return this.findOneOrThrowNotFound(id)
    }

    async modify(id: TID, data: T): Promise<IdentifierResult<TID>> {
        await this.findOneOrThrowNotFound(id)
        await this.repo.update(id, data)
        return new IdentifierResult(id)
    }

    async delete(id: TID): Promise<IdentifierResult<TID>> {
        await this.findOneOrThrowNotFound(id)
        await this.repo.delete(id)
        return new IdentifierResult(id)
    }
}

@generic.template("P", "T", "PID", "TID")
@generic.type("P", "T", "PID", "TID")
export class TypeOrmGenericOneToManyController<P, T, PID, TID> extends GenericOneToManyController<P, T, PID, TID> {
    protected readonly repo: Repository<T>
    protected readonly parentRepo: Repository<P>
    protected inversePropertyName: string
    constructor() {
        super()
        this.parentRepo = getManager().getRepository(this.parentEntityType)
        this.repo = getManager().getRepository(this.entityType)
        const join = this.parentRepo.metadata.relations.find(x => x.propertyName === this.propertyName)
        this.inversePropertyName = join!.inverseSidePropertyPath;
    }

    list(pid: PID, offset: number = 0, limit: number = 50, query: T): Promise<T[]> {
        return this.repo.find({ where: { [this.inversePropertyName]: pid }, skip: offset, take: limit })
    }

    async save(pid: PID, data: T): Promise<IdentifierResult<TID>> {
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
    protected async findOneOrThrowNotFound(id: TID) {
        const data = await this.repo.findOne(id)
        if (!data) throw new HttpStatusError(404)
        return data
    }

    get(pid: PID, id: TID): Promise<T> {
        return this.findOneOrThrowNotFound(id)
    }

    async modify(pid: PID, id: TID, data: T): Promise<IdentifierResult<TID>> {
        await this.findOneOrThrowNotFound(id)
        await this.repo.update(id, data)
        return new IdentifierResult(id)
    }

    async delete(pid: PID, id: TID): Promise<IdentifierResult<TID>> {
        await this.findOneOrThrowNotFound(id)
        await this.repo.delete(id)
        return new IdentifierResult(id)
    }
}