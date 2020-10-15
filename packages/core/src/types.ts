import { SetOption } from "cookies"
import { copyFile } from "fs"
import { Server } from "http"
import Koa, { Context } from "koa"
import { extname, join } from "path"
import reflect, {
    ClassReflection,
    decorateClass,
    MethodReflection,
    ParameterReflection,
    PropertyReflection,
} from "tinspector"
import { Result, VisitorExtension, VisitorInvocation } from "typedconverter"
import { promisify } from "util"

import { RoleField } from "./authorization"
import { Class } from "./common"
import { HttpStatus } from "./http-status"

const copyFileAsync = promisify(copyFile)

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// --------------------------------------------------------------------- //
// --------------------------- ACTION RESULT --------------------------- //
// --------------------------------------------------------------------- //

export interface HttpCookie {
    key: string, value?: string, option?: SetOption
}

export class ActionResult {
    headers: { [key: string]: string | string[] } = {}
    cookies: { key: string, value?: string, option?: SetOption }[] = []
    constructor(public body?: any, public status?: number) { }

    static fromContext(ctx: Context) {
        return new ActionResult(ctx.body, ctx.status)
    }

    setHeader(key: string, value: string | string[]) {
        this.headers[key] = value;
        return this
    }

    setStatus(status: number) {
        this.status = status
        return this
    }

    setCookie(cookie: HttpCookie): this
    setCookie(cookie: HttpCookie[]): this
    setCookie(key: string, value?: string, option?: SetOption): this
    setCookie(key: string | HttpCookie | HttpCookie[], value?: string, option?: SetOption) {
        if (typeof key === "string")
            this.cookies.push({ key, value, option })
        else if (Array.isArray(key)) {
            key.forEach(x => this.cookies.push(x))
        }
        else
            this.cookies.push(key)
        return this
    }

    async execute(ctx: Context): Promise<void> {
        Object.keys(this.headers).forEach(x => {
            ctx.set(x, this.headers[x])
        })
        if (this.status)
            ctx.status = this.status
        for (const cookie of this.cookies) {
            if (!cookie.value)
                ctx.cookies.set(cookie.key)
            else
                ctx.cookies.set(cookie.key, cookie.value, cookie.option)
        }
        if (this.body)
            ctx.body = this.body
    }
}

export class RedirectActionResult extends ActionResult {
    constructor(public path: string) { super() }

    async execute(ctx: Context): Promise<void> {
        ctx.redirect(this.path)
    }
}

// --------------------------------------------------------------------- //
// ----------------------------- ROUTE INFO ---------------------------- //
// --------------------------------------------------------------------- //

export type HttpMethod = "post" | "get" | "put" | "delete" | "patch" | "head" | "trace" | "options"

export type RouteMetadata = RouteInfo | VirtualRoute

export interface RouteInfo {
    kind: "ActionRoute"
    group?: string
    url: string
    method: HttpMethod
    action: MethodReflection
    controller: ClassReflection
    access?: string,
    paramMapper: { alias: (name: string) => string }
}

export interface VirtualRoute {
    kind: "VirtualRoute"
    group?: string
    url: string
    method: HttpMethod
    provider: Class
    access?: string
    openApiOperation?: any
}

export interface RouteAnalyzerIssue { type: "error" | "warning" | "success", message?: string }
export type RouteAnalyzerFunction = (route: RouteMetadata, allRoutes: RouteMetadata[]) => RouteAnalyzerIssue[]

// --------------------------------------------------------------------- //
// ------------------------------ FACILITY ----------------------------- //
// --------------------------------------------------------------------- //

export interface Facility {
    generateRoutes(app: Readonly<PlumierApplication>): Promise<RouteMetadata[]>
    setup(app: Readonly<PlumierApplication>): void
    preInitialize(app: Readonly<PlumierApplication>): Promise<void>
    initialize(app: Readonly<PlumierApplication>, routes: RouteMetadata[]): Promise<void>
}

