import { Context } from "koa"
import { Key, pathToRegexp } from "path-to-regexp"
import reflect, {
    decorate,
    decorateClass,
    DecoratorId,
    DecoratorOptionId,
    generic,
    GenericTypeDecorator,
    PropertyReflection
} from "tinspector"
import { val } from "typedconverter"
import { AuthorizeDecorator } from "./authorization"
import { Class, entityHelper } from "./common"
import { api, ApiTagDecorator } from "./decorator/api"
import { authorize } from "./decorator/authorize"
import { bind } from "./decorator/bind"
import { domain } from "./decorator/common"
import { DeleteColumnDecorator, entity, RelationDecorator } from "./decorator/entity"
import { GenericControllerDecorator, route } from "./decorator/route"
import "./filter-parser"
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
    Repository
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

type ActionName = "delete" | "list" | "get" | "modify" | "save" | "replace"

interface ActionConfig {
    authorize?: string[]
    ignore?: true
}

type ActionConfigMap = Map<ActionName, ActionConfig>

interface GenericControllerConfig {
    path?: string
    map: ActionConfigMap
    actions(): ActionName[]
}


class ControllerBuilder {
    private path?: string
    private map: ActionConfigMap = new Map()
    setPath(path: string): ControllerBuilder {
        this.path = path
        return this
    }
    post() {
        return new ActionsBuilder(this.map, ["save"])
    }
    put() {
        return new ActionsBuilder(this.map, ["replace"])
    }
    patch() {
        return new ActionsBuilder(this.map, ["modify"])
    }
    delete() {
        return new ActionsBuilder(this.map, ["delete"])
    }
    getOne() {
        return new ActionsBuilder(this.map, ["get"])
    }
    getMany() {
        return new ActionsBuilder(this.map, ["list"])
    }
    mutators() {
        return new ActionsBuilder(this.map, ["delete", "modify", "save", "replace"])
    }
    accessors() {
        return new ActionsBuilder(this.map, ["list", "get"])
    }
    all() {
        return new ActionsBuilder(this.map, ["delete", "list", "get", "modify", "save", "replace"])
    }
    toObject(): GenericControllerConfig {
        return {
            map: this.map,
            path: this.path,
            actions() {
                if (this.map.size === 0)
                    return ["delete", "list", "get", "modify", "save", "replace"]
                return Array.from(this.map.keys())
            }
        }
    }
}

class ActionsBuilder {
    constructor(private actions: ActionConfigMap, private names: ActionName[]) {
        this.setConfig(names, {})
    }

    private setConfig(names: ActionName[], config: ActionConfig) {
        for (const action of names) {
            const cnf = this.actions.get(action)!
            this.actions.set(action, { ...cnf, ...config })
        }
        return this
    }

    ignore() {
        return this.setConfig(this.names, { ignore: true })
    }

    authorize(...authorize: string[]) {
        return this.setConfig(this.names, { authorize })
    }
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
    list(offset: number = 0, limit: number = 50, @entity.filter() @reflect.type("T") @val.partial("T") @val.filter() filter: FilterEntity<T>, select: string, order: string, @bind.ctx() ctx: Context): Promise<T[]> {
        return this.repo.find(offset, limit, filter, parseSelect(this.entityType, select), parseOrder(order))
    }

    @decorateRoute("post", "")
    @reflect.type(IdentifierResult, "TID")
    async save(@api.hideRelations() @reflect.type("T") data: T, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        return this.repo.insert(data)
    }

