import { Request } from "koa";

import { bindParameter, model } from "../../src/binder";
import { reflect } from "../../src/libs/reflect";
import { bind, route } from '../../src';

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
                    public id: string,
                    public name: string
                ) { }
            }

            class AnimalController {
                @route.post()
                saveAnimal(model: AnimalModel) { }
            }

            const metadata = reflect(AnimalController)
            const result = bindParameter(request({ body: { id: 123, name: "Mimi" } }), metadata.methods[0])
            expect(result[0]).toBeInstanceOf(AnimalModel)
            expect(result[0]).toMatchObject({ id: 123, name: "Mimi" })
        })

        it("Should bind model on put method", () => {
            @model()
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

        it("Should not bind model if parameter decorated with other binding", () => {
            @model()
            class AnimalModel {
                constructor(
                    public id: string,
                    public name: string
                ) { }
            }

            class AnimalController {
                @route.put()
                saveAnimal(@bind.request() model: AnimalModel) { }
            }

            const metadata = reflect(AnimalController)
            const result = bindParameter(request({ query: { id: "123" }, body: { id: 123, name: "Mimi" } }), metadata.methods[0])
            expect(result[0]).toMatchObject({ query: { id: "123" }, body: { id: 123, name: "Mimi" } })
        })
    })

    describe("Converter", () => {
        it("If parameters metadata not provided should keep '123' using string", () => {
            class AnimalController {
                getAnimal(id: number) { }
            }
            const metadata = reflect(AnimalController)
            const result = bindParameter(request({ query: { id: "123" } }), metadata.methods[0])
            expect(result).toEqual(["123"])
        })

        it("If parameters metadata not provided should keep 'TRUE' using string", () => {
            class AnimalController {
                getAnimal(id: number) { }
            }
            const metadata = reflect(AnimalController)
            const result = bindParameter(request({ query: { id: "TRUE" } }), metadata.methods[0])
            expect(result).toEqual(["TRUE"])
        })

        it("Should able to specify custom converter", () => {
            function convertNumber(value: string) { return 474747 }
            class AnimalController {
                @route.get()
                getAnimal(id: number) { }
            }
            const metadata = reflect(AnimalController)
            const normalResult = bindParameter(request({ query: { id: "123" } }), metadata.methods[0])
            expect(normalResult).toEqual([123])
            const result = bindParameter(request({ query: { id: "123" } }), metadata.methods[0], { Number: convertNumber })
            expect(result).toEqual([474747])
        })

        describe("Number Converter", () => {
            it("Should convert number", () => {
                class AnimalController {
                    @route.get()
                    getAnimal(id: number) { }
                }
                const metadata = reflect(AnimalController)
                const result = bindParameter(request({ query: { id: "123" } }), metadata.methods[0])
                expect(result).toEqual([123])
            })

            it("Should convert float", () => {
                class AnimalController {
                    @route.get()
                    getAnimal(id: number) { }
                }
                const metadata = reflect(AnimalController)
                const result = bindParameter(request({ query: { id: "123.456" } }), metadata.methods[0])
                expect(result).toEqual([123.456])
            })
        })

        describe("Boolean Converter", () => {
            it("Should convert ON to true", () => {
                class AnimalController {
                    @route.get()
                    getAnimal(id: boolean) { }
                }
                const metadata = reflect(AnimalController)
                const result = bindParameter(request({ query: { id: "ON" } }), metadata.methods[0])
                expect(result).toEqual([true])
            })

            it("Should convert 'on' to true", () => {
                class AnimalController {
                    @route.get()
                    getAnimal(id: boolean) { }
                }
                const metadata = reflect(AnimalController)
                const result = bindParameter(request({ query: { id: "on" } }), metadata.methods[0])
                expect(result).toEqual([true])
            })

            it("Should convert YES to true", () => {
                class AnimalController {
                    @route.get()
                    getAnimal(id: boolean) { }
                }
                const metadata = reflect(AnimalController)
                const result = bindParameter(request({ query: { id: "YES" } }), metadata.methods[0])
                expect(result).toEqual([true])
            })

            it("Should convert 1 to true", () => {
                class AnimalController {
                    @route.get()
                    getAnimal(id: boolean) { }
                }
                const metadata = reflect(AnimalController)
                const result = bindParameter(request({ query: { id: "1" } }), metadata.methods[0])
                expect(result).toEqual([true])
            })

            it("Should convert TRUE to true", () => {
                class AnimalController {
                    @route.get()
                    getAnimal(id: boolean) { }
                }
                const metadata = reflect(AnimalController)
                const result = bindParameter(request({ query: { id: "TRUE" } }), metadata.methods[0])
                expect(result).toEqual([true])
            })

            it("Should convert CUSTOM STRING to false", () => {
                class AnimalController {
                    @route.get()
                    getAnimal(id: boolean) { }
                }
                const metadata = reflect(AnimalController)
                const result = bindParameter(request({ query: { id: "CUSTOM STRING" } }), metadata.methods[0])
                expect(result).toEqual([false])
            })

            it("Should convert 12345 to false", () => {
                class AnimalController {
                    @route.get()
                    getAnimal(id: boolean) { }
                }
                const metadata = reflect(AnimalController)
                const result = bindParameter(request({ query: { id: "12345" } }), metadata.methods[0])
                expect(result).toEqual([false])
            })
        })


    })
})