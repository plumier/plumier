import { Class, route } from "@plumier/core"
import supertest from "supertest"
import { SwaggerFacility } from "@plumier/swagger"

import { fixture } from "../helper"
import Plumier, { WebApiFacility, ControllerFacility } from '@plumier/plumier'



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

        describe("Grouping", () => {
            function createApp(ctl: Class | Class[]) {
                return new Plumier()
                    .set({ mode: "production" })
                    .set(new WebApiFacility())
                    .set(new SwaggerFacility())
                    .set(new ControllerFacility({ group: "v1", controller: ctl, rootPath: "api/v1" }))
                    .set(new ControllerFacility({ group: "v2", controller: ctl, rootPath: "api/v2" }))
            }

            it("Should redirect to proper swagger UI", async () => {
                const app = await createApp(UsersController).initialize()
                const respV1 = await supertest(app.callback())
                    .get("/swagger/v1")
                    .expect(302)
                const respV2 = await supertest(app.callback())
                    .get("/swagger/v2")
                    .expect(302)
                expect(respV1.header.location).toBe("/swagger/v1/index")
                expect(respV2.header.location).toBe("/swagger/v2/index")
            })
            it("Should provide swagger UI for each group", async () => {
                const app = await createApp(UsersController).initialize()
                await supertest(app.callback())
                    .get("/swagger/v1/index")
                    .expect(200)
                await supertest(app.callback())
                    .get("/swagger/v2/index")
                    .expect(200)
            })
            it("Should provide swagger UI assets for each group", async () => {
                const app = await createApp(UsersController).initialize()
                await supertest(app.callback())
                    .get("/swagger/v1/swagger-ui.css")
                    .expect(200)
                await supertest(app.callback())
                    .get("/swagger/v2/swagger-ui.css")
                    .expect(200)
            })
            it("Should provide swagger UI JavaScript for each group", async () => {
                const app = await createApp(UsersController).initialize()
                await supertest(app.callback())
                    .get("/swagger/v1/swagger-ui-bundle.js")
                    .expect(200)
                await supertest(app.callback())
                    .get("/swagger/v2/swagger-ui-bundle.js")
                    .expect(200)
            })
        })
    })

})