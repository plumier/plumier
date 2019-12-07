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

function toRegExp(route: RouteInfo, path: string): RouteMatcher {
    const keys: Key[] = []
    const regexp = pathToRegexp(route.url, keys)
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

function sendError(ctx: Context, status: number, message: any) {
    ctx.status = status
    ctx.body = { status, message }
}

/* ------------------------------------------------------------------------------- */
/* ------------------------------- ROUTER ---------------------------------------- */
/* ------------------------------------------------------------------------------- */

function router(infos: RouteInfo[], config:Configuration) {
    const matchCache = new Map<string, RouteMatcher | undefined>()
    const getMatcherCached = useCache(matchCache, getMatcher, (info, ctx) => `${ctx.method}${ctx.path}`)
    return async (ctx: Context) => {
        try {
            ctx.config = config
            ctx.routes = infos
            const match = getMatcherCached(infos, ctx)
            if (match) {
                for (const key in match.query) {
                    const element = match.query[key];
                    ctx.request.query[key] = element
                }
                ctx.route = match.route
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
