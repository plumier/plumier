import { bind, DefaultFacility, generateRoutes, PlumierApplication, route } from "@plumier/core"
import Plumier from "plumier"
import { Context } from "koa"
import supertest = require("supertest")
import reflect from "@plumier/reflect"

import { fixture } from "../helper"


describe("Request Query", () => {

    function createResult(q: any) {
        return {
            property: {
                lower: q.animalid,
                upper: q.ANIMALID,
            },
            associative: {
                lower: q["animalid"],
                upper: q["ANIMALID"]
            },
        }
    }

    it("Should not cache query", async () => {
        class AnimalController {
            query(@bind.query() q: any) {
                return q
            }

        }
        const app = await fixture(AnimalController)
        const koa = await app.initialize()
        await supertest(koa.callback())
            .get("/animal/query?data=123")
            .expect(200, { data: "123" })
        await supertest(koa.callback())
            .get("/animal/query?data=456")
            .expect(200, { data: "456" })
    })

    it("Should not cache query parameter", async () => {
        class AnimalController {
            @route.get(":id")
            query(id: number) {
                return { id }
            }
        }
        const app = await fixture(AnimalController)
        const koa = await app.initialize()
        await supertest(koa.callback())
            .get("/animal/123")
            .expect(200, { id: 123 })
        await supertest(koa.callback())
            .get("/animal/456")
            .expect(200, { id: 456 })
    })

    it("Should accessible case insensitively from ctx.request.query", async () => {
        class AnimalController {
            @route.get("")
            query(@bind.query() q: any) {
                return createResult(q)
            }
        }
        const app = await fixture(AnimalController)
        const koa = await app.initialize()
        await supertest(koa.callback())
            .get("/animal?animalId=123")
            .expect(200, {
                property: { lower: '123', upper: '123' },
                associative: { lower: '123', upper: '123' }
            })
    })

    it("Should accessible case insensitively from ctx.query", async () => {
        class AnimalController {
            @route.get("")
            query(@bind.ctx() q: Context) {
                return createResult(q.query)
            }
        }
        const app = await fixture(AnimalController)
        const koa = await app.initialize()
        await supertest(koa.callback())
            .get("/animal?animalId=123")
            .expect(200, {
                property: { lower: '123', upper: '123' },
                associative: { lower: '123', upper: '123' }
            })
    })

    it("Query parameter should accessible case insensitively from ctx.request.query", async () => {
        class AnimalController {
            @route.get(":animalId")
            query(animalId: string, @bind.query() q: any) {
                return createResult(q)
            }
        }
        const app = await fixture(AnimalController)
        const koa = await app.initialize()
        await supertest(koa.callback())
            .get("/animal/123")
            .expect(200, {
                property: { lower: '123', upper: '123' },
                associative: { lower: '123', upper: '123' }
            })
    })

    it("Query parameter should accessible case insensitively from ctx.query", async () => {
        class AnimalController {
            @route.get(":animalId")
            query(animalId: string, @bind.ctx() q: Context) {
                return createResult(q.query)
            }
        }
        const app = await fixture(AnimalController)
        const koa = await app.initialize()
        await supertest(koa.callback())
            .get("/animal/123")
            .expect(200, {
                property: { lower: '123', upper: '123' },
                associative: { lower: '123', upper: '123' }
            })
    })

    it("Should able to pass object on query using square bracket", async () => {
        @reflect.parameterProperties()
        class Query {
            constructor(
                public num: number,
                public str: string
            ) { }
        }
        class AnimalController {
            @route.get()
            query(data: Query) {
                return data
            }
        }
        const app = await fixture(AnimalController)
        const koa = await app.initialize()
        await supertest(koa.callback())
            .get("/animal/query?data[num]=123&data[str]=abcd")
            .expect(200, { num: 123, str: "abcd" })
    })

    it("Should able to pass array on query using square bracket", async () => {
        class AnimalController {
            query(@bind.query() q: any) {
                return q
            }

        }
        const app = await fixture(AnimalController)
        const koa = await app.initialize()
        await supertest(koa.callback())
            .get("/animal/query?data[]=123&data[]=abcd")
            .expect(200, { data: ["123", "abcd"] })
    })

    it("Should not error when no addQuery logic provided", async () => {
        class MyFacility extends DefaultFacility {
            async generateRoutes(app: Readonly<PlumierApplication>) {
                const { controller } = app.config
                return generateRoutes(controller, { ...app.config })
            }
        }
        class AnimalController {
            query(@bind.query() q: any) {
                return q
            }
        }
        const app = await new Plumier()
            .set(new MyFacility())
            .set({ controller: AnimalController, mode: "production" })
        const koa = await app.initialize()
        await supertest(koa.callback())
            .get("/animal/query?data=123&data=abcd")
            .expect(200, { data: ["123", "abcd"] })
    })
})