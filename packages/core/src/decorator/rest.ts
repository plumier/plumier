import { RouteDecoratorImpl } from "./route";


class RestDecoratorImpl extends RouteDecoratorImpl {
    /**
     * Mark method as POST method http handler and ignore the method name
     ```
     class AnimalController{
        @rest.post()
        method(id:number){}
     }
     //result: POST /animal?id=<number>
     ```
     * Override method name with absolute url
     ```
     class AnimalController{
        @rest.post("/beast/:id")
        method(id:number){}
     }
     //result: POST /beast/:id
     ```
     * Override method name with relative url
     ```
     class AnimalController{
        @rest.post("get")
        method(id:number){}
     }
     //result: POST /animal/get?id=<number>
     ```
     * @param url url override
     */
    post(url: string = "") { return super.post(url) }

    /**
     * Mark method as GET method http handler and ignore the method name
     ```
     class AnimalController{
        @rest.get()
        method(id:number){}
     }
     //result: GET /animal?id=<number>
     ```
     * Override method name with absolute url
     ```
     class AnimalController{
        @rest.get("/beast/:id")
        method(id:number){}
     }
     //result: GET /beast/:id
     ```
     * Override method name with relative url
     ```
     class AnimalController{
        @rest.get("get")
        method(id:number){}
     }
     //result: GET /animal/get?id=<number>
     ```
     * @param url url override
     */
    get(url: string = "") { return super.get(url) }

    /**
     * Mark method as PUT method http handler and ignore the method name
     ```
     class AnimalController{
        @rest.put()
        method(id:number){}
     }
     //result: PUT /animal?id=<number>
     ```
     * Override method name with absolute url
     ```
     class AnimalController{
        @rest.put("/beast/:id")
        method(id:number){}
     }
     //result: PUT /beast/:id
     ```
     * Override method name with relative url
     ```
     class AnimalController{
        @rest.put("get")
        method(id:number){}
     }
     //result: PUT /animal/get?id=<number>
     ```
     * @param url url override
     */
    put(url: string = "") { return super.put(url) }

    /**
     * Mark method as DELETE method http handler and ignore the method name
     ```
     class AnimalController{
        @rest.delete()
        method(id:number){}
     }
     //result: DELETE /animal?id=<number>
     ```
     * Override method name with absolute url
     ```
     class AnimalController{
        @rest.delete("/beast/:id")
        method(id:number){}
     }
     //result: DELETE /beast/:id
     ```
     * Override method name with relative url
     ```
     class AnimalController{
        @rest.delete("get")
        method(id:number){}
     }
     //result: DELETE /animal/get?id=<number>
     ```
     * @param url url override
     */
    delete(url: string = "") { return super.delete(url) }

    /**
     * Mark method as PATCH method http handler and ignore the method name
     ```
     class AnimalController{
        @rest.patch()
        method(id:number){}
     }
     //result: PATCH /animal?id=<number>
     ```
     * Override method name with absolute url
     ```
     class AnimalController{
        @rest.patch("/beast/:id")
        method(id:number){}
     }
     //result: PATCH /beast/:id
     ```
     * Override method name with relative url
     ```
     class AnimalController{
        @rest.patch("get")
        method(id:number){}
     }
     //result: PATCH /animal/get?id=<number>
     ```
     * @param url url override
     */
    patch(url: string = "") { return super.patch(url) }

    /**
     * Mark method as HEAD method http handler and ignore the method name
     ```
     class AnimalController{
        @rest.head()
        method(id:number){}
     }
     //result: HEAD /animal?id=<number>
     ```
     * Override method name with absolute url
     ```
     class AnimalController{
        @rest.head("/beast/:id")
        method(id:number){}
     }
     //result: HEAD /beast/:id
     ```
     * Override method name with relative url
     ```
     class AnimalController{
        @rest.head("get")
        method(id:number){}
     }
     //result: HEAD /animal/get?id=<number>
     ```
     * @param url url override
     */
    head(url: string = "") { return super.head(url) }

    /**
     * Mark method as TRACE method http handler and ignore the method name
     ```
     class AnimalController{
        @rest.trace()
        method(id:number){}
     }
     //result: TRACE /animal?id=<number>
     ```
     * Override method name with absolute url
     ```
     class AnimalController{
        @rest.trace("/beast/:id")
        method(id:number){}
     }
     //result: TRACE /beast/:id
     ```
     * Override method name with relative url
     ```
     class AnimalController{
        @rest.trace("get")
        method(id:number){}
     }
     //result: TRACE /animal/get?id=<number>
     ```
     * @param url url override
     */
    trace(url: string = "") { return super.trace(url) }

    /**
     * Mark method as OPTIONS method http handler and ignore the method name
     ```
     class AnimalController{
        @rest.options()
        method(id:number){}
     }
     //result: OPTIONS /animal?id=<number>
     ```
     * Override method name with absolute url
     ```
     class AnimalController{
        @rest.options("/beast/:id")
        method(id:number){}
     }
     //result: OPTIONS /beast/:id
     ```
     * Override method name with relative url
     ```
     class AnimalController{
        @rest.options("get")
        method(id:number){}
     }
     //result: OPTIONS /animal/get?id=<number>
     ```
     * @param url url override
     */
    options(url: string = "") { return super.options(url) }

}

const rest = new RestDecoratorImpl()

export { rest, RestDecoratorImpl }