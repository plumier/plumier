import { HttpMethod, responseType, RouteDecorator } from "@plumier/core"
import reflect, { Class, decorate, DecoratorId, mergeDecorator } from "@plumier/reflect"

import { ControllerBuilder, GenericControllerConfiguration } from "./configuration"
import { updateGenericControllerRegistry } from "./helper"

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

type ResponseTransformer<S = any, D = any> = (s: S) => D

interface ResponseTransformerDecorator {
    kind: "plumier-meta:response-transformer",
    transformer: ResponseTransformer
}

interface GenericControllerDecorator {
    name: "plumier-meta:controller"
    config: ((x: ControllerBuilder) => void) | undefined
    target:Class
}

const RouteDecoratorID = Symbol("generic-controller:route")

// --------------------------------------------------------------------- //
// ----------------------------- DECORATORS ---------------------------- //
// --------------------------------------------------------------------- //

function genericController(opt?: string | GenericControllerConfiguration) {
    const config = typeof opt === "string" ? (x: ControllerBuilder) => x.setPath(opt) : opt
    return decorate((...args: any[]) => {
        updateGenericControllerRegistry(args[0])
        return <GenericControllerDecorator>{ target: args[0], name: "plumier-meta:controller", config }
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



export {
    GenericControllerDecorator, genericController, decorateRoute,
    responseTransformer, ResponseTransformer, ResponseTransformerDecorator,
    RouteDecoratorID,
}
