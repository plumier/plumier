import Koa, { Context, Request } from "koa"
import { ClassReflection, MethodReflection, ParameterReflection } from "tinspector"

import { HttpStatus } from "./http-status"
import { IncomingHttpHeaders } from 'http';


/* ------------------------------------------------------------------------------- */
/* ----------------------------------- TYPES ------------------------------------- */
/* ------------------------------------------------------------------------------- */

export type HttpMethod = "post" | "get" | "put" | "delete" | "patch" | "head" | "trace" | "options"
export type RequestPart = keyof Request
export type HeaderPart = keyof IncomingHttpHeaders
export type KoaMiddleware = (ctx: Context, next: () => Promise<void>) => Promise<any>
export type Class = new (...args: any[]) => any
export type ValidatorFunction = (value: string, ctx: Context) => Promise<string | undefined>
export type ValidatorStore = { [key: string]: ValidatorFunction }
export type AuthorizeStore = { [key: string]: (info: AuthorizeMetadataInfo) => Promise<boolean> }
export type ConverterFunction = (value: any, path: string[], expectedType: Function | Function[], converters: Converters) => any
export type TypeConverter = { type: Class, converter: ConverterFunction }
export type DefaultConverter = "Boolean" | "Number" | "Date" | "Object" | "Array"
export type AuthorizeCallback = (info: AuthorizeMetadataInfo, location: "Class" | "Parameter" | "Method") => Promise<boolean>
export type Converters = { 
    default: { [key in DefaultConverter]: ConverterFunction }, 
    converters: Map<Function, ConverterFunction> 
}
export interface MiddlewareDecorator { name: "Middleware", value: Middleware[] }

export interface RouteInfo {
    url: string,
    method: HttpMethod
    action: MethodReflection
    controller: ClassReflection
    access?: string
}

export enum ValidatorId {
    optional = "internal:optional",
    skip = "internal:skip"
}

export interface ValidatorDecorator {
    type: "ValidatorDecorator",
    validator: ValidatorFunction | string,
}

export interface BindingDecorator {
    type: "ParameterBinding",
    process: (ctx: Context) => any
}

export interface RouteDecorator { name: "Route", method: HttpMethod, url?: string }

export interface IgnoreDecorator { name: "Ignore" }

export interface RootDecorator { name: "Root", url: string }

export interface AuthorizeDecorator {
    type: "plumier-meta:authorize",
    authorize: string | ((info: AuthorizeMetadataInfo) => Promise<boolean>),
    tag: string
}

export interface AuthorizeMetadataInfo {
    role: string[]
    user: any
    ctx: Koa.Context
    route: RouteInfo
    parameters: any[]
    value?: any
}

export interface Invocation {
    context: Readonly<Context>
    proceed(): Promise<ActionResult>
}

export interface Middleware {
    execute(invocation: Readonly<Invocation>): Promise<ActionResult>
}

export interface Facility {
    setup(app: Readonly<PlumierApplication>): void
    initialize(app: Readonly<PlumierApplication>, routes:RouteInfo[]): Promise<void>
}

export interface DependencyResolver {
    resolve(type: (new (...args: any[]) => any)): any
}


export interface ValidationIssue {
    path: string[]
    messages: string[]
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
     * Set custom converters for parameter binding
    ```
    converters: {
        AnimalDto: (value:any, type:Function) => new AnimalDto(value)
    }
    ```
     */
    converters?: TypeConverter[],

    /**
     * Set custom validator
     */
    validator?: (value: any, metadata: ParameterReflection, context: Context, validators?: { [key: string]: ValidatorFunction }) => Promise<ValidationIssue[]>

    /**
     * Multi part form file parser implementation
     */
    fileParser?: (ctx: Context) => FileParser,

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

declare module "koa" {
    interface Context {
        route?: Readonly<RouteInfo>,
        config: Readonly<Configuration>,
        parameters?: any[]
    }
}

/* ------------------------------------------------------------------------------- */
/* -------------------------------- HELPERS -------------------------------------- */
/* ------------------------------------------------------------------------------- */

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
}



/* ------------------------------------------------------------------------------- */
/* -------------------------------- CLASSES -------------------------------------- */
/* ------------------------------------------------------------------------------- */


export class ActionResult {
    static fromContext(ctx: Context) {
        return new ActionResult(ctx.body, ctx.status)
    }
    private readonly headers: { [key: string]: string } = {}
    constructor(public body?: any, public status?: number) { }

    setHeader(key: string, value: string) {
        this.headers[key] = value;
        return this
    }

    setStatus(status: number) {
        this.status = status
        return this
    }

    async execute(ctx: Context): Promise<void> {
        Object.keys(this.headers).forEach(x => {
            ctx.set(x, this.headers[x])
        })
        if (this.body)
            ctx.body = this.body
        if (this.status)
            ctx.status = this.status
    }
}

export class HttpStatusError extends Error {
    constructor(public status: HttpStatus, message?: string) {
        super(message)
        Object.setPrototypeOf(this, HttpStatusError.prototype);
    }
}

export class ValidationError extends HttpStatusError {
    constructor(public issues: ValidationIssue[]) {
        super(422)
        Object.setPrototypeOf(this, ValidationError.prototype)
    }
}

export class ConversionError extends HttpStatusError {
    constructor(public issues: ValidationIssue) {
        super(400)
        Object.setPrototypeOf(this, ConversionError.prototype)
    }
}

export class DefaultDependencyResolver implements DependencyResolver {
    resolve(type: new (...args: any[]) => any) {
        return new type()
    }
}

export class DefaultFacility implements Facility {
    setup(app: Readonly<PlumierApplication>) { }
    async initialize(app: Readonly<PlumierApplication>, routes:RouteInfo[]) { }
}


export class RedirectActionResult extends ActionResult {
    constructor(public path: string) { super() }

    async execute(ctx: Context): Promise<void> {
        ctx.redirect(this.path)
    }
}


/* ------------------------------------------------------------------------------- */
/* -------------------------------- CONSTANTS ------------------------------------ */
/* ------------------------------------------------------------------------------- */


export const DefaultConfiguration: Configuration = {
    mode: "debug",
    controller: "./controller",
    dependencyResolver: new DefaultDependencyResolver()
}

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

/* ------------------------------------------------------------------------------- */
/* -------------------------------- GLOBALS -------------------------------------- */
/* ------------------------------------------------------------------------------- */


declare global {
    interface String {
        format(...args: any[]): string
    }

    interface Array<T> {
        flatten(): T
    }
}

String.prototype.format = function (this: string, ...args: any[]) {
    return this.replace(/{(\d+)}/g, (m, i) => typeof args[i] != 'undefined' ? args[i] : m)
}

Array.prototype.flatten = function <T>(this: Array<T>) {
    return this.reduce((a, b) => a.concat(b), <T[]>[])
}