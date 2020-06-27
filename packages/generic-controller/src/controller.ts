import reflect, { generic } from "tinspector"
import { domain, Class, HttpStatusError, route, val, bind } from "@plumier/core"
import { ControllerGeneric, Repository, OneToManyControllerGeneric, OneToManyRepository } from './types'


// --------------------------------------------------------------------- //
// ---------------------------- CONTROLLERS ---------------------------- //
// --------------------------------------------------------------------- //

@domain()
@generic.template("TID")
class IdentifierResult<TID> {
    constructor(
        @reflect.type("TID")
        public id: TID
    ) { }
}

@generic.template("T", "TID")
class RepoBaseControllerGeneric<T, TID> extends ControllerGeneric<T, TID>{
    protected readonly repo: Repository<T>
    constructor(fac: ((x: Class<T>) => Repository<T>)) {
        super()
        this.repo = fac(this.entityType)
    }

    @route.ignore()
    protected async findByIdOrNotFound(id: TID): Promise<T> {
        const saved = await this.repo.findById(id)
        if (!saved) throw new HttpStatusError(404, `Record with ID ${id} not found`)
        return saved
    }

    @route.get("")
    @reflect.type(["T"])
    list(offset: number = 0, limit: number = 50, @reflect.type("T") @bind.query() @val.partial("T") query: T): Promise<T[]> {
        return this.repo.find(offset, limit, query)
    }

    @route.post("")
    @reflect.type(IdentifierResult, "TID")
    save(@reflect.type("T") data: T): Promise<IdentifierResult<TID>> {
        return this.repo.insert(data)
    }

    @route.get(":id")
    @reflect.type("T")
    get(@val.required() @reflect.type("TID") id: TID): Promise<T> {
        return this.findByIdOrNotFound(id)
    }

    @route.patch(":id")
    @reflect.type(IdentifierResult, "TID")
    async modify(@val.required() @reflect.type("TID") id: TID, @reflect.type("T") @val.partial("T") data: T): Promise<IdentifierResult<TID>> {
        await this.findByIdOrNotFound(id)
        return this.repo.update(id, data)
    }

    @route.put(":id")
    @reflect.type(IdentifierResult, "TID")
    async replace(@val.required() @reflect.type("TID") id: TID, @reflect.type("T") data: T): Promise<IdentifierResult<TID>> {
        await this.findByIdOrNotFound(id)
        return this.repo.update(id, data)
    }

    @route.delete(":id")
    @reflect.type(IdentifierResult, "TID")
    async delete(@val.required() @reflect.type("TID") id: TID): Promise<IdentifierResult<TID>> {
        await this.findByIdOrNotFound(id)
        return this.repo.delete(id)
    }
}

@generic.template("P", "T", "PID", "TID")
class RepoBaseOneToManyControllerGeneric<P, T, PID, TID> extends OneToManyControllerGeneric<P, T, PID, TID>{
    protected readonly repo: OneToManyRepository<P, T>

    constructor(fac: ((p: Class<P>, t: Class<T>, rel: string) => OneToManyRepository<P, T>)) {
        super()
        this.repo = fac(this.parentEntityType, this.entityType, this.relation)
    }

    @route.ignore()
    protected async findByIdOrNotFound(id: TID): Promise<T> {
        const saved = await this.repo.findById(id)
        if (!saved) throw new HttpStatusError(404, `Record with ID ${id} not found`)
        return saved
    }

    @route.ignore()
    protected async findParentByIdOrNotFound(id: PID): Promise<P> {
        const saved = await this.repo.findParentById(id)
        if (!saved) throw new HttpStatusError(404, `Parent record with ID ${id} not found`)
        return saved
    }

    @route.get("")
    @reflect.type(["T"])
    async list(@val.required() @reflect.type("PID") pid: PID, offset: number = 0, limit: number = 50, @reflect.type("T") @bind.query() @val.partial("T") query: T): Promise<T[]> {
        await this.findParentByIdOrNotFound(pid)
        return this.repo.find(pid, offset, limit, query)
    }

    @route.post("")
    @reflect.type(IdentifierResult, "TID")
    async save(@val.required() @reflect.type("PID") pid: PID, @reflect.type("T") data: T): Promise<IdentifierResult<TID>> {
        await this.findParentByIdOrNotFound(pid)
        return this.repo.insert(pid, data)
    }

    @route.get(":id")
    @reflect.type("T")
    async get(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID): Promise<T> {
        await this.findParentByIdOrNotFound(pid)
        return this.findByIdOrNotFound(id)
    }

    @route.patch(":id")
    @reflect.type(IdentifierResult, "TID")
    async modify(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID, @val.partial("T") data: T): Promise<IdentifierResult<TID>> {
        await this.findParentByIdOrNotFound(pid)
        await this.findByIdOrNotFound(id)
        return this.repo.update(id, data)
    }

    @route.put(":id")
    @reflect.type(IdentifierResult, "TID")
    async replace(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID, @reflect.type("T") data: T): Promise<IdentifierResult<TID>> {
        await this.findParentByIdOrNotFound(pid)
        await this.findByIdOrNotFound(id)
        return this.repo.update(id, data)
    }

    @route.delete(":id")
    @reflect.type(IdentifierResult, "TID")
    async delete(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID): Promise<IdentifierResult<TID>> {
        await this.findParentByIdOrNotFound(pid)
        await this.findByIdOrNotFound(id)
        return this.repo.delete(id)
    }
}

export { IdentifierResult, RepoBaseControllerGeneric, RepoBaseOneToManyControllerGeneric }