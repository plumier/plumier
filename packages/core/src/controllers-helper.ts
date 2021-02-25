import "./filter-parser"

import reflect, { decorateClass, DecoratorOptionId, generic } from "@plumier/reflect"
import { Key, pathToRegexp } from "path-to-regexp"

import { AuthorizeDecorator } from "./authorization"
import { Class, entityHelper } from "./common"
import {
    decorateRoute,
    GetManyCustomQueryDecorator,
    GetManyCustomQueryFunction,
    GetOneCustomQueryDecorator,
    GetOneCustomQueryFunction,
    ResponseTransformer,
    responseTransformer,
} from "./controllers"
import { api, ApiTagDecorator } from "./decorator/api"
import { authorize } from "./decorator/authorize"
import { entityProvider, responseType } from "./decorator/common"
import { entity, RelationDecorator } from "./decorator/entity"
import { GenericControllerDecorator, route } from "./decorator/route"
import { IgnoreDecorator } from "./route-generator"
import {
    ControllerGeneric,
    errorMessage,
    GenericController,
    OneToManyControllerGeneric,
    RelationPropertyDecorator,
} from "./types"


// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

type ActionNotation = "Put" | "Patch" | "Post" | "GetMany" | "GetOne" | "Delete"

interface ActionConfig {
    authorize?: string[]
    ignore?: true
    transformer?: { target: Class, fn: ResponseTransformer }
    getOneCustomQuery?: { type: Class | [Class], query: GetOneCustomQueryFunction }
    getManyCustomQuery?: { type: Class | [Class], query: GetManyCustomQueryFunction }
}

type ActionConfigMap = Map<string, ActionConfig>

interface GenericControllerConfig {
    path?: string
    map: ActionConfigMap
    actions(): string[]
}

function getActionName(method: ActionNotation) {
    if (method === "Delete") return "delete"
    if (method === "GetMany") return "list"
    if (method === "GetOne") return "get"
    if (method === "Patch") return "modify"
    if (method === "Post") return "save"
    else return "replace"
}

class ControllerBuilder {
    public parent?: Class
    public relation?: string
    private path?: string
    private map: ActionConfigMap = new Map()

    /**
     * Set custom path for generic controller
     */
    setPath(path: string): ControllerBuilder {
        this.path = path
        return this
    }

    /**
     * Use nested generic controller. Use this configuration when @route.controller() applied on class decorator instead of on one to many relation
     * @param parent The parent entity class
     * @param relation Relation name of the parent entity
     */
    useNested<T>(parent: Class<T>, relation: keyof T) {
        this.parent = parent
        this.relation = relation as string
        return this
    }

    /**
     * Configure multiple generic controller actions based on their http method
     */
    actions(...notations: ActionNotation[]) {
        return new ActionsBuilder(this.map, notations.map(x => getActionName(x)))
    }

    /**
     * Configure multiple generic controller actions based on their name
     */
    actionNames(...names: string[]){
        return new ActionsBuilder(this.map, names)
    }

    /**
     * Configure generic controller action handles POST http method
     */
    post() {
        return new ActionsBuilder(this.map, ["save"])
    }

    /**
     * Configure generic controller action handles PUT http method
     */
    put() {
        return new ActionsBuilder(this.map, ["replace"])
    }

    /**
     * Configure generic controller action handles PATCH http method
     */
    patch() {
        return new ActionsBuilder(this.map, ["modify"])
    }

    /**
     * Configure generic controller action handles DELETE http method
     */
    delete() {
        return new ActionsBuilder(this.map, ["delete"])
    }

    /**
     * Configure generic controller action handles GET http method with single result
     */
    getOne() {
        return new GetOneActionBuilder(this.map, ["get"])
    }

    /**
     * Configure generic controller action handles POST http method with multiple result
     */
    getMany() {
        return new GetManyActionBuilder(this.map, ["list"])
    }

    /**
     * Configure generic controller actions handles POST, PUT, PATCH, DELETE http method
     */
    mutators() {
        return new ActionsBuilder(this.map, ["delete", "modify", "save", "replace"])
    }

    /**
     * Configure generic controller actions handles GET http method (single result or multiple result)
     */
    accessors() {
        return new TransformableActionBuilder(this.map, ["list", "get"])
    }

    /**
     * Configure ALL generic controller actions
     */
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
    constructor(private actions: ActionConfigMap, protected names: string[]) {
        this.setConfig(names, {})
    }

