import reflect, { decorateMethod } from "@plumier/reflect"

import { PartialValidator, Result, val, validate, ValidatorDecorator, VisitorInvocation } from "../src"
import { RequiredValidator } from "../src/validation"

const required = <ValidatorDecorator>{ type: "tc:validator", validator: RequiredValidator }


describe("Required Validator and Partial", () => {
    describe("Decorators", () => {
        it("Should able to decorate required validator", () => {
            @reflect.parameterProperties()
            class AnimalClass {
                constructor(
                    public id: number,
                    public name: string,
                    public deceased: boolean,
                    @val.required()
                    public birthday: Date
                ) { }
            }
            expect(reflect(AnimalClass)).toMatchSnapshot()
        })

        it("Should able to decorate partial validator", () => {
            @reflect.parameterProperties()
            class AnimalClass {
                constructor(
                    public id: number,
                    public name: string,
                    public deceased: boolean,
                    public birthday: Date
                ) { }
            }

            class AnimalController {
                @decorateMethod({})
                save(@val.partial(AnimalClass) data: AnimalClass) { }
            }
            expect(reflect(AnimalController)).toMatchSnapshot()
        })
    })

    describe("Primitive Type Validation", () => {

        it("Should validate undefined if required", () => {
            const result = validate(undefined, {
                path: "data",
                type: Number,
                decorators: [required]
            })
            expect(result).toMatchSnapshot()
        })
        it("Should validate null if required", () => {
            const result = validate(null, {
                path: "data",
                type: Number,
                decorators: [required]
            })
            expect(result).toMatchSnapshot()
        })
        it("Should validate empty string if required", () => {
            const result = validate("", {
                path: "data",
                type: Number,
                decorators: [required]
            })
            expect(result).toMatchSnapshot()
        })
        it("Should give proper info if provided wrong type of value", () => {
            const result = validate("hula", {
                path: "data",
                type: Number,
            })
            expect(result).toMatchSnapshot()
        })
        it("Should valid if not required and provided null", () => {
            const result = validate(null, {
                path: "data",
                type: Number,
            })
            expect(result).toMatchSnapshot()
        })

        it("Should valid if not required and provided undefined", () => {
            const result = validate(undefined, {
                path: "data",
                type: Number,
            })
            expect(result).toMatchSnapshot()
        })

        it("Should valid if not required and provided empty string", () => {
            const result = validate("", {
                path: "data",
                type: Number,
            })
            expect(result).toMatchSnapshot()
        })
    })

    describe("Object Validator", () => {
        @reflect.parameterProperties()
        class AnimalClass {
            constructor(
                @val.required()
                public id: number,
                public name: string,
                public deceased: boolean,
                public birthday: Date
            ) { }
        }

        const option = { type: AnimalClass, }

        it("Should validate undefined property if required", () => {
            const result = validate({ id: undefined, name: "Mimi", deceased: "ON", birthday: "2018-2-2" }, { ...option })
            expect(result).toMatchSnapshot()
        })

        it("Should validate null property if required", () => {
            const result = validate({ id: null, name: "Mimi", deceased: "ON", birthday: "2018-2-2" }, { ...option })
            expect(result).toMatchSnapshot()
        })

        it("Should validate empty string property", () => {
            const result = validate({ id: "", name: "", deceased: "ON", birthday: "2018-2-2" }, { ...option })
            expect(result).toMatchSnapshot()
        })

        it("Should validate required validation if property not provided", () => {
            const result = validate({ name: "Mimi", deceased: "ON", birthday: "2018-2-2" }, { ...option })
            expect(result).toMatchSnapshot()
        })

        it("Should valid if provided null if not required", () => {
            const result = validate({ id: "123", name: null, deceased: null, birthday: null }, { ...option })
            expect(result).toMatchSnapshot()
        })

        it("Should valid if provided undefined if not required", () => {
            const result = validate({ id: "123" }, { ...option })
            expect(result).toMatchSnapshot()
        })
    })

    describe("Array of Primitive Type Validation", () => {

        it("Should validate undefined if required", () => {
            const result = validate(["1", undefined, "3"], {
                path: "data",
                type: [Number],
                decorators: [required]
            })
            expect(result).toMatchSnapshot()
        })
        it("Should validate null if required", () => {
            const result = validate(["1", null, "3"], {
                path: "data",
                type: [Number],
                decorators: [required]
            })
            expect(result).toMatchSnapshot()
        })
        it("Should validate empty string if required", () => {
            const result = validate(["1", "", "3"], {
                path: "data",
                type: [Number],
                decorators: [required]
            })
            expect(result).toMatchSnapshot()
        })
        it("Should valid if not required", () => {
            const result = validate(["1", null, "3"], {
                path: "data",
                type: [Number],
            })
            expect(result).toMatchSnapshot()
        })
    })

    describe("Array of Object Validator", () => {
        @reflect.parameterProperties()
        class AnimalClass {
            constructor(
                @val.required()
                public id: number,
                public name: string,
                public deceased: boolean,
                public birthday: Date
            ) { }
        }

        const option = { type: [AnimalClass], }

        it("Should validate undefined property if required", () => {
            const result = validate([undefined, { id: undefined, name: "Mimi", deceased: "ON", birthday: "2018-2-2" }], { ...option })
            expect(result).toMatchSnapshot()
        })

        it("Should validate null property if required", () => {
            const result = validate([undefined, { id: null, name: "Mimi", deceased: "ON", birthday: "2018-2-2" }], { ...option })
            expect(result).toMatchSnapshot()
        })

        it("Should validate empty string property if required", () => {
            const result = validate([undefined, { id: "", name: "Mimi", deceased: "ON", birthday: "2018-2-2" }], { ...option })
            expect(result).toMatchSnapshot()
        })

        it("Should valid if not required", () => {
            const result = validate([undefined, { id: "123" }], { ...option })
            expect(result).toMatchSnapshot()
        })
    })

    describe("Nested Object Validator", () => {
        @reflect.parameterProperties()
        class TagClass {
            constructor(
                @val.required()
                public id: number,
                public name: string
            ) { }
        }

        @reflect.parameterProperties()
        class AnimalClass {
            constructor(
                public id: number,
                public name: string,
                public deceased: boolean,
                public birthday: Date,
                public tag: TagClass
            ) { }
        }

        const option = { type: AnimalClass, }

        it("Should validate undefined property if required", () => {
            const result = validate({ id: "123", name: "Mimi", deceased: "ON", birthday: "2018-2-2", tag: { id: undefined, name: "The Tag" } }, { ...option })
            expect(result).toMatchSnapshot()
        })

        it("Should validate null property if required", () => {
            const result = validate({ id: "123", name: "Mimi", deceased: "ON", birthday: "2018-2-2", tag: { id: null, name: "The Tag" } }, { ...option })
            expect(result).toMatchSnapshot()
        })

        it("Should validate empty string property if required", () => {
            const result = validate({ id: "123", name: "Mimi", deceased: "ON", birthday: "2018-2-2", tag: { id: "", name: "The Tag" } }, { ...option })
            expect(result).toMatchSnapshot()
        })

        it("Should valid if provided null not required", () => {
            const result = validate({ id: "123", name: "Mimi", deceased: "ON", birthday: "2018-2-2", tag: { id: "123", name: null } }, { ...option })
            expect(result).toMatchSnapshot()
        })

        it("Should valid if provided undefined not required", () => {
            const result = validate({ id: "123", tag: { id: "123", name: undefined } }, { ...option })
            expect(result).toMatchSnapshot()
        })
    })

    describe("Partial Validation", () => {

        it("Should skip required validator on partial parent", () => {
            @reflect.parameterProperties()
            class AnimalClass {
                constructor(
                    public id: number,
                    public name: string,
                    @val.required()
                    public deceased: boolean,
                    public birthday: Date
                ) { }
            }
            const result = validate({ id: "123" }, {
                decorators: [<ValidatorDecorator>{ type: "tc:validator", validator: PartialValidator }],
                path: "data",
                type: AnimalClass,
            })
            expect(result).toMatchSnapshot()
        })

        it("Should able to combined with required", () => {
            @reflect.parameterProperties()
            class AnimalClass {
                constructor(
                    public id: number,
                    public name: string,
                    public deceased: boolean,
                    public birthday: Date
                ) { }
            }
            const result = validate(undefined, {
                decorators: [<ValidatorDecorator>{ type: "tc:validator", validator: PartialValidator }, required],
                path: "data",
                type: AnimalClass,
            })
            expect(result).toMatchSnapshot()
        })
    })

})

describe("Validator", () => {
    it("Should validate properly", () => {
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


    it("Should return message if provided invalid value", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.email()
                public property: string
            ) { }
        }
        const result = validate({ property: "lorem ipsum" }, { type: Dummy, })
        expect(result).toMatchObject({ issues: [{ messages: ["Invalid email address"], path: "property" }] })
    })

    it("Should prioritize Required validator than other validator", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.required()
                @val.email()
                public property: string
            ) { }
        }
        const result = validate({ property: "" }, { type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Required"] }])
    })

    it("Should valid if not required", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.email()
                public property: string
            ) { }
        }
        const result = validate({ property: undefined }, { type: Dummy, })
        expect(result).toMatchObject({ value: {}, issues: undefined })
    })

    it("Should able to add custom visitor", () => {
        const visitor = (i: VisitorInvocation) => {
            if (i.type === String) return Result.create("lorem ipsum")
            else return i.proceed()
        }
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.email()
                public property: string
            ) { }
        }
        const result = validate({ property: "lorem.ipsum@gmail.com" }, { visitors: [visitor], type: Dummy, })
        expect(result).toMatchObject({ value: { property: "lorem ipsum" } })
    })
})
