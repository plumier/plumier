import Koa, { Context } from "koa"
import { ClassReflection, MethodReflection } from "tinspector"
import { VisitorExtension } from "typedconverter"

import { Class } from "./common"
import { HttpStatus } from "./http-status"
import { SetOption } from 'cookies'

// --------------------------------------------------------------------- //
// --------------------------- ACTION RESULT --------------------------- //
// --------------------------------------------------------------------- //

export class ActionResult {
    static fromContext(ctx: Context) {
        return new ActionResult(ctx.body, ctx.status)
    }
    private readonly headers: { [key: string]: string | string[] } = {}
    private readonly cookies: { key: string, value?: string, option?: SetOption }[] = []
    constructor(public body?: any, public status?: number) { }

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
// ----------------------------- INVOCATION ---------------------------- //
// --------------------------------------------------------------------- //

export interface Invocation {
    context: Readonly<Context>
    proceed(): Promise<ActionResult>
}

// --------------------------------------------------------------------- //
// ------------------------ KOA CONTEXT AUGMENT ------------------------ //
// --------------------------------------------------------------------- //

declare module "koa" {
    interface Context {
        route?: Readonly<RouteInfo>,
        config: Readonly<Configuration>,
        parameters?: any[]
    }
}


export interface RouteContext extends Context {
    route: Readonly<RouteInfo>,
    parameters: any[]
}

// --------------------------------------------------------------------- //
// ----------------------------- MIDDLEWARE ---------------------------- //
// --------------------------------------------------------------------- //


export type KoaMiddleware = (ctx: Context, next: () => Promise<void>) => Promise<any>
export interface MiddlewareDecorator { name: "Middleware", value: Middleware[] }

export interface Middleware {
    execute(invocation: Readonly<Invocation>): Promise<ActionResult>
}

export namespace MiddlewareUtil {
    export function fromKoa(middleware: KoaMiddleware): Middleware {
        return {
            execute: async x => {
                await middleware(x.context, async () => {
                    const nextResult = await x.proceed()
                    await nextResult.execute(x.context)
                })
                return ActionResult.fromContext(x.context)
            }
        }
    }
    export function extractDecorators(route: RouteInfo): Middleware[] {
        const middlewares: Middleware[] = []
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


export interface DependencyResolver {
    resolve(type: (new (...args: any[]) => any)): any
}

// --------------------------------------------------------------------- //
// ---------------------------- APPLICATION ---------------------------- //
// --------------------------------------------------------------------- //



export interface Application {
    /**
     * Use Koa middleware
    ```
    use(KoaBodyParser())
    ```
     * Use inline Koa middleware
    ```
    use(async (ctx, next) => { })
    ```
     */
    use(middleware: KoaMiddleware): Application

    /**
     * Use plumier middleware by class instance inherited from Middleware
    ```
    use(new MyMiddleware())
    ```
     * Use plumier middleware by inline object
    ```
    use({ execute: x => x.proceed()})
    use({ execute: async x => {
        return new ActionResult({ json: "body" }, 200)
    })
    ```
     */

    use(middleware: Middleware): Application

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
    validator: ValidatorFunction,
}

export interface ValidatorInfo {
    name: string,
    route: RouteInfo,
    ctx: Context,
    parent?: { value: any, type: Class, decorators: any[] }
}

export interface AsyncValidatorResult {
    path: string,
    messages: string[]
}

export type ValidatorFunction = (value: any, info: ValidatorInfo) => Promise<AsyncValidatorResult[] | string | undefined>
export type ValidatorStore = { [key: string]: ValidatorFunction }



// --------------------------------------------------------------------- //
// --------------------------- AUTHORIZATION --------------------------- //
// --------------------------------------------------------------------- //


export type AuthorizeStore = { [key: string]: (info: AuthorizeMetadataInfo) => Promise<boolean> }

export interface AuthorizeMetadataInfo {
    role: string[]
    user: any
    ctx: RouteContext
    route: RouteInfo
    parameters: any[]
    value?: any
}


// --------------------------------------------------------------------- //
// ----------------------------- MULTIPART ----------------------------- //
// --------------------------------------------------------------------- //

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
     * Key-value pair to store validator logic. Separate decorator and validation logic
     */
    validators?: ValidatorStore

    /**
     * Key-value pair to store authorization logic. Separate decorator and authorization logic
     */
    authorizer?: AuthorizeStore
}

export interface PlumierConfiguration extends Configuration {
    middleware: Middleware[]
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

    //PLUM2XXX internal app error
    export const UnableToInstantiateModel = `PLUM2000: Unable to instantiate {0}. Domain model should not throw error inside constructor`

    //End user error (no error code)
    export const UnableToConvertValue = `Unable to convert "{0}" into {1}`
    export const FileSizeExceeded = "File {0} size exceeded the maximum size"
    export const NumberOfFilesExceeded = "Number of files exceeded the maximum allowed"
}
