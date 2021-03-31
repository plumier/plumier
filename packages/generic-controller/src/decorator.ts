import { HttpMethod, responseType, RouteDecorator, SelectQuery } from "@plumier/core"
import reflect, { Class, decorate, DecoratorId, mergeDecorator } from "@plumier/reflect"
import { Context } from "koa"

import { ControllerBuilder, GenericControllerConfiguration } from "./configuration"
import { updateGenericControllerRegistry } from "./helper"

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

// get one custom query
interface GetOneParams { pid?: any, id: any, select: SelectQuery }
type GetOneCustomQueryFunction<T = any> = (params: GetOneParams, ctx: Context) => Promise<T>
interface GetOneCustomQueryDecorator {
    kind: "plumier-meta:get-one-query",
    query: GetOneCustomQueryFunction
}

// get many custom query
interface GetManyParams<T> { pid?: any, limit: number, offset: number, select: SelectQuery, filter: any, order: any }
type GetManyCustomQueryFunction<T = any> = (params: GetManyParams<T>, ctx: Context) => Promise<T[]>
interface GetManyCustomQueryDecorator {
    kind: "plumier-meta:get-many-query",
    query: GetManyCustomQueryFunction
}

type ResponseTransformer<S = any, D = any> = (s: S) => D

interface ResponseTransformerDecorator {
    kind: "plumier-meta:response-transformer",
    transformer: ResponseTransformer
}

interface GenericControllerDecorator {
    name: "plumier-meta:controller"
    config: ((x: ControllerBuilder) => void) | undefined
}

const RouteDecoratorID = Symbol("generic-controller:route")

// --------------------------------------------------------------------- //
// ----------------------------- DECORATORS ---------------------------- //
// --------------------------------------------------------------------- //

function genericController(opt?: string | GenericControllerConfiguration) {
    const config = typeof opt === "string" ? (x: ControllerBuilder) => x.setPath(opt) : opt
    return decorate((...args: any[]) => {
        updateGenericControllerRegistry(args[0])
        return <GenericControllerDecorator>{ name: "plumier-meta:controller", config }
    })
}

/**
 * Custom route decorator to make it possible to override @route decorator from class scope decorator. 
 * This is required for custom route path defined with @genericController("custom/:customId")
 */
function decorateRoute(method: HttpMethod, path?: string, option?: { applyTo: string | string[] }) {
    return decorate(<RouteDecorator & { [DecoratorId]: any }>{
        [DecoratorId]: RouteDecoratorID,
        name: "plumier-meta:route",
        method,
        url: path
    }, ["Class", "Method"], { allowMultiple: false, ...option })
}

function responseTransformer(target: Class | Class[] | ((x: any) => Class | Class[]), transformer: ResponseTransformer, opt?: { applyTo: string | string[] }) {
    return mergeDecorator(
        decorate(<ResponseTransformerDecorator>{ kind: "plumier-meta:response-transformer", transformer }, ["Method", "Class"], opt),
        responseType(target, opt)
    )
}

function getTransformer(type: Class, methodName: string) {
    const meta = reflect(type)
    const method = meta.methods.find(x => methodName === x.name)!
    return method.decorators.find((x: ResponseTransformerDecorator): x is ResponseTransformerDecorator => x.kind === "plumier-meta:response-transformer")?.transformer
}

function getOneCustomQuery(type: Class): GetOneCustomQueryFunction | undefined {
    const meta = reflect(type)
    const decorator = meta.decorators.find((x: GetOneCustomQueryDecorator): x is GetOneCustomQueryDecorator => x.kind === "plumier-meta:get-one-query")
    return decorator?.query
}

function getManyCustomQuery(type: Class): GetManyCustomQueryFunction | undefined {
    const meta = reflect(type)
    const decorator = meta.decorators.find((x: GetManyCustomQueryDecorator): x is GetManyCustomQueryDecorator => x.kind === "plumier-meta:get-many-query")
    return decorator?.query
}


export {
    GenericControllerDecorator, genericController, decorateRoute,
    responseTransformer, getTransformer, getOneCustomQuery, getManyCustomQuery,
    RouteDecoratorID,
    GetOneParams,
    GetOneCustomQueryFunction,
    GetOneCustomQueryDecorator,
    GetManyParams,
    GetManyCustomQueryFunction,
    GetManyCustomQueryDecorator,
    ResponseTransformer,
    ResponseTransformerDecorator,
}
