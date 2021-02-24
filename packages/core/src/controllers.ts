import "./filter-parser"

import { Context } from "koa"
import reflect, {
    decorate,
    DecoratorId,
    generic,
    GenericTypeDecorator,
    mergeDecorator,
    PropertyReflection,
    type,
} from "@plumier/reflect"
import { val } from "@plumier/validator"

import { Class } from "./common"
import { postSaveValue } from "./controllers-request-hook"
import { api } from "./decorator/api"
import { bind } from "./decorator/bind"
import { domain, responseType } from "./decorator/common"
import { DeleteColumnDecorator, entity, EntityIdDecorator, RelationDecorator } from "./decorator/entity"
import { route } from "./decorator/route"
import { RouteDecorator } from "./route-generator"
import {
    ControllerGeneric,
    errorMessage,
    FilterEntity,
    HttpMethod,
    HttpStatusError,
    OneToManyControllerGeneric,
    OneToManyRepository,
    OrderQuery,
    RelationPropertyDecorator,
    Repository,
} from "./types"

// --------------------------------------------------------------------- //
// ----------------------------- DECORATORS ---------------------------- //
// --------------------------------------------------------------------- //

const RouteDecoratorID = Symbol("generic-controller:route")

/**
 * Custom route decorator to make it possible to override @route decorator from class scope decorator. 
 * This is required for custom route path defined with @route.controller("custom/:customId")
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
interface GetOneParams { pid?: any, id: any, select: string[] }
type GetOneCustomQueryFunction<T = any> = (params: GetOneParams, ctx: Context) => Promise<T>
interface GetOneCustomQueryDecorator {
    kind: "plumier-meta:get-one-query",
    query: GetOneCustomQueryFunction
}

// get many custom query
interface GetManyParams<T> { pid?: any, limit: number, offset: number, select: string[], filter: FilterEntity<T>, order: OrderQuery[] }
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

function getGenericTypeParameters(controller: Class) {
    const meta = reflect(controller)
    const genericDecorator = meta.decorators
        .find((x: GenericTypeDecorator): x is GenericTypeDecorator => x.kind == "GenericType" && x.target === controller)
    return {
        types: genericDecorator!.types.map(x => x as Class),
        meta
    }
}

function getGenericControllerRelation(controller: Class) {
    const { types, meta } = getGenericTypeParameters(controller)
    const parentEntityType = types[0]
    const entityType = types[1]
    const oneToMany = meta.decorators.find((x: RelationPropertyDecorator): x is RelationPropertyDecorator => x.kind === "plumier-meta:relation-prop-name")
    const relation = oneToMany!.name
    return { parentEntityType, entityType, relation, inverseProperty: oneToMany!.inverseProperty }
}

function getGenericControllerInverseProperty(controller: Class) {
    const rel = getGenericControllerRelation(controller)
    return rel.inverseProperty
}

function parseOrder(order?: string) {
    const tokens = order?.split(",").map(x => x.trim()) ?? []
    const result: OrderQuery[] = []
    for (const token of tokens) {
        if (token.match(/^\-.*/)) {
            const column = token.replace(/^\-/, "")
            result.push({ column, order: -1 })
        }
        else {
            const column = token.replace(/^\+/, "")
            result.push({ column, order: 1 })
        }
    }
    return result
}

function normalizeSelect(type: Class, dSelect: string[], reverseProperty?: string) {
    const isArrayRelation = (prop: PropertyReflection) => Array.isArray(prop.type) && !!prop.decorators.find((x: RelationDecorator) => x.kind === "plumier-meta:relation");
    const defaultSelection = []
    const meta = reflect(type)
    for (const prop of meta.properties) {
        // do not include reverseProperty on default select
        if (reverseProperty && prop.name === reverseProperty) continue
        if (prop.name && !isArrayRelation(prop))
            defaultSelection.push(prop.name)
    }
    return dSelect.length === 0 ? defaultSelection : dSelect
}

function parseSelect(type: Class, select?: string, reverseProperty?: string) {
    const dSelect = select?.split(",").map(x => x.trim()) ?? []
    return normalizeSelect(type, dSelect, reverseProperty)
}

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
        const { types } = getGenericTypeParameters(this.constructor as Class)
        this.entityType = types[0]
        this.repo = fac(this.entityType)
    }

    @route.ignore()
    protected async findByIdOrNotFound(id: TID, select: string[] = []): Promise<T> {
        const saved = await this.repo.findById(id, normalizeSelect(this.entityType, select))
        if (!saved) throw new HttpStatusError(404, `Record with ID ${id} not found`)
        return saved
    }

    @decorateRoute("get", "")
    @api.hideRelations()
    @reflect.type(["T"])
    async list(offset: number = 0, limit: number = 50, @entity.filter() @reflect.type("T") @val.partial("T") @val.filter() filter: FilterEntity<T>, select: string, order: string, @bind.ctx() ctx: Context): Promise<any> {
        const query = getManyCustomQuery(this.constructor as any)
        const pOrder = parseOrder(order)
        const pSelect = parseSelect(this.entityType, select)
        const result = query ? await query({ offset, limit, filter, order: pOrder, select: pSelect }, ctx) : await this.repo.find(offset, limit, filter, pSelect, pOrder)
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
    async get(@val.required() @reflect.type("TID") id: TID, select: string, @bind.ctx() ctx: Context): Promise<T> {
        const query = getOneCustomQuery(this.constructor as any)
        const pSelect = parseSelect(this.entityType, select)
        const result = query ? await query({ id, select: pSelect }, ctx) : await this.findByIdOrNotFound(id, pSelect)
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
    protected async findByIdOrNotFound(id: TID, select: string[] = []): Promise<T> {
        const saved = await this.repo.findById(id, normalizeSelect(this.entityType, select))
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
    async list(@val.required() @reflect.type("PID") pid: PID, offset: number = 0, limit: number = 50, @entity.filter() @reflect.type("T") @val.partial("T") @val.filter() filter: FilterEntity<T>, select: string, order: string, @bind.ctx() ctx: Context): Promise<any> {
        await this.findParentByIdOrNotFound(pid)
        const query = getManyCustomQuery(this.constructor as any)
        const pOrder = parseOrder(order)
        const reverseProperty = getGenericControllerInverseProperty(this.constructor as Class)
        const pSelect = parseSelect(this.entityType, select, reverseProperty)
        const result = query ? await query({ pid, offset, limit, filter, order: pOrder, select: pSelect }, ctx) : await this.repo.find(pid, offset, limit, filter, pSelect, pOrder)
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
    async get(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID, select: string, @bind.ctx() ctx: Context): Promise<T> {
        await this.findParentByIdOrNotFound(pid)
        const query = getOneCustomQuery(this.constructor as any)
        const reverseProperty = getGenericControllerInverseProperty(this.constructor as Class)
        const pSelect = parseSelect(this.entityType, select, reverseProperty)
        const result = query ? await query({ id, select: pSelect }, ctx) : await this.findByIdOrNotFound(id, pSelect)
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
    parseSelect, decorateRoute, IdentifierResult, getGenericControllerRelation,
    getGenericControllerInverseProperty, ResponseTransformer, responseTransformer,
    GetOneCustomQueryFunction, GetOneCustomQueryDecorator, GetOneParams,
    GetManyCustomQueryFunction, GetManyCustomQueryDecorator, GetManyParams,
}
