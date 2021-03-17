import {
    api,
    bind,
    Class,
    ControllerGeneric,
    DeleteColumnDecorator,
    domain,
    EntityIdDecorator,
    HttpMethod,
    HttpStatusError,
    OneToManyControllerGeneric,
    OneToManyRepository,
    Repository,
    responseType,
    route,
    RouteDecorator,
    SelectQuery
} from "@plumier/core"
import { filterParser, orderParser, selectParser } from "@plumier/query-parser"
import reflect, { decorate, DecoratorId, generic, mergeDecorator } from "@plumier/reflect"
import { val } from "@plumier/validator"
import { Context } from "koa"

import { getGenericControllerInverseProperty, getGenericControllerRelation } from "./helper"
import { postSaveValue } from "./request-hook"



// --------------------------------------------------------------------- //
// ----------------------------- DECORATORS ---------------------------- //
// --------------------------------------------------------------------- //

const RouteDecoratorID = Symbol("generic-controller:route")

/**
 * Custom route decorator to make it possible to override @route decorator from class scope decorator. 
 * This is required for custom route path defined with @genericController("custom/:customId")
 */
function decorateRoute(method: HttpMethod, path?: string, option?: { applyTo: string | string[] }) {
    return decorate(<RouteDecorator & { [DecoratorId]: any }>{
        [DecoratorId]: RouteDecoratorID,
        name: "plumier-meta:route",
        method,
        url: path
    }, ["Class", "Method"], { allowMultiple: false, ...option })
}

// get one custom query
interface GetOneParams { pid?: any, id: any, select: SelectQuery }
type GetOneCustomQueryFunction<T = any> = (params: GetOneParams, ctx: Context) => Promise<T>
interface GetOneCustomQueryDecorator {
    kind: "plumier-meta:get-one-query",
    query: GetOneCustomQueryFunction
}

// get many custom query
interface GetManyParams<T> { pid?: any, limit: number, offset: number, select: SelectQuery, filter: any, order: any }
type GetManyCustomQueryFunction<T = any> = (params: GetManyParams<T>, ctx: Context) => Promise<T[]>
interface GetManyCustomQueryDecorator {
    kind: "plumier-meta:get-many-query",
    query: GetManyCustomQueryFunction
}

type ResponseTransformer<S = any, D = any> = (s: S) => D

interface ResponseTransformerDecorator {
    kind: "plumier-meta:response-transformer",
    transformer: ResponseTransformer
}

function responseTransformer(target: Class | Class[] | ((x: any) => Class | Class[]), transformer: ResponseTransformer, opt?: { applyTo: string | string[] }) {
    return mergeDecorator(
        decorate(<ResponseTransformerDecorator>{ kind: "plumier-meta:response-transformer", transformer }, ["Method", "Class"], opt),
        responseType(target, opt)
    )
}

function getTransformer(type: Class, methodName: string) {
    const meta = reflect(type)
    const method = meta.methods.find(x => methodName === x.name)!
    return method.decorators.find((x: ResponseTransformerDecorator): x is ResponseTransformerDecorator => x.kind === "plumier-meta:response-transformer")?.transformer
}

function getOneCustomQuery(type: Class): GetOneCustomQueryFunction | undefined {
    const meta = reflect(type)
    const decorator = meta.decorators.find((x: GetOneCustomQueryDecorator): x is GetOneCustomQueryDecorator => x.kind === "plumier-meta:get-one-query")
    return decorator?.query
}

function getManyCustomQuery(type: Class): GetManyCustomQueryFunction | undefined {
    const meta = reflect(type)
    const decorator = meta.decorators.find((x: GetManyCustomQueryDecorator): x is GetManyCustomQueryDecorator => x.kind === "plumier-meta:get-many-query")
    return decorator?.query
}

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
@generic.template("TID")
class IdentifierResult<TID> {
    constructor(
        @reflect.type("TID")
        public id: TID
    ) { }
}

@generic.template("T", "TID")
class RepoBaseControllerGeneric<T = Object, TID = string> extends ControllerGeneric<T, TID>{
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
    async get(@val.required() @reflect.type("TID") id: TID, @selectParser(x => "T") select: SelectQuery, @bind.ctx() ctx: Context): Promise<T> {
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

@generic.template("P", "T", "PID", "TID")
class RepoBaseOneToManyControllerGeneric<P = Object, T = Object, PID = String, TID = String> extends OneToManyControllerGeneric<P, T, PID, TID>{
    readonly entityType: Class<T>
    readonly parentEntityType: Class<P>
    readonly relation: string
    readonly repo: OneToManyRepository<P, T>

    constructor(fac: ((p: Class<P>, t: Class<T>, rel: string) => OneToManyRepository<P, T>)) {
        super()
        const info = getGenericControllerRelation(this.constructor as Class)
        this.parentEntityType = info.parentEntityType
        this.entityType = info.entityType
        this.relation = info.relation
        this.repo = fac(this.parentEntityType, this.entityType, this.relation)
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
        const reverseProperty = getGenericControllerInverseProperty(this.constructor as Class)
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
    async get(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID, @selectParser(x => "T") select: SelectQuery, @bind.ctx() ctx: Context): Promise<T> {
        await this.findParentByIdOrNotFound(pid)
        const query = getOneCustomQuery(this.constructor as any)
        const reverseProperty = getGenericControllerInverseProperty(this.constructor as Class)
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
    RepoBaseControllerGeneric, RepoBaseOneToManyControllerGeneric,
    decorateRoute, IdentifierResult, getGenericControllerInverseProperty, ResponseTransformer, responseTransformer,
    GetOneCustomQueryFunction, GetOneCustomQueryDecorator, GetOneParams,
    GetManyCustomQueryFunction, GetManyCustomQueryDecorator, GetManyParams,
}
