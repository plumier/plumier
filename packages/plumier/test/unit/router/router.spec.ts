import {
    ActionResult,
    Class,
    Configuration,
    DefaultDependencyResolver,
    HttpStatusError,
    Invocation,
    route,
} from "@plumier/core"
import Plumier from "../../../src"
import Koa from "koa"
import Supertest from "supertest"

import { router, transformController } from "../../../src/router"

class DummyInvocation implements Invocation {
    constructor(public context: Readonly<Koa.Context>) { }
    async proceed() {
        if (!this.context.route) throw new HttpStatusError(404)
        return new ActionResult("OK")
    }
}


describe("Router", () => {
    describe("Basic Route Functions", () => {

        function fixture(controller: Class) {
            const route = transformController(controller)
            const app = new Koa()
            const configuration = <Configuration>{ dependencyResolver: new DefaultDependencyResolver() }
            app.use(router(route, configuration, ctx => new DummyInvocation(ctx)))
            return app
        }

        it("Should route basic controller", async () => {
            class AnimalController {
                get(id: number) { }
            }
            const app = fixture(AnimalController)
            await Supertest(app.callback())
                .get("/animal/get?id=1234")
                .expect(200, "OK")
        })
        it("Should route controller with param", async () => {
            class AnimalController {
                @route.get(":id")
                get(id: number) { }
            }
            const app = fixture(AnimalController)
            await Supertest(app.callback())
                .get("/animal/1234")
                .expect(200, "OK")
        })
        it("Should route controller with root", async () => {
            @route.root("/beast/:type/animal")
            class AnimalController {
                @route.get(":id")
                get(type: string, id: string) { }
            }
            const app = fixture(AnimalController)
            await Supertest(app.callback())
                .get("/beast/bat/animal/rabbit")
                .expect(200, "OK")
        })

        it("Should pass to next middleware if no match", async () => {
            class AnimalController {
                @route.get(":id")
                get(id: number) { }
            }
            const app = fixture(AnimalController)
            await Supertest(app.callback())
                .get("/beast/rabbit")
                .expect(404)
        })

        it("Should able to handle multiple routes", async () => {
            class AnimalController {
                get() { }
                list() { }
                @route.post()
                save() { }
                @route.put()
                modify() { }
                @route.delete()
                delete() { }
            }
            const app = fixture(AnimalController)
            await Supertest(app.callback())
                .get("/animal/get")
                .expect("OK")
            await Supertest(app.callback())
                .get("/animal/list")
                .expect("OK")
            await Supertest(app.callback())
                .post("/animal/save")
                .expect("OK")
            await Supertest(app.callback())
                .put("/animal/modify")
                .expect("OK")
            await Supertest(app.callback())
                .delete("/animal/delete")
                .expect("OK")
        })
    })

    describe("Middleware function", () => {
        class AnimalController {
            @route.get()
            get(id: number) { }
        }

        function fixture(mdw: (i: Invocation) => Promise<ActionResult>) {
            const app = new Plumier()
            app.set({ controller: AnimalController, mode: "production" })
            app.use({ execute: mdw })
            return app.initialize()
        }

        it("Should able to get controller metadata from middleware context", async () => {
            const fn = jest.fn((a) => { })
            const app = await fixture(async x => {
                fn(x.context.route)
                return x.proceed()
            })
            await Supertest(app.callback())
                .get("/animal/get?id=1234")
                .expect(200, "OK")
            expect(fn.mock.calls[0][0]).toMatchObject({
                method: 'get',
                url: '/animal/get',
                action: { name: 'get' },
                controller: { name: 'AnimalController' }
            })
        })

        it("Should able to get passed parameter from middleware context", async () => {
            const fn = jest.fn((a) => { })
            const app = await fixture(async x => {
                fn(x.context.parameters)
                return x.proceed()
            })
            await Supertest(app.callback())
                .get("/animal/get?id=1234")
                .expect(200, "OK")
            expect(fn.mock.calls[0][0]).toMatchObject([1234])
        })

        it("Should execute global middleware on 404", async () => {
            const fn = jest.fn((a) => { })
            const app = await fixture(async x => {
                fn(x.context.route)
                return x.proceed()
            })
            await Supertest(app.callback())
                .get("/nohandler")
                .expect(404)
            expect(fn.mock.calls[0][0]).toBeUndefined()
        })

        it("Should able to handle route from middleware", async () => {
            const app = await fixture(async x => {
                if (x.context.path.toLowerCase() === "/nohandler")
                    return new ActionResult("OK")
                else 
                    throw new HttpStatusError(404)
            })
            await Supertest(app.callback())
                .get("/nohandler")
                .expect(200, "OK")
        })
    })

})