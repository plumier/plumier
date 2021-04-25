import {
    api,
    bind,
    Class,
    ControllerGeneric,
    DeleteColumnDecorator,
    domain,
    entityHelper,
    EntityIdDecorator,
    HttpStatusError,
    NestedGenericControllerDecorator,
    NestedControllerGeneric,
    NestedRepository,
    Repository,
    route,
    SelectQuery,
} from "@plumier/core"
import { filterParser, orderParser, selectParser } from "@plumier/query-parser"
import reflect, { generic } from "@plumier/reflect"
import { val } from "@plumier/validator"
import { Context } from "koa"

import { decorateRoute, responseTransformer } from "./decorator"
import { EntityWithRelation } from "./factory"
import { getManyCustomQuery, getOneCustomQuery, getTransformer, } from "./helper"
import { postSaveValue } from "./request-hook"


// --------------------------------------------------------------------- //
// ------------------------------ HELPERS ------------------------------ //
// --------------------------------------------------------------------- //

function getDeletedProperty(type: Class) {
    const meta = reflect(type)
    return meta.properties.find(x => x.decorators.some((d: DeleteColumnDecorator) => d.kind === "plumier-meta:delete-column"))
}

async function getIdentifierResult(type: Class, obj: any) {
    const data = await obj
    const meta = reflect(type)
    const id = meta.properties.find(prop => prop.decorators.some((x: EntityIdDecorator) => x.kind === "plumier-meta:entity-id"))
    return { [postSaveValue]: data, id: data[id!.name] } as { id: any }
}


// --------------------------------------------------------------------- //
// ---------------------------- CONTROLLERS ---------------------------- //
// --------------------------------------------------------------------- //

@domain()
@generic.parameter("TID")
class IdentifierResult<TID> {
    constructor(
        @reflect.type("TID")
        public id: TID
    ) { }
}

type NestedRepositoryFactory<P,T> = (t:EntityWithRelation<P,T> | EntityWithRelation<T|P>) => NestedRepository<P,T>

@generic.parameter("T", "TID")
class RepoBaseControllerGeneric<T = any, TID = string> extends ControllerGeneric<T, TID>{
    readonly entityType: Class<T>
    readonly repo: Repository<T>

    constructor(fac: ((x: Class<T>) => Repository<T>)) {
        super()
        const types = generic.getGenericTypeParameters(this.constructor as Class)
        this.entityType = types[0]
        this.repo = fac(this.entityType)
    }

    @route.ignore()
    protected async findByIdOrNotFound(id: TID, select: SelectQuery = {}): Promise<T> {
        const saved = await this.repo.findById(id, select)
        if (!saved) throw new HttpStatusError(404, `Record with ID ${id} not found`)
        return saved
    }

    @decorateRoute("get", "")
    @api.hideRelations()
    @reflect.type(["T"])
    async list(offset: number = 0, limit: number = 50, @filterParser(() => "T") filter: any, @selectParser(x => "T") select: SelectQuery, @orderParser(x => "T") order: string, @bind.ctx() ctx: Context): Promise<any> {
        const query = getManyCustomQuery(this.constructor as any)
        const result = query ? await query({ offset, limit, filter, order, select }, ctx) : await this.repo.find(offset, limit, filter, select, order)
        const transformer = getTransformer(this.constructor as Class, "list")
        if (transformer)
            return result.map(x => transformer(x))
        return result
    }

    @decorateRoute("post", "")
    @reflect.type(IdentifierResult, "TID")
    save(@api.hideRelations() @reflect.type("T") data: T, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        return getIdentifierResult(this.entityType, this.repo.insert(data))
    }

    @decorateRoute("get", ":id")
    @api.hideRelations()
    @reflect.type("T")
    async get(@val.required() @reflect.type("TID") id: TID, @selectParser(x => "T") select: SelectQuery, @bind.ctx() ctx: Context): Promise<any> {
        const query = getOneCustomQuery(this.constructor as any)
        const result = query ? await query({ id, select }, ctx) : await this.findByIdOrNotFound(id, select)
        const transformer = getTransformer(this.constructor as Class, "get")
        if (transformer)
            return transformer(result)
        return result
    }

    @decorateRoute("patch", ":id")
    @reflect.type(IdentifierResult, "TID")
    async modify(@val.required() @reflect.type("TID") id: TID, @api.hideRelations() @reflect.type("T") @val.partial("T") data: T, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        await this.findByIdOrNotFound(id)
        return getIdentifierResult(this.entityType, this.repo.update(id, data))
    }

    @decorateRoute("put", ":id")
    @reflect.type(IdentifierResult, "TID")
    async replace(@val.required() @reflect.type("TID") id: TID, @api.hideRelations() @reflect.type("T") data: T, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        await this.findByIdOrNotFound(id)
        return getIdentifierResult(this.entityType, this.repo.update(id, data))
    }

