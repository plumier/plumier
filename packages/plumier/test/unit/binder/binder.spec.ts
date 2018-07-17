import { reflect } from "@plumjs/reflect";
import { Request } from "koa";

import { array, bind, model, route } from "../../../src";
import { bindParameter } from "../../../src/binder";

function request(opt?: Partial<Request>): Request {
    return <Request>{ body: { name: "The Body" }, ...opt }
}


describe("Parameter Binder", () => {
    it("Should bind non decorated action", () => {
        class AnimalController {
            getAnimal(id: number, name: string) { }
        }
        const metadata = reflect(AnimalController)
        const result = bindParameter(request({ query: { id: 123, name: "Mimi" } }), metadata.methods[0])
        expect(result).toEqual([123, "Mimi"])
    })

    describe("Request Binder", () => {
        it("Should bind request body", () => {
            class AnimalController {
                saveAnimal(@bind.request("body") model: any) { }
            }
            const metadata = reflect(AnimalController)
            const result = bindParameter(request(), metadata.methods[0])
            expect(result).toEqual([{ name: "The Body" }])
        })

        it("Should bind request body in any position of action parameter", () => {
            class AnimalController {
                saveAnimal(id: number, name: string, @bind.request("body") model: any, email: string) { }
            }
            const metadata = reflect(AnimalController)
            const result = bindParameter(request({ query: { id: 123, name: "Mimi", email: "mimi@gmail.com" } }), metadata.methods[0])
            expect(result).toEqual([123, "Mimi", { name: "The Body" }, "mimi@gmail.com"])
        })

        it("Should bin request", () => {
            class AnimalController {
                saveAnimal(@bind.request() model: any) { }
            }
            const metadata = reflect(AnimalController)
            const result = bindParameter(request(), metadata.methods[0])
            expect(result).toEqual([request()])
        })
    })

    describe("Body Binder", () => {
        it("Should bind request body", () => {
            class AnimalController {
                saveAnimal(@bind.body() model: any) { }
            }
            const metadata = reflect(AnimalController)
            const result = bindParameter(request(), metadata.methods[0])
            expect(result).toEqual([{ name: "The Body" }])
        })

        it("Should bind part of request body", () => {
            class AnimalController {
                saveAnimal(@bind.body("name") model: any) { }
            }
            const metadata = reflect(AnimalController)
            const result = bindParameter(request(), metadata.methods[0])
            expect(result).toEqual(["The Body"])
        })

        it("Should bind request body in any position of action parameter", () => {
            class AnimalController {
                saveAnimal(id: number, name: string, @bind.body() model: any, email: string) { }
            }
            const metadata = reflect(AnimalController)
            const result = bindParameter(request({ query: { id: 123, name: "Mimi", email: "mimi@gmail.com" } }), metadata.methods[0])
            expect(result).toEqual([123, "Mimi", { name: "The Body" }, "mimi@gmail.com"])
        })
    })

    describe("Header Binder", () => {
        it("Should bind request header", () => {
            class AnimalController {
                saveAnimal(@bind.header() model: any) { }
            }
            const metadata = reflect(AnimalController)
            const result = bindParameter(request({ headers: { accept: "gzip" } }), metadata.methods[0])
            expect(result).toEqual([{ accept: "gzip" }])
        })

        it("Should bind part of request header", () => {
            class AnimalController {
                saveAnimal(@bind.header("accept") model: any) { }
            }
            const metadata = reflect(AnimalController)
            const result = bindParameter(request({ headers: { accept: "gzip" } }), metadata.methods[0])
            expect(result).toEqual(["gzip"])
        })

        it("Should bind request header in any position of action parameter", () => {
            class AnimalController {
                saveAnimal(id: number, name: string, @bind.header() model: any, email: string) { }
            }
            const metadata = reflect(AnimalController)
            const result = bindParameter(request({ headers: { accept: "gzip" }, query: { id: 123, name: "Mimi", email: "mimi@gmail.com" } }), metadata.methods[0])
            expect(result).toEqual([123, "Mimi", { accept: "gzip" }, "mimi@gmail.com"])
        })
    })

    describe("Query Binder", () => {
        it("Should bind request query", () => {
            class AnimalController {
                saveAnimal(@bind.query() model: any) { }
            }
            const metadata = reflect(AnimalController)
            const result = bindParameter(request({ query: { accept: "gzip" } }), metadata.methods[0])
            expect(result).toEqual([{ accept: "gzip" }])
        })

        it("Should bind part of request query", () => {
            class AnimalController {
                saveAnimal(@bind.query("accept") model: any) { }
            }
            const metadata = reflect(AnimalController)
            const result = bindParameter(request({ query: { accept: "gzip" } }), metadata.methods[0])
            expect(result).toEqual(["gzip"])
        })
    })

    describe("Model Binder", () => {
        it("Should bind model on post method", () => {
            @model()
            class AnimalModel {
                constructor(
                    public id: number,
                    public name: string
                ) { }
            }

            class AnimalController {
                @route.post()
                saveAnimal(model: AnimalModel) { }
            }

            const metadata = reflect(AnimalController)
            const result = bindParameter(request({ body: { id: "123", name: "Mimi", other: "MALICIOUS CODE" } }), metadata.methods[0])
            expect(result[0]).toBeInstanceOf(AnimalModel)
            expect(result[0]).toEqual({ id: 123, name: "Mimi" })
        })

        it("Should bind model on put method", () => {
            class AnimalModel {
                constructor(
                    public id: string,
                    public name: string
                ) { }
            }

            class AnimalController {
                @route.put(":id")
                saveAnimal(id: number, model: AnimalModel) { }
            }

            const metadata = reflect(AnimalController)
            const result = bindParameter(request({ query: { id: "123" }, body: { id: 123, name: "Mimi" } }), metadata.methods[0])
            expect(result[0]).toBe(123)
            expect(result[1]).toBeInstanceOf(AnimalModel)
            expect(result[1]).toMatchObject({ id: 123, name: "Mimi" })
        })

    })

    describe("Array Binder", () => {
        it("Should bind array of number", () => {
            class AnimalController {
                @route.post()
                saveAnimal(@array(Number) model: number[]) { }
            }
            const metadata = reflect(AnimalController)
            const result = bindParameter(request({ query: {}, body: ["1", "2", "3"] }), metadata.methods[0])
            expect(result[0]).toEqual([1, 2, 3])
        })
        it("Should bind array of model", () => {
            @model()
            class AnimalModel {
                constructor(
                    public id: number,
                    public name: string
                ) { }
            }

            class AnimalController {
                @route.post()
                saveAnimal(@array(AnimalModel) model: AnimalModel[]) { }
            }

            const metadata = reflect(AnimalController)
            const result = bindParameter(request({ query: {}, body: [
                {id: "123", name: "Mimi"},
                {id: "123", name: "Mimi"},
                {id: "123", name: "Mimi"}
            ] }), metadata.methods[0])
            expect(result[0]).toEqual([
                {id: 123, name: "Mimi"},
                {id: 123, name: "Mimi"},
                {id: 123, name: "Mimi"}
            ])

        })
    })
})