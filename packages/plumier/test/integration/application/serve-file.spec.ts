import { route } from "@plumier/core"
import { response, ServeStaticFacility } from "../../../src"
import { readFileSync } from "fs"
import { join } from "path"
import Supertest from "supertest"

import { fixture } from "../../helper"


describe("Serve File From Controller", () => {
    it("Should able to provided absolute path without specifying root", async () => {
        const root = join(__dirname, "./assets/index.html");
        class HomeController {
            @route.get("/")
            index() {
                return response.file(root)
            }
        }
        const app = fixture(HomeController)
        const koa = await app.initialize()
        const result = await Supertest(koa.callback())
            .get("/")
            .expect(200)
        expect(result.type).toBe("text/html")
        const file = readFileSync(root).toString()
        expect(result.text).toEqual(file)
    })

    it("Should be able to serve file with correct mime type", async () => {
        const root = join(__dirname, "./assets");
        class HomeController {
            @route.get("/")
            index() {
                return response.file("index.html", { root })
            }
        }
        const app = fixture(HomeController)
        const koa = await app.initialize()
        const result = await Supertest(koa.callback())
            .get("/")
            .expect(200)
        expect(result.type).toBe("text/html")
        const file = readFileSync(join(root, "index.html")).toString()
        expect(result.text).toEqual(file)
    })

    it("Should return 404 if file not found", async () => {
        const root = join(__dirname, "./assets");
        class HomeController {
            @route.get("/")
            index() {
                return response.file("abc.html", { root })
            }
        }
        const app = fixture(HomeController)
        const koa = await app.initialize()
        koa.on("error", () => { })
        const result = await Supertest(koa.callback())
            .get("/")
            .expect(404)
    })
})

describe("Serve Files", () => {
    it("Should be able to serve files", async () => {
        const root = join(__dirname, "./assets");
        class HomeController {
            @route.get("/")
            index() {
                return "Hello"
            }
        }
        const app = fixture(HomeController)
        app.set(new ServeStaticFacility({ root }))
        const koa = await app.initialize()
        const result = await Supertest(koa.callback())
            .get("/index.html")
            .expect(200)
        expect(result.type).toBe("text/html")
        const file = readFileSync(join(root, "index.html")).toString()
        expect(result.text).toEqual(file)
    })

    it("Should be able to serve jpg files", async () => {
        const root = join(__dirname, "./assets");
        class HomeController {
            @route.get("/")
            index() {
                return "Hello"
            }
        }
        const app = fixture(HomeController)
        app.set(new ServeStaticFacility({ root }))
        const koa = await app.initialize()
        const result = await Supertest(koa.callback())
            .get("/clock.jpeg")
            .expect(200)
        expect(result.type).toBe("image/jpeg")
    })

    it("Should prioritize controller vs static assets", async () => {
        const root = join(__dirname, "./assets");
        class HomeController {
            @route.get("/clock.jpeg")
            index() {
                return "Hello"
            }
        }
        const app = fixture(HomeController)
        app.set(new ServeStaticFacility({ root }))
        const koa = await app.initialize()
        await Supertest(koa.callback())
            .get("/clock.jpeg")
            .expect(200, "Hello")
    })

    it("Should return 404 if file not found", async () => {
        const root = join(__dirname, "./assets");
        class HomeController {
            @route.get("/")
            index() {
                return "Hello"
            }
        }
        const app = fixture(HomeController)
        app.set(new ServeStaticFacility({ root }))
        const koa = await app.initialize()
        const result = await Supertest(koa.callback())
            .get("/new-image.jpeg")
            .expect(404)
    })

    it("Should be able to serve nested files", async () => {
        const root = join(__dirname, "./assets-nested");
        class HomeController {
            @route.get("/")
            index() {
                return "Hello"
            }
        }
        const app = fixture(HomeController)
        app.set(new ServeStaticFacility({ root }))
        const koa = await app.initialize()
        const result = await Supertest(koa.callback())
            .get("/static/base.css")
            .expect(200)
        expect(result.type).toBe("text/css")
    })

    it("Should be able to serve with multiple root location", async () => {
        const nested = join(__dirname, "./assets-nested");
        const root = join(__dirname, "./assets");
        class HomeController {
            @route.get("/")
            index() {
                return "Hello"
            }
        }
        const app = fixture(HomeController)
        app.set(new ServeStaticFacility({ root: nested }))
        app.set(new ServeStaticFacility({ root }))
        const koa = await app.initialize()
        await Supertest(koa.callback())
            .get("/static/base.css")
            .expect(200)
        await Supertest(koa.callback())
            .get("/clock.jpeg")
            .expect(200)
    })

    it("Should handle error properly", async () => {
        jest.resetModules()
        jest.doMock("koa-send", () => function() { throw new Error() })
        const serve = require("../../../src/serve-static")
        const root = join(__dirname, "./assets");
        class HomeController {
            @route.get("/")
            index() {
                return "Hello"
            }
        }
        const app = fixture(HomeController)
        app.set(new serve.ServeStaticFacility({ root }))
        const koa = await app.initialize()
        koa.on("error", () => {})
        await Supertest(koa.callback())
            .get("/clock.jpeg")
            .expect(500)
        jest.dontMock("koa-send")
        jest.resetModules()
    })
})