    @decorateRoute("get", ":id")
    @api.hideRelations()
    @reflect.type("T")
    get(@val.required() @reflect.type("TID") id: TID, select: string, @bind.ctx() ctx: Context): Promise<T> {
        return this.findByIdOrNotFound(id, parseSelect(this.entityType, select))
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

function ignoreActions(config: GenericControllerConfig): ((...args: any[]) => void) {
    const actions = config.actions()
    const applyTo = actions.filter(x => !!config.map.get(x)?.ignore)
    if (applyTo.length === 0) return (...args: any[]) => { }
    return route.ignore({ applyTo })
}

function authorizeActions(config: GenericControllerConfig) {
    const actions = config.actions()
    const result = []
    for (const action of actions) {
        const opt = config.map.get(action)
        if (!opt || !opt.authorize) continue
        result.push(authorize.custom({ policies: opt.authorize }, { access: "route", applyTo: action, tag: opt.authorize.join("|") }))
    }
    return result
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


function createGenericController(entity: Class, builder: ControllerBuilder, controller: Class<ControllerGeneric>, nameConversion: (x: string) => string) {
    const config = builder.toObject()
    // get type of ID column on entity
    const idType = entityHelper.getIdType(entity)
    if(!idType) 
        throw new Error(errorMessage.EntityRequireID.format(entity.name))
    // create controller type dynamically 
    const Controller = generic.create({ parent: controller, name: controller.name }, entity, idType)
    // add root decorator
    let routePath = nameConversion(entity.name)
    let routeMap: any = {}
    const routes: ClassDecorator[] = []
    if (config.path) {
        const keys = validatePath(config.path, entity)
        routePath = config.path.replace(lastParam, "")
        routeMap = { id: keys[0].name }
        routes.push(...createRouteDecorators(keys[0].name.toString()))
    }
    // copy @route.ignore() and @authorize on entity to the controller to control route generation
    const meta = reflect(entity)
    const decorators = copyDecorators([...meta.decorators, ...meta.removedDecorators ?? []], controller)
    Reflect.decorate([
        ...decorators,
        ...routes,
        route.root(routePath, { map: routeMap }),
        ignoreActions(config),
        ...authorizeActions(config)
    ], Controller)
    if (!meta.decorators.some((x: ApiTagDecorator) => x.kind === "ApiTag"))
        Reflect.decorate([api.tag(entity.name)], Controller)
    return Controller
}

function createOneToManyGenericController(entity: Class, builder: ControllerBuilder, relation: Class, relationProperty: string, controller: Class<OneToManyControllerGeneric>, nameConversion: (x: string) => string) {
    const config = builder.toObject()
    // get type of ID column on parent entity
    const parentIdType = entityHelper.getIdType(entity)
    if(!parentIdType) 
        throw new Error(errorMessage.EntityRequireID.format(entity.name))
    // get type of ID column on entity
    const idType = entityHelper.getIdType(relation)
    if(!idType) 
        throw new Error(errorMessage.EntityRequireID.format(relation.name))
    // create controller 
    const Controller = generic.create({ parent: controller, name: controller.name }, entity, relation, parentIdType, idType)
    // add root decorator
    let routePath = `${nameConversion(entity.name)}/:pid/${relationProperty}`
    let routeMap: any = {}
    const routes = []
    if (config.path) {
        const keys = validatePath(config.path, entity, true)
        routePath = config.path.replace(lastParam, "")
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
        ignoreActions(config),
        ...authorizeActions(config)
    ], Controller)
    if (!relProp.decorators.some((x: ApiTagDecorator) => x.kind === "ApiTag"))
        Reflect.decorate([api.tag(entity.name)], Controller)
    return Controller
}

function createGenericControllers(controller: Class, genericControllers: GenericController, nameConversion: (x: string) => string) {
    const meta = reflect(controller)
    const controllers = []
    // basic generic controller
    const basicDecorator = meta.decorators.find((x: GenericControllerDecorator): x is GenericControllerDecorator => x.name === "plumier-meta:controller")
    if (basicDecorator) {
        const ctl = createGenericController(controller, basicDecorator.config, genericControllers[0], nameConversion)
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
        const ctl = createOneToManyGenericController(controller, relation.decorator.config, relation.type, relation.name, genericControllers[1], nameConversion)
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

export {
    IdentifierResult, createGenericControllers, genericControllerRegistry, updateGenericControllerRegistry,
    RepoBaseControllerGeneric, RepoBaseOneToManyControllerGeneric, getGenericControllerOneToOneRelations,
    DefaultControllerGeneric, DefaultOneToManyControllerGeneric, DefaultRepository, DefaultOneToManyRepository,
    parseSelect, getGenericControllerRelation, RelationPropertyDecorator, ControllerBuilder
}
