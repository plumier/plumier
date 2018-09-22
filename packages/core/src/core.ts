import {
    ClassReflection,
    decorateClass,
    decorateMethod,
    decorateParameter,
    FunctionReflection,
    ParameterReflection,
} from "@plumjs/reflect";
import { IncomingHttpHeaders } from "http";
import Koa, { Context, Request } from "koa";
import { getChildValue } from './common';


/* ------------------------------------------------------------------------------- */
/* ----------------------------------- TYPES ------------------------------------- */
/* ------------------------------------------------------------------------------- */

export type HttpMethod = "post" | "get" | "put" | "delete"
export type KoaMiddleware = (ctx: Context, next: () => Promise<void>) => Promise<any>
export type RequestPart = keyof Request
export type HeaderPart = keyof IncomingHttpHeaders
export type Class = new (...args: any[]) => any
export type ValueConverter = (value: any, prop: ParameterProperties) => any
export type TypeConverter = { type: Class, converter: ValueConverter }
export type ValidatorFunction = (value: string) => Promise<string | undefined>

export interface ParameterProperties extends ParameterPropertiesType<Class | Class[]> { }

export interface ParameterPropertiesType<T> {
    path: string[],
    parameterType: T,
    decorators: any[]
    converters: Map<Function, ValueConverter>,
}

export interface BindingDecorator {
    type: "ParameterBinding",
    process: (ctx: Context) => any
}

export interface RouteDecorator { name: "Route", method: HttpMethod, url?: string }

export interface IgnoreDecorator { name: "Ignore" }

export interface RootDecorator { name: "Root", url: string }

export interface MiddlewareDecorator { name: "Middleware", value: Middleware[] }

export interface DomainDecorator { name: "Domain" }

export interface RouteInfo {
    url: string,
    method: HttpMethod
    action: FunctionReflection
    controller: ClassReflection
}

export interface ValidatorDecorator {
    type: "ValidatorDecorator",
    validator: ValidatorFunction,
    name: string
}

export interface Invocation {
    context: Readonly<Context>
    proceed(): Promise<ActionResult>
}

export interface Middleware {
    execute(invocation: Readonly<Invocation>): Promise<ActionResult>
}

export interface Facility {
    setup(app: Readonly<PlumierApplication>): Promise<void>
}

export interface DependencyResolver {
    resolve(type: (new (...args: any[]) => any)): any
}

export interface BodyParserOption {
    enableTypes?: string[];
    encode?: string;
    formLimit?: string;
    jsonLimit?: string;
    strict?: boolean;
    detectJSON?: (ctx: Koa.Context) => boolean;
    extendTypes?: {
        json?: string[];
        form?: string[];
        text?: string[];
    }
    onerror?: (err: Error, ctx: Koa.Context) => void;
}

export interface ValidationIssue {
    path: string[]
    messages: string[]
}

export interface FileUploadInfo {
    field:string,
    fileName: string,
    originalName:string,
    mime: string,
    size: number,
    encoding:string
}

export interface FileParser {
    save(subDirectory?:string): Promise<FileUploadInfo[]>
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
    validator?: (value: any, metadata: ParameterReflection) => Promise<ValidationIssue[]>

    /**
     * Route generator will search for this file extension on controller directory
     */
    fileExtension?: ".js" | ".ts",

    /**
     * Multi part form file parser implementation
     */
    fileParser?: (ctx: Context) => FileParser
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
                    nextResult.execute(x.context)
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
    constructor(public status: number, message?: string) {
        super(message)
        Object.setPrototypeOf(this, HttpStatusError.prototype);
    }
}

export class ConversionError extends HttpStatusError {
    constructor(public info: { path: string[], type: string, value: any }, message?: string) {
        super(400, message)
        Object.setPrototypeOf(this, ConversionError.prototype)
    }
}

export class ValidationError extends HttpStatusError {
    constructor(public issues: ValidationIssue[]) {
        super(422)
        Object.setPrototypeOf(this, ValidationError.prototype)
    }
}

export class DefaultDependencyResolver implements DependencyResolver {
    resolve(type: new (...args: any[]) => any) {
        return new type()
    }
}

/* ------------------------------------------------------------------------------- */
/* ----------------------------- DECORATORS -------------------------------------- */
/* ------------------------------------------------------------------------------- */

