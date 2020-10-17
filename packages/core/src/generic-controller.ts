import "./filter-parser"
import { Context } from "koa"
import { Key, pathToRegexp } from "path-to-regexp"
import reflect, {
    decorate,
    decorateClass,
    DecoratorId,
    DecoratorOptionId,
    generic,
    GenericTypeDecorator,
    type,
} from "tinspector"
import { val } from "typedconverter"

import { AuthorizeDecorator } from "./authorization"
import { Class, entityHelper } from "./common"
import { api, ApiTagDecorator } from "./decorator/api"
import { bind } from "./decorator/bind"
import { domain } from "./decorator/common"
import { RelationDecorator } from "./decorator/entity"
import { GenericControllerDecorator, route } from "./decorator/route"
import { IgnoreDecorator, RouteDecorator } from "./route-generator"
import {
    ControllerGeneric,
    errorMessage,
    FilterEntity,
    GenericController,
    HttpMethod,
    HttpStatusError,
    OneToManyControllerGeneric,
    OneToManyRepository,
    OrderQuery,
    RelationPropertyDecorator,
    Repository,
} from "./types"


// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

const RouteDecoratorID = Symbol("generic-controller:route")

@domain()
@generic.template("TID")
class IdentifierResult<TID> {
    constructor(
        @reflect.type("TID")
        public id: TID
    ) { }
}


// --------------------------------------------------------------------- //
// ------------------------------ HELPERS ------------------------------ //
// --------------------------------------------------------------------- //

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
    const defaultSelection = reflect(type).properties
        // default, exclude array (one to many) properties 
        .filter(x => x.name && !Array.isArray(x.type))
        .map(x => x.name)
    return dSelect.length === 0 ? defaultSelection : dSelect
}

function parseSelect(type: Class, select?: string) {
    const dSelect = select?.split(",").map(x => x.trim()) ?? []
    return normalizeSelect(type, dSelect)
}

// --------------------------------------------------------------------- //
// ---------------------------- CONTROLLERS ---------------------------- //
// --------------------------------------------------------------------- //


@generic.template("T", "TID")
class RepoBaseControllerGeneric<T = Object, TID = string> implements ControllerGeneric<T, TID>{
    readonly entityType: Class<T>
    readonly repo: Repository<T>

    constructor(fac: ((x: Class<T>) => Repository<T>)) {
        const { types } = getGenericTypeParameters(this)
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
    @reflect.type(["T"])
    list(offset: number = 0, limit: number = 50, @reflect.type("T") @val.partial("T") @val.filter() filter: FilterEntity<T>, select: string, order: string, @bind.ctx() ctx: Context): Promise<T[]> {
        return this.repo.find(offset, limit, filter, parseSelect(this.entityType, select), parseOrder(order))
    }

    @decorateRoute("post", "")
    @reflect.type(IdentifierResult, "TID")
    async save(@reflect.type("T") data: T, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        return this.repo.insert(data)
    }

    @decorateRoute("get", ":id")
    @reflect.type("T")
    get(@val.required() @reflect.type("TID") id: TID, select: string, @bind.ctx() ctx: Context): Promise<T> {
        return this.findByIdOrNotFound(id, parseSelect(this.entityType, select))
    }

    @decorateRoute("patch", ":id")
    @reflect.type(IdentifierResult, "TID")
    async modify(@val.required() @reflect.type("TID") id: TID, @reflect.type("T") @val.partial("T") data: T, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        await this.findByIdOrNotFound(id)
        return this.repo.update(id, data)
    }

    @decorateRoute("put", ":id")
    @reflect.type(IdentifierResult, "TID")
    async replace(@val.required() @reflect.type("TID") id: TID, @reflect.type("T") data: T, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        await this.findByIdOrNotFound(id)
        return this.repo.update(id, data)
    }

    @decorateRoute("delete", ":id")
    @reflect.type(IdentifierResult, "TID")
    async delete(@val.required() @reflect.type("TID") id: TID, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        await this.findByIdOrNotFound(id)
        return this.repo.delete(id)
    }
}

@generic.template("P", "T", "PID", "TID")
class RepoBaseOneToManyControllerGeneric<P = Object, T = Object, PID = String, TID = String> implements OneToManyControllerGeneric<P, T, PID, TID>{
    readonly entityType: Class<T>
    readonly parentEntityType: Class<P>
    readonly relation: string
    readonly repo: OneToManyRepository<P, T>

