import "@plumier/core"
import { Class } from "@plumier/core"
import {
    GetManyCustomQueryFunction,
    GetOneCustomQueryFunction,
    ResponseTransformer
} from "./controllers"


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
     * Use nested generic controller. Use this configuration when @genericController() applied on class decorator instead of on one to many relation
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

export {
    ControllerBuilder, GenericControllerConfig
}

