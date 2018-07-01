import { IncomingHttpHeaders } from "http";
import Koa, { Context, Request } from "koa";
import BodyParser from "koa-bodyparser";

import { ClassReflection, decorateClass, decorateMethod, decorateParameter, FunctionReflection } from "./libs/reflect";


export type HttpMethod = "post" | "get" | "put" | "delete"
export type KoaMiddleware = (ctx: Context, next: () => Promise<void>) => Promise<any>
export type TypeConverter = { [typeName: string]: (value: any) => any }
export type RequestPart = keyof Request
export type HeaderPart = keyof IncomingHttpHeaders

export interface BindingDecorator {
    type: "ParameterBinding",
    name: "Request" | "Body" | "Header" | "Query",
    part?: RequestPart
}

export interface RouteDecorator { name: "Route", method: HttpMethod, url?: string }

export interface IgnoreDecorator { name: "Ignore" }

export interface RootDecorator { name: "Root", url: string }

export interface MiddlewareDecorator { name: "Middleware", value: Middleware[] }

export interface RouteInfo {
    url: string,
    method: HttpMethod
    action: FunctionReflection
    controller: ClassReflection
}

export interface Invocation {
    context: Readonly<Context>
    proceed(): Promise<ActionResult>
}

export interface Middleware {
    execute(invocation: Readonly<Invocation>): Promise<ActionResult>
}

export interface Facility {
    setup(app: Readonly<PlumierApplication>):Promise<void>
}

export interface DependencyResolver {
    resolve(type: (new (...args: any[]) => any)): any
}

export interface Configuration {
    mode: "debug" | "production"
    rootPath: string
    controllerPath: string
    modelPath: string
    dependencyResolver: DependencyResolver,
    converters?: TypeConverter
}

export interface PlumierConfiguration extends Configuration {
    middleware: Middleware[]
    facilities: Facility[]
}

export interface Application {
    use(middleware: KoaMiddleware): Application
    use(middleware: Middleware): Application
    set(facility: Facility): Application
    set(config: Partial<Configuration>): Application
    initialize(): Promise<Koa>
}

export interface PlumierApplication extends Application {
    readonly koa: Koa,
    readonly config: Readonly<PlumierConfiguration>
}

declare module "koa" {
    export interface Context {
        route: RouteInfo,
        config: Configuration
    }
}


/* ------------------------------------------------------------------------------- */
/* -------------------------------- HELPERS -------------------------------------- */
/* ------------------------------------------------------------------------------- */


export namespace StringUtil {
    export function format(s: string, ...args: any[]) {
        return s.replace(/{(\d+)}/g, (m, i) => typeof args[i] != 'undefined' ? args[i] : m)
    }

    export function padRight(s: string, length: number) {
        const space = " ".repeat(length)
        return (s + space).substring(0, space.length);
    }
}


export function hasKeyOf<T>(opt: any, key: string): opt is T {
    return key in opt;
}


export namespace Middleware {
    export function fromKoa(middleware: KoaMiddleware): Middleware {
        return {
            execute: async x => {
                await middleware(x.context, async () => { x.proceed() })
                return new ActionResult(x.context.body, x.context.status)
            }
        }
    }
    export function toKoa(middleware: Middleware): KoaMiddleware {
        return async (context: Context, next: () => Promise<any>) => {
            const result = await middleware.execute({
                context, proceed: async () => {
                    await next()
                    return new ActionResult(context.body, context.status)
                }
            })
            result.execute(context)
        }
    }
}

/* ------------------------------------------------------------------------------- */
/* -------------------------------- CLASSES -------------------------------------- */
/* ------------------------------------------------------------------------------- */


export class ActionResult {
    private readonly headers: { [key: string]: string } = {}
    constructor(public body?: any, public status?: number) { }

    header(key: string, value: string) {
        this.headers[key] = value;
        return this
    }

    execute(ctx: Context): void {
        Object.keys(this.headers).forEach(x => {
            ctx.set(x, this.headers[x])
        })
        if (this.body)
            ctx.body = this.body
        if (this.status)
            ctx.status = this.status
    }
}


export class WebApiFacility implements Facility {
    async setup({ koa }: Readonly<PlumierApplication>) {
        koa.use(BodyParser())
    }
}

export class HttpStatusError extends Error {
    constructor(public message: string, public status: number) {
        super(message)
        Object.setPrototypeOf(this, HttpStatusError.prototype);
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
    export function request(part?: RequestPart) {
        return decorateParameter(<BindingDecorator>{ type: "ParameterBinding", name: "Request", part })
    }
    export function body(part?: string) {
        return decorateParameter(<BindingDecorator>{ type: "ParameterBinding", name: "Body", part })
    }
    export function header(key?: HeaderPart) {
        return decorateParameter(<BindingDecorator>{ type: "ParameterBinding", name: "Header", part: key })
    }
    export function query(name?: string) {
        return decorateParameter(<BindingDecorator>{ type: "ParameterBinding", name: "Query", part: name })
    }
}

export class RouteDecoratorImpl {
    private decorateRoute(method: HttpMethod, url?: string) { return decorateMethod(<RouteDecorator>{ name: "Route", method, url }) }
    post(url?: string) { return this.decorateRoute("post", url) }
    get(url?: string) { return this.decorateRoute("get", url) }
    put(url?: string) { return this.decorateRoute("put", url) }
    delete(url?: string) { return this.decorateRoute("delete", url) }
    root(url: string) { return decorateClass(<RootDecorator>{ name: "Root", url }) }
    ignore() { return decorateMethod(<IgnoreDecorator>{ name: "Ignore" }) }
}

export const route = new RouteDecoratorImpl()


export namespace middleware {
    export function use(...middleware: (Middleware | KoaMiddleware)[]) {
        const mdw = middleware.map(x => typeof x == "function" ? Middleware.fromKoa(x) : x).reverse()
        const value: MiddlewareDecorator = { name: "Middleware", value: mdw }
        return (...args: any[]) => {
            if (args.length == 1) {
                decorateClass(value)(args[0])
            }
            else if (args.length == 3) {
                decorateMethod(value)(args[0], args[1])
            }
        }
    }
}


export function model() {
    return decorateClass({ type: "Model" })
}

/* ------------------------------------------------------------------------------- */
/* -------------------------------- CONSTANTS ------------------------------------ */
/* ------------------------------------------------------------------------------- */

export namespace errorMessage {
    //PLUM1XXX User configuration error
    export const RouteDoesNotHaveBackingParam = "PLUM1000: Route parameters ({0}) doesn't have appropriate backing parameter"
    export const ActionDoesNotHaveTypeInfo = "PLUM1001: Action doesn't contains design type information, automatic type conversion will be skipped"
    export const MultipleDecoratorNotSupported = "PLUM1002: Multiple decorators doesn't supported"
    export const DuplicateRouteFound = "PLUM1003: Duplicate route found in {0}"
    export const ControllerPathNotFound = "PLUM1004: Controller directory {0} not found"
    export const ModelPathNotFound = "PLUM1005: Model directory {0} not found"

    //PLUM1XXX internal app error
    export const RequestedUrlNotFound = "PLUM2001: Requested url not found"
}