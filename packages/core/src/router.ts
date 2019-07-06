import { Context } from "koa"
import ptr from "path-to-regexp"
import { useCache } from "tinspector"

import { Configuration, Middleware, MiddlewareUtil, RouteContext, RouteInfo } from "./types"
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

/* ------------------------------------------------------------------------------- */
/* ------------------------------- ROUTER ---------------------------------------- */
/* ------------------------------------------------------------------------------- */

function router(infos: RouteInfo[], globalMiddleware: Middleware[]) {
    const matchCache = new Map<string, RouteMatcher | undefined>()
    const middlewareCache = new Map<string, Middleware[]>()
    const getMatcherCached = useCache(matchCache, getMatcher, (info, ctx) => `${ctx.method}${ctx.path}`)
    const getMiddlewareCached = useCache(middlewareCache, getMiddleware, (global, route) => route.url)
    return async (ctx: Context) => {
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
}

export { router }
