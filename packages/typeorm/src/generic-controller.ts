import { GenericController, GenericOneToManyController, HttpStatusError, IdentifierResult, route } from "@plumier/core"
import reflect, { generic } from "tinspector"
import { Repository, OneToManyRepository } from './repository'

// --------------------------------------------------------------------- //
// ------------------------ GENERIC CONTROLLERS ------------------------ //
// --------------------------------------------------------------------- //

@generic.template("T", "TID")
@generic.type("T", "TID")
class TypeOrmGenericController<T, TID> extends GenericController<T, TID>{
    private readonly repo: Repository<T>
    constructor() {
        super()
        this.repo = new Repository(this.entityType)
    }

    list(offset: number = 0, limit: number = 50, query: T): Promise<T[]> {
        return this.repo.find(offset, limit, query)
    }


    async save(data: T): Promise<IdentifierResult<TID>> {
        const result = await this.repo.insert(data)
        return new IdentifierResult(result.id as any)
    }

    @route.ignore()
    protected async findOneOrThrowNotFound(id: TID) {
        const data = await this.repo.findById(id)
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

    replace(id: TID, data: T): Promise<IdentifierResult<TID>> {
        return this.modify(id, data)
    }

    async delete(id: TID): Promise<IdentifierResult<TID>> {
        await this.findOneOrThrowNotFound(id)
        await this.repo.delete(id)
        return new IdentifierResult(id)
    }
}

@generic.template("P", "T", "PID", "TID")
@generic.type("P", "T", "PID", "TID")
class TypeOrmGenericOneToManyController<P, T, PID, TID> extends GenericOneToManyController<P, T, PID, TID> {
    protected readonly repo: OneToManyRepository<P, T>
    constructor() {
        super()
        this.repo = new OneToManyRepository(this.parentEntityType, this.entityType, this.propertyName)
    }

    @route.ignore()
    protected async findParentOrThrowNotFound(id: PID) {
        const data = await this.repo.findParentById(id)
        if (!data) throw new HttpStatusError(404, "Parent not found")
        return data
    }

    @route.ignore()
    protected async findOneOrThrowNotFound(id: TID) {
        const data = await this.repo.findById(id)
        if (!data) throw new HttpStatusError(404)
        return data
    }

    list(pid: PID, offset: number = 0, limit: number = 50, query: T): Promise<T[]> {
        return this.repo.find(pid, offset, limit, query)
    }

    async save(pid: PID, data: T): Promise<IdentifierResult<TID>> {
        await this.findParentOrThrowNotFound(pid)
        const inserted = await this.repo.insert(pid, data)
        return new IdentifierResult(inserted.id)
    }

    async get(pid: PID, id: TID): Promise<T> {
        await this.findParentOrThrowNotFound(pid)
        return this.findOneOrThrowNotFound(id)
    }

    async modify(pid: PID, id: TID, data: T): Promise<IdentifierResult<TID>> {
        await this.findParentOrThrowNotFound(pid)
        await this.findOneOrThrowNotFound(id)
        await this.repo.update(id, data)
        return new IdentifierResult(id)
    }

    replace(pid: PID, id: TID, data: T): Promise<IdentifierResult<TID>> {
        return this.modify(pid, id, data)
    }

    async delete(pid: PID, id: TID): Promise<IdentifierResult<TID>> {
        await this.findParentOrThrowNotFound(pid)
        await this.findOneOrThrowNotFound(id)
        await this.repo.delete(id)
        return new IdentifierResult(id)
    }
}

export { TypeOrmGenericController, TypeOrmGenericOneToManyController }