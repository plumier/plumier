import { IncomingHttpHeaders } from "http"
import { Context, Request } from "koa"
import { decorateParameter, decorateProperty, mergeDecorator, ParameterReflection } from "tinspector"
import createConverter, { Converter, ConverterMap } from "typedconverter"

import { getChildValue, isCustomClass } from "./common"
import { ValidatorDecorator, ValidatorId } from "./validator"

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- // 

interface BindingDecorator { type: "ParameterBinding", process: (ctx: Context) => any }
type RequestPart = keyof Request
type HeaderPart = keyof IncomingHttpHeaders

// --------------------------------------------------------------------- //
// ----------------------------- DECORATOR ----------------------------- //
// --------------------------------------------------------------------- //

namespace bind {

    function ctxDecorator(skip: boolean, part?: string) {
        const decorator = custom(ctx => part ? getChildValue(ctx, part) : ctx)
        if (skip) {
            const skipDecorator = decorateProperty(<ValidatorDecorator>{ type: "ValidatorDecorator", validator: ValidatorId.skip })
            return mergeDecorator(skipDecorator, decorator)
        }
        return decorator
    }

    /**
     * Bind Koa Context
     * 
     *    method(@bind.ctx() ctx:any) {}
     * 
     * Use dot separated string to access child property
     * 
     *    method(@bind.ctx("state.user") ctx:User) {}
     *    method(@bind.ctx("request.headers.ip") ip:string) {}
     *    method(@bind.ctx("body[0].id") id:string) {}
     * 
     * @param part part of context, use dot separator to access child property
     */
    export function ctx(part?: string) {
        return ctxDecorator(true, part)
    }

    /**
     * Bind Koa request to parameter
     * 
     *    method(@bind.request() req:Request){}
     * 
     * If parameter provided, part of request property will be bound
     * 
     *    method(@bind.request("method") httpMethod:string){}
     *    method(@bind.request("status") status:number){}
     * 
     * @param part part of request ex: body, method, query etc
     */
    export function request(part?: RequestPart) {
        return ctxDecorator(true, ["request", part].join("."))
    }

    /**
     * Bind request body to parameter
     *    
     *     method(@bind.body() body:AnimalDto){}
     * 
     * If parameter provided, part of body property will be bound
     * 
     *     method(@bind.body("name") name:string){}
     *     method(@bind.body("age") age:number){}
     */
    export function body(part?: string) {
        return ctxDecorator(false, ["request", "body", part].join("."))
    }

    /**
     * Bind request header to parameter
     *    
     *     method(@bind.header() header:any){}
     * 
     * If parameter provided, part of header property will be bound
     * 
     *     method(@bind.header("accept") accept:string){}
     *     method(@bind.header("cookie") age:any){}
     */
    export function header(key?: HeaderPart) {
        return ctxDecorator(false, ["request", "headers", key].join("."))
    }

    /**
     * Bind request query object to parameter
     *    
     *     method(@bind.query() query:any){}
     * 
     * If parameter provided, part of query property will be bound
     * 
     *     method(@bind.query("id") id:string){}
     *     method(@bind.query("type") type:string){}
     */
    export function query(name?: string) {
        return ctxDecorator(false, ["request", "query", name].join("."))
    }

    /**
     * Bind current login user to parameter
     *    
     *     method(@bind.user() user:User){}
     */
    export function user() {
        return ctxDecorator(false, "state.user")
    }

    /**
     * Bind file parser for multi part file upload. This function required `FileUploadFacility`
    ```
    @route.post()
    async method(@bind.file() file:FileParser){
        const info = await file.parse()
    }
    ```
     */
    export function file() {
        return decorateParameter(<BindingDecorator>{
            type: "ParameterBinding",
            process: ctx => {
                if (!ctx.config.fileParser) throw new Error("No file parser found in configuration")
                return ctx.config.fileParser(ctx)
            }
        })
    }

    /**
     * Bind custom part of Koa context into parameter
     * example:
     * 
     *    method(@bind.custom(ctx => ctx.request.body) data:Item){}
     * 
     * Can be used to create custom parameter binding
     * example: 
     * 
     *    function body(){ 
     *      return bind.custom(ctx => ctx.request.body)
     *    }
     * 
     * To use it: 
     * 
     *    method(@body() data:Item){}
     * 
     * @param process callback function to process the Koa context
     */
    export function custom(process: (ctx: Context) => any) {
        return decorateParameter(<BindingDecorator>{ type: "ParameterBinding", process })
    }
}


/* ------------------------------------------------------------------------------- */
/* ----------------------------- BINDER FUNCTIONS -------------------------------- */
/* ------------------------------------------------------------------------------- */

type Binder = (ctx: Context, par: ParameterReflection) => any
class Next { }


function getProperty(obj: any, key: string) {
    const realKey = Object.keys(obj).find(x => x.toLowerCase() === key.toLowerCase())
    return realKey && obj[realKey]
}

function bindBody(ctx: Context, par: ParameterReflection): any {
    return isCustomClass(par.type) || Array.isArray(par.type) ? ctx.request.body : undefined
}

function bindDecorator(ctx: Context, par: ParameterReflection): any {
    const decorator: BindingDecorator = par.decorators.find((x: BindingDecorator) => x.type == "ParameterBinding")
    if (!decorator) return new Next()
    return decorator.process(ctx)
}

function bindByName(ctx: Context, par: ParameterReflection): any {
    const { body, query } = ctx.request;
    const keys = Object.keys(query).concat(Object.keys(body!)).map(x => x.toLowerCase())
    if (keys.some(x => x === par.name.toLowerCase())) {
        return getProperty(query, par.name) || getProperty(body, par.name)
    }
    else return new Next()
}

function chain(...binder: Binder[]) {
    return (ctx: Context, par: ParameterReflection) => binder
        .reduce((a, b) => a instanceof Next ? b(ctx, par) : a, new Next())
}

function bindParameter(ctx: Context, converters?: ConverterMap[]) {
    const convert = createConverter({ converters, guessArrayElement: !!ctx.is("urlencoded") })
    return ctx.route!.action.parameters.map(((x, i) => {
        const binder = chain(bindDecorator, bindByName, bindBody)
        const result = binder(ctx, x)
        return convert(result, x.type, [x.name])
    }))
}

export { bindParameter, RequestPart, HeaderPart, bind }