    protected setConfig(names: string[], config: ActionConfig) {
        for (const action of names) {
            const cnf = this.actions.get(action)!
            this.actions.set(action, { ...cnf, ...config })
        }
        return this
    }

    /**
     * Ignore (exclude) generic controller methods from route generation system
     */
    ignore() {
        return this.setConfig(this.names, { ignore: true })
    }

    /**
     * Set authorization access to generic controller methods
     * @param authorize 
     */
    authorize(...authorize: string[]) {
        return this.setConfig(this.names, { authorize })
    }
}

class TransformableActionBuilder extends ActionsBuilder {

    /**
     * Set custom response transformer returned by generic controller action
     * @param target Response type model
     * @param fn Transformation logic
     */
    transformer<T>(target: Class<T>, fn: ResponseTransformer<any, T>) {
        return this.setConfig(this.names, { transformer: { target, fn } })
    }
}


class GetOneActionBuilder extends TransformableActionBuilder {

    /**
     * Override current generic controller action database query to provide different response result then the default one
     * @param responseType Response type, used to specify the response schema
     * @param query Custom database query 
     */
    custom<T>(responseType: Class | [Class], query: GetOneCustomQueryFunction<T>) {
        return this.setConfig(this.names, { getOneCustomQuery: { type: responseType, query } })
    }
}

class GetManyActionBuilder extends TransformableActionBuilder {
    /**
     * Override current generic controller action database query to provide different response result then the default one
     * @param responseType Response type, used to specify the response schema
     * @param query Custom database query 
     */
    custom<T>(responseType: Class | [Class], query: GetManyCustomQueryFunction<T>) {
        return this.setConfig(this.names, { getManyCustomQuery: { type: responseType, query } })
    }
}


// --------------------------------------------------------------------- //
// -------------------------------- MAIN ------------------------------- //
// --------------------------------------------------------------------- //

const genericControllerRegistry = new Map<Class, boolean>()

function updateGenericControllerRegistry(cls: Class) {
    genericControllerRegistry.set(cls, true)
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
        result.push(authorize.custom(opt.authorize, { access: "route", applyTo: action, tag: opt.authorize.join("|") }))
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

function decorateTransformers(config: GenericControllerConfig) {
    const result = []
    for (const key of config.map.keys()) {
        const cnf = config.map.get(key)
        if (cnf && cnf.transformer) {
            const target = key === "get" ? cnf.transformer.target : [cnf.transformer.target]
            result.push(responseTransformer(target, cnf.transformer.fn, { applyTo: key }))
        }
    }
    return result
}

function decorateCustomQuery(config: GenericControllerConfig) {
    const result = []
    const get = config.map.get("get")
    if (get && get.getOneCustomQuery) {
        result.push(decorateClass(<GetOneCustomQueryDecorator>{ kind: "plumier-meta:get-one-query", query: get.getOneCustomQuery.query }))
        result.push(responseType(get.getOneCustomQuery.type, { applyTo: "get" }))
    }
    const list = config.map.get("list")
    if (list && list.getManyCustomQuery) {
        result.push(decorateClass(<GetManyCustomQueryDecorator>{ kind: "plumier-meta:get-many-query", query: list.getManyCustomQuery.query }))
        result.push(responseType(list.getManyCustomQuery.type, { applyTo: "list" }))
    }
    return result
}

function createGenericController(entity: Class, builder: ControllerBuilder, controller: Class<ControllerGeneric>, nameConversion: (x: string) => string) {
    const config = builder.toObject()
    // get type of ID column on entity
    const idType = entityHelper.getIdType(entity)
    if (!idType)
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
        entityProvider(entity, "id", { applyTo: ["get", "modify", "replace", "delete"] }),
        route.root(routePath, { map: routeMap }),
        ignoreActions(config),
        ...authorizeActions(config),
        ...decorateTransformers(config),
        ...decorateCustomQuery(config)
    ], Controller)
    if (!meta.decorators.some((x: ApiTagDecorator) => x.kind === "ApiTag"))
        Reflect.decorate([api.tag(entity.name)], Controller)

    return Controller
}

function getControllerBuilderFromConfig(callback?: (builder: ControllerBuilder) => void) {
    const c = new ControllerBuilder();
    if (callback)
        callback(c);
    return c
}

function createOneToManyGenericController(parentType: Class, builder: ControllerBuilder, entity: Class, relationProperty: string, controller: Class<OneToManyControllerGeneric>, nameConversion: (x: string) => string) {
    const config = builder.toObject()
    // get type of ID column on parent entity
    const parentIdType = entityHelper.getIdType(parentType)
    if (!parentIdType)
        throw new Error(errorMessage.EntityRequireID.format(parentType.name))
    // get type of ID column on entity
    const idType = entityHelper.getIdType(entity)
    if (!idType)
        throw new Error(errorMessage.EntityRequireID.format(entity.name))
    // create controller 
    const Controller = generic.create({ parent: controller, name: controller.name }, parentType, entity, parentIdType, idType)
    // add root decorator
    let routePath = `${nameConversion(parentType.name)}/:pid/${relationProperty}`
    let routeMap: any = {}
    const routes = []
    if (config.path) {
        const keys = validatePath(config.path, parentType, true)
        routePath = config.path.replace(lastParam, "")
        routeMap = { pid: keys[0].name, id: keys[1].name }
        routes.push(...createRouteDecorators(keys[1].name.toString()))
    }
    // copy @route.ignore() on entity to the controller to control route generation
    const meta = reflect(parentType)
    const relProp = meta.properties.find(x => x.name === relationProperty)!
    const entityDecorators = relProp.decorators
    const decorators = copyDecorators(entityDecorators, controller)
    const inverseProperty = entityDecorators.find((x:RelationDecorator):x is RelationDecorator => x.kind === "plumier-meta:relation")?.inverseProperty!
    Reflect.decorate([
        ...decorators,
        ...routes,
        route.root(routePath, { map: routeMap }),
        // re-assign oneToMany decorator which will be used on OneToManyController constructor
        decorateClass(<RelationPropertyDecorator>{ kind: "plumier-meta:relation-prop-name", name: relationProperty, inverseProperty }),
        ignoreActions(config),
        entityProvider(parentType, "pid", { applyTo: ["list", "save"] }),
        entityProvider(entity, "id", { applyTo: ["get", "modify", "replace", "delete"] }),
        ...authorizeActions(config),
        ...decorateTransformers(config),
        ...decorateCustomQuery(config)
    ], Controller)
    if (!relProp.decorators.some((x: ApiTagDecorator) => x.kind === "ApiTag"))
        Reflect.decorate([api.tag(parentType.name)], Controller)
    return Controller
}

function createEntityController(type: Class, genericControllers: GenericController, nameConversion: (x: string) => string) {
    const meta = reflect(type)
    const controllers = []
    // basic generic controller
    const decorators = meta.decorators.filter((x: GenericControllerDecorator): x is GenericControllerDecorator => x.name === "plumier-meta:controller")
    for (const decorator of decorators) {
        const config = getControllerBuilderFromConfig(decorator.config)
        if (!!config.parent) {
            const ctl = createOneToManyGenericController(config.parent, config, type, config.relation!, genericControllers[1], nameConversion)
            controllers.push(ctl)
        }
        else {
            const ctl = createGenericController(type, config, genericControllers[0], nameConversion)
            controllers.push(ctl)
        }
    }
    return controllers
}

function createRelationController(entity: Class, genericControllers: GenericController, nameConversion: (x: string) => string) {
    const meta = reflect(entity)
    const controllers = []
    // one to many controller on each relation property
    for (const prop of meta.properties) {
        const decorators = prop.decorators.filter((x: GenericControllerDecorator): x is GenericControllerDecorator => x.name === "plumier-meta:controller")
        for (const decorator of decorators) {
            if (!prop.type[0])
                throw new Error(errorMessage.GenericControllerMissingTypeInfo.format(`${meta.name}.${prop.name}`))
            const ctl = createOneToManyGenericController(entity, getControllerBuilderFromConfig(decorator.config), prop.type[0], prop.name, genericControllers[1], nameConversion)
            controllers.push(ctl)
        }
    }
    return controllers
}

function createGenericControllers(controller: Class, genericControllers: GenericController, nameConversion: (x: string) => string) {
    return [
        ...createEntityController(controller, genericControllers, nameConversion),
        ...createRelationController(controller, genericControllers, nameConversion)
    ]
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
    createGenericControllers, genericControllerRegistry, updateGenericControllerRegistry,
    getGenericControllerOneToOneRelations, ControllerBuilder,
    createGenericController, createOneToManyGenericController, getControllerBuilderFromConfig
}