export class DefaultFacility implements Facility {
    async generateRoutes(app: Readonly<PlumierApplication>): Promise<RouteMetadata[]> { return [] }
    setup(app: Readonly<PlumierApplication>): void { }
    async preInitialize(app: Readonly<PlumierApplication>) { }
    async initialize(app: Readonly<PlumierApplication>, routes: RouteMetadata[]) { }
}


// --------------------------------------------------------------------- //
// ------------------------ KOA CONTEXT AUGMENT ------------------------ //
// --------------------------------------------------------------------- //

declare module "koa" {
    interface Context {
        route?: Readonly<RouteInfo>
        routes: RouteInfo[]
        config: Readonly<Configuration>
    }

    interface Request {
        addQuery(query: any): void
    }

    interface DefaultState {
        caller: "system" | "invoke"
    }
}

export interface ActionContext extends Context {
    route: Readonly<RouteInfo>,
    parameters: any[]
}

// --------------------------------------------------------------------- //
// ----------------------------- MIDDLEWARE ---------------------------- //
// --------------------------------------------------------------------- //

export type KoaMiddleware = (ctx: Context, next: () => Promise<void>) => Promise<any>

export interface MiddlewareDecorator { name: "Middleware", value: (string | symbol | MiddlewareFunction | Middleware)[], target: "Controller" | "Action" }

export interface Invocation<T = Context> {
    ctx: Readonly<T>
    metadata?: T extends ActionContext ? Metadata : GlobalMetadata
    proceed(): Promise<ActionResult>
}

export interface ActionInvocation extends Invocation<ActionContext> {
    metadata: Metadata
}

export type MiddlewareFunction<T = Context> = (invocation: T extends ActionContext ? Readonly<ActionInvocation> : Readonly<Invocation>) => Promise<ActionResult>

export interface Middleware<T = Context> {
    execute(invocation: Readonly<Invocation<T>>): Promise<ActionResult>
}

export type CustomMiddleware = Middleware
export type CustomMiddlewareFunction = MiddlewareFunction
export type MiddlewareType = string | symbol | MiddlewareFunction | Middleware
export interface MiddlewareMeta<T = MiddlewareType> { middleware: T, target?: "Controller" | "Action" }

export namespace MiddlewareUtil {
    export function fromKoa(middleware: KoaMiddleware): Middleware {
        return {
            execute: async x => {
                await middleware(x.ctx, async () => {
                    const nextResult = await x.proceed()
                    await nextResult.execute(x.ctx)
                })
                return ActionResult.fromContext(x.ctx)
            }
        }
    }
    export function extractDecorators(route: RouteInfo) {
        const middlewares: MiddlewareMeta[] = []
        for (let i = route.controller.decorators.length; i--;) {
            const dec: MiddlewareDecorator = route.controller.decorators[i];
            if (dec.name === "Middleware")
                middlewares.push(...dec.value.map(middleware => ({ middleware, target: dec.target })))
        }
        for (let i = route.action.decorators.length; i--;) {
            const dec: MiddlewareDecorator = route.action.decorators[i];
            if (dec.name === "Middleware")
                middlewares.push(...dec.value.map(middleware => ({ middleware, target: dec.target })))
        }
        return middlewares
    }
}


// --------------------------------------------------------------------- //
// ------------------------ DEPENDENCY RESOLVER ------------------------ //
// --------------------------------------------------------------------- //

interface RegistryDecorator { type: "RegistryDecorator", id: string | symbol }

export interface DependencyResolver {
    resolve(type: Class | string | symbol): any
}

export class DefaultDependencyResolver implements DependencyResolver {
    private readonly registry = new Map<string | symbol, Class>()

    register(id: string | symbol) {
        return decorateClass(cls => {
            this.registry.set(id, cls)
            return <RegistryDecorator>{ type: "RegistryDecorator", id }
        })
    }

    resolve(type: Class | string | symbol) {
        if (typeof type === "function") {
            return new type()
        }
        else {
            const Type = this.registry.get(type)
            if (!Type) throw new Error(errorMessage.ObjectNotFound.format(type))
            return new Type()
        }
    }
}

