import { Context } from "koa"
import reflect, {
    decorate,
    decorateClass,
    decorateMethod,
    decorateParameter,
    decorateProperty,
    mergeDecorator,
} from "tinspector"

import { AuthorizeCallback, AuthorizeDecorator, AuthorizeMetadataInfo } from "./authorization"
import { BindingDecorator, HeaderPart, RequestPart } from "./binder"
import { getChildValue } from "./common"
import { errorMessage } from "./error-message"
import { KoaMiddleware, Middleware, MiddlewareDecorator, MiddlewareUtil } from "./middleware"
import { HttpMethod, IgnoreDecorator, RootDecorator, RouteDecorator } from "./route-generator"
import { ValidatorDecorator, ValidatorId } from "./validator"

// --------------------------------------------------------------------- //
// ------------------------------- DOMAIN ------------------------------ //
// --------------------------------------------------------------------- //

function domain() { return reflect.parameterProperties() }

// --------------------------------------------------------------------- //
// ----------------------------- MIDDLEWARE ---------------------------- //
// --------------------------------------------------------------------- //

namespace middleware {
    export function use(...middleware: (Middleware | KoaMiddleware)[]) {
        const mdw = middleware.map(x => typeof x == "function" ? MiddlewareUtil.fromKoa(x) : x).reverse()
        const value: MiddlewareDecorator = { name: "Middleware", value: mdw }
        return decorate(value, ["Class", "Method"])
    }

}

// --------------------------------------------------------------------- //
// ----------------------------- AUTHORIZE ----------------------------- //
// --------------------------------------------------------------------- //

class AuthDecoratorImpl {

    custom(authorize: string | AuthorizeCallback, tag: string = "Custom") {
        return decorate((...args: any[]) => {
            const type = args.length === 1 ? "Class" : args.length === 2 ? "Method" : "Parameter"
            return <AuthorizeDecorator>{
                type: "plumier-meta:authorize", tag,
                authorize: typeof authorize === "string" ? authorize : (info: AuthorizeMetadataInfo) => authorize(info, type),
            }
        }, ["Class", "Parameter", "Method", "Property"])
    }

    /**
     * Authorize controller/action to public
     */
    public() {
        return decorate((...args: any[]) => {
            if (args.length === 3 && typeof args[2] === "number")
                throw new Error(errorMessage.PublicNotInParameter)
            return <AuthorizeDecorator>{ type: "plumier-meta:authorize", tag: "Public" }
        }, ["Class", "Parameter", "Method", "Property"])
    }

    /**
     * Authorize controller/action accessible by specific role
     * @param roles List of roles allowed
     */
    role(...roles: string[]) {
        const roleDecorator = this.custom(async (info, location) => {
            const { role, value } = info
            const isAuthorized = roles.some(x => role.some(y => x === y))
            return location === "Parameter" ? !!value && isAuthorized : isAuthorized
        }, roles.join("|"))
        const optionalDecorator = (...args: any[]) => {
            if (args.length === 3 && typeof args[2] === "number")
                decorateParameter(<ValidatorDecorator>{ type: "ValidatorDecorator", validator: ValidatorId.optional })(args[0], args[1], args[2])
        }
        return mergeDecorator(roleDecorator, optionalDecorator)
    }
}

const authorize = new AuthDecoratorImpl()

// --------------------------------------------------------------------- //
// -------------------------------- BIND ------------------------------- //
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


// --------------------------------------------------------------------- //
// ----------------------------- DECORATOR ----------------------------- //
// --------------------------------------------------------------------- //

class RouteDecoratorImpl {
    private decorateRoute(method: HttpMethod, url?: string) { return decorateMethod(<RouteDecorator>{ name: "Route", method, url }) }
    /**
     * Mark method as POST method http handler
     ```
     class AnimalController{
        @route.post()
        method(id:number){}
     }
     //result: POST /animal/method?id=<number>
     ```
     * Override method name with absolute url
     ```
     class AnimalController{
        @route.post("/beast/:id")
        method(id:number){}
     }
     //result: POST /beast/:id
     ```
     * Override method name with relative url
     ```
     class AnimalController{
        @route.post("get")
        method(id:number){}
     }
     //result: POST /animal/get?id=<number>
     ```
     * @param url url override
     */
    post(url?: string) { return this.decorateRoute("post", url) }

    /**
     * Mark method as GET method http handler
     ```
     class AnimalController{
        @route.get()
        method(id:number){}
     }
     //result: GET /animal/method?id=<number>
     ```
     * Override method name with absolute url
     ```
     class AnimalController{
        @route.get("/beast/:id")
        method(id:number){}
     }
     //result: GET /beast/:id
     ```
     * Override method name with relative url
     ```
     class AnimalController{
        @route.get("get")
        method(id:number){}
     }
     //result: GET /animal/get?id=<number>
     ```
     * @param url url override
     */
    get(url?: string) { return this.decorateRoute("get", url) }

