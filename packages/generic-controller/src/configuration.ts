import { api, ApiTagDecorator, authorize, Class, EntityRelationInfo, responseType, route } from "@plumier/core"
import reflect, { decorateClass } from "@plumier/reflect"

import { decorateRoute, ResponseTransformer, responseTransformer } from "./decorator"
import {
    GetManyCustomQueryDecorator,
    GetManyCustomQueryFunction,
    GetOneCustomQueryDecorator,
    GetOneCustomQueryFunction,
} from "./helper"


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

interface GenericControllerOptions {
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
     * Configure multiple generic controller actions based on their http method
     */
    methods(...notations: ActionNotation[]) {
        return new ActionsBuilder(this.map, notations.map(x => getActionName(x)))
    }

    /**
     * Configure multiple generic controller actions based on their name
     */
    actionNames(...names: string[]) {
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

    toObject(): GenericControllerOptions {
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

type GenericControllerConfiguration = (c: ControllerBuilder) => void

// --------------------------------------------------------------------- //
// ---------------------- CONFIGURATION DECORATORS --------------------- //
// --------------------------------------------------------------------- //



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


function decorateTagByClass(entity: Class, nameConversion: (x: string) => string) {
    const meta = reflect(entity)
    const tag = meta.decorators.find((x: ApiTagDecorator) => x.kind === "ApiTag")
    if (!tag)
        return api.tag(nameConversion(entity.name))
    return decorateClass(tag)
}

function decorateTagByRelation(info: EntityRelationInfo, nameConversion: (x: string) => string) {
    const meta = reflect(info.parent)
    const relProp = meta.properties.find(x => x.name === info.parentProperty || x.name === info.childProperty)
    if (relProp) {
        const tag = relProp.decorators.find((x: ApiTagDecorator) => x.kind === "ApiTag")
        if (tag) return decorateClass(tag)
    }
    const parent = nameConversion(info.parent.name)
    const child = nameConversion(info.child.name)
    return api.tag(`${parent} ${child}`)
}


export {
    ControllerBuilder, GenericControllerOptions, GenericControllerConfiguration,
    splitPath,
    createRouteDecorators,
    ignoreActions,
    authorizeActions,
    decorateTransformers,
    decorateCustomQuery, decorateTagByRelation, decorateTagByClass
}