// --------------------------------------------------------------------- //
// ---------------------------- APPLICATION ---------------------------- //
// --------------------------------------------------------------------- //


export interface Application {
    /**
     * Use plumier middleware registered from the registry
    ```
    use("myMiddleware")
    ```
     */

    use(middleware: string | symbol, scope?: "Global" | "Action"): Application

    /**
     * Use plumier middleware 
    ```
    use(new MyMiddleware())
    ```
     */

    use(middleware: Middleware, scope?: "Global" | "Action"): Application

    /**
     * Use plumier middleware 
    ```
    use(x => x.proceed())
    use(async x => {
        return new ActionResult({ json: "body" }, 200)
    })
    ```
     */

    use(middleware: MiddlewareFunction, scope?: "Global" | "Action"): Application

    /**
     * Set facility (advanced configuration)
    ```
    set(new WebApiFacility())
    ```
     */
    set(facility: Facility): Application

    /**
     * Set part of configuration
    ```
    set({ controllerPath: "./my-controller" })
    ```
     * Can be specified more than one configuration
    ```
    set({ mode: "production", rootPath: __dirname })
    ```
     */
    set(config: Partial<Configuration>): Application

    /**
     * Initialize Plumier app and return Koa application
    ```
    app.initialize().then(koa => koa.listen(8000))
    ```
     * For testing purposes
    ```
    const koa = await app.initialize()
    supertest(koa.callback())
    ```
     */
    initialize(): Promise<Koa>


    /**
     * Initialize Plumier and listen immediately to specific port. 
     */
    listen(port?: number | string): Promise<Server>
}

export interface PlumierApplication extends Application {
    readonly koa: Koa,
    readonly config: Readonly<PlumierConfiguration>
}

// --------------------------------------------------------------------- //
// ----------------------------- MULTIPART ----------------------------- //
// --------------------------------------------------------------------- //

@reflect.parameterProperties()
export class FormFile {
    constructor(
        public size: number,
        public path: string,
        public name: string,
        public type: string,
        public mtime?: string,
    ) { }

    /**
     * Copy uploaded file into target directory, file name automatically generated
     * @param dir target directory
     * @returns the full path of the new location { fullPath, name }
     */
    async copy(dir: string) {
        const random = Math.round((Math.random() * 10000)).toString(36)
        const time = new Date().getTime().toString(36)
        const name = time + random + extname(this.name)
        const fullPath = join(dir, name)
        await copyFileAsync(this.path, fullPath)
        return { fullPath, name }
    }
}

// --------------------------------------------------------------------- //
// ------------------------- GENERIC CONTROLLER ------------------------ //
// --------------------------------------------------------------------- //

export type FilterQueryType = "equal" | "partial" | "range" | "gte" | "gt" | "lte" | "lt" | "ne"

export interface RelationPropertyDecorator { kind: "plumier-meta:relation-prop-name", name: string }

export type GenericController = [Class<ControllerGeneric>, Class<OneToManyControllerGeneric>]

export interface OrderQuery { column: string, order: 1 | -1 }

export interface FilterQuery { type: FilterQueryType, partial?: "start" | "end" | "both", value: any }

export type FilterEntity<T = any> = { [k in keyof T]: FilterQuery }

export interface Repository<T> {
    find(offset: number, limit: number, query: FilterEntity<T>, select: string[], order: OrderQuery[]): Promise<T[]>
    insert(data: Partial<T>): Promise<{ id: any }>
    findById(id: any, select: string[]): Promise<T | undefined>
    update(id: any, data: Partial<T>): Promise<{ id: any }>
    delete(id: any): Promise<{ id: any }>
}

export interface OneToManyRepository<P, T> {
    find(pid: any, offset: number, limit: number, query: FilterEntity<T>, select: string[], order: OrderQuery[]): Promise<T[]>
    insert(pid: any, data: Partial<T>): Promise<{ id: any }>
    findParentById(id: any): Promise<P | undefined>
    findById(id: any, select: string[]): Promise<T | undefined>
    update(id: any, data: Partial<T>): Promise<{ id: any }>
    delete(id: any): Promise<{ id: any }>
}

