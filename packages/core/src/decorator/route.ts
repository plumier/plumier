import { decorate, decorateClass, DecoratorId } from "@plumier/reflect"

import { ControllerBuilder, updateGenericControllerRegistry } from "../controllers-helper"
import { IgnoreDecorator, RootDecorator, RouteDecorator } from "../route-generator"
import { HttpMethod } from "../types"


interface GenericControllerDecorator {
   name: "plumier-meta:controller"
   config: ((x: ControllerBuilder) => void) | undefined
}

interface ApplyToOption {
   /**
    * Ignore specific actions. Only work on controller scope ignore
    */
   applyTo?: string | string[]
}

interface RootRouteOption {
   map?: any
}

interface RouteOption extends RootRouteOption, ApplyToOption {
   path?: string
}

class RouteDecoratorImpl {
   private decorateRoute(method: HttpMethod, pathOrOption?: string | RouteOption, option?: RouteOption) {
      const opt = !!option ? { path: pathOrOption, ...option } : typeof pathOrOption === "string" ? { path: pathOrOption } : pathOrOption
      return decorate(<RouteDecorator>{ name: "plumier-meta:route", method, url: opt?.path, map: opt?.map },
         ["Class", "Method"],
         { applyTo: opt?.applyTo ?? [] })
   }
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
   post(): (...args: any[]) => void
   post(option: RouteOption): (...args: any[]) => void
   post(url: string, option?: RouteOption): (...args: any[]) => void
   post(url?: string | RouteOption, option?: RouteOption) { return this.decorateRoute("post", url, option) }

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
   get(): (...args: any[]) => void
   get(option: RouteOption): (...args: any[]) => void
   get(url: string, option?: RouteOption): (...args: any[]) => void
   get(url?: string | RouteOption, option?: RouteOption) { return this.decorateRoute("get", url, option) }

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
   put(): (...args: any[]) => void
   put(option: RouteOption): (...args: any[]) => void
   put(url: string, option?: RouteOption): (...args: any[]) => void
   put(url?: string | RouteOption, option?: RouteOption) { return this.decorateRoute("put", url, option) }

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
   delete(): (...args: any[]) => void
   delete(option: RouteOption): (...args: any[]) => void
   delete(url: string, option?: RouteOption): (...args: any[]) => void
   delete(url?: string | RouteOption, option?: RouteOption) { return this.decorateRoute("delete", url, option) }

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
   patch(): (...args: any[]) => void
   patch(option: RouteOption): (...args: any[]) => void
   patch(url: string, option?: RouteOption): (...args: any[]) => void
   patch(url?: string | RouteOption, option?: RouteOption) { return this.decorateRoute("patch", url, option) }

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
   head(): (...args: any[]) => void
   head(option: RouteOption): (...args: any[]) => void
   head(url: string, option?: RouteOption): (...args: any[]) => void
   head(url?: string | RouteOption, option?: RouteOption) { return this.decorateRoute("head", url, option) }

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
   trace(): (...args: any[]) => void
   trace(option: RouteOption): (...args: any[]) => void
   trace(url: string, option?: RouteOption): (...args: any[]) => void
   trace(url?: string | RouteOption, option?: RouteOption) { return this.decorateRoute("trace", url, option) }

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
   options(): (...args: any[]) => void
   options(option: RouteOption): (...args: any[]) => void
   options(url: string, option?: RouteOption): (...args: any[]) => void
   options(url?: string | RouteOption, option?: RouteOption) { return this.decorateRoute("options", url, option) }

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
   root(url: string, option?: RootRouteOption) { return decorateClass(<RootDecorator>{ name: "plumier-meta:root", url, map: option?.map }) }

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
   ignore(opt?: ApplyToOption) { return decorate(<IgnoreDecorator>{ [DecoratorId]: "route:ignore", name: "plumier-meta:ignore" }, ["Class", "Method", "Property", "Parameter"], { allowMultiple: false, ...opt }) }

   /**
    * Mark an entity will be handled by a generic CRUD controller
    */
   controller(opt?: string | ((x: ControllerBuilder) => void)) {
      const config = typeof opt === "string" ? (x:ControllerBuilder) => x.setPath(opt) : opt
      return decorate((...args: any[]) => {
         updateGenericControllerRegistry(args[0])
         return <GenericControllerDecorator>{ name: "plumier-meta:controller", config }
      })
   }
}

const route = new RouteDecoratorImpl()

export { route, RouteDecoratorImpl, GenericControllerDecorator }
