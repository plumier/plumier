import "@plumier/core"
import {
    api, ApiTagDecorator, authorize, AuthorizeDecorator, Class, ControllerGeneric, ControllerTransformOption, entityHelper, entityProvider, errorMessage,
    IgnoreDecorator, OneToManyControllerGeneric, RelationDecorator, RelationPropertyDecorator, responseType, route
} from "@plumier/core"
import reflect, { decorateClass, DecoratorOptionId, generic } from "@plumier/reflect"
import { Key, pathToRegexp } from "path-to-regexp"
import { ControllerBuilder, GenericControllerConfig } from "./configuration"
import {
    decorateRoute,
    GetManyCustomQueryDecorator,
    GetOneCustomQueryDecorator,
    responseTransformer
} from "./controllers"

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

function createGenericControllerType(entity: Class, builder: ControllerBuilder, controller: Class<ControllerGeneric>, nameConversion: (x: string) => string) {
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
        Reflect.decorate([api.tag(nameConversion(entity.name))], Controller)
    return Controller
}

function createOneToManyGenericControllerType(parentType: Class, builder: ControllerBuilder, entity: Class, relationProperty: string, controller: Class<OneToManyControllerGeneric>, nameConversion: (x: string) => string) {
    const meta = reflect(parentType)
    const relProp = meta.properties.find(x => x.name === relationProperty)!
    if (relProp.type === Array && !relProp.type[0])
        throw new Error(errorMessage.GenericControllerMissingTypeInfo.format(`${parentType.name}.${relationProperty}`))
    if (!Array.isArray(relProp.type))
        throw new Error(errorMessage.GenericControllerInNonArrayProperty.format(parentType.name, relationProperty))
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
    const entityDecorators = relProp.decorators
    const decorators = copyDecorators(entityDecorators, controller)
    const inverseProperty = entityDecorators.find((x: RelationDecorator): x is RelationDecorator => x.kind === "plumier-meta:relation")?.inverseProperty!
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
    if (!relProp.decorators.some((x: ApiTagDecorator) => x.kind === "ApiTag")) {
        const parent = nameConversion(parentType.name)
        const child = nameConversion(entity.name)
        Reflect.decorate([api.tag(`${parent} ${child}`)], Controller)
    }
    return Controller
}

export {
    genericControllerRegistry, updateGenericControllerRegistry,
    createGenericControllerType, createOneToManyGenericControllerType,
}

