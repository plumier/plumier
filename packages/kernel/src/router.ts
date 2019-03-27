import { Configuration, Middleware, MiddlewareUtil, RouteContext, RouteInfo } from "@plumier/core"
import { Context } from "koa"
import ptr from "path-to-regexp"

import * as Binder from "./binder"
import { CacheStore, useCache } from "./common"
import { ActionInvocation, execute, NotFoundActionInvocation } from "./invocation"

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
    return global.concat(MiddlewareUtil.extractDecorators(route))
}


/* ------------------------------------------------------------------------------- */
/* ------------------------------- ROUTER ---------------------------------------- */
/* ------------------------------------------------------------------------------- */

export function router(infos: RouteInfo[], config: Configuration, globalMiddleware: Middleware[]) {
    const matchCache: CacheStore<RouteMatcher | undefined> = {}
    const middlewareCache: CacheStore<Middleware[]> = {}
    return async (ctx: Context) => {
        const getMatcherCached = useCache(matchCache, getMatcher, (info, ctx) => `${ctx.method}${ctx.path}`)
        const match = getMatcherCached(infos, ctx)
        ctx.config = config;
        if (match) {
            Object.assign(ctx.request.query, match.query)
            ctx.route = match.route;
            ctx.parameters = Binder.bindParameter(ctx, match.route.action, config.converters)
            const getMiddlewareCached = useCache(middlewareCache, getMiddleware, (global, route) => route.url)
            const middlewares = getMiddlewareCached(globalMiddleware, match.route)
            await execute(middlewares, ctx, new ActionInvocation(<RouteContext>ctx))
        }
        else {
            await execute(globalMiddleware.slice(0), ctx, new NotFoundActionInvocation(ctx))
        }
    }
}