    constructor(fac: ((p: Class<P>, t: Class<T>, rel: string) => OneToManyRepository<P, T>)) {
        const { types, meta } = getGenericTypeParameters(this)
        this.parentEntityType = types[0]
        this.entityType = types[1]
        const oneToMany = meta.decorators.find((x: RelationPropertyDecorator): x is RelationPropertyDecorator => x.kind === "plumier-meta:relation-prop-name")
        this.relation = oneToMany!.name
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
    @reflect.type(["T"])
    async list(@val.required() @reflect.type("PID") pid: PID, offset: number = 0, limit: number = 50, @reflect.type("T") @val.partial("T") @val.filter() filter: FilterEntity<T>, select: string, order: string, @bind.ctx() ctx: Context): Promise<T[]> {
        await this.findParentByIdOrNotFound(pid)
        return this.repo.find(pid, offset, limit, filter, parseSelect(this.entityType, select), parseOrder(order))
    }

    @decorateRoute("post", "")
    @reflect.type(IdentifierResult, "TID")
    async save(@val.required() @reflect.type("PID") pid: PID, @reflect.type("T") data: T, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        await this.findParentByIdOrNotFound(pid)
        return this.repo.insert(pid, data)
    }

    @decorateRoute("get", ":id")
    @reflect.type("T")
    async get(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID, select: string, @bind.ctx() ctx: Context): Promise<T> {
        await this.findParentByIdOrNotFound(pid)
        return this.findByIdOrNotFound(id, parseSelect(this.entityType, select))
    }

    @decorateRoute("patch", ":id")
    @reflect.type(IdentifierResult, "TID")
    async modify(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID, @val.partial("T") data: T, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        await this.findParentByIdOrNotFound(pid)
        await this.findByIdOrNotFound(id)
        return this.repo.update(id, data)
    }

    @decorateRoute("put", ":id")
    @reflect.type(IdentifierResult, "TID")
    async replace(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID, @reflect.type("T") data: T, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        await this.findParentByIdOrNotFound(pid)
        await this.findByIdOrNotFound(id)
        return this.repo.update(id, data)
    }

    @decorateRoute("delete", ":id")
    @reflect.type(IdentifierResult, "TID")
    async delete(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        await this.findParentByIdOrNotFound(pid)
        await this.findByIdOrNotFound(id)
        return this.repo.delete(id)
    }
}

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

// --------------------------------------------------------------------- //
// -------------------------------- MAIN ------------------------------- //
// --------------------------------------------------------------------- //

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


const genericControllerRegistry = new Map<Class, boolean>()

function updateGenericControllerRegistry(cls: Class) {
    genericControllerRegistry.set(cls, true)
}

function getGenericTypeParameters(cls: any) {
    const controller: Class = cls.constructor
    const meta = reflect(controller)
    const genericDecorator = meta.decorators
        .find((x: GenericTypeDecorator): x is GenericTypeDecorator => x.kind == "GenericType" && x.target === controller)
    return {
        types: genericDecorator!.types.map(x => x as Class),
        meta
    }
}

function copyDecorators(decorators: any[], controller: Class) {
    const result = []
    for (const decorator of decorators) {
        // copy @route.ignore()
        if ((decorator as IgnoreDecorator).name === "plumier-meta:ignore") {
            result.push(decorator)
        }
        // copy @authorize
        const authDec = (decorator as AuthorizeDecorator)
        if (authDec.type === "plumier-meta:authorize") {
            result.push(decorator)
        }
        // copy @api.tag
        const apiTag = (decorator as ApiTagDecorator)
        if (apiTag.kind === "ApiTag") {
            result.push(decorator)
        }
    }
    return result.map(x => decorateClass(x, x[DecoratorOptionId]))
}


function createRouteDecorators(id: string) {
    return [
        decorateRoute("post", "", { applyTo: "save" }),
        decorateRoute("get", "", { applyTo: "list" }),
        decorateRoute("get", `:${id}`, { applyTo: "get" }),
        decorateRoute("put", `:${id}`, { applyTo: "replace" }),
        decorateRoute("patch", `:${id}`, { applyTo: "modify" }),
        decorateRoute("delete", `:${id}`, { applyTo: "delete" }),
    ]
}

const lastParam = /\/:\w*$/

function validatePath(path: string, entity: Class, oneToMany = false) {
    const endWithParam = path.match(lastParam)
    if (!endWithParam) throw new Error(errorMessage.CustomRouteEndWithParameter.format(path, entity.name))
    const keys: Key[] = []
    pathToRegexp(path, keys)
    if (!oneToMany && keys.length > 1)
        throw new Error(errorMessage.CustomRouteMustHaveOneParameter.format(path, entity.name))
    if (oneToMany && (keys.length != 2))
        throw new Error(errorMessage.CustomRouteRequiredTwoParameters.format(path, entity.name))
    return keys
}

function createGenericController(entity: Class, decorator: GenericControllerDecorator, controller: Class<ControllerGeneric>, nameConversion: (x: string) => string) {
    // get type of ID column on entity
    const idType = entityHelper.getIdType(entity)
    // create controller type dynamically 
    const Controller = generic.create({ parent: controller, name: controller.name }, entity, idType)
    // add root decorator
    let routePath = nameConversion(entity.name)
    let routeMap: any = {}
    const routes: ClassDecorator[] = []
    if (decorator.path) {
        const keys = validatePath(decorator.path, entity)
        routePath = decorator.path.replace(lastParam, "")
        routeMap = { id: keys[0].name }
        routes.push(...createRouteDecorators(keys[0].name.toString()))
    }
    // copy @route.ignore() and @authorize on entity to the controller to control route generation
    const meta = reflect(entity)
    const decorators = copyDecorators([...meta.decorators, ...meta.removedDecorators ?? []], controller)
    Reflect.decorate([...decorators, ...routes, route.root(routePath, { map: routeMap })], Controller)
    if (!meta.decorators.some((x: ApiTagDecorator) => x.kind === "ApiTag"))
        Reflect.decorate([api.tag(entity.name)], Controller)
    return Controller
}

function createOneToManyGenericController(entity: Class, decorator: GenericControllerDecorator, relation: Class, relationProperty: string, controller: Class<OneToManyControllerGeneric>, nameConversion: (x: string) => string) {
    // get type of ID column on parent entity
    const parentIdType = entityHelper.getIdType(entity)
    // get type of ID column on entity
    const idType = entityHelper.getIdType(relation)
    // create controller 
    const Controller = generic.create({ parent: controller, name: controller.name }, entity, relation, parentIdType, idType)
    // add root decorator
    let routePath = `${nameConversion(entity.name)}/:pid/${relationProperty}`
    let routeMap: any = {}
    const routes = []
    if (decorator.path) {
        const keys = validatePath(decorator.path, entity, true)
        routePath = decorator.path.replace(lastParam, "")
        routeMap = { pid: keys[0].name, id: keys[1].name }
        routes.push(...createRouteDecorators(keys[1].name.toString()))
    }
    // copy @route.ignore() on entity to the controller to control route generation
    const meta = reflect(entity)
    const relProp = meta.properties.find(x => x.name === relationProperty)!
    const entityDecorators = relProp.decorators
    const decorators = copyDecorators(entityDecorators, controller)
    Reflect.decorate([
        ...decorators,
        ...routes,
        route.root(routePath, { map: routeMap }),
        // re-assign oneToMany decorator which will be used on OneToManyController constructor
        decorateClass(<RelationPropertyDecorator>{ kind: "plumier-meta:relation-prop-name", name: relationProperty }),
    ], Controller)
    if (!relProp.decorators.some((x: ApiTagDecorator) => x.kind === "ApiTag"))
        Reflect.decorate([api.tag(entity.name)], Controller)
    return Controller
}

function createGenericControllers(controller: Class, genericControllers: GenericController, nameConversion: (x: string) => string) {
    const setting = genericControllerRegistry.get(controller)
    const meta = reflect(controller)
    const controllers = []
    // basic generic controller
    const basicDecorator = meta.decorators.find((x: GenericControllerDecorator): x is GenericControllerDecorator => x.name === "plumier-meta:controller")
    if (basicDecorator) {
        const ctl = createGenericController(controller, basicDecorator, genericControllers[0], nameConversion)
        controllers.push(ctl)
    }
    // one to many controller on each relation property
    const relations = []
    for (const prop of meta.properties) {
        const decorator = prop.decorators.find((x: GenericControllerDecorator): x is GenericControllerDecorator => x.name === "plumier-meta:controller")
        if (!decorator) continue
        if (!prop.type[0])
            throw new Error(errorMessage.GenericControllerMissingTypeInfo.format(`${meta.name}.${prop.name}`))
        relations.push({ name: prop.name, type: prop.type[0], decorator })
    }
    for (const relation of relations) {
        const ctl = createOneToManyGenericController(controller, relation.decorator, relation.type, relation.name, genericControllers[1], nameConversion)
        controllers.push(ctl)
    }
    return controllers
}

function getGenericControllerOneToOneRelations(type: Class) {
    const meta = reflect(type)
    const result = []
    for (const prop of meta.properties) {
        if (prop.decorators.find((x: RelationDecorator) => x.kind === "plumier-meta:relation") && prop.typeClassification !== "Array") {
            result.push(prop)
        }
    }
    return result
}

type ActionMember = keyof RepoBaseControllerGeneric | keyof RepoBaseOneToManyControllerGeneric

/**
 * Get list of generic controller actions handles specific http methods
 * @param httpMethods http methods
 */
function actions(...httpMethods: ("post" | "put" | "patch" | "delete" | "get")[]): { applyTo: ActionMember[] }
/**
 * Get list of generic controller actions handles "post", "put", "patch" and "delete"
 * @param mutation 
 */
function actions(mutation: "mutations"): { applyTo: ActionMember[] }
function actions(...httpMethods: string[]): { applyTo: ActionMember[] } {
    const result: ActionMember[] = []
    for (const method of httpMethods) {
        switch (method) {
            case "post":
                result.push("save")
                break;
            case "delete":
                result.push("delete")
                break;
            case "get":
                result.push("get")
                result.push("list")
                break;
            case "put":
                result.push("replace")
                break;
            case "patch":
                result.push("modify")
                break;
            case "mutations":
                result.push("save")
                result.push("modify")
                result.push("replace")
                result.push("delete")
                break;
        }
    }
    return { applyTo: result };
}

export {
    IdentifierResult, createGenericControllers, genericControllerRegistry, updateGenericControllerRegistry,
    RepoBaseControllerGeneric, RepoBaseOneToManyControllerGeneric, getGenericControllerOneToOneRelations,
    DefaultControllerGeneric, DefaultOneToManyControllerGeneric, DefaultRepository, DefaultOneToManyRepository,
    parseSelect, actions
}
