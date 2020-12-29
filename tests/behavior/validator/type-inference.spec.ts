import reflect from "@plumier/reflect"

import createConverter, { createValidator, val, validate, convert } from "@plumier/validator"


describe("Generic Type Inference", () => {
    describe("Converter", () => {
        it("Should able to infer type by provided type in option", () => {
            @reflect.parameterProperties()
            class Dummy {
                constructor(
                    public property: string
                ) { }
            }
            const result = convert({ property: "lorem.ipsum@gmail.com" }, { type: Dummy, })
            expect(result).toMatchObject({ value: { property: "lorem.ipsum@gmail.com" } })
        })

        it("Should able to infer array type by provided type in option", () => {
            @reflect.parameterProperties()
            class Dummy {
                constructor(
                    public property: string
                ) { }
            }
            const result = convert([{ property: "lorem.ipsum@gmail.com" }], { type: [Dummy], })
            expect(result).toMatchObject({ value: [{ property: "lorem.ipsum@gmail.com" }] })
        })

        it("Should able to infer type by provided type from validator factory", () => {
            @reflect.parameterProperties()
            class Dummy {
                constructor(
                    public property: string
                ) { }
            }
            const valid = createConverter({ type: Dummy })
            const result = valid({ property: "lorem.ipsum@gmail.com" })
            expect(result).toMatchObject({ value: { property: "lorem.ipsum@gmail.com" } })
        })

        it("Should able to infer array type by provided type from validator factory", () => {
            @reflect.parameterProperties()
            class Dummy {
                constructor(
                    public property: string
                ) { }
            }
            const valid = createConverter({ type: [Dummy] })
            const result = valid([{ property: "lorem.ipsum@gmail.com" }])
            expect(result).toMatchObject({ value: [{ property: "lorem.ipsum@gmail.com" }] })
        })

        it("Should able to pass type to validator factory", () => {
            @reflect.parameterProperties()
            class Dummy {
                constructor(
                    public property: string
                ) { }
            }
            const valid = createConverter(Dummy)
            const result = valid({ property: "lorem.ipsum@gmail.com" })
            expect(result).toMatchObject({ value: { property: "lorem.ipsum@gmail.com" } })
        })

        it("Should able to pass array type to validator factory", () => {
            @reflect.parameterProperties()
            class Dummy {
                constructor(
                    public property: string
                ) { }
            }
            const valid = createConverter([Dummy])
            const result = valid([{ property: "lorem.ipsum@gmail.com" }])
            expect(result).toMatchObject({ value: [{ property: "lorem.ipsum@gmail.com" }] })
        })
    })

    describe("Validation", () => {
        it("Should able to infer type by provided type in option", () => {
            @reflect.parameterProperties()
            class Dummy {
                constructor(
                    @val.email()
                    public property: string
                ) { }
            }
            const result = validate({ property: "lorem.ipsum@gmail.com" }, { type: Dummy, })
            expect(result).toMatchObject({ value: { property: "lorem.ipsum@gmail.com" } })
        })

        it("Should able to infer array type by provided type in option", () => {
            @reflect.parameterProperties()
            class Dummy {
                constructor(
                    @val.email()
                    public property: string
                ) { }
            }
            const result = validate([{ property: "lorem.ipsum@gmail.com" }], { type: [Dummy], })
            expect(result).toMatchObject({ value: [{ property: "lorem.ipsum@gmail.com" }] })
        })

        it("Should able to infer type by provided type from validator factory", () => {
            @reflect.parameterProperties()
            class Dummy {
                constructor(
                    @val.email()
                    public property: string
                ) { }
            }
            const valid = createValidator({ type: Dummy })
            const result = valid({ property: "lorem.ipsum@gmail.com" })
            expect(result).toMatchObject({ value: { property: "lorem.ipsum@gmail.com" } })
        })

        it("Should able to infer array type by provided type from validator factory", () => {
            @reflect.parameterProperties()
            class Dummy {
                constructor(
                    @val.email()
                    public property: string
                ) { }
            }
            const valid = createValidator({ type: [Dummy] })
            const result = valid([{ property: "lorem.ipsum@gmail.com" }])
            expect(result).toMatchObject({ value: [{ property: "lorem.ipsum@gmail.com" }] })
        })

        it("Should able to pass type to validator factory", () => {
            @reflect.parameterProperties()
            class Dummy {
                constructor(
                    @val.email()
                    public property: string
                ) { }
            }
            const valid = createValidator(Dummy)
            const result = valid({ property: "lorem.ipsum@gmail.com" })
            expect(result).toMatchObject({ value: { property: "lorem.ipsum@gmail.com" } })
        })

        it("Should able to pass array type to validator factory", () => {
            @reflect.parameterProperties()
            class Dummy {
                constructor(
                    @val.email()
                    public property: string
                ) { }
            }
            const valid = createValidator([Dummy])
            const result = valid([{ property: "lorem.ipsum@gmail.com" }])
            expect(result).toMatchObject({ value: [{ property: "lorem.ipsum@gmail.com" }] })
        })
    })

})
