import {
    ActionResult,
    route,
    DefaultFacility,
    Invocation,
    Middleware,
    PlumierApplication,
    response,
    RouteAnalyzerIssue,
    RouteInfo,
} from "@plumier/core"
import { Context } from "koa"
import send from "koa-send"
import mime from "mime-types"
import { extname } from "path"
import { decorateMethod } from "tinspector"


// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

declare module "@plumier/core" {
    namespace response {
        function file(path: string, opt?: ServeStaticOptions): ActionResult
    }

    interface RouteDecoratorImpl {
        historyApiFallback(): (target: any, name: string) => void
    }

    export interface Configuration {
        sendFile?: (path: string, opt?: ServeStaticOptions) => Promise<string>
    }
}

export interface ServeStaticOptions {
    /** 
     * Root directory of static assets 
     **/
    root: string

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
}

export class FileActionResult extends ActionResult {
    constructor(path: string, private opt?: ServeStaticOptions) {
        super(path)
        if (!this.opt)
            this.opt = { root: "/" }
    }

    async execute(ctx: Context) {
        await super.execute(ctx)
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
    return decorateMethod({ type: "HistoryApiFallback" })
}


// --------------------------------------------------------------------- //
// ---------------------------- MIDDLEWARES ---------------------------- //
// --------------------------------------------------------------------- //

export class ServeStaticMiddleware implements Middleware {
    constructor(public option: ServeStaticOptions) { }

    async execute(invocation: Readonly<Invocation>): Promise<ActionResult> {
        //no route = no controller = possibly static file request
        if (!invocation.context.route) {
            //execute action result directly here, so if file not found it will possible to chain with next middleware
            try {
                const result = new FileActionResult(invocation.context.path, this.option)
                await result.execute(invocation.context)
                return ActionResult.fromContext(invocation.context)
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
    constructor(private redirectPath: () => string | undefined) { }

    async execute(i: Readonly<Invocation>): Promise<ActionResult> {
        const isFile = !!mime.lookup(i.context.path)
        const redirect = this.redirectPath()
        //no route = no controller = no handler
        if (!isFile && !!redirect && !i.context.route && i.context.request.method === "GET" && i.context.request.accepts("html")) {
            return response.redirect(redirect)
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

function multipleDecoratorsCheck(route: RouteInfo, allRoutes: RouteInfo[]): RouteAnalyzerIssue {
    const histories = allRoutes.filter(x => x.action.decorators.some(x => x.type === "HistoryApiFallback"))
    if (histories.length > 1) {
        const actions = histories.map(x => getActionName(x)).join(", ")
        return { type: "error", message: `PLUM1020: Multiple @route.historyApiFallback() is not allowed, in ${actions}` }
    }
    else return { type: "success" }
}

function httpMethodCheck(route: RouteInfo, allRoutes: RouteInfo[]): RouteAnalyzerIssue {
    if (route.method !== "get")
        return { type: "error", message: `PLUM1021: History api fallback should have GET http method, in ${getActionName(route)}` }
    else
        return { type: "success" }
}


// --------------------------------------------------------------------- //
// ------------------------------ FACILITY ----------------------------- //
// --------------------------------------------------------------------- //

export class ServeStaticFacility extends DefaultFacility {
    private redirectPath?: string
    constructor(public option: ServeStaticOptions) { super() }

    setup(app: Readonly<PlumierApplication>) {
        const analyzers = (app.config.analyzers || []).concat([multipleDecoratorsCheck, httpMethodCheck])
        Object.assign(app.config, { analyzers })
        app.use(new ServeStaticMiddleware(this.option))
        app.use(new HistoryApiFallbackMiddleware(() => this.redirectPath))
    }

    async initialize(app: Readonly<PlumierApplication>, routes: RouteInfo[]) {
        const histories = routes.filter(x => x.action.decorators.some(x => x.type === "HistoryApiFallback"))
        if (histories.length === 1) {
            this.redirectPath = histories[0].url
        }
    }
}

