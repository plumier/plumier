import Koa from "koa";
import Supertest from "supertest";
import Ptr from "path-to-regexp"

import { Configuration, route } from "../../src";
import { Class, DefaultDependencyResolver } from "../../src/framework";
import { router, transformController } from "../../src/router";

function fixture(controller: Class) {
    const route = transformController(controller)
    const app = new Koa()
    const configuration = <Configuration>{ dependencyResolver: new DefaultDependencyResolver() }
    app.use(router(route, configuration, async ctx => {
        ctx.body = "OK"
    }))
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