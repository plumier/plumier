import Koa, { Context } from "koa"
import { ClassReflection, MethodReflection, decorateClass } from "tinspector"
import { VisitorExtension } from "typedconverter"

import { Class } from "./common"
import { HttpStatus } from "./http-status"
import { SetOption } from 'cookies'
import { RoleField } from './authorization'

// --------------------------------------------------------------------- //
// --------------------------- ACTION RESULT --------------------------- //
// --------------------------------------------------------------------- //

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

    setCookie(key: string, value?: string, option?: SetOption) {
        this.cookies.push({ key, value, option })
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

export interface RouteInfo {
    url: string,
    method: HttpMethod
    action: MethodReflection
    controller: ClassReflection
    access?: string
}

export interface RouteAnalyzerIssue { type: "error" | "warning" | "success", message?: string }
export type RouteAnalyzerFunction = (route: RouteInfo, allRoutes: RouteInfo[]) => RouteAnalyzerIssue


// --------------------------------------------------------------------- //
// ------------------------------ FACILITY ----------------------------- //
// --------------------------------------------------------------------- //

export interface Facility {
    setup(app: Readonly<PlumierApplication>): void
    initialize(app: Readonly<PlumierApplication>, routes: RouteInfo[]): Promise<void>
}

export class DefaultFacility implements Facility {
    setup(app: Readonly<PlumierApplication>) { }
    async initialize(app: Readonly<PlumierApplication>, routes: RouteInfo[]) { }
}


// --------------------------------------------------------------------- //
// ------------------------ KOA CONTEXT AUGMENT ------------------------ //
// --------------------------------------------------------------------- //

declare module "koa" {
    interface Context {
        route?: Readonly<RouteInfo>,
        routes: RouteInfo[]
        config: Readonly<Configuration>
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

export interface MiddlewareDecorator { name: "Middleware", value: (string | symbol | MiddlewareFunction | Middleware)[] }

export interface Invocation<T = Context> {
    ctx: Readonly<T>
    proceed(): Promise<ActionResult>
}

export type MiddlewareFunction<T = Context> = (invocation: Readonly<Invocation<T>>) => Promise<ActionResult>

export interface Middleware<T = Context> {
    execute(invocation: Readonly<Invocation<T>>): Promise<ActionResult>
}

export type CustomMiddleware = Middleware
export type CustomMiddlewareFunction = MiddlewareFunction

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
    export function extractDecorators(route: RouteInfo): (string | symbol | MiddlewareFunction | Middleware)[] {
        const middlewares: (string | symbol | MiddlewareFunction | Middleware)[] = []
        for (let i = route.controller.decorators.length; i--;) {
            const dec: MiddlewareDecorator = route.controller.decorators[i];
            if (dec.name === "Middleware")
                middlewares.push(...dec.value)
        }
        for (let i = route.action.decorators.length; i--;) {
            const dec: MiddlewareDecorator = route.action.decorators[i];
            if (dec.name === "Middleware")
                middlewares.push(...dec.value)
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

    use(middleware: string | symbol): Application

    /**
     * Use plumier middleware 
    ```
    use(new MyMiddleware())
    ```
     */

    use(middleware: Middleware): Application

    /**
     * Use plumier middleware 
    ```
    use(x => x.proceed())
    use(async x => {
        return new ActionResult({ json: "body" }, 200)
    })
    ```
     */

    use(middleware: MiddlewareFunction): Application

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
}

export interface PlumierApplication extends Application {
    readonly koa: Koa,
    readonly config: Readonly<PlumierConfiguration>
}

// --------------------------------------------------------------------- //
// ----------------------------- VALIDATOR ----------------------------- //
// --------------------------------------------------------------------- //

export interface ValidatorDecorator {
    type: "ValidatorDecorator",
    validator: CustomValidatorFunction | string | symbol,
}

export interface ValidatorContext {
    name: string,
    ctx: ActionContext,
    parent?: { value: any, type: Class, decorators: any[] }
}

export interface AsyncValidatorResult {
    path: string,
    messages: string[]
}

export type CustomValidatorFunction = (value: any, info: ValidatorContext) => undefined | string | AsyncValidatorResult[] | Promise<AsyncValidatorResult[] | string | undefined>

export interface CustomValidator {
    validate(value: any, info: ValidatorContext): undefined | string | AsyncValidatorResult[] | Promise<AsyncValidatorResult[] | string | undefined>
}


// --------------------------------------------------------------------- //
// ----------------------------- MULTIPART ----------------------------- //
// --------------------------------------------------------------------- //

export interface FormFile {
    size:number
    path:string
    name:string
    type:string
    mtime?:string
}

export interface FileUploadInfo {
    field: string,
    fileName: string,
    originalName: string,
    mime: string,
    size: number,
    encoding: string
}

export interface FileParser {
    save(subDirectory?: string): Promise<FileUploadInfo[]>
}

// --------------------------------------------------------------------- //
// --------------------------- CONFIGURATION --------------------------- //
// --------------------------------------------------------------------- //


export interface Configuration {
    mode: "debug" | "production"

    /**
     * List of registered global middlewares
     */
    middlewares: (string | symbol | MiddlewareFunction | Middleware)[]

    /**
     * Specify controller path (absolute or relative to entry point) or the controller classes array.
     */
    controller: string | Class[] | Class

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
    typeConverterVisitors?: VisitorExtension[],


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
    rootDir:string
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
// --------------------------- ERROR MESSAGE --------------------------- //
// --------------------------------------------------------------------- //

export namespace errorMessage {
    //PLUM1XXX User configuration error
    export const RouteDoesNotHaveBackingParam = "PLUM1000: Route parameters ({0}) doesn't have appropriate backing parameter"
    export const ActionDoesNotHaveTypeInfo = "PLUM1001: Parameter binding skipped because action doesn't have @route decorator"
    export const DuplicateRouteFound = "PLUM1003: Duplicate route found in {0}"
    export const ControllerPathNotFound = "PLUM1004: Controller file or directory {0} not found"
    export const ModelWithoutTypeInformation = "PLUM1005: Parameter binding skipped because  {0} doesn't have @domain() decorator"
    export const ArrayWithoutTypeInformation = "PLUM1006: Parameter binding skipped because array field without @array() decorator found in ({0})"
    export const ModelNotFound = "PLUM1007: Domain model not found, no class decorated with @domain() on provided classes"
    export const ModelPathNotFound = "PLUM1007: Domain model not found, no class decorated with @domain() on path {0}"
    export const PublicNotInParameter = "PLUM1008: @authorize.public() can not be applied to parameter"
    export const ObjectNotFound = "PLUM1009: Object with id {0} not found in Object registry"

    //PLUM2XXX internal app error
    export const UnableToInstantiateModel = `PLUM2000: Unable to instantiate {0}. Domain model should not throw error inside constructor`

    //End user error (no error code)
    export const UnableToConvertValue = `Unable to convert "{0}" into {1}`
    export const FileSizeExceeded = "File {0} size exceeded the maximum size"
    export const NumberOfFilesExceeded = "Number of files exceeded the maximum allowed"
}
