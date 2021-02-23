import {
    ActionResult,
    api,
    DefaultFacility,
    HttpStatus,
    HttpStatusError,
    Invocation,
    invoke,
    Middleware,
    PlumierApplication,
    response,
    route,
    RouteAnalyzerIssue,
    RouteInfo,
    RouteMetadata,
} from "@plumier/core"
import { decorateMethod, mergeDecorator } from "@plumier/reflect"
import { exists } from "fs"
import { Context } from "koa"
import send from "koa-send"
import mime from "mime-types"
import { extname, isAbsolute, join } from "path"
import { promisify } from "util"

const existsAsync = promisify(exists)

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

declare module "@plumier/core" {
    namespace response {
        function file(path: string, opt?: ServeStaticOptions): ActionResult
    }

    interface RouteDecoratorImpl {
        historyApiFallback(): MethodDecorator
    }

    export interface Configuration {
        sendFile?: (path: string, opt?: ServeStaticOptions) => Promise<string>
    }
}

export interface ServeStaticOptions {
    /** 
     * Root directory of static assets 
     **/
    root?: string

    /** 
     * Browser cache max-age in milliseconds. (defaults to 0) 
     **/
    maxAge?: number

    /** 
     * Tell the browser the resource is immutable and can be cached indefinitely. (defaults to false) 
     **/
    immutable?: boolean;

    /** 
     * Try to serve the gzipped version of a file automatically when gzip is supported by a client and if the requested file with .gz extension exists. (defaults to true). 
     **/
    gzip?: boolean;

    /** 
     * Try to serve the brotli version of a file automatically when brotli is supported by a client and if the requested file with .br extension exists. (defaults to true). 
     **/
    brotli?: boolean;

    /**
     * Root path of the request, all containing assets will accessible with this root path. Default is /
     */
    rootPath?: string
}

export class FileActionResult extends ActionResult {
    constructor(path: string, private opt?: ServeStaticOptions) {
        super(path)
        if (!this.opt)
            this.opt = { root: "/" }
    }

    async execute(ctx: Context) {
        await super.execute(ctx)
        const isFile = !!mime.lookup(this.body)
        if (!isFile)
            throw new HttpStatusError(HttpStatus.NotFound)
        ctx.type = extname(this.body)
        const sendFile = ctx.config.sendFile || ((path: string, opt?: ServeStaticOptions) => send(ctx, path, opt))
        await sendFile(this.body, this.opt)
    }
}

// --------------------------------------------------------------------- //
// ----------------------------- DECORATORS ---------------------------- //
// --------------------------------------------------------------------- //


response.file = (path: string, opt?: ServeStaticOptions) => new FileActionResult(path, opt)

route.historyApiFallback = () => {
    return mergeDecorator(decorateMethod({ type: "HistoryApiFallback" }), api.response(200, "text/html", String))
}


// --------------------------------------------------------------------- //
// ---------------------------- MIDDLEWARES ---------------------------- //
// --------------------------------------------------------------------- //

export class ServeStaticMiddleware implements Middleware {
    constructor(public option: ServeStaticOptions) { }

    async execute(invocation: Readonly<Invocation>): Promise<ActionResult> {
        if (this.option.rootPath && !this.option.rootPath.startsWith("/"))
            this.option.rootPath = "/" + this.option.rootPath
        const rootPath = this.option.rootPath || ""
        //no route = no controller = possibly static file request
        if (!invocation.ctx.route && invocation.ctx.path.toLowerCase().startsWith(rootPath.toLowerCase())) {
            //check if not in root path then proceed
            //execute action result directly here, so if file not found it will possible to chain with next middleware
            try {
                const path = invocation.ctx.path.substr(rootPath.length)
                const result = new FileActionResult(path, this.option)
                await result.execute(invocation.ctx)
                return ActionResult.fromContext(invocation.ctx)
            }
            catch (e) {
                if (e.status && e.status === 404)
                    return invocation.proceed()
                else
                    throw e
            }
        }
        else
            return invocation.proceed()
    }
}


export class HistoryApiFallbackMiddleware implements Middleware {
    constructor() { }

    async execute(i: Readonly<Invocation>): Promise<ActionResult> {
        const isFile = !!mime.lookup(i.ctx.path)
        const route = i.ctx.routes.find(x => x.action.decorators.some(x => x.type === "HistoryApiFallback"))
        //no context.route = no controller = no handler
        if (!i.ctx.route && i.ctx.state.caller === "system" && !isFile && !!route && i.ctx.request.method === "GET" && i.ctx.request.accepts("html")) {
            return invoke(i.ctx, route)
        }
        else
            return i.proceed()
    }
}


// --------------------------------------------------------------------- //
// ------------------------------ ANALYZER ----------------------------- //
// --------------------------------------------------------------------- //

function getActionName(route: RouteInfo) {
    return `${route.controller.name}.${route.action.name}(${route.action.parameters.map(x => x.name).join(", ")})`
}

function multipleDecoratorsCheck(route: RouteMetadata, allRoutes: RouteMetadata[]): RouteAnalyzerIssue[] {
    if (route.kind === "VirtualRoute") return [{ type: "success" }]
    const histories = allRoutes.filter((x): x is RouteInfo => x.kind === "ActionRoute" && x.action.decorators.some(x => x.type === "HistoryApiFallback"))
    if (histories.length > 1) {
        const actions = histories.map(x => getActionName(x)).join(", ")
        return [{ type: "error", message: `PLUM1020: Multiple @route.historyApiFallback() is not allowed, in ${actions}` }]
    }
    else return [{ type: "success" }]
}

function httpMethodCheck(route: RouteMetadata, allRoutes: RouteMetadata[]): RouteAnalyzerIssue[] {
    if (route.kind === "VirtualRoute") return [{ type: "success" }]
    if (route.method !== "get" && route.action.decorators.some(x => x.type === "HistoryApiFallback"))
        return [{ type: "error", message: `PLUM1021: History api fallback should have GET http method, in ${getActionName(route)}` }]
    else
        return [{ type: "success" }]
}


// --------------------------------------------------------------------- //
// ------------------------------ FACILITY ----------------------------- //
// --------------------------------------------------------------------- //

export class ServeStaticFacility extends DefaultFacility {
    constructor(public option?: ServeStaticOptions) { super() }

    async initialize(app: Readonly<PlumierApplication>) {
        const analyzers = (app.config.analyzers || []).concat([multipleDecoratorsCheck, httpMethodCheck])
        Object.assign(app.config, { analyzers })
        const dir = this.option?.root ?? "www"
        const root = isAbsolute(dir) ? dir : join(app.config.rootDir, dir)
        app.use(new ServeStaticMiddleware({ ...this.option, root }))
        app.use(new HistoryApiFallbackMiddleware())
    }
}