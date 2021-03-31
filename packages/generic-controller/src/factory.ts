import "@plumier/core"
import {
    api, authorize, Class, ControllerGeneric, entityHelper, entityProvider, errorMessage,
    GenericControllers,
    KeyOf, OneToManyControllerGeneric, RelationDecorator, RelationPropertyDecorator, responseType, route
} from "@plumier/core"
import reflect, { decorateClass, generic } from "@plumier/reflect"
import { Key, pathToRegexp } from "path-to-regexp"
import { ControllerBuilder, GenericControllerConfiguration, GenericControllerOptions } from "./configuration"
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


function splitPath(path: string): [string, string] {
    const idx = path.lastIndexOf("/")
    const root = path.substring(0, idx)
    const id = path.substring(idx + 2)
    return [root, id]
}

function createRouteDecorators(path: string, map: { pid?: string, id: string }) {
    const [root, id] = splitPath(path)!
    return [
        route.root(root, { map }),
        decorateRoute("post", "", { applyTo: "save" }),
        decorateRoute("get", "", { applyTo: "list" }),
        decorateRoute("get", `:${id}`, { applyTo: "get" }),
        decorateRoute("put", `:${id}`, { applyTo: "replace" }),
        decorateRoute("patch", `:${id}`, { applyTo: "modify" }),
        decorateRoute("delete", `:${id}`, { applyTo: "delete" }),
    ]
}

function ignoreActions(config: GenericControllerOptions): ((...args: any[]) => void) {
    const actions = config.actions()
    const applyTo = actions.filter(x => !!config.map.get(x)?.ignore)
    if (applyTo.length === 0) return (...args: any[]) => { }
    return route.ignore({ applyTo })
}

function authorizeActions(config: GenericControllerOptions) {
    const actions = config.actions()
    const result = []
    for (const action of actions) {
        const opt = config.map.get(action)
        if (!opt || !opt.authorize) continue
        result.push(authorize.custom(opt.authorize, { access: "route", applyTo: action, tag: opt.authorize.join("|") }))
    }
    return result
}

function validatePath(path: string, entity: Class, oneToMany = false) {
    if(!path.match(/\/:\w*$/))
        throw new Error(errorMessage.CustomRouteEndWithParameter.format(path, entity.name))
    const keys: Key[] = []
    pathToRegexp(path, keys)
    if (!oneToMany && keys.length > 1)
        throw new Error(errorMessage.CustomRouteMustHaveOneParameter.format(path, entity.name))
    if (oneToMany && (keys.length != 2))
        throw new Error(errorMessage.CustomRouteRequiredTwoParameters.format(path, entity.name))
    return oneToMany ? { pid: keys[0].name.toString(), id: keys[1].name.toString() } : { pid: "", id: keys[0].name.toString() }
}

function decorateTransformers(config: GenericControllerOptions) {
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

function decorateCustomQuery(config: GenericControllerOptions) {
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
    const Controller = generic.create({ extends: controller, name: controller.name }, entity, idType)
    let path = config.path ?? `${nameConversion(entity.name)}/:id`
    const map = validatePath(path, entity)
    Reflect.decorate([
        ...createRouteDecorators(path, map),
        entityProvider(entity, "id", { applyTo: ["get", "modify", "replace", "delete"] }),
        ignoreActions(config),
        ...authorizeActions(config),
        ...decorateTransformers(config),
        ...decorateCustomQuery(config),
        api.tag(nameConversion(entity.name))
    ], Controller)
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
    const Controller = generic.create({ extends: controller, name: controller.name }, parentType, entity, parentIdType, idType)
    // add root decorator
    let path = config.path ?? `${nameConversion(parentType.name)}/:pid/${relationProperty}/:id`
    const map = validatePath(path, parentType, true)
    const entityDecorators = relProp.decorators
    const inverseProperty = entityDecorators.find((x: RelationDecorator): x is RelationDecorator => x.kind === "plumier-meta:relation")?.inverseProperty!
    Reflect.decorate([
        ...createRouteDecorators(path, map),
        // re-assign oneToMany decorator which will be used on OneToManyController constructor
        decorateClass(<RelationPropertyDecorator>{ kind: "plumier-meta:relation-prop-name", name: relationProperty, inverseProperty }),
        ignoreActions(config),
        entityProvider(parentType, "pid", { applyTo: ["list", "save"] }),
        entityProvider(entity, "id", { applyTo: ["get", "modify", "replace", "delete"] }),
        ...authorizeActions(config),
        ...decorateTransformers(config),
        ...decorateCustomQuery(config),
        api.tag(`${nameConversion(parentType.name)} ${nameConversion(entity.name)}`)
    ], Controller)
    return Controller
}


type EntityWithRelation<T = any> = [Class<T>, KeyOf<T>]

interface CreateGenericControllerOption {
    config?: GenericControllerConfiguration,
    controllers: GenericControllers
    normalize?: (entities: Class | EntityWithRelation) => void
    nameConversion: (x: string) => string
}

function createGenericController<T>(type: Class | EntityWithRelation<T>, option: CreateGenericControllerOption) {
    const builder = new ControllerBuilder()
    if (option.config) option.config(builder)
    if (option.normalize) option.normalize(type)
    if (Array.isArray(type)) {
        const [parentEntity, relation] = type
        const meta = reflect(parentEntity)
        const prop = meta.properties.find(x => x.name === relation)!
        const entity = prop.type[0] as Class
        return createOneToManyGenericControllerType(parentEntity, builder, entity, relation, option.controllers[1], option.nameConversion)
    }
    return createGenericControllerType(type, builder, option.controllers[0], option.nameConversion)
}

export {
    genericControllerRegistry, updateGenericControllerRegistry,
    createGenericController, CreateGenericControllerOption, EntityWithRelation,
    createGenericControllerType, createOneToManyGenericControllerType
}

