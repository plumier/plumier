import { transformController } from "../../../src/router";
import { route } from '@plumier/core';

describe("Controller Transformer", () => {
    describe("Basic Transformation", () => {
        it("Should transform basic controller into get method", () => {
            class AnimalController {
                getData(id: string) { }
                otherMethod() { }
            }
            const result = transformController(AnimalController)
            expect(result).toMatchObject([
                { method: "get", url: "/animal/getdata" },
                { method: "get", url: "/animal/othermethod" }
            ])
        })

        it("Should skip transform non controller", () => {
            class AnimalClass {
                getData(id: string) { }
            }
            const result = transformController(AnimalClass)
            expect(result).toMatchObject([])
        })
    })

    describe("Route Decorator Transformation", () => {
        it("Should transform get method", () => {
            class AnimalController {
                @route.get()
                theMethod(id: string) { }
            }
            const result = transformController(AnimalController)
            expect(result).toMatchObject([{ method: "get", url: "/animal/themethod" }])
        })

        it("Should transform get method with override route", () => {
            class AnimalController {
                @route.get("/beast/get")
                theMethod(id: string) { }
            }
            const result = transformController(AnimalController)
            expect(result).toMatchObject([{ method: "get", url: "/beast/get" }])
        })

        it("Should transform post method", () => {
            class AnimalController {
                @route.post()
                theMethod(id: string) { }
            }
            const result = transformController(AnimalController)
            expect(result).toMatchObject([{ method: "post", url: "/animal/themethod" }])
        })

        it("Should transform post method with override route", () => {
            class AnimalController {
                @route.post("/beast/get")
                theMethod(id: string) { }
            }
            const result = transformController(AnimalController)
            expect(result).toMatchObject([{ method: "post", url: "/beast/get" }])
        })

        it("Should transform put method", () => {
            class AnimalController {
                @route.put()
                theMethod(id: string) { }
            }
            const result = transformController(AnimalController)
            expect(result).toMatchObject([{ method: "put", url: "/animal/themethod" }])
        })

        it("Should transform put method with override route", () => {
            class AnimalController {
                @route.put("/beast/get")
                theMethod(id: string) { }
            }
            const result = transformController(AnimalController)
            expect(result).toMatchObject([{ method: "put", url: "/beast/get" }])
        })

        it("Should transform delete method", () => {
            class AnimalController {
                @route.delete()
                theMethod(id: string) { }
            }
            const result = transformController(AnimalController)
            expect(result).toMatchObject([{ method: "delete", url: "/animal/themethod" }])
        })

        it("Should transform delete method with override route", () => {
            class AnimalController {
                @route.delete("/beast/get")
                theMethod(id: string) { }
            }
            const result = transformController(AnimalController)
            expect(result).toMatchObject([{ method: "delete", url: "/beast/get" }])
        })

        it("Should able to override only method name with relative route", () => {
            class AnimalController {
                @route.get("get")
                theMethod(id: string) { }
            }
            const result = transformController(AnimalController)
            expect(result).toMatchObject([{ method: "get", url: "/animal/get" }])
        })

        it("Should not include method name if empty string is provided", () => {
            class AnimalController {
                @route.get("")
                theMethod(id: string) { }
            }
            const result = transformController(AnimalController)
            expect(result).toMatchObject([{ method: "get", url: "/animal" }])
        })

        it("Should able transform method with multiple routes", () => {
            class AnimalController {
                @route.get("/home")
                @route.get("/about")
                @route.get("/new")
                @route.get("/transaction")
                theMethod(id: string) { }
            }
            const result = transformController(AnimalController)
            expect(result).toMatchObject([
                { method: "get", url: "/home" },
                { method: "get", url: "/about" },
                { method: "get", url: "/new" },
                { method: "get", url: "/transaction" }
            ])
        })
    })

    describe("Ignore Transformation", () => {
        it("Should able to ignore transformation", () => {
            class AnimalController {
                theMethod(id: string) { }
                @route.ignore()
                otherMethod() { }
            }
            const result = transformController(AnimalController)
            expect(result.length).toBe(1)
            expect(result).toMatchObject([{ method: "get", url: "/animal/themethod" }])
        })
    })

    describe("Root Transformation", () => {
        it("Should be able to override only the class name with root route", () => {
            @route.root("/beast")
            class AnimalController {
                theMethod(id: string) { }
                otherMethod() { }
            }
            const result = transformController(AnimalController)
            expect(result).toMatchObject([
                { method: "get", url: "/beast/themethod" },
                { method: "get", url: "/beast/othermethod" }
            ])
        })

        it("Should be able to override class name and method name with root route and relative route", () => {
            @route.root("/beast")
            class AnimalController {
                @route.get("get")
                theMethod(id: string) { }
            }
            const result = transformController(AnimalController)
            expect(result).toMatchObject([{ method: "get", url: "/beast/get" }])
        })

        it("Should be able to transform root route with parameter", () => {
            @route.root("/beast/:beastId/animal")
            class AnimalController {
                @route.get("get")
                theMethod(beastId:string, id: string) { }
            }
            const result = transformController(AnimalController)
            expect(result).toMatchObject([{ method: "get", url: "/beast/:beastid/animal/get" }])
        })

        it("Should be able to skip class name override from action by absolute route", () => {
            @route.root("/beast")
            class AnimalController {
                @route.get("/absolute/method")
                theMethod(id: string) { }
                otherMethod() { }
            }
            const result = transformController(AnimalController)
            expect(result).toMatchObject([
                { method: "get", url: "/absolute/method" },
                { method: "get", url: "/beast/othermethod" }
            ])
        })

        it("Should transform multiple root decorators", () => {
            @route.root("/animal")
            @route.root("/beast")
            class AnimalController {
                theMethod(id: string) { }
            }
            const result = transformController(AnimalController)
            expect(result).toMatchObject([
                { method: "get", url: "/animal/themethod" },
                { method: "get", url: "/beast/themethod" },
            ])
        })

        it("Should transform multiple root decorators with multiple routes", () => {
            @route.root("/animal")
            @route.root("/beast")
            class AnimalController {
                @route.get("home")
                @route.get("about")
                theMethod(id: string) { }
            }
            const result = transformController(AnimalController)
            expect(result).toMatchObject([
                { method: "get", url: "/animal/home" },
                { method: "get", url: "/animal/about" },
                { method: "get", url: "/beast/home" },
                { method: "get", url: "/beast/about" },
            ])
        })

        it("Should add preceding slash if not provided", () => {
            @route.root("beast")
            class AnimalController {
                @route.get("get")
                theMethod(id: string) { }
            }
            const result = transformController(AnimalController)
            expect(result).toMatchObject([{ method: "get", url: "/beast/get" }])
        })

        it("Should not double slash if trailing slash added", () => {
            @route.root("/beast/")
            class AnimalController {
                @route.get("get")
                theMethod(id: string) { }
            }
            const result = transformController(AnimalController)
            expect(result).toMatchObject([{ method: "get", url: "/beast/get" }])
        })
    })
})