export abstract class ControllerGeneric<T = any, TID = any> {
    abstract readonly entityType: Class<T>
}

export abstract class OneToManyControllerGeneric<P = any, T = any, PID = any, TID = any> {
    abstract readonly entityType: Class<T>
    abstract readonly parentEntityType: Class<P>
    abstract readonly relation: string
}

// --------------------------------------------------------------------- //
// --------------------------- CONFIGURATION --------------------------- //
// --------------------------------------------------------------------- //

export type CustomConverter = (next:VisitorInvocation, ctx: ActionContext) => Result

export interface Configuration {
    mode: "debug" | "production"

    /**
     * List of registered global middlewares
     */
    middlewares: { middleware: (string | symbol | MiddlewareFunction | Middleware), scope: "Global" | "Action" }[]

    /**
     * Specify controller path (absolute or relative to entry point) or the controller classes array.
     */
    controller: string | string[] | Class[] | Class

    /**
     * Set custom dependency resolver for dependency injection
     */
    dependencyResolver: DependencyResolver,

    /**
     * Define default response status for method type get/post/put/delete, default 200
    ```
    responseStatus: { post: 201, put: 204, delete: 204 }
    ```
    */
    responseStatus?: Partial<{ [key in HttpMethod]: number }>

    /**
     * Set type converter visitor provided by typedconverter
     */
    typeConverterVisitors: CustomConverter[],


    /**
     * Set custom route analyser functions
     */
    analyzers?: RouteAnalyzerFunction[],

    /**
     * Role field / function used to specify current login user role inside JWT claim for authorization
     */
    roleField: RoleField,


    /**
     * Global authorization decorators, use mergeDecorator for multiple
     */
    globalAuthorizationDecorators?: (...args: any[]) => void

    /**
     * Enable/disable authorization, when enabled all routes will be private by default. Default false
     */
    enableAuthorization: boolean,

    /**
     * Root directory of the application, usually __dirname
     */
    rootDir: string

    /**
     * Trust proxy headers such as X-Forwarded-For, X-Forwarded-Proto, X-Forwarded-Host and use its value 
     * to appropriate request properties: ip, protocol, host
     */
    trustProxyHeader: boolean

    /**
     * Implementation of generic controllers, first tuple for simple controller, second tuple for one to many controller
     */
    genericController?: GenericController

    /**
     * Generic controller name conversion to make plural route
     */

    genericControllerNameConversion?: (x: string) => string
}

export interface PlumierConfiguration extends Configuration {
    facilities: Facility[]
}

// --------------------------------------------------------------------- //
// ------------------------------- ERROR ------------------------------- //
// --------------------------------------------------------------------- //


export class HttpStatusError extends Error {
    constructor(public status: HttpStatus, message?: string) {
        super(message)
        Object.setPrototypeOf(this, HttpStatusError.prototype);
    }
}

