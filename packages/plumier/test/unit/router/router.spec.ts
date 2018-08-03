import Koa from "koa";
import Supertest from "supertest";

import { Configuration, route } from "../../../src";
import { Class, DefaultDependencyResolver, Invocation, ActionResult } from "@plumjs/core";
import { router, transformController } from "../../../src/router";

class DummyInvocation implements Invocation{
    constructor(public context: Readonly<Koa.Context>){}
    async proceed(){
        return new ActionResult("OK")
    }
}

function fixture(controller: Class) {
    const route = transformController(controller)
    const app = new Koa()
    const configuration = <Configuration>{ dependencyResolver: new DefaultDependencyResolver() }
    app.use(router(route, configuration, ctx => new DummyInvocation(ctx)))
    return app.callback()
}

describe("Router", () => {
    it("Should route basic controller", async () => {
        class AnimalController {
            get(id: number) { }
        }
        const app = fixture(AnimalController)
        await Supertest(app)
            .get("/animal/get?id=1234")
            .expect(200, "OK")
    })
    it("Should route controller with param", async () => {
        class AnimalController {
            @route.get(":id")
            get(id: number) { }
        }
        const app = fixture(AnimalController)
        await Supertest(app)
            .get("/animal/1234")
            .expect(200, "OK")
    })
    it("Should route controller with root", async () => {
        @route.root("/beast/:type/animal")
        class AnimalController {
            @route.get(":id")
            get(id: number) { }
        }
        const app = fixture(AnimalController)
        await Supertest(app)
            .get("/beast/bat/animal/rabbit")
            .expect(200, "OK")
    })

    it("Should pass to next middleware if no match", async () => {
        class AnimalController {
            @route.get(":id")
            get(id: number) { }
        }
        const app = fixture(AnimalController)
        await Supertest(app)
            .get("/beast/rabbit")
            .expect(404)
    })

    it("Should able to handle multiple routes", async () => {
        class AnimalController {
            get() { }
            list() { }
            @route.post()
            save() {}
            @route.put()
            modify(){}
            @route.delete()
            delete(){}
        }
        const app = fixture(AnimalController)
        await Supertest(app)
            .get("/animal/get")
            .expect("OK")
        await Supertest(app)
            .get("/animal/list")
            .expect("OK")
        await Supertest(app)
            .post("/animal/save")
            .expect("OK")
        await Supertest(app)
            .put("/animal/modify")
            .expect("OK")
        await Supertest(app)
            .delete("/animal/delete")
            .expect("OK")
    }) 
})