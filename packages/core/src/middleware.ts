import { Context } from "koa"
import { decorate } from "tinspector"

import { ActionResult } from "./action-result"
import { Invocation } from './invocation';
import { RouteInfo } from './route-generator';


// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

export type KoaMiddleware = (ctx: Context, next: () => Promise<void>) => Promise<any>
export interface MiddlewareDecorator { name: "Middleware", value: Middleware[] }

export interface Middleware {
    execute(invocation: Readonly<Invocation>): Promise<ActionResult>
}

// --------------------------------------------------------------------- //
// ------------------------------- HELPER ------------------------------ //
// --------------------------------------------------------------------- //

export namespace MiddlewareUtil {
    export function fromKoa(middleware: KoaMiddleware): Middleware {
        return {
            execute: async x => {
                await middleware(x.context, async () => {
                    const nextResult = await x.proceed()
                    await nextResult.execute(x.context)
                })
                return ActionResult.fromContext(x.context)
            }
        }
    }
    export function extractDecorators(route: RouteInfo): Middleware[] {
        const classDecorator: MiddlewareDecorator[] = route.controller.decorators.filter(x => x.name == "Middleware")
        const methodDecorator: MiddlewareDecorator[] = route.action.decorators.filter(x => x.name == "Middleware")
        const extract = (d: MiddlewareDecorator[]) => d.map(x => x.value).flatten()
        return extract(classDecorator)
            .concat(extract(methodDecorator))
            .reverse()
    }
}
