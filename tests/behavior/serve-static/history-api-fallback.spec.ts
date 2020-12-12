import "@plumier/testing"

import { DefaultFacility, PlumierApplication, response, route, RouteMetadata } from "@plumier/core"
import { ServeStaticFacility } from "@plumier/serve-static"
import { cleanupConsole } from "@plumier/testing"
import { join } from "path"
import supertest = require("supertest")

import { fixture } from "../helper"

describe("History Api Fallback", () => {
    it("Should fallback if requested by provide accept header html", async () => {
        class AnimalController {
            @route.historyApiFallback()
            get() {
                return response.file(join(__dirname, "assets/index.html"))
            }
        }
        const app = fixture(AnimalController)
        const koa = await app.set(new ServeStaticFacility({ root: join(__dirname, "./assets") }))
            .initialize()
        const resp = await supertest(koa.callback())
            .get("/login")
            .set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3")
            .expect(200)
        expect(resp.text).toMatchSnapshot()
    })

    it("Should not fallback if requested by accept JSON", async () => {
        class AnimalController {
            @route.historyApiFallback()
            get() {
                return response.file(join(__dirname, "assets/index.html"))
            }
        }
        const app = fixture(AnimalController)
        const koa = await app.set(new ServeStaticFacility({ root: join(__dirname, "./assets") }))
            .initialize()
        await supertest(koa.callback())
            .get("/login")
            .set("Accept", "application/json; charset=utf-8")
            .expect(404)
    })

    it("Should not fallback if request already have handler (controller)", async () => {
        class AnimalController {
            @route.historyApiFallback()
            get() {
                return response.file(join(__dirname, "assets/index.html"))
            }
        }
        const app = fixture(AnimalController)
        const koa = await app.set(new ServeStaticFacility({ root: join(__dirname, "./assets") }))
            .initialize()
        await supertest(koa.callback())
            .get("/animal/get")
            .set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3")
            .expect(200)
    })

    it("Should not fallback if request already serve static file", async () => {
        class AnimalController {
            @route.historyApiFallback()
            get() {
                return response.file(join(__dirname, "assets/index.html"))
            }
        }
        const app = fixture(AnimalController)
        const koa = await app.set(new ServeStaticFacility({ root: join(__dirname, "./assets") }))
            .initialize()
        await supertest(koa.callback())
            .get("/dice.png")
            .expect(200)
    })

    it("Should return 404 if requested is a non exists file", async () => {
        class AnimalController {
            @route.historyApiFallback()
            get() {
                return response.file(join(__dirname, "assets/index.html"))
            }
        }
        const app = fixture(AnimalController)
        const koa = await app.set(new ServeStaticFacility({ root: join(__dirname, "./assets") }))
            .initialize()
        await supertest(koa.callback())
            .get("/non-exists.png")
            .expect(404)
    })

    it("Should analyze if multiple @route.historyApiFallback() defined", async () => {
        class AnimalController {
            @route.historyApiFallback()
            get() {
                return response.file(join(__dirname, "assets/index.html"))
            }

            @route.historyApiFallback()
            data() {
                return response.file(join(__dirname, "assets/index.html"))
            }
        }
        const app = fixture(AnimalController, { mode: "debug" })
        console.mock()
        await app.set(new ServeStaticFacility({ root: join(__dirname, "./assets") }))
            .initialize()
        expect((console.log as any).mock.calls[3][0]).toContain("error PLUM1020: Multiple @route.historyApiFallback() is not allowed, in AnimalController.get(), AnimalController.data()")
        console.mockClear()
    })

    it("Should analyze if @route.historyApiFallback() combined with non GET method", async () => {
        class AnimalController {
            @route.historyApiFallback()
            @route.post()
            get(b:number) {
                return response.file(join(__dirname, "assets/index.html"))
            }
        }
        const app = fixture(AnimalController, { mode: "debug" })
        const mock = console.mock()
        await app.set(new ServeStaticFacility({ root: join(__dirname, "./assets") }))
            .initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        console.mockClear()
    })

    it("Should not analyze non history api fallback method", async () => {
        class AnimalController {
            @route.post()
            get() {
                return response.file(join(__dirname, "assets/index.html"))
            }
        }
        
        const app = fixture(AnimalController, { mode: "debug" })
        console.mock()
        await app.set(new ServeStaticFacility({ root: join(__dirname, "./assets") }))
            .initialize()
        expect((console.log as any).mock.calls).toMatchSnapshot()
        console.mockClear()
    })

    it("Analyzer should not error when provided VirtualRoute", async () => {
        class AnimalController {
            @route.get()
            method() { }
        }
        class MyFacility extends DefaultFacility {
            constructor() { super() }
            async generateRoutes(app: Readonly<PlumierApplication>): Promise<RouteMetadata[]> {
                return [{
                    kind: "VirtualRoute",
                    method: "get",
                    provider: MyFacility,
                    url: "/other/get",
                    access: "Public"
                }]
            }
        }
        const mock = console.mock()
        await fixture(AnimalController, { mode: "debug" })
            .set(new ServeStaticFacility({ root: join(__dirname, "./assets") }))
            .set(new MyFacility())
            .initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        console.mockClear()
    })
})