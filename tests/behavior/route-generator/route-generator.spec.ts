import {
    Class,
    cleanupConsole,
    consoleLog,
    DefaultFacility,
    generateRoutes,
    PlumierApplication,
    RouteMetadata,
    RouteInfo
} from "@plumier/core"
import { join } from "path"
import Plumier, { RestfulApiFacility, route, WebApiFacility, ControllerFacility } from "plumier"
import Supertest from "supertest"

import { fixture } from "../helper"

describe("Route Generator", () => {
    it("Should transform regular method to GET", async () => {
        class AnimalController {
            method() { }
        }
        const app = await fixture(AnimalController)
            .set({ rootDir: __dirname })
            .initialize()
        await Supertest(app.callback())
            .get("/animal/method")
            .expect(200)
        await Supertest(app.callback())
            .post("/animal/method")
            .expect(404)
        await Supertest(app.callback())
            .put("/animal/method")
            .expect(404)
        await Supertest(app.callback())
            .delete("/animal/method")
            .expect(404)
    })

    it("Should not transform if controller name does not end with controller", async () => {
        class AnimalClass {
            method() { }
        }
        const app = await fixture(AnimalClass)
            .initialize()
        await Supertest(app.callback())
            .get("/animal/method")
            .expect(404)
        await Supertest(app.callback())
            .get("/animalclass/method")
            .expect(404)
    })

    it("Should transform if controller name does not end with controller but has root decorator", async () => {
        @route.root("animal")
        class AnimalClass {
            method() { }
        }
        const app = await fixture(AnimalClass)
            .initialize()
        await Supertest(app.callback())
            .get("/animal/method")
            .expect(200)
        await Supertest(app.callback())
            .get("/animalclass/method")
            .expect(404)
    })

    it("Should transform action with multiple routes", async () => {
        class AnimalController {
            @route.get("/home")
            @route.get("/about")
            @route.get("/new")
            @route.get("/transaction")
            method() { return "OK" }
        }
        const app = await fixture(AnimalController)
            .initialize()
        await Supertest(app.callback()).get("/home").expect(200, "OK")
        await Supertest(app.callback()).get("/about").expect(200, "OK")
        await Supertest(app.callback()).get("/new").expect(200, "OK")
        await Supertest(app.callback()).get("/transaction").expect(200, "OK")
    })

    it("Should allow case insensitive backing parameter", async () => {
        class AnimalController {
            @route.get(":animalid")
            method(AnimalId: string) {
                return { AnimalId }
            }
        }
        const app = await fixture(AnimalController)
            .initialize()
        await Supertest(app.callback())
            .get("/animal/123")
            .expect(200, { AnimalId: "123" })
    })

    it("Should allow case insensitive backing parameter in root route", async () => {
        @route.root("/beast/:beastId/animal")
        class AnimalController {
            @route.get(":animalid")
            method(BeastId: string, AnimalId: string) {
                return { BeastId, AnimalId }
            }
        }
        const app = await fixture(AnimalController)
            .initialize()
        await Supertest(app.callback())
            .get("/beast/123/animal/123")
            .expect(200, { BeastId: "123", AnimalId: "123" })
    })

    it("Should transform nested controller", async () => {
        const app = await fixture(join(__dirname, "nested"))
            .initialize()
        await Supertest(app.callback())
            .get("/api/v1/animal/get")
            .expect(200)
        await Supertest(app.callback())
            .get("/api/v2/animal/get")
            .expect(200)
    })

    it("Should able to provided multiple path", async () => {
        const mock = consoleLog.startMock()
        await fixture(["nested/api/v1", "nested/api/v2"], { mode: "debug" })
            .initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        consoleLog.clearMock()
    })

    it("Should able to provided multiple path with absolute", async () => {
        const mock = consoleLog.startMock()
        await fixture([join(__dirname, "nested/api/v1"), join(__dirname, "nested/api/v2")], { mode: "debug" })
            .initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        consoleLog.clearMock()
    })

    it("Should able to transform using relative glob", async () => {
        const mock = consoleLog.startMock()
        await fixture("nested/**/*.ts", {mode: "debug"})
            .initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        consoleLog.clearMock()
    })

    it("Should able to transform using absolute glob", async () => {
        const mock = consoleLog.startMock()
        await fixture(join(__dirname, "nested/**/*.ts"), {mode: "debug"})
            .initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        consoleLog.clearMock()
    })

    it("Should able to provided multiple globs", async () => {
        const mock = consoleLog.startMock()
        await fixture(["nested/api/v1/*.ts", "nested/api/v2/*.ts"], { mode: "debug" })
            .initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        consoleLog.clearMock()
    })

    it("Should able to rename class name using relative route in nested controller", async () => {
        const app = await fixture(join(__dirname, "nested"))
            .initialize()
        await Supertest(app.callback())
            .get("/api/v1/kitty/get")
            .expect(200)
    })

    it("Should skip nested route using absolute root route in nested controller", async () => {
        const app = await fixture(join(__dirname, "nested"))
            .initialize()
        await Supertest(app.callback())
            .get("/quack/get")
            .expect(200)
    })

    it("Should skip nested route using absolute method route in nested controller", async () => {
        const app = await fixture(join(__dirname, "nested"))
            .initialize()
        await Supertest(app.callback())
            .get("/chicken")
            .expect(200)
    })

    it("Should allow relative root name on non nested controller", async () => {
        @route.root("beast")
        class AnimalController {
            method() {
            }
        }
        const app = await fixture(AnimalController)
            .initialize()
        await Supertest(app.callback())
            .get("/beast/method")
            .expect(200)
    })

    it("Should not throw error when specify invalid directory", async () => {
        const mock = consoleLog.startMock()
        await fixture(join(__dirname, "not-exits"), { mode: "debug" })
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
        consoleLog.clearMock()
    })

    describe("GET route", () => {
        it("Should route simple path", async () => {
            class AnimalController {
                @route.get()
                method() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .get("/animal/method")
                .expect(200)
        })

        it("Should route path with query", async () => {
            class AnimalController {
                @route.get()
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .get("/animal/method?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to relative override method", async () => {
            class AnimalController {
                @route.get("get")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to absolute override method", async () => {
            class AnimalController {
                @route.get("/get")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .get("/get?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to exclude method name", async () => {
            class AnimalController {
                @route.get("")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .get("/animal?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to ignore method", async () => {
            class AnimalController {
                @route.get("")
                method(a: number, b: string) {
                    return { a, b }
                }
                @route.ignore()
                other() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .get("/animal/other")
                .expect(404)
        })

        it("Should route path with parameters", async () => {
            class AnimalController {
                @route.get("a/:a/b/:b")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .get("/animal/a/100/b/hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to combine path and query", async () => {
            class AnimalController {
                @route.get("a/:a")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .get("/animal/a/100?b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should work with root", async () => {
            @route.root("/beast")
            class AnimalController {
                @route.get("a/:a")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .get("/beast/a/100?b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should work with parameterized root", async () => {
            @route.root("/beast/:type")
            class AnimalController {
                @route.get("a/:a")
                method(type: string, a: number, b: string) {
                    return { type, a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .get("/beast/wolf/a/100?b=hello")
                .expect(200, { type: "wolf", a: 100, b: "hello" })
        })

        it("Should return 404 if not found", async () => {
            class AnimalController {
                @route.get()
                method() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .get("/beast/a")
                .expect(404)
        })
    })

    describe("POST route", () => {
        it("Should route simple path", async () => {
            class AnimalController {
                @route.post()
                method() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .post("/animal/method")
                .expect(200)
        })

        it("Should route path with query", async () => {
            class AnimalController {
                @route.post()
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .post("/animal/method?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to relative override method", async () => {
            class AnimalController {
                @route.post("get")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .post("/animal/get?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to absolute override method", async () => {
            class AnimalController {
                @route.post("/get")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .post("/get?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to exclude method name", async () => {
            class AnimalController {
                @route.post("")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .post("/animal?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to ignore method", async () => {
            class AnimalController {
                @route.post("")
                method(a: number, b: string) {
                    return { a, b }
                }
                @route.ignore()
                other() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .post("/animal/other")
                .expect(404)
        })

        it("Should route path with parameters", async () => {
            class AnimalController {
                @route.post("a/:a/b/:b")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .post("/animal/a/100/b/hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to combine path and query", async () => {
            class AnimalController {
                @route.post("a/:a")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .post("/animal/a/100?b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should work with root", async () => {
            @route.root("/beast")
            class AnimalController {
                @route.post("a/:a")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .post("/beast/a/100?b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should work with parameterized root", async () => {
            @route.root("/beast/:type")
            class AnimalController {
                @route.post("a/:a")
                method(type: string, a: number, b: string) {
                    return { type, a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .post("/beast/wolf/a/100?b=hello")
                .expect(200, { type: "wolf", a: 100, b: "hello" })
        })

        it("Should return 404 if not found", async () => {
            class AnimalController {
                @route.post()
                method() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .post("/beast/a")
                .expect(404)
        })
    })

    describe("PUT route", () => {
        it("Should route simple path", async () => {
            class AnimalController {
                @route.put()
                method() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .put("/animal/method")
                .expect(200)
        })

        it("Should route path with query", async () => {
            class AnimalController {
                @route.put()
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .put("/animal/method?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to relative override method", async () => {
            class AnimalController {
                @route.put("get")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .put("/animal/get?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to absolute override method", async () => {
            class AnimalController {
                @route.put("/get")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .put("/get?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to exclude method name", async () => {
            class AnimalController {
                @route.put("")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .put("/animal?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to ignore method", async () => {
            class AnimalController {
                @route.put("")
                method(a: number, b: string) {
                    return { a, b }
                }
                @route.ignore()
                other() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .put("/animal/other")
                .expect(404)
        })

        it("Should route path with parameters", async () => {
            class AnimalController {
                @route.put("a/:a/b/:b")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .put("/animal/a/100/b/hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to combine path and query", async () => {
            class AnimalController {
                @route.put("a/:a")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .put("/animal/a/100?b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should work with root", async () => {
            @route.root("/beast")
            class AnimalController {
                @route.put("a/:a")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .put("/beast/a/100?b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should work with parameterized root", async () => {
            @route.root("/beast/:type")
            class AnimalController {
                @route.put("a/:a")
                method(type: string, a: number, b: string) {
                    return { type, a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .put("/beast/wolf/a/100?b=hello")
                .expect(200, { type: "wolf", a: 100, b: "hello" })
        })

        it("Should return 404 if not found", async () => {
            class AnimalController {
                @route.put()
                method() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .put("/beast/a")
                .expect(404)
        })
    })

    describe("DELETE route", () => {
        it("Should route simple path", async () => {
            class AnimalController {
                @route.delete()
                method() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .delete("/animal/method")
                .expect(200)
        })

        it("Should route path with query", async () => {
            class AnimalController {
                @route.delete()
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .delete("/animal/method?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to relative override method", async () => {
            class AnimalController {
                @route.delete("get")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .delete("/animal/get?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to absolute override method", async () => {
            class AnimalController {
                @route.delete("/get")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .delete("/get?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to exclude method name", async () => {
            class AnimalController {
                @route.delete("")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .delete("/animal?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to ignore method", async () => {
            class AnimalController {
                @route.delete("")
                method(a: number, b: string) {
                    return { a, b }
                }
                @route.ignore()
                other() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .delete("/animal/other")
                .expect(404)
        })

        it("Should route path with parameters", async () => {
            class AnimalController {
                @route.delete("a/:a/b/:b")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .delete("/animal/a/100/b/hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to combine path and query", async () => {
            class AnimalController {
                @route.delete("a/:a")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .delete("/animal/a/100?b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should work with root", async () => {
            @route.root("/beast")
            class AnimalController {
                @route.delete("a/:a")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .delete("/beast/a/100?b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should work with parameterized root", async () => {
            @route.root("/beast/:type")
            class AnimalController {
                @route.delete("a/:a")
                method(type: string, a: number, b: string) {
                    return { type, a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .delete("/beast/wolf/a/100?b=hello")
                .expect(200, { type: "wolf", a: 100, b: "hello" })
        })

        it("Should return 404 if not found", async () => {
            class AnimalController {
                @route.delete()
                method() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .delete("/beast/a")
                .expect(404)
        })
    })

    describe("PATCH route", () => {
        it("Should route simple path", async () => {
            class AnimalController {
                @route.patch()
                method() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .patch("/animal/method")
                .expect(200)
        })

        it("Should route path with query", async () => {
            class AnimalController {
                @route.patch()
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .patch("/animal/method?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to relative override method", async () => {
            class AnimalController {
                @route.patch("get")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .patch("/animal/get?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to absolute override method", async () => {
            class AnimalController {
                @route.patch("/get")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .patch("/get?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to exclude method name", async () => {
            class AnimalController {
                @route.patch("")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .patch("/animal?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to ignore method", async () => {
            class AnimalController {
                @route.patch("")
                method(a: number, b: string) {
                    return { a, b }
                }
                @route.ignore()
                other() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .patch("/animal/other")
                .expect(404)
        })

        it("Should route path with parameters", async () => {
            class AnimalController {
                @route.patch("a/:a/b/:b")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .patch("/animal/a/100/b/hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to combine path and query", async () => {
            class AnimalController {
                @route.patch("a/:a")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .patch("/animal/a/100?b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should work with root", async () => {
            @route.root("/beast")
            class AnimalController {
                @route.patch("a/:a")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .patch("/beast/a/100?b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should work with parameterized root", async () => {
            @route.root("/beast/:type")
            class AnimalController {
                @route.patch("a/:a")
                method(type: string, a: number, b: string) {
                    return { type, a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .patch("/beast/wolf/a/100?b=hello")
                .expect(200, { type: "wolf", a: 100, b: "hello" })
        })

        it("Should return 404 if not found", async () => {
            class AnimalController {
                @route.patch()
                method() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .patch("/beast/a")
                .expect(404)
        })
    })

    describe("HEAD route", () => {
        it("Should route simple path", async () => {
            class AnimalController {
                @route.head()
                method() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .head("/animal/method")
                .expect(200)
        })

        it("Should route path with query", async () => {
            class AnimalController {
                @route.head()
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .head("/animal/method?a=100&b=hello")
                .expect(200, {})
        })

        it("Should able to relative override method", async () => {
            class AnimalController {
                @route.head("get")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .head("/animal/get?a=100&b=hello")
                .expect(200, {})
        })

        it("Should able to absolute override method", async () => {
            class AnimalController {
                @route.head("/get")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .head("/get?a=100&b=hello")
                .expect(200, {})
        })

        it("Should able to exclude method name", async () => {
            class AnimalController {
                @route.head("")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .head("/animal?a=100&b=hello")
                .expect(200, {})
        })

        it("Should able to ignore method", async () => {
            class AnimalController {
                @route.head("")
                method(a: number, b: string) {
                    return { a, b }
                }
                @route.ignore()
                other() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .head("/animal/other")
                .expect(404)
        })

        it("Should route path with parameters", async () => {
            class AnimalController {
                @route.head("a/:a/b/:b")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .head("/animal/a/100/b/hello")
                .expect(200, {})
        })

        it("Should able to combine path and query", async () => {
            class AnimalController {
                @route.head("a/:a")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .head("/animal/a/100?b=hello")
                .expect(200, {})
        })

        it("Should work with root", async () => {
            @route.root("/beast")
            class AnimalController {
                @route.head("a/:a")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .head("/beast/a/100?b=hello")
                .expect(200, {})
        })

        it("Should work with parameterized root", async () => {
            @route.root("/beast/:type")
            class AnimalController {
                @route.head("a/:a")
                method(type: string, a: number, b: string) {
                    return { type, a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .head("/beast/wolf/a/100?b=hello")
                .expect(200, {})
        })

        it("Should return 404 if not found", async () => {
            class AnimalController {
                @route.head()
                method() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .head("/beast/a")
                .expect(404)
        })
    })

    describe("OPTIONS route", () => {
        it("Should route simple path", async () => {
            class AnimalController {
                @route.options()
                method() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .options("/animal/method")
                .expect(200)
        })

        it("Should route path with query", async () => {
            class AnimalController {
                @route.options()
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .options("/animal/method?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to relative override method", async () => {
            class AnimalController {
                @route.options("get")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .options("/animal/get?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to absolute override method", async () => {
            class AnimalController {
                @route.options("/get")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .options("/get?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to exclude method name", async () => {
            class AnimalController {
                @route.options("")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .options("/animal?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to ignore method", async () => {
            class AnimalController {
                @route.options("")
                method(a: number, b: string) {
                    return { a, b }
                }
                @route.ignore()
                other() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .options("/animal/other")
                .expect(404)
        })

        it("Should route path with parameters", async () => {
            class AnimalController {
                @route.options("a/:a/b/:b")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .options("/animal/a/100/b/hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to combine path and query", async () => {
            class AnimalController {
                @route.options("a/:a")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .options("/animal/a/100?b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should work with root", async () => {
            @route.root("/beast")
            class AnimalController {
                @route.options("a/:a")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .options("/beast/a/100?b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should work with parameterized root", async () => {
            @route.root("/beast/:type")
            class AnimalController {
                @route.options("a/:a")
                method(type: string, a: number, b: string) {
                    return { type, a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .options("/beast/wolf/a/100?b=hello")
                .expect(200, { type: "wolf", a: 100, b: "hello" })
        })

        it("Should return 404 if not found", async () => {
            class AnimalController {
                @route.options()
                method() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .options("/beast/a")
                .expect(404)
        })
    })

    describe("TRACE route", () => {
        it("Should route simple path", async () => {
            class AnimalController {
                @route.trace()
                method() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .trace("/animal/method")
                .expect(200)
        })

        it("Should route path with query", async () => {
            class AnimalController {
                @route.trace()
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .trace("/animal/method?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to relative override method", async () => {
            class AnimalController {
                @route.trace("get")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .trace("/animal/get?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to absolute override method", async () => {
            class AnimalController {
                @route.trace("/get")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .trace("/get?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to exclude method name", async () => {
            class AnimalController {
                @route.trace("")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .trace("/animal?a=100&b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to ignore method", async () => {
            class AnimalController {
                @route.trace("")
                method(a: number, b: string) {
                    return { a, b }
                }
                @route.ignore()
                other() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .trace("/animal/other")
                .expect(404)
        })

        it("Should route path with parameters", async () => {
            class AnimalController {
                @route.trace("a/:a/b/:b")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .trace("/animal/a/100/b/hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should able to combine path and query", async () => {
            class AnimalController {
                @route.trace("a/:a")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .trace("/animal/a/100?b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should work with root", async () => {
            @route.root("/beast")
            class AnimalController {
                @route.trace("a/:a")
                method(a: number, b: string) {
                    return { a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .trace("/beast/a/100?b=hello")
                .expect(200, { a: 100, b: "hello" })
        })

        it("Should work with parameterized root", async () => {
            @route.root("/beast/:type")
            class AnimalController {
                @route.trace("a/:a")
                method(type: string, a: number, b: string) {
                    return { type, a, b }
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .trace("/beast/wolf/a/100?b=hello")
                .expect(200, { type: "wolf", a: 100, b: "hello" })
        })

        it("Should return 404 if not found", async () => {
            class AnimalController {
                @route.trace()
                method() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .trace("/beast/a")
                .expect(404)
        })
    })

    describe("Root route", () => {
        it("Should able to override class name", async () => {
            @route.root("/beast")
            class AnimalController {
                method() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .get("/beast/method")
                .expect(200)
        })

        it("Should ok without preceding slash", async () => {
            @route.root("beast")
            class AnimalController {
                method() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .get("/beast/method")
                .expect(200)
        })

        it("Should ok with trailing slash", async () => {
            @route.root("beast/")
            class AnimalController {
                method() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .get("/beast/method")
                .expect(200)
        })

        it("Should ok with trailing slash with route override", async () => {
            @route.root("beast/")
            class AnimalController {
                @route.get("no-method")
                method() { }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .get("/beast/no-method")
                .expect(200)
        })
    })
})

describe("Router with external controller", () => {

    it("Should load controllers", async () => {
        consoleLog.startMock()
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .initialize()
        expect((console.log as any).mock.calls[2][0]).toContain("GET /animal/get")
        expect((console.log as any).mock.calls[3][0]).toContain("GET /beast/get")
        expect((console.log as any).mock.calls[4][0]).toContain("GET /creature/get")
        consoleLog.clearMock()
    })

    it("Should able to specify file instead of folder", async () => {
        consoleLog.startMock()
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: "controller/animal-controller.ts" })
            .initialize()
        expect((console.log as any).mock.calls[2][0]).toContain("/animal/get")
        consoleLog.clearMock()
    })

    it("Should should not load non controller", async () => {
        consoleLog.startMock()
        const app = await new Plumier()
            .set(new RestfulApiFacility({ controller: "./no-controller" }))
            .initialize()
        expect((console.log as any).mock.calls[2][0]).toContain("No controller found")
        consoleLog.clearMock()
    })

    it("Should not error when provided files with mix types", async () => {
        consoleLog.startMock()
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: "mix-types" })
            .initialize()
        expect((console.log as any).mock.calls[2][0]).toContain("/users/save")
        consoleLog.clearMock()
    })
})

describe("Extend Route Generator", () => {
    it("Should able to provide ActionRoutes from Facility", async () => {
        class AnimalController {
            @route.get()
            method() { }
        }
        class OtherController {
            @route.get()
            method() { }
        }
        class MyFacility extends DefaultFacility {
            constructor(private ctl: Class) { super() }
            async generateRoutes(app: Readonly<PlumierApplication>) {
                return generateRoutes(this.ctl, { ...app.config })
            }
        }
        const mock = consoleLog.startMock()
        await fixture(AnimalController, { mode: "debug" })
            .set(new MyFacility(OtherController))
            .initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        consoleLog.clearMock()
    })
    it("Should able to provide VirtualRoutes from Facility", async () => {
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
                    url: "/other/get"
                }]
            }
        }
        const mock = consoleLog.startMock()
        await fixture(AnimalController, { mode: "debug" })
            .set(new MyFacility())
            .initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        consoleLog.clearMock()
    })
})

describe("Route Ignore", () => {
    it("Should able to ignore class from route generation", async () => {
        @route.ignore()
        class UsersController {
            @route.get("")
            get(id: string) { }
        }
        const routes = await generateRoutes(UsersController)
        expect(routes).toMatchSnapshot()
    })
    it("Should able to ignore specific methods from class ignore", async () => {
        @route.ignore({ action: ["get", "save"] })
        class UsersController {
            @route.get("")
            get(id: string) { }

            @route.post("")
            save() { }

            @route.put(":id")
            modify(id: string) { }
        }
        const routes = await generateRoutes(UsersController)
        expect(routes.map(x => ({ method: x.method, url: x.url }))).toMatchSnapshot()
    })

    it("Should able to ignore specific methods from class ignore with multiple root route", async () => {
        @route.ignore({ action: ["get", "save"] })
        @route.root("users")
        @route.root("clients")
        class UsersController {
            @route.get("")
            get(id: string) { }

            @route.post("")
            save() { }

            @route.put(":id")
            modify(id: string) { }
        }
        const routes = await generateRoutes(UsersController)
        expect(routes.map(x => ({ method: x.method, url: x.url }))).toMatchSnapshot()
    })
    it("Should able to ignore specific methods from class ignore with multiple route", async () => {
        @route.ignore({ action: ["get", "save"] })
        class UsersController {
            @route.get("")
            @route.get()
            get(id: string) { }

            @route.post()
            save() { }

            @route.put(":id")
            @route.put()
            modify(id: string) { }
        }
        const routes = await generateRoutes(UsersController)
        expect(routes.map(x => ({ method: x.method, url: x.url }))).toMatchSnapshot()
    })
})

describe("Route Grouping", () => {
    function createApp() {
        return new Plumier()
            .set(new WebApiFacility({ controller: "__" }))
    }
    it("Should able to group routes", async () => {
        class AnimalController {
            method() { }
        }
        const mock = consoleLog.startMock()
        await createApp()
            .set(new ControllerFacility({ controller: AnimalController, group: "v1", rootPath: "api/v1" }))
            .set(new ControllerFacility({ controller: AnimalController, group: "v2", rootPath: "api/v2" }))
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
        consoleLog.clearMock()
    })
    it("Should use directory tree as route", async () => {
        const mock = consoleLog.startMock()
        await createApp()
            .set(new ControllerFacility({ controller: "./nested/", group: "v1" }))
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
        consoleLog.clearMock()
    })
    it("Should able to group routes by providing relative path", async () => {
        const mock = consoleLog.startMock()
        await createApp()
            .set(new ControllerFacility({ controller: "./nested/api/v1", group: "v1", rootPath: "api/v1" }))
            .set(new ControllerFacility({ controller: "./nested/api/v2", group: "v2", rootPath: "api/v2" }))
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
        consoleLog.clearMock()
    })
    it("Should able to group routes by providing absolute path", async () => {
        const mock = consoleLog.startMock()
        await createApp()
            .set(new ControllerFacility({ controller: join(__dirname, "./nested/api/v1"), group: "v1", rootPath: "api/v1" }))
            .set(new ControllerFacility({ controller: join(__dirname, "./nested/api/v2"), group: "v2", rootPath: "api/v2" }))
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
        consoleLog.clearMock()
    })
    it("Should able to combine with default controller path", async () => {
        const mock = consoleLog.startMock()
        await createApp()
            .set({ controller: "./controller" })
            .set(new ControllerFacility({ controller: "./nested/api/v1", group: "v1", rootPath: "api/v1" }))
            .set(new ControllerFacility({ controller: "./nested/api/v2", group: "v2", rootPath: "api/v2" }))
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
        consoleLog.clearMock()
    })
    it("Should able to ignore nested directory as path", async () => {
        const mock = consoleLog.startMock()
        await createApp()
            .set(new ControllerFacility({ controller: "./nested", group: "v1", directoryAsPath: false }))
            .initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        consoleLog.clearMock()
    })
    it("Should able to ignore nested directory as path with rootPath", async () => {
        const mock = consoleLog.startMock()
        await createApp()
            .set(new ControllerFacility({ controller: "./nested", group: "v1", directoryAsPath: false, rootPath: "api/v1" }))
            .initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        consoleLog.clearMock()
    })
})