export namespace bind {
    /**
     * Bind Koa Context
     * 
     *    method(@bind.ctx() ctx:any) {}
     * 
     * Use dot separated string to access child property
     * 
     *    method(@bind.ctx("state.user") ctx:User) {}
     *    method(@bind.ctx("request.headers.ip") ip:string) {}
     *    method(@bind.ctx("body[0].id") id:string) {}
     * 
     * @param part part of context, use dot separator to access child property
     */
    export function ctx(part?: string) {
        return decorateParameter(<BindingDecorator>{
            type: "ParameterBinding",
            process: ctx => part ? getChildValue(ctx, part) : ctx
        })
    }

    /**
     * Bind Koa request to parameter
     * 
     *    method(@bind.request() req:Request){}
     * 
     * If parameter provided, part of request property will be bound
     * 
     *    method(@bind.request("method") httpMethod:string){}
     *    method(@bind.request("status") status:number){}
     * 
     * @param part part of request ex: body, method, query etc
     */
    export function request(part?: RequestPart) {
        return ctx(["request", part].join("."))
    }

    /**
     * Bind request body to parameter
     *    
     *     method(@bind.body() body:AnimalDto){}
     * 
     * If parameter provided, part of body property will be bound
     * 
     *     method(@bind.body("name") name:string){}
     *     method(@bind.body("age") age:number){}
     */
    export function body(part?: string) {
        return ctx(["request", "body", part].join("."))
    }

    /**
     * Bind request header to parameter
     *    
     *     method(@bind.header() header:any){}
     * 
     * If parameter provided, part of header property will be bound
     * 
     *     method(@bind.header("accept") accept:string){}
     *     method(@bind.header("cookie") age:any){}
     */
    export function header(key?: HeaderPart) {
        return ctx(["request", "headers", key].join("."))
    }

    /**
     * Bind request query object to parameter
     *    
     *     method(@bind.query() query:any){}
     * 
     * If parameter provided, part of query property will be bound
     * 
     *     method(@bind.query("id") id:string){}
     *     method(@bind.query("type") type:string){}
     */
    export function query(name?: string) {
        return ctx(["request", "query", name].join("."))
    }

    /**
     * Bind current login user to parameter
     *    
     *     method(@bind.user() user:User){}
     */
    export function user() {
        return ctx("state.user")
    }

    /**
     * Bind file parser for multi part file upload. This function required `FileUploadFacility`
    ```
    @route.post()
    async method(@bind.file() file:FileParser){
        const info = await file.parse()
    }
    ```
     */
    export function file() {
        return decorateParameter(<BindingDecorator>{
            type: "ParameterBinding",
            process: ctx => {
                if (!ctx.config.fileParser) throw new Error("No file parser found in configuration")
                return ctx.config.fileParser(ctx)
            }
        })
    }
}

export class RouteDecoratorImpl {
    private decorateRoute(method: HttpMethod, url?: string) { return decorateMethod(<RouteDecorator>{ name: "Route", method, url }) }
    /**
     * Mark method as POST method http handler
     ```
     class AnimalController{
        @route.post()
        method(id:number){}
     }
     //result: POST /animal/method?id=<number>
     ```
     * Override method name with absolute url
     ```
     class AnimalController{
        @route.post("/beast/:id")
        method(id:number){}
     }
     //result: POST /beast/:id
     ```
     * Override method name with relative url
     ```
     class AnimalController{
        @route.post("get")
        method(id:number){}
     }
     //result: POST /animal/get?id=<number>
     ```
     * @param url url override
     */
    post(url?: string) { return this.decorateRoute("post", url) }

    /**
     * Mark method as GET method http handler
     ```
     class AnimalController{
        @route.get()
        method(id:number){}
     }
     //result: GET /animal/method?id=<number>
     ```
     * Override method name with absolute url
     ```
     class AnimalController{
        @route.get("/beast/:id")
        method(id:number){}
     }
     //result: GET /beast/:id
     ```
     * Override method name with relative url
     ```
     class AnimalController{
        @route.get("get")
        method(id:number){}
     }
     //result: GET /animal/get?id=<number>
     ```
     * @param url url override
     */
    get(url?: string) { return this.decorateRoute("get", url) }

    /**
     * Mark method as PUT method http handler
     ```
     class AnimalController{
        @route.put()
        method(id:number){}
     }
     //result: PUT /animal/method?id=<number>
     ```
     * Override method name with absolute url
     ```
     class AnimalController{
        @route.put("/beast/:id")
        method(id:number){}
     }
     //result: PUT /beast/:id
     ```
     * Override method name with relative url
     ```
     class AnimalController{
        @route.put("get")
        method(id:number){}
     }
     //result: PUT /animal/get?id=<number>
     ```
     * @param url url override
     */
    put(url?: string) { return this.decorateRoute("put", url) }

