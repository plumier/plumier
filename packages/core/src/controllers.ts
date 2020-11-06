import "./filter-parser"

import { Context } from "koa"
import reflect, { decorate, decorateClass, DecoratorId, generic, GenericTypeDecorator, mergeDecorator, PropertyReflection, TypeDecorator, TypeDecoratorId } from "tinspector"
import { val } from "typedconverter"

import { Class } from "./common"
import { api } from "./decorator/api"
import { bind } from "./decorator/bind"
import { domain } from "./decorator/common"
import { DeleteColumnDecorator, entity, RelationDecorator } from "./decorator/entity"
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
import { type } from "tinspector"

// --------------------------------------------------------------------- //
// ----------------------------- DECORATORS ---------------------------- //
// --------------------------------------------------------------------- //

const RouteDecoratorID = Symbol("generic-controller:route")

type ResponseTransformer<S = any, D = any> = (s: S) => D

interface ResponseTransformerDecorator {
    kind: "plumier-meta:response-transformer",
    transformer: ResponseTransformer
}

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

function responseTransformer(target: Class | Class[], transformer: ResponseTransformer, opt?: { applyTo: string | string[] }) {
    return mergeDecorator(
        decorate(<ResponseTransformerDecorator>{ kind: "plumier-meta:response-transformer", transformer }, ["Method", "Class"], opt),
        decorate((x: any) => <TypeDecorator>{ [DecoratorId]: TypeDecoratorId, kind: "Override", target: x, genericParams: [], type: target }, ["Method", "Class"], opt)
    )
}

function getTransformer(type: Class, methodName: string) {
    const meta = reflect(type)
    const method = meta.methods.find(x => methodName === x.name)
    if (!method) throw new Error(`${type.name} doesn't have method named ${methodName}`)
    return method.decorators.find((x: ResponseTransformerDecorator): x is ResponseTransformerDecorator => x.kind === "plumier-meta:response-transformer")?.transformer
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

function getGenericControllerRelation(ctl: Class) {
    const { types, meta } = getGenericTypeParameters(ctl)
    const parentEntityType = types[0]
    const entityType = types[1]
    const oneToMany = meta.decorators.find((x: RelationPropertyDecorator): x is RelationPropertyDecorator => x.kind === "plumier-meta:relation-prop-name")
    const relation = oneToMany!.name
    return { parentEntityType, entityType, relation }
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

function normalizeSelect(type: Class, dSelect: string[]) {
    const isArrayRelation = (prop: PropertyReflection) => Array.isArray(prop.type) && !!prop.decorators.find((x: RelationDecorator) => x.kind === "plumier-meta:relation");
    const defaultSelection = reflect(type).properties
        // default, exclude array (one to many) properties 
        .filter(x => x.name && !isArrayRelation(x))
        .map(x => x.name)
    return dSelect.length === 0 ? defaultSelection : dSelect
}

function parseSelect(type: Class, select?: string) {
    const dSelect = select?.split(",").map(x => x.trim()) ?? []
    return normalizeSelect(type, dSelect)
}

function getDeletedProperty(type: Class) {
    const meta = reflect(type)
    return meta.properties.find(x => x.decorators.some((d: DeleteColumnDecorator) => d.kind === "plumier-meta:delete-column"))
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
class RepoBaseControllerGeneric<T = Object, TID = string> implements ControllerGeneric<T, TID>{
    readonly entityType: Class<T>
    readonly repo: Repository<T>

    constructor(fac: ((x: Class<T>) => Repository<T>)) {
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
    async list(offset: number = 0, limit: number = 50, @entity.filter() @reflect.type("T") @val.partial("T") @val.filter() filter: FilterEntity<T>, select: string, order: string, @bind.ctx() ctx: Context): Promise<T[]> {
        const transformer = getTransformer(this.constructor as Class, "list")
        const result = await this.repo.find(offset, limit, filter, parseSelect(this.entityType, select), parseOrder(order))
        if (transformer)
            return result.map(x => transformer(x))
        return result
    }

    @decorateRoute("post", "")
    @reflect.type(IdentifierResult, "TID")
    async save(@api.hideRelations() @reflect.type("T") data: T, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        return this.repo.insert(data)
    }

    @decorateRoute("get", ":id")
    @api.hideRelations()
    @reflect.type("T")
    async get(@val.required() @reflect.type("TID") id: TID, select: string, @bind.ctx() ctx: Context): Promise<T> {
        const transformer = getTransformer(this.constructor as Class, "list")
        const result = await this.findByIdOrNotFound(id, parseSelect(this.entityType, select))
        if (transformer)
            return transformer(result)
        return result
    }

    @decorateRoute("patch", ":id")
    @reflect.type(IdentifierResult, "TID")
    async modify(@val.required() @reflect.type("TID") id: TID, @api.hideRelations() @reflect.type("T") @val.partial("T") data: T, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        await this.findByIdOrNotFound(id)
        return this.repo.update(id, data)
    }

    @decorateRoute("put", ":id")
    @reflect.type(IdentifierResult, "TID")
    async replace(@val.required() @reflect.type("TID") id: TID, @api.hideRelations() @reflect.type("T") data: T, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        await this.findByIdOrNotFound(id)
        return this.repo.update(id, data)
    }

    @decorateRoute("delete", ":id")
    @reflect.type(IdentifierResult, "TID")
    async delete(@val.required() @reflect.type("TID") id: TID, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        const prop = getDeletedProperty(this.entityType)
        await this.findByIdOrNotFound(id)
        if (!prop) {
            return this.repo.delete(id)
        }
        else {
            return this.repo.update(id, { [prop.name]: true } as any)
        }
    }
}

@generic.template("P", "T", "PID", "TID")
class RepoBaseOneToManyControllerGeneric<P = Object, T = Object, PID = String, TID = String> implements OneToManyControllerGeneric<P, T, PID, TID>{
    readonly entityType: Class<T>
    readonly parentEntityType: Class<P>
    readonly relation: string
    readonly repo: OneToManyRepository<P, T>

    constructor(fac: ((p: Class<P>, t: Class<T>, rel: string) => OneToManyRepository<P, T>)) {
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
    async list(@val.required() @reflect.type("PID") pid: PID, offset: number = 0, limit: number = 50, @entity.filter() @reflect.type("T") @val.partial("T") @val.filter() filter: FilterEntity<T>, select: string, order: string, @bind.ctx() ctx: Context): Promise<T[]> {
        await this.findParentByIdOrNotFound(pid)
        return this.repo.find(pid, offset, limit, filter, parseSelect(this.entityType, select), parseOrder(order))
    }

    @decorateRoute("post", "")
    @reflect.type(IdentifierResult, "TID")
    async save(@val.required() @reflect.type("PID") pid: PID, @api.hideRelations() @reflect.type("T") data: T, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        await this.findParentByIdOrNotFound(pid)
        return this.repo.insert(pid, data)
    }

    @decorateRoute("get", ":id")
    @api.hideRelations()
    @reflect.type("T")
    async get(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID, select: string, @bind.ctx() ctx: Context): Promise<T> {
        await this.findParentByIdOrNotFound(pid)
        return this.findByIdOrNotFound(id, parseSelect(this.entityType, select))
    }

    @decorateRoute("patch", ":id")
    @reflect.type(IdentifierResult, "TID")
    async modify(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID, @api.hideRelations() @val.partial("T") data: T, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        await this.findParentByIdOrNotFound(pid)
        await this.findByIdOrNotFound(id)
        return this.repo.update(id, data)
    }

    @decorateRoute("put", ":id")
    @reflect.type(IdentifierResult, "TID")
    async replace(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID, @api.hideRelations() @reflect.type("T") data: T, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        await this.findParentByIdOrNotFound(pid)
        await this.findByIdOrNotFound(id)
        return this.repo.update(id, data)
    }

    @decorateRoute("delete", ":id")
    @reflect.type(IdentifierResult, "TID")
    async delete(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        await this.findParentByIdOrNotFound(pid)
        await this.findByIdOrNotFound(id)
        const prop = getDeletedProperty(this.entityType)
        if (!prop) {
            return this.repo.delete(id)
        }
        else {
            return this.repo.update(id, { [prop.name]: true } as any)
        }
    }
}


// --------------------------------------------------------------------- //
// ------------- DEFAULT GENERIC CONTROLLER IMPLEMENTATION ------------- //
// --------------------------------------------------------------------- //

class DefaultRepository<T> implements Repository<T> {
    find(offset: number, limit: number, query: FilterEntity<T>): Promise<T[]> {
        throw new Error(errorMessage.GenericControllerImplementationNotFound)
    }
    insert(data: Partial<T>): Promise<{ id: any }> {
        throw new Error(errorMessage.GenericControllerImplementationNotFound)
    }
    findById(id: any): Promise<T | undefined> {
        throw new Error(errorMessage.GenericControllerImplementationNotFound)
    }
    update(id: any, data: Partial<T>): Promise<{ id: any }> {
        throw new Error(errorMessage.GenericControllerImplementationNotFound)
    }
    delete(id: any): Promise<{ id: any }> {
        throw new Error(errorMessage.GenericControllerImplementationNotFound)
    }
}

class DefaultOneToManyRepository<P, T> implements OneToManyRepository<P, T> {
    find(pid: any, offset: number, limit: number, query: FilterEntity<T>): Promise<T[]> {
        throw new Error(errorMessage.GenericControllerImplementationNotFound)
    }
    insert(pid: any, data: Partial<T>): Promise<{ id: any }> {
        throw new Error(errorMessage.GenericControllerImplementationNotFound)
    }
    findParentById(id: any): Promise<P | undefined> {
        throw new Error(errorMessage.GenericControllerImplementationNotFound)
    }
    findById(id: any): Promise<T | undefined> {
        throw new Error(errorMessage.GenericControllerImplementationNotFound)
    }
    update(id: any, data: Partial<T>): Promise<{ id: any }> {
        throw new Error(errorMessage.GenericControllerImplementationNotFound)
    }
    delete(id: any): Promise<{ id: any }> {
        throw new Error(errorMessage.GenericControllerImplementationNotFound)
    }
}

@generic.template("T", "TID")
@generic.type("T", "TID")
class DefaultControllerGeneric<T, TID> extends RepoBaseControllerGeneric<T, TID>{
    constructor() { super(x => new DefaultRepository()) }
}

@generic.template("P", "T", "PID", "TID")
@generic.type("P", "T", "PID", "TID")
class DefaultOneToManyControllerGeneric<P, T, PID, TID> extends RepoBaseOneToManyControllerGeneric<P, T, PID, TID>{
    constructor() { super(x => new DefaultOneToManyRepository()) }
}


export {
    RepoBaseControllerGeneric, RepoBaseOneToManyControllerGeneric,
    DefaultControllerGeneric, DefaultOneToManyControllerGeneric, DefaultRepository, DefaultOneToManyRepository,
    parseSelect, decorateRoute, IdentifierResult, getGenericControllerRelation, ResponseTransformer, responseTransformer
}