    @decorateRoute("delete", ":id")
    @reflect.type(IdentifierResult, "TID")
    async delete(@val.required() @reflect.type("TID") id: TID, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        const prop = getDeletedProperty(this.entityType)
        await this.findByIdOrNotFound(id)
        const result = !prop ? this.repo.delete(id) : this.repo.update(id, { [prop.name]: true } as any)
        return getIdentifierResult(this.entityType, result)
    }
}

@generic.parameter("P", "T", "PID", "TID")
class RepoBaseNestedControllerGeneric<P = any, T = any, PID = String, TID = String> extends NestedControllerGeneric<P, T, PID, TID>{
    readonly entityType: Class<T>
    readonly parentEntityType: Class<P>
    readonly repo: NestedRepository<P, T>

    constructor(fac: NestedRepositoryFactory<P,T>) {
        super()
        const meta = reflect(this.constructor as Class)
        const dec = meta.decorators.find((x: NestedGenericControllerDecorator): x is NestedGenericControllerDecorator => x.kind === "plumier-meta:relation-prop-name")!
        const info = entityHelper.getRelationInfo([dec.type, dec.relation])
        this.parentEntityType = info.parent
        this.entityType = info.child
        this.repo = fac([dec.type, dec.relation as any])
    }

    @route.ignore()
    protected async findByIdOrNotFound(id: TID, select: SelectQuery = {}): Promise<T> {
        const saved = await this.repo.findById(id, select)
        if (!saved) throw new HttpStatusError(404, `Record with ID ${id} not found`)
        return saved
    }

    @route.ignore()
    protected async findParentByIdOrNotFound(id: PID): Promise<P> {
        const saved = await this.repo.findParentById(id)
        if (!saved) throw new HttpStatusError(404, `Parent record with ID ${id} not found`)
        return saved
    }

    @decorateRoute("get", "")
    @api.hideRelations()
    @reflect.type(["T"])
    async list(@val.required() @reflect.type("PID") pid: PID, offset: number = 0, limit: number = 50, @filterParser(() => "T") filter: any, @selectParser(x => "T") select: SelectQuery, @orderParser(x => "T") order: string, @bind.ctx() ctx: Context): Promise<any> {
        await this.findParentByIdOrNotFound(pid)
        const query = getManyCustomQuery(this.constructor as any)
        const result = query ? await query({ pid, offset, limit, filter, order, select }, ctx) : await this.repo.find(pid, offset, limit, filter, select, order)
        const transformer = getTransformer(this.constructor as Class, "list")
        if (transformer)
            return result.map(x => transformer(x))
        return result
    }

    @decorateRoute("post", "")
    @reflect.type(IdentifierResult, "TID")
    async save(@val.required() @reflect.type("PID") pid: PID, @api.hideRelations() @reflect.type("T") data: T, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        await this.findParentByIdOrNotFound(pid)
        return getIdentifierResult(this.entityType, this.repo.insert(pid, data))
    }

    @decorateRoute("get", ":id")
    @api.hideRelations()
    @reflect.type("T")
    async get(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID, @selectParser(x => "T") select: SelectQuery, @bind.ctx() ctx: Context): Promise<any> {
        await this.findParentByIdOrNotFound(pid)
        const query = getOneCustomQuery(this.constructor as any)
        const result = query ? await query({ id, select }, ctx) : await this.findByIdOrNotFound(id, select)
        const transformer = getTransformer(this.constructor as Class, "get")
        if (transformer)
            return transformer(result)
        return result
    }

    @decorateRoute("patch", ":id")
    @reflect.type(IdentifierResult, "TID")
    async modify(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID, @api.hideRelations() @val.partial("T") data: T, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        await this.findParentByIdOrNotFound(pid)
        await this.findByIdOrNotFound(id)
        return getIdentifierResult(this.entityType, this.repo.update(id, data))
    }

    @decorateRoute("put", ":id")
    @reflect.type(IdentifierResult, "TID")
    async replace(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID, @api.hideRelations() @reflect.type("T") data: T, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        await this.findParentByIdOrNotFound(pid)
        await this.findByIdOrNotFound(id)
        return getIdentifierResult(this.entityType, this.repo.update(id, data))
    }

    @decorateRoute("delete", ":id")
    @reflect.type(IdentifierResult, "TID")
    async delete(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        await this.findParentByIdOrNotFound(pid)
        await this.findByIdOrNotFound(id)
        const prop = getDeletedProperty(this.entityType)
        const result = !prop ? this.repo.delete(id) : this.repo.update(id, { [prop.name]: true } as any)
        return getIdentifierResult(this.entityType, result)
    }
}

export {
    RepoBaseControllerGeneric, RepoBaseNestedControllerGeneric, IdentifierResult, NestedRepositoryFactory
}
