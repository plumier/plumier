import { ActionResult, Class, Configuration, DefaultConfiguration, HttpStatusError, route } from "@plumjs/core";
import Koa, { Context } from "koa";
import BodyParser from "koa-bodyparser";
import Supertest from "supertest";

import { ActionInvocation, RouteContext } from "../../../src/application";
import { bindParameter } from "../../../src/binder";
import { transformController } from "../../../src/router";


function fixture(controller: Class, config?: Partial<Configuration>) {
    return async (ctx: Context) => {
        const ctlRoute = transformController(controller)
        ctx.route = ctlRoute[0]
        ctx.config = Object.assign(DefaultConfiguration, config)
        ctx.parameters = bindParameter(ctx, ctlRoute[0].action, ctx.config.converters)
        const invocation = new ActionInvocation(<RouteContext>ctx)
        const result = await invocation.proceed()
        result.execute(ctx)
    }
}

describe("Action Invocation", () => {
    it("Should invoke action", async () => {
        class AnimalController {
            @route.get()
            getAnimal() {
                return { body: "The Body" }
            }
        }

        const app = new Koa()
        app.use(fixture(AnimalController))
        await Supertest(app.callback())
            .get("/")
            .expect(200, { body: "The Body" })
    })

    it("Should able to return action result", async () => {
        class AnimalController {
            @route.get()
            getAnimal() {
                return new ActionResult({ body: "Custom Body" }, 201)
            }
        }

        const app = new Koa()
        app.use(fixture(AnimalController))
        await Supertest(app.callback())
            .get("/")
            .expect(201, { body: "Custom Body" })
    })

    it("Should able to return action result without status", async () => {
        class AnimalController {
            @route.get()
            getAnimal() {
                return new ActionResult({ body: "Custom Body" })
            }
        }

        const app = new Koa()
        app.use(fixture(AnimalController))
        await Supertest(app.callback())
            .get("/")
            .expect(200, { body: "Custom Body" })
    })

    it("Should able to use async method", async () => {
        class AnimalController {
            @route.get()
            async getAnimal() {
                await new Promise(resolve => setTimeout(resolve, 10))
                return { body: "The Body" }
            }
        }

        const app = new Koa()
        app.use(fixture(AnimalController))
        await Supertest(app.callback())
            .get("/")
            .expect(200, { body: "The Body" })
    })

    it("Should invoke action with parameter binding", async () => {
        class AnimalController {
            @route.get()
            getAnimal(id: number) {
                return { id: id }
            }
        }

        const app = new Koa()
        app.use(fixture(AnimalController))
        await Supertest(app.callback())
            .get("/?id=474747")
            .expect(200, { id: 474747 })
    })

    it("Should invoke action with model binding", async () => {
        class AnimalModel {
            constructor(
                public id: number,
                public name: string
            ) { }
        }
        class AnimalController {
            @route.post()
            getAnimal(data: AnimalModel) {
                return data
            }
        }

        const app = new Koa()
        app.use(BodyParser())
        app.use(fixture(AnimalController))
        await Supertest(app.callback())
            .post("/")
            .send({ id: 474747, name: "Mimi" })
            .expect(200, { id: 474747, name: "Mimi" })
    })

    it("Should invoke action with model binding and parameter binding", async () => {
        class AnimalModel {
            constructor(
                public id: number,
                public name: string
            ) { }
        }
        class AnimalController {
            @route.put()
            getAnimal(type: string, data: AnimalModel) {
                return { ...data, type }
            }
        }

        const app = new Koa()
        app.use(BodyParser())
        app.use(fixture(AnimalController))
        await Supertest(app.callback())
            .post("/?type=Canine")
            .send({ id: 474747, name: "Mimi" })
            .expect(200, { id: 474747, name: "Mimi", type: "Canine" })
    })

    it("Should able to throw error from inside action", async () => {
        class AnimalController {
            @route.get()
            getAnimal(id: number) {
                throw new HttpStatusError(400)
            }
        }

        const app = new Koa()
        app.use(async (ctx, next) => {
            try {
                await next()
            } catch (e) {
                ctx.throw(e.status, e.message)
            }
        })
        app.use(fixture(AnimalController))

        await Supertest(app.callback())
            .get("/?id=474747")
            .expect(400)
    })

})