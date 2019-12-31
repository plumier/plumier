import Plumier, { WebApiFacility, WebApiFacilityOption } from "plumier"
import Cors from "@koa/cors"
import supertest from 'supertest'

import Koa from "koa"

describe("Cors", () => {
    class AnimalController {
        index() {
            return { message: "Hello world!" }
        }
    }

    function createApp(opt?: Cors.Options | boolean) {
        return new Plumier()
            .set({mode: "production"})
            .set(new WebApiFacility({ controller: AnimalController, cors: opt }))
            .initialize()
    }

    it("Should not active by default", async () => {
        const app = await createApp()
        const {header} = await supertest(app.callback())
            .get("/animal/index")
            .set("Origin", "http://plumierjs.com")
            .expect(200)
        expect(header["access-control-allow-origin"]).toBeUndefined()
    })

    it("Should provide default option if enabled", async () => {
        const app = await createApp(true)
        const {header} = await supertest(app.callback())
            .get("/animal/index")
            .set("Origin", "http://plumierjs.com")
            .expect(200)
        expect(header["access-control-allow-origin"]).toBe('http://plumierjs.com')
    })

    it("Should able to override option", async () => {
        const app = await createApp({origin: "http://plumierjs.com"})
        const {header: plumHeader} = await supertest(app.callback())
            .get("/animal/index")
            .set("Origin", "http://plumierjs.com")
            .expect(200)
        expect(plumHeader["access-control-allow-origin"]).toBe('http://plumierjs.com')
        const {header} = await supertest(app.callback())
            .get("/animal/index")
            .set("Origin", "http://google.com")
            .expect(200)
        expect(header["access-control-allow-origin"]).toBe('http://plumierjs.com')
    })
})