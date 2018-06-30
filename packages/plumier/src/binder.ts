import Koa, { Request } from "koa";

import { BindingDecorator, RouteDecorator, TypeConverter } from "./framework";
import { decorateClass, FunctionReflection, getDecorators, ParameterReflection } from "./libs/reflect";

/* ------------------------------------------------------------------------------- */
/* ------------------------------- CONVERTER ------------------------------------- */
/* ------------------------------------------------------------------------------- */

function booleanConverter(value: any) {
    return ["on", "true", "1", "yes"].some(x => value.toLocaleLowerCase() == x)
}

const defaultConverter: TypeConverter = {
    Number: Number,
    Boolean: booleanConverter,
}

function convert(value: any, converters?: TypeConverter, type?: Function) {
    const merge: TypeConverter = { ...defaultConverter, ...converters }
    const converter = merge[type ? type.name : ""]
    return converter ? converter(value) : value
}

/* ------------------------------------------------------------------------------- */
/* ----------------------------- MODEL BINDER ------------------------------------ */
/* ------------------------------------------------------------------------------- */

export function model() {
    return decorateClass({ type: "Model" })
}

function bindModel(action: FunctionReflection, request: Request, par: ParameterReflection): object | undefined {
    const decorator = getDecorators(par.typeAnnotation || {})
    const isModel = decorator.length > 0 && decorator[0].value.type == "Model"
    const routeDecorator: RouteDecorator | undefined = action.decorators.find((x: RouteDecorator) => x.name == "Route")
    const isPostOrPut = routeDecorator && (routeDecorator.method == "post" || routeDecorator.method == "put")
    if (par.typeAnnotation && isModel && isPostOrPut) {
        const instance = new par.typeAnnotation()
        Object.assign(instance, request.body)
        return instance
    }
}

/* ------------------------------------------------------------------------------- */
/* ------------------------ DECORATOR PARAMETER BINDER --------------------------- */
/* ------------------------------------------------------------------------------- */


function bindDecorator(action: FunctionReflection, request: Request, par: ParameterReflection): object | string | undefined {
    const decorator: BindingDecorator = par.decorators.find((x: BindingDecorator) => x.type == "ParameterBinding")
    if (decorator) {
        switch (decorator.name) {
            case "Body":
                return decorator.part ? request.body && (<any>request.body)[decorator.part] : request.body
            case "Query":
                return decorator.part ? request.query && request.query[decorator.part] : request.query
            case "Header":
                return decorator.part ? request.headers && request.headers[decorator.part] : request.headers
            case "Request":
                return decorator.part ? request[decorator.part] : request
        }
    }
}

/* ------------------------------------------------------------------------------- */
/* -------------------------- REGULAR PARAMETER BINDER --------------------------- */
/* ------------------------------------------------------------------------------- */

function bindRegular(action: FunctionReflection, request: Request, par: ParameterReflection): object | undefined {
    return request.query[par.name]
}

/* ------------------------------------------------------------------------------- */
/* -------------------------- MAIN PARAMETER BINDER --------------------------- */
/* ------------------------------------------------------------------------------- */

export function bindParameter(request: Request, action: FunctionReflection, converter?: TypeConverter) {
    return action.parameters.map(x => {
        const value = bindDecorator(action, request, x)
            || bindModel(action, request, x)
            || bindRegular(action, request, x)
        return convert(value, converter, x.typeAnnotation)
    })
}