    /**
     * Mark method as PUT method http handler
     ```
     class AnimalController{
        @route.put()
        method(id:number){}
     }
     //result: PUT /animal/method?id=<number>
     ```
     * Override method name with absolute url
     ```
     class AnimalController{
        @route.put("/beast/:id")
        method(id:number){}
     }
     //result: PUT /beast/:id
     ```
     * Override method name with relative url
     ```
     class AnimalController{
        @route.put("get")
        method(id:number){}
     }
     //result: PUT /animal/get?id=<number>
     ```
     * @param url url override
     */
    put(url?: string) { return this.decorateRoute("put", url) }

    /**
     * Mark method as DELETE method http handler
     ```
     class AnimalController{
        @route.delete()
        method(id:number){}
     }
     //result: DELETE /animal/method?id=<number>
     ```
     * Override method name with absolute url
     ```
     class AnimalController{
        @route.delete("/beast/:id")
        method(id:number){}
     }
     //result: DELETE /beast/:id
     ```
     * Override method name with relative url
     ```
     class AnimalController{
        @route.delete("get")
        method(id:number){}
     }
     //result: DELETE /animal/get?id=<number>
     ```
     * @param url url override
     */
    delete(url?: string) { return this.decorateRoute("delete", url) }

    /**
     * Mark method as PATCH method http handler
     ```
     class AnimalController{
        @route.patch()
        method(id:number){}
     }
     //result: PATCH /animal/method?id=<number>
     ```
     * Override method name with absolute url
     ```
     class AnimalController{
        @route.patch("/beast/:id")
        method(id:number){}
     }
     //result: PATCH /beast/:id
     ```
     * Override method name with relative url
     ```
     class AnimalController{
        @route.patch("get")
        method(id:number){}
     }
     //result: PATCH /animal/get?id=<number>
     ```
     * @param url url override
     */
    patch(url?: string) { return this.decorateRoute("patch", url) }

    /**
     * Mark method as HEAD method http handler
     ```
     class AnimalController{
        @route.head()
        method(id:number){}
     }
     //result: HEAD /animal/method?id=<number>
     ```
     * Override method name with absolute url
     ```
     class AnimalController{
        @route.head("/beast/:id")
        method(id:number){}
     }
     //result: HEAD /beast/:id
     ```
     * Override method name with relative url
     ```
     class AnimalController{
        @route.head("get")
        method(id:number){}
     }
     //result: HEAD /animal/get?id=<number>
     ```
     * @param url url override
     */
    head(url?: string) { return this.decorateRoute("head", url) }

    /**
     * Mark method as TRACE method http handler
     ```
     class AnimalController{
        @route.trace()
        method(id:number){}
     }
     //result: TRACE /animal/method?id=<number>
     ```
     * Override method name with absolute url
     ```
     class AnimalController{
        @route.trace("/beast/:id")
        method(id:number){}
     }
     //result: TRACE /beast/:id
     ```
     * Override method name with relative url
     ```
     class AnimalController{
        @route.trace("get")
        method(id:number){}
     }
     //result: TRACE /animal/get?id=<number>
     ```
     * @param url url override
     */
    trace(url?: string) { return this.decorateRoute("trace", url) }

    /**
     * Mark method as OPTIONS method http handler
     ```
     class AnimalController{
        @route.options()
        method(id:number){}
     }
     //result: OPTIONS /animal/method?id=<number>
     ```
     * Override method name with absolute url
     ```
     class AnimalController{
        @route.options("/beast/:id")
        method(id:number){}
     }
     //result: OPTIONS /beast/:id
     ```
     * Override method name with relative url
     ```
     class AnimalController{
        @route.options("get")
        method(id:number){}
     }
     //result: OPTIONS /animal/get?id=<number>
     ```
     * @param url url override
     */
    options(url?: string) { return this.decorateRoute("options", url) }

    /**
     * Override controller name on route generation
     ```
     @route.root("/beast")
     class AnimalController{
        @route.get()
        method(id:number){}
     }
     //result: GET /beast/method?id=<number>
     ```
     * Parameterized root, useful for nested Restful resource
     ```
     @route.root("/beast/:type/bunny")
     class AnimalController{
        @route.get(":id")
        method(type:string, id:number){}
     }
     //result: GET /beast/:type/bunny/:id
     ```
     * @param url url override
     */
    root(url: string) { return decorateClass(<RootDecorator>{ name: "Root", url }) }

    /**
     * Ignore method from route generation
     ```
     class AnimalController{
        @route.get()
        method(id:number){}
        @route.ignore()
        otherMethod(type:string, id:number){}
     }
     //result: GET /animal/method?id=<number>
     //otherMethod not generated
     ```
     */
    ignore() { return decorateMethod(<IgnoreDecorator>{ name: "Ignore" }) }
}

const route = new RouteDecoratorImpl()

export { authorize, AuthDecoratorImpl, bind, domain, middleware, route, RouteDecoratorImpl }