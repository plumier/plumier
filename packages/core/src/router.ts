import { Context } from "koa"
import ptr from "path-to-regexp"
import { useCache } from "tinspector"

import { Configuration, Middleware, MiddlewareUtil, RouteContext, RouteInfo, ValidationError, HttpStatusError } from "./types"
import { ActionInvocation, NotFoundActionInvocation, pipe } from "./middleware-pipeline"

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

interface RouteMatcher {
    match: RegExpExecArray | null,
    query: any,
    method: string,
    route: RouteInfo
}

// --------------------------------------------------------------------- //
// ------------------------------- HELPER ------------------------------ //
// --------------------------------------------------------------------- //

function toRegExp(route: RouteInfo, path: string): RouteMatcher {
    const keys: ptr.Key[] = []
    const regexp = ptr(route.url, keys)
    const match = regexp.exec(path)
    const query = !match ? {} : keys.reduce((a, b, i) => {
        a[b.name] = match![i + 1]
        return a;
    }, <any>{})
    return { match, query, method: route.method.toUpperCase(), route }
}

function getMatcher(infos: RouteInfo[], ctx: Context) {
    return infos.map(x => toRegExp(x, ctx.path)).find(x => Boolean(x.match) && x.method == ctx.method)
}

function getMiddleware(global: Middleware[], route: RouteInfo) {
    const conMdws = MiddlewareUtil.extractDecorators(route)
    const result: Middleware[] = []
    for (const mdw of global) {
        result.push(mdw)
    }
    for (const mdw of conMdws) {
        result.push(mdw)
    }
    return result
}

function sendError(ctx: Context, status: number, message: any) {
    ctx.status = status
    ctx.body = { status, message }
}

/* ------------------------------------------------------------------------------- */
/* ------------------------------- ROUTER ---------------------------------------- */
/* ------------------------------------------------------------------------------- */

function router(infos: RouteInfo[], globalMiddleware: Middleware[]) {
    const matchCache = new Map<string, RouteMatcher | undefined>()
    const middlewareCache = new Map<string, Middleware[]>()
    const getMatcherCached = useCache(matchCache, getMatcher, (info, ctx) => `${ctx.method}${ctx.path}`)
    const getMiddlewareCached = useCache(middlewareCache, getMiddleware, (global, route) => route.url)
    return async (ctx: Context) => {
        try {
            const match = getMatcherCached(infos, ctx)
            if (match) {
                for (const key in match.query) {
                    const element = match.query[key];
                    ctx.request.query[key] = element
                }
                ctx.route = match.route
                const middlewares = getMiddlewareCached(globalMiddleware, match.route)
                await pipe(middlewares, ctx, new ActionInvocation(<RouteContext>ctx))
            }
            else {
                await pipe(globalMiddleware.slice(0), ctx, new NotFoundActionInvocation(ctx))
            }
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