    /**
     * Mark method as DELETE method http handler
     ```
     class AnimalController{
        @route.delete()
        method(id:number){}
     }
     //result: DELETE /animal/method?id=<number>
     ```
     * Override method name with absolute url
     ```
     class AnimalController{
        @route.delete("/beast/:id")
        method(id:number){}
     }
     //result: DELETE /beast/:id
     ```
     * Override method name with relative url
     ```
     class AnimalController{
        @route.delete("get")
        method(id:number){}
     }
     //result: DELETE /animal/get?id=<number>
     ```
     * @param url url override
     */
    delete(url?: string) { return this.decorateRoute("delete", url) }

    /**
     * Override controller name on route generation
     ```
     @route.root("/beast")
     class AnimalController{
        @route.get()
        method(id:number){}
     }
     //result: GET /beast/method?id=<number>
     ```
     * Parameterized root, useful for nested Restful resource
     ```
     @route.root("/beast/:type/bunny")
     class AnimalController{
        @route.get(":id")
        method(type:string, id:number){}
     }
     //result: GET /beast/:type/bunny/:id
     ```
     * @param url url override
     */
    root(url: string) { return decorateClass(<RootDecorator>{ name: "Root", url }) }

    /**
     * Ignore method from route generation
     ```
     class AnimalController{
        @route.get()
        method(id:number){}
        @route.ignore()
        otherMethod(type:string, id:number){}
     }
     //result: GET /animal/method?id=<number>
     //otherMethod not generated
     ```
     */
    ignore() { return decorateMethod(<IgnoreDecorator>{ name: "Ignore" }) }
}

export const route = new RouteDecoratorImpl()


export namespace middleware {
    export function use(...middleware: (Middleware | KoaMiddleware)[]) {
        const mdw = middleware.map(x => typeof x == "function" ? MiddlewareUtil.fromKoa(x) : x).reverse()
        const value: MiddlewareDecorator = { name: "Middleware", value: mdw }
        return (...args: any[]) => {
            if (args.length == 1) {
                decorateClass(value)(args[0])
            }
            else {
                decorateMethod(value)(args[0], args[1])
            }
        }
    }
}

export function domain() { return decorateClass(<DomainDecorator>{ name: "Domain" }) }

/* ------------------------------------------------------------------------------- */
/* -------------------------------- CONSTANTS ------------------------------------ */
/* ------------------------------------------------------------------------------- */


export const DefaultConfiguration: Configuration = {
    mode: "debug",
    controller: "./controller",
    dependencyResolver: new DefaultDependencyResolver(),
    fileExtension: ".js"
}

export namespace errorMessage {
    //PLUM1XXX User configuration error
    export const RouteDoesNotHaveBackingParam = "PLUM1000: Route parameters ({0}) doesn't have appropriate backing parameter"
    export const ActionDoesNotHaveTypeInfo = "PLUM1001: Parameter binding skipped because action doesn't have @route decorator"
    export const ModelWithoutTypeInformation = "PLUM1005: Parameter binding skipped because  {0} doesn't have @domain() decorator"
    export const ArrayWithoutTypeInformation = "PLUM1006: Parameter binding skipped because array field without @array() decorator found in ({0})"
    export const MultipleDecoratorNotSupported = "PLUM1002: Multiple decorators doesn't supported"
    export const DuplicateRouteFound = "PLUM1003: Duplicate route found in {0}"
    export const ControllerPathNotFound = "PLUM1004: Controller file or directory {0} not found"
    export const ModelNotFound = "PLUM1007: Domain model not found, no class decorated with @domain() on provided classes"
    export const ModelPathNotFound = "PLUM1007: Domain model not found, no class decorated with @domain() on path {0}"

    //PLUM2XXX internal app error
    export const UnableToInstantiateModel = `PLUM2000: Unable to instantiate model {0}. Domain model should be instantiable using default constructor`


    //End user error (no error code)
    export const UnableToConvertValue = `Unable to convert "{0}" into {1} in parameter {2}`
    export const FileSizeExceeded = "File {0} size exceeded the maximum size"
    export const NumberOfFilesExceeded = "Number of files exceeded the maximum allowed"
}