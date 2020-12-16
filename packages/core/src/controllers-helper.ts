import "./filter-parser"

import { Key, pathToRegexp } from "path-to-regexp"
import reflect, { decorateClass, DecoratorOptionId, generic } from "@plumier/reflect"

import { AuthorizeDecorator } from "./authorization"
import { Class, entityHelper } from "./common"
import { decorateRoute, responseTransformer, ResponseTransformer } from "./controllers"
import { api, ApiTagDecorator } from "./decorator/api"
import { authorize } from "./decorator/authorize"
import { entityProvider } from "./decorator/common"
import { entity, EntityIdDecorator, RelationDecorator } from "./decorator/entity"
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
type ActionName = "delete" | "list" | "get" | "modify" | "save" | "replace"

interface ActionConfig {
    authorize?: string[]
    ignore?: true
    transformer?: { target: Class, fn: ResponseTransformer }
}

type ActionConfigMap = Map<ActionName, ActionConfig>

interface GenericControllerConfig {
    path?: string
    map: ActionConfigMap
    actions(): ActionName[]
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
    public parent?:Class
    public relation?:string
    private path?: string
    private map: ActionConfigMap = new Map()
    setPath(path: string): ControllerBuilder {
        this.path = path
        return this
    }
    useNested<T>(parent:Class<T>, relation: keyof T){
        this.parent = parent
        this.relation = relation as string
        return this
    }
    actions(...notations: ActionNotation[]) {
        return new ActionsBuilder(this.map, notations.map(x => getActionName(x)))
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
        return new TransformableActionBuilder(this.map, ["get"])
    }
    getMany() {
        return new TransformableActionBuilder(this.map, ["list"])
    }
    mutators() {
        return new ActionsBuilder(this.map, ["delete", "modify", "save", "replace"])
    }
    accessors() {
        return new TransformableActionBuilder(this.map, ["list", "get"])
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
    constructor(private actions: ActionConfigMap, protected names: ActionName[]) {
        this.setConfig(names, {})
    }

    protected setConfig(names: ActionName[], config: ActionConfig) {
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

class TransformableActionBuilder extends ActionsBuilder {
    transformer<T>(target: Class<T>, fn: ResponseTransformer<any, T>) {
        this.setConfig(this.names, { transformer: { target, fn } })
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
        ...decorateTransformers(config)
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
    Reflect.decorate([
        ...decorators,
        ...routes,
        route.root(routePath, { map: routeMap }),
        // re-assign oneToMany decorator which will be used on OneToManyController constructor
        decorateClass(<RelationPropertyDecorator>{ kind: "plumier-meta:relation-prop-name", name: relationProperty }),
        ignoreActions(config),
        entityProvider(parentType, "pid", { applyTo: ["list", "save"] }),
        entityProvider(entity, "id", { applyTo: ["get", "modify", "replace", "delete"] }),
        ...authorizeActions(config),
        ...decorateTransformers(config)
    ], Controller)
    if (!relProp.decorators.some((x: ApiTagDecorator) => x.kind === "ApiTag"))
        Reflect.decorate([api.tag(parentType.name)], Controller)
    return Controller
}

function createGenericControllers(controller: Class, genericControllers: GenericController, nameConversion: (x: string) => string) {
    const meta = reflect(controller)
    const controllers = []
    // basic generic controller
    const basicDecorator = meta.decorators.find((x: GenericControllerDecorator): x is GenericControllerDecorator => x.name === "plumier-meta:controller")
    if (basicDecorator) {
        const config = getControllerBuilderFromConfig(basicDecorator.config)
        if(!!config.parent){
            const ctl = createOneToManyGenericController(config.parent, config, controller, config.relation!, genericControllers[1], nameConversion)
            controllers.push(ctl)
        }
        else {
            const ctl = createGenericController(controller, config, genericControllers[0], nameConversion)
            controllers.push(ctl)
        }
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
        const ctl = createOneToManyGenericController(controller, getControllerBuilderFromConfig(relation.decorator.config), relation.type, relation.name, genericControllers[1], nameConversion)
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
    createGenericControllers, genericControllerRegistry, updateGenericControllerRegistry,
    getGenericControllerOneToOneRelations, ControllerBuilder,
    createGenericController, createOneToManyGenericController, getControllerBuilderFromConfig
}
