import Plumier, { route, WebApiFacility, domain, bind } from "../../../src";
import { fixture } from '../../helper';
import Supertest from "supertest"
import { join } from 'path';
import Rimraf from "rimraf"
import { consoleLog } from '@plumjs/core';

describe("Router", () => {
    it("Should transform regular method to GET", async () => {
        class AnimalController {
            method() { }
        }
        const app = await fixture(AnimalController)
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
            method(BeastId:string, AnimalId: string) {
                return { BeastId, AnimalId }
            }
        }
        const app = await fixture(AnimalController)
            .initialize()
        await Supertest(app.callback())
            .get("/beast/123/animal/123")
            .expect(200, { BeastId: "123", AnimalId: "123" })
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
})

describe("Router with external controller", () => {
    it("Should load .js file by default", async () => {
        Rimraf.sync(join(__dirname, "./controller/*.js"))
        consoleLog.startMock()
        const app = new Plumier()
            .set(new WebApiFacility())
        await app.initialize()
        expect((console.log as any).mock.calls[2][0]).toBe("No controller found")
        consoleLog.clearMock()
    })

    it("Should load controllers", async () => {
        consoleLog.startMock()
        const app = await new Plumier()
            .set(new WebApiFacility())
            .set({ fileExtension: ".ts" })
            .initialize()
        expect((console.log as any).mock.calls[2][0]).toContain("GET /animal/get")
        expect((console.log as any).mock.calls[3][0]).toContain("GET /beast/get")
        expect((console.log as any).mock.calls[4][0]).toContain("GET /creature/get")
        consoleLog.clearMock()
    })

    it("Should able to specify file instead of folder", async () => {
        consoleLog.startMock()
        const app = await new Plumier()
            .set(new WebApiFacility())
            .set({ controller: "controller/animal-controller.ts", fileExtension: ".ts" })
            .initialize()
        expect((console.log as any).mock.calls[2][0]).toContain("/animal/get")
        consoleLog.clearMock()
    })
})

describe("Analyzer", () => {
    it("Should identify missing backing parameter", async () => {
        class AnimalController {
            @route.get(":c")
            method(a: number, b: number) { }
        }
        consoleLog.startMock()
        const app = await new Plumier()
            .set(new WebApiFacility())
            .set({ controller: [AnimalController] })
            .initialize()
        expect((console.log as any).mock.calls[3][0]).toContain("PLUM1000")
        expect((console.log as any).mock.calls[3][0]).toContain("(c)")
        expect((console.log as any).mock.calls[3][0]).toContain("error")
        consoleLog.clearMock()
    })

    it("Should identify missing backing parameter on root decorator", async () => {
        @route.root("/beast/:type")
        class AnimalController {
            @route.get(":a")
            method(a: number, b: number) { }
        }
        consoleLog.startMock()
        const app = await new Plumier()
            .set(new WebApiFacility())
            .set({ controller: [AnimalController] })
            .initialize()
        expect((console.log as any).mock.calls[3][0]).toContain("PLUM1000")
        expect((console.log as any).mock.calls[3][0]).toContain("(type)")
        expect((console.log as any).mock.calls[3][0]).toContain("error")
        consoleLog.clearMock()
    })

    it("Should identify missing type information for data binding", async () => {
        class AnimalController {
            method(a: number) { }
        }
        consoleLog.startMock()
        const app = await new Plumier()
            .set(new WebApiFacility())
            .set({ controller: [AnimalController] })
            .initialize()
        expect((console.log as any).mock.calls[3][0]).toContain("PLUM1001")
        expect((console.log as any).mock.calls[3][0]).toContain("warning")
        consoleLog.clearMock()
    })

    it("Should not identify missing type information for data binding if method has no parameter", async () => {
        class AnimalController {
            method() { }
        }
        consoleLog.startMock()
        const app = await new Plumier()
            .set(new WebApiFacility())
            .set({ controller: [AnimalController] })
            .initialize()
        expect((console.log as any).mock.calls.length).toBe(4)
        consoleLog.clearMock()
    })

    it("Should identify duplicate route", async () => {
        @route.root("/beast")
        class AnimalController {
            @route.get()
            method(a: number) { }
        }
        class BeastController {
            @route.get()
            method(a: number) { }
        }
        consoleLog.startMock()
        const app = await new Plumier()
            .set(new WebApiFacility())
            .set({ controller: [AnimalController, BeastController] })
            .initialize()
        expect((console.log as any).mock.calls[3][0]).toContain("PLUM1003")
        expect((console.log as any).mock.calls[3][0]).toContain("AnimalController.method(a)")
        expect((console.log as any).mock.calls[3][0]).toContain("BeastController.method(a)")
        expect((console.log as any).mock.calls[3][0]).toContain("error")
        consoleLog.clearMock()
    })

    it("Should identify if model doesn't have type information for parameter binding", async () => {
        class AnimalModel {
            constructor(
                public id: number,
                public name: string
            ) { }
        }
        class AnimalController {
            @route.post()
            method(a: AnimalModel) { }
        }
        consoleLog.startMock()
        const app = await new Plumier()
            .set(new WebApiFacility())
            .set({ controller: [AnimalController] })
            .initialize()
        expect((console.log as any).mock.calls[3][0]).toContain("PLUM1005")
        expect((console.log as any).mock.calls[3][0]).toContain("AnimalModel")
        expect((console.log as any).mock.calls[3][0]).toContain("warning")
        consoleLog.clearMock()
    })

    it("Should identify if model doesn't have type information for parameter binding recursive", async () => {
        class TagModel {
            constructor(
                public id: number,
                public name: string
            ) { }
        }
        @domain()
        class AnimalModel {
            constructor(
                public id: number,
                public name: string,
                public tag: TagModel
            ) { }
        }
        class AnimalController {
            @route.post()
            method(a: AnimalModel) { }
        }
        consoleLog.startMock()
        const app = await new Plumier()
            .set(new WebApiFacility())
            .set({ controller: [AnimalController] })
            .initialize()
        expect((console.log as any).mock.calls[3][0]).toContain("PLUM1005")
        expect((console.log as any).mock.calls[3][0]).toContain("TagModel")
        expect((console.log as any).mock.calls[3][0]).toContain("warning")
        consoleLog.clearMock()
    })

    it("Should identify if array doesn't have type information for parameter binding", async () => {
        @domain()
        class AnimalModel {
            constructor(
                public id: number,
                public name: string
            ) { }
        }
        class AnimalController {
            @route.post()
            method(a: AnimalModel[]) { }
        }
        consoleLog.startMock()
        const app = await new Plumier()
            .set(new WebApiFacility())
            .set({ controller: [AnimalController] })
            .initialize()
        expect((console.log as any).mock.calls[3][0]).toContain("PLUM1006")
        expect((console.log as any).mock.calls[3][0]).toContain("warning")
        consoleLog.clearMock()
    })
})

