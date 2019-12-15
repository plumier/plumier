import { route, domain, bind } from "@plumier/core"
import Plumier, { WebApiFacility } from '@plumier/plumier'
import supertest = require('supertest')
import { Context } from 'koa'
import { fixture } from '../../../test/helper'


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
            query(animalId:string, @bind.query() q: any) {
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
            query(animalId:string, @bind.ctx() q: Context) {
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

})