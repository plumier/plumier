import { decorateParameter, mergeDecorator } from "@plumier/reflect"
import { GetOption } from "cookies"

import { BindingDecorator, CustomBinderFunction, HeaderPart, RequestPart } from "../binder"
import { getChildValue } from "../common"
import { api } from "./api"

export namespace bind {

    function ctxDecorator(name: string, part?: string) {
        return custom(ctx => part ? getChildValue(ctx, part) : ctx, name)
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
        return ctxDecorator("ctx", part)
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
        return ctxDecorator("request", ["request", part].join("."))
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
        return ctxDecorator("body", ["request", "body", part].join("."))
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
        return ctxDecorator("header", ["request", "headers", key].join("."))
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
        return ctxDecorator("query", ["request", "query", name].join("."))
    }

    /**
     * Bind current login user to parameter
     *    
     *     method(@bind.user() user:User){}
     * 
     * If parameter provided, part of query property will be bound
     * 
     *     method(@bind.user("userId") id:string){}
     *     method(@bind.user("role") role:string){}
     */
    export function user(part?: string) {
        return ctxDecorator("user", ["state", "user", part].join("."))
    }

    /**
     * Bind request cookie into parameter
     *    
     *     method(@bind.cookie("name") cookie:string){}
     */
    export function cookie(name: string, opt?: GetOption) {
        return bind.custom(ctx => ctx.cookies.get(name, opt), "cookie")
    }

    /**
     * Bind file upload into parameter
     *    
     *     method(@bind.formFile("file") cookie:FormFile){}
     */
    export function formFile(name: string): ParameterDecorator {
        return mergeDecorator(
            bind.custom(ctx => (ctx.request as any).files?.[name], "formFile") as any,
            api.name(name))
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
    export function custom(process: CustomBinderFunction, name: string = "custom") {
        return decorateParameter(<BindingDecorator>{ type: "ParameterBinding", process, name })
    }
}