export class ValidationError extends HttpStatusError {
    constructor(public issues: { path: string[], messages: string[] }[]) {
        super(HttpStatus.UnprocessableEntity, JSON.stringify(issues))
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

// --------------------------------------------------------------------- //
// -------------------------------- META ------------------------------- //
// --------------------------------------------------------------------- //


export type CurrentMetadataType = (PropertyReflection | ParameterReflection | MethodReflection | ClassReflection) & { parent?: Class }
export interface Metadata {
    controller: ClassReflection
    action: MethodReflection
    access?: string
    actionParams: ParameterMetadata
    current?: CurrentMetadataType
}

export type GlobalMetadata = Omit<Metadata, "actionParams">

export class ParameterMetadata {
    constructor(private parameters: any[], private meta: ParameterReflection[]) { }

    /**
     * Get action parameter value by index
     * @param index index of parameter
     */
    get<T = any>(index: number): T | undefined

    /**
     * Get action parameter value by parameter name (case insensitive)
     */
    get<T = any>(name: string): T | undefined
    get(nameOrIndex: string | number) {
        if (typeof nameOrIndex === "number") return this.parameters[nameOrIndex]
        const idx = this.meta.findIndex(x => x.name.toLowerCase() === nameOrIndex.toLowerCase())
        if (idx === -1) return
        return this.parameters[idx]
    }

    /**
     * Get all parameter values
     */
    values() { return this.parameters }

    /**
     * Get all action's parameter names
     */
    names() { return this.meta.map(x => x.name) }

    /**
     * Check if action has specified parameter (case insensitive)
     * @param name name of parameter 
     */
    hasName(name: string) {
        return !!this.meta.find(x => x.name.toLowerCase() === name.toLowerCase())
    }
}

export class MetadataImpl {
    /**
     * Controller metadata object graph
     */
    controller: ClassReflection

    /**
     * Action metadata object graph
     */
    action: MethodReflection

    /**
     * Current action authorization access visible on route analysis, for example Public, Authenticated, Admin, User etc
     */
    access?: string

    /**
     * Action's parameters metadata, contains access to parameter values, parameter names etc. 
     * This property not available on Custom Parameter Binder and Global Middleware
     */
    actionParams?: ParameterMetadata

    /**
     * Metadata information where target (Validator/Authorizer/Middleware) applied, can be a Property, Parameter, Method, Class. 
     */
    current?: CurrentMetadataType

    constructor(params: any[] | undefined, routeInfo: RouteInfo, current?: CurrentMetadataType) {
        this.controller = routeInfo.controller
        this.action = routeInfo.action
        this.access = routeInfo.access
        if (params)
            this.actionParams = new ParameterMetadata(params, routeInfo.action.parameters)
        this.current = current
    }
}



// --------------------------------------------------------------------- //
// --------------------------- ERROR MESSAGE --------------------------- //
// --------------------------------------------------------------------- //

export namespace errorMessage {
    //PLUM1XXX User configuration error
    export const RouteDoesNotHaveBackingParam = "PLUM1000: Route parameters ({0}) doesn't have appropriate backing parameter"
    export const DuplicateRouteFound = "PLUM1001: Duplicate route found in {0}"
    export const ControllerPathNotFound = "PLUM1002: Controller file or directory {0} not found"
    export const ObjectNotFound = "PLUM1003: Object with id {0} not found in Object registry"

    export const ActionParameterDoesNotHaveTypeInfo = "PLUM1004: Parameter binding skipped because action parameters doesn't have type information in ({0})"
    export const ModelWithoutTypeInformation = "PLUM1005: Parameter binding skipped because {0} doesn't have type information on its properties"
    export const ArrayWithoutTypeInformation = "PLUM1006: Parameter binding skipped because array element doesn't have type information in ({0})"
    export const PublicNotInParameter = "PLUM1007: @authorize.public() can not be applied to parameter"
    export const PropertyWithoutTypeInformation = "PLUM1008: Parameter binding skipped because property doesn't have type information in ({0})"
    export const GenericControllerImplementationNotFound = "PLUM1009: Generic controller implementation not installed"
    export const GenericControllerMissingTypeInfo = "PLUM1010: {0} marked with @route.controller() but doesn't have type information"
    export const CustomRouteEndWithParameter = "PLUM1011: Custom route path '{0}' on {1} entity, require path that ends with route parameter, example: animals/:animalId"
    export const CustomRouteRequiredTwoParameters = "PLUM1012: Nested custom route path '{0}' on {1} entity, must have two route parameters, example: users/:userId/animals/:animalId"
    export const CustomRouteMustHaveOneParameter = "PLUM1013: Custom route path '{0}' on {1} entity, must have one route parameter, example: animals/:animalId"


    //PLUM2XXX internal app error
    export const UnableToInstantiateModel = `PLUM2000: Unable to instantiate {0}. Domain model should not throw error inside constructor`

    //End user error (no error code)
    export const UnableToConvertValue = `Unable to convert "{0}" into {1}`
    export const FileSizeExceeded = "File {0} size exceeded the maximum size"
    export const NumberOfFilesExceeded = "Number of files exceeded the maximum allowed"
}
