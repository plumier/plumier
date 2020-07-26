import { decorateClass, decorateMethod, decorate, DecoratorId } from "tinspector"

import { HttpMethod } from "../types"
import { IgnoreDecorator, RootDecorator, RouteDecorator } from "../route-generator"

interface IgnoreOption {
   /**
    * Ignore specific actions. Only work on controller scope ignore
    */
   action: string | string[]
}

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
   ignore(opt?: IgnoreOption) { return decorate(<IgnoreDecorator>{ [DecoratorId]: "route:ignore", name: "Ignore", action: opt?.action }, ["Class", "Method", "Property", "Parameter"], { allowMultiple: false }) }
}

const route = new RouteDecoratorImpl()

export { route, RouteDecoratorImpl }