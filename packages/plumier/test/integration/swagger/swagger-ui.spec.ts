import { SwaggerFacility, SwaggerFacilityConfiguration } from "@plumier/swagger"
import Plumier, { Class, WebApiFacility } from "plumier"
import supertest = require("supertest")

export function appStub(controller: Class | Class[] | string, opt?: SwaggerFacilityConfiguration) {
    return new Plumier()
        .set({ mode: "production" })
        .set(new WebApiFacility({ controller }))
        .set(new SwaggerFacility(opt))
        .initialize()
}

describe("Swagger UI Hosting", () => {
    it("Should host swagger ui", async () => {
        class AnimalController {
            index() { }
        }
        const app = await appStub(AnimalController)
        await supertest(app.callback())
            .get("/swagger/index.js")
            .expect(200)
        await supertest(app.callback())
            .get("/swagger/swagger-ui.js")
            .expect(200)
        const { text } = await supertest(app.callback())
            .get("/swagger/index")
            .expect(200)
        expect(text).toMatchSnapshot()
    })

    it("Should redirect if accessed from the root path", async () => {
        class AnimalController {
            index() { }
        }
        const app = await appStub(AnimalController)
        const { header } = await supertest(app.callback())
            .get("/swagger")
            .expect(302)
        expect(header["location"]).toBe("/swagger/index")
    })

    it("Should able to host swagger ui with custom name", async () => {
        class AnimalController {
            index() { }
        }
        const app = await appStub(AnimalController, { endpoint: "/explorer" })
        await supertest(app.callback())
            .get("/explorer/index.js")
            .expect(200)
        await supertest(app.callback())
            .get("/explorer/swagger-ui.js")
            .expect(200)
        const { text } = await supertest(app.callback())
            .get("/explorer/index")
            .expect(200)
        const { header } = await supertest(app.callback())
            .get("/explorer")
            .expect(302)
        expect(text).toMatchSnapshot()
        expect(header["location"]).toBe("/explorer/index")
    })

    it("Should fix endpoint if ends with /index", async () => {
        class AnimalController {
            index() { }
        }
        const app = await appStub(AnimalController, { endpoint: "/explorer/index" })
        await supertest(app.callback())
            .get("/explorer/index.js")
            .expect(200)
        await supertest(app.callback())
            .get("/explorer/swagger-ui.js")
            .expect(200)
        const { text } = await supertest(app.callback())
            .get("/explorer/index")
            .expect(200)
        const { header } = await supertest(app.callback())
            .get("/explorer")
            .expect(302)
        expect(header["location"]).toBe("/explorer/index")
    })
})