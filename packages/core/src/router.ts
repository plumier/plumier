import { Context } from "koa"
import { Key, pathToRegexp } from "path-to-regexp"
import { useCache } from "tinspector"

import { pipe } from "./application-pipeline"
import { Configuration, HttpStatusError, RouteInfo, ValidationError } from "./types"

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

function sendError(ctx: Context, status: number, message: any) {
    ctx.status = status
    ctx.body = { status, message }
}

function getHandler(ctx: Context) {
    for (const route of ctx.routes) {
        if (route.method !== ctx.method.toLowerCase()) continue
        const keys: Key[] = []
        const regexp = pathToRegexp(route.url, keys)
        const match = regexp.exec(ctx.path)
        if (match) {
            const query = keys.reduce((a, b, i) => {
                a[b.name] = match![i + 1]
                return a;
            }, ctx.request.query)
            return { route, query }
        }
    }
}


/* ------------------------------------------------------------------------------- */
/* ------------------------------- ROUTER ---------------------------------------- */
/* ------------------------------------------------------------------------------- */

function router(infos: RouteInfo[], config: Configuration) {
    const matchCache = new Map<string, RouteMatcher | undefined>()
    const getHandlerCached = useCache(matchCache, getHandler, (ctx) => `${ctx.method}${ctx.path}`)
    return async (ctx: Context) => {
        try {
            ctx.config = config
            ctx.routes = infos
            const handler = getHandlerCached(ctx)
            if (handler) {
                ctx.request.query = handler.query
                ctx.route = handler.route
            }
            const result = await pipe(ctx)
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
