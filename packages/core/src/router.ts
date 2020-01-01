import { Context } from "koa"
import { Key, pathToRegexp } from "path-to-regexp"
import { useCache } from "tinspector"

import { createPipes, Pipe } from "./application-pipeline"
import { Configuration, HttpStatusError, RouteInfo, ValidationError } from "./types"

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

interface RouteMatcher {
    route: RouteInfo
    keys: Key[],
    match: RegExpExecArray,
}

// --------------------------------------------------------------------- //
// ------------------------------- HELPER ------------------------------ //
// --------------------------------------------------------------------- //

function sendError(ctx: Context, status: number, message: any) {
    ctx.status = status
    ctx.body = { status, message }
}

function getHandler(ctx: Context): RouteMatcher | undefined {
    for (const route of ctx.routes) {
        if (route.method !== ctx.method.toLowerCase()) continue
        const keys: Key[] = []
        const regexp = pathToRegexp(route.url, keys)
        const match = regexp.exec(ctx.path)
        if (match)
            return { route, keys, match }
    }
}

function createQuery(query: any, { keys, match }: RouteMatcher) {
    const raw = keys.reduce((a, b, i) => {
        a[b.name] = match![i + 1]
        return a;
    }, query)
    return new Proxy(raw, {
        get: (target, name) => {
            for (const key in target) {
                if (key.toLowerCase() === name.toString().toLowerCase())
                    return target[key];
            }
            return target[name]
        }
    })
}

/* ------------------------------------------------------------------------------- */
/* ------------------------------- ROUTER ---------------------------------------- */
/* ------------------------------------------------------------------------------- */

function router(infos: RouteInfo[], config: Configuration) {
    const nodeCache = new Map<string, Pipe>()
    const matchCache = new Map<string, RouteMatcher | undefined>()
    const getHandlerCached = useCache(matchCache, getHandler, (ctx) => `${ctx.method}${ctx.path}`)
    const createPipe = useCache(nodeCache, createPipes, (ctx) => `${ctx.method}${ctx.path}`)
    return async (ctx: Context) => {
        try {
            ctx.config = config
            ctx.routes = infos
            ctx.state.caller = "system"
            const handler = getHandlerCached(ctx)
            if (handler) {
                Object.defineProperty(ctx.request, "query", {
                    value: createQuery(ctx.query, handler)
                })
                ctx.route = handler.route
            }
            const pipe = createPipe(ctx)
            const result = await pipe.execute(ctx).proceed()
            await result.execute(ctx)
        }
        catch (e) {
            if (e instanceof ValidationError)
                sendError(ctx, e.status, e.issues)
            else if (e instanceof HttpStatusError)
                sendError(ctx, e.status, e.message)
            else
                ctx.throw(e)
        }
    }
}

export { router }
