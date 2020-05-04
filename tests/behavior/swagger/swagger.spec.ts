import { Class, route } from "@plumier/core"
import supertest from "supertest"
import { SwaggerFacility } from "@plumier/swagger"

import { fixture } from "../helper"



describe("Swagger", () => {
    function createApp(ctl: Class | Class[]) {
        return fixture(ctl)
            .set(new SwaggerFacility())
            .initialize()
    }
    describe("Swagger UI Hosting", () => {
        class UsersController {
            @route.get("")
            get() { }
        }
        it("Should accessible from /swagger", async () => {
            const app = await createApp(UsersController)
            const resp = await supertest(app.callback())
                .get("/swagger")
                .expect(302)
            expect(resp.header.location).toBe("/swagger/index")
        })
        it("Should serve UI properly", async () => {
            const app = await createApp(UsersController)
            await supertest(app.callback())
                .get("/swagger/index")
                .expect(200)
        })
        it("Should serve assets", async () => {
            const app = await createApp(UsersController)
            await supertest(app.callback())
                .get("/swagger/swagger-ui.css")
                .expect(200)
        })
        it("Should serve JavaScript", async () => {
            const app = await createApp(UsersController)
            await supertest(app.callback())
                .get("/swagger/swagger-ui-bundle.js")
                .expect(200)
        })
        describe("Custom Endpoint", () => {
            function createApp(ctl: Class | Class[]) {
                return fixture(ctl)
                    .set(new SwaggerFacility({ endpoint: "/explorer" }))
                    .initialize()
            }
            it("Should able to change swagger endpoint", async () => {
                const app = await createApp(UsersController)
                const resp = await supertest(app.callback())
                    .get("/explorer")
                    .expect(302)
                expect(resp.header.location).toBe("/explorer/index")
            })
            it("Should serve assets", async () => {
                const app = await createApp(UsersController)
                await supertest(app.callback())
                    .get("/explorer/swagger-ui.css")
                    .expect(200)
            })
            it("Should serve assets", async () => {
                const app = await createApp(UsersController)
                await supertest(app.callback())
                    .get("/explorer/swagger-ui-bundle.js")
                    .expect(200)
            })
            it("Should normalize path when provided with /index", async () => {
                const app = await fixture(UsersController)
                    .set(new SwaggerFacility({ endpoint: "/explorer/index" }))
                    .initialize()
                const resp = await supertest(app.callback())
                    .get("/explorer")
                    .expect(302)
            })
        })

    })

})