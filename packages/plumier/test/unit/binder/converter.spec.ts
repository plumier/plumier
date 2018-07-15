import { decorateClass, reflect } from "tinspector";

import { bind, model, TypeConverter } from "../../../src";
import { convert, DefaultConverterList, flattenConverters } from "../../../src/binder";
import { ParameterProperties, ArrayBindingDecorator, Class } from '../../../src/core';

class AnimalController {
    get(id: number) { }
}
const metaData = reflect(AnimalController)

const DefaultNumberProp: ParameterProperties = {
    converters: flattenConverters(DefaultConverterList),
    parameterType: Number,
    path: ["id"],
    decorators: metaData.methods[0].decorators[0] || []
}

describe("Converter", () => {
    describe("Number Converter", () => {
        it("Should convert number", () => {
            const result = convert("123", DefaultNumberProp)
            expect(result).toBe(123)
        })
        it("Should convert float", () => {
            const result = convert("123.123", DefaultNumberProp)
            expect(result).toBe(123.123)
        })
        it("Should convert negative", () => {
            const result = convert("-123", DefaultNumberProp)
            expect(result).toBe(-123)
        })
        it("Should convert negative float", () => {
            const result = convert("-123.123", DefaultNumberProp)
            expect(result).toBe(-123.123)
        })
        it("Should return undefined if provided null", () => {
            const result = convert(null, DefaultNumberProp)
            expect(result).toBeUndefined()
        })
        it("Should return undefined if provided undefined", () => {
            const result = convert(undefined, DefaultNumberProp)
            expect(result).toBeUndefined()
        })
        it("Should not convert string", () => {
            expect(() => convert("hello", DefaultNumberProp)).toThrow(`Unable to convert "hello" into Number in parameter id`)
        })
    })

    describe("Boolean Converter", () => {
        const Prop = { ...DefaultNumberProp, parameterType: Boolean }
        it("Should convert Trusty string to true", () => {
            const result = ["ON", "TRUE", "1", "YES", 1].map(x => convert(x, Prop))
            expect(result.every(x => x == true)).toEqual(true)
        })
        it("Should convert Falsy into false", () => {
            const result = ["OFF", "FALSE", "0", "NO", 0].map(x => convert(x, Prop))
            expect(result.every(x => x == false)).toEqual(true)
        })
        it("Should return undefined if provided null", () => {
            const result = convert(null, Prop)
            expect(result).toBeUndefined()
        })
        it("Should return undefined if provided undefined", () => {
            const result = convert(undefined, Prop)
            expect(result).toBeUndefined()
        })
        it("Should throw error when provided non convertible string", () => {
            expect(() => convert("Hello", Prop)).toThrow(`Unable to convert "Hello" into Boolean in parameter id`)
        })
        it("Should throw error when provided non convertible number", () => {
            expect(() => convert(200, Prop)).toThrow(`Unable to convert "200" into Boolean in parameter id`)
        })
    })

    describe("Date Converter", () => {
        const Prop = { ...DefaultNumberProp, parameterType: Date }
        it("Should convert date", () => {
            const result = convert("2018-12-22", Prop)
            expect(result.getTime()).toEqual(new Date("2018-12-22").getTime())
        })
        it("Should convert date", () => {
            const result = convert("12/22/2018", Prop)
            expect(result.getTime()).toEqual(new Date("12/22/2018").getTime())
        })
        it("Should return undefined if provided null", () => {
            const result = convert(null, Prop)
            expect(result).toBeUndefined()
        })
        it("Should return undefined if provided undefined", () => {
            const result = convert(undefined, Prop)
            expect(result).toBeUndefined()
        })
        it("Should throw error when provided non convertible string", () => {
            expect(() => convert("Hello", Prop)).toThrow(`Unable to convert "Hello" into Date in parameter id`)
        })
    })

    describe("Model Converter", () => {
        it("Should convert model and appropriate properties", () => {
            @decorateClass({})
            class AnimalClass {
                constructor(
                    public id: number,
                    public name: string,
                    public deceased: boolean,
                    public birthday: Date
                ) { }
            }

            const result = convert({ id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1" }, { ...DefaultNumberProp, parameterType: AnimalClass })
            expect(result).toBeInstanceOf(AnimalClass)
            expect(result).toEqual({ birthday: new Date("2018-1-1"), deceased: true, id: 200, name: "Mimi" })
        })

        it("Should not convert excess properties", () => {
            @decorateClass({})
            class AnimalClass {
                constructor(
                    public id: number,
                    public name: string,
                ) { }
            }

            const result = convert({ id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1", }, { ...DefaultNumberProp, parameterType: AnimalClass })
            expect(result).toBeInstanceOf(AnimalClass)
            expect(result).toEqual({ id: 200, name: "Mimi" })
        })

        it("Should not sanitized if no constructor property found", () => {
            class AnimalClass {
                constructor(
                    public id: number,
                    public name: string,
                    public deceased: boolean,
                    public birthday: Date
                ) { }
            }

            const result = convert({ id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1" }, { ...DefaultNumberProp, parameterType: AnimalClass })
            expect(result).toBeInstanceOf(AnimalClass)
            expect(result).toEqual({ id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1" })
        })

        it("Should allow undefined value", () => {
            @decorateClass({})
            class AnimalClass {
                constructor(
                    public id: number,
                    public name: string,
                    public deceased: boolean,
                    public birthday: Date
                ) { }
            }

            const result = convert({}, { ...DefaultNumberProp, parameterType: AnimalClass })
            expect(result).toBeInstanceOf(AnimalClass)
            expect(result).toEqual({})
        })

        it("Should throw if provided non convertible value", () => {
            @decorateClass({})
            class AnimalClass {
                constructor(
                    public id: number,
                    public name: string,
                    public deceased: boolean,
                    public birthday: Date
                ) { }
            }

            expect(() => {
                convert({ id: "200", name: "Mimi", deceased: "Hello", birthday: "2018-1-1" },
                    { ...DefaultNumberProp, parameterType: AnimalClass })
            }).toThrow(`Unable to convert "Hello" into Boolean in parameter id->deceased`)
        })

        it("Should throw if provided non convertible value", () => {
            @decorateClass({})
            class AnimalClass {
                constructor(
                    public id: number,
                    public name: string,
                    public deceased: boolean,
                    public birthday: Date
                ) { }
            }

            expect(() => {
                convert("Hello", { ...DefaultNumberProp, parameterType: AnimalClass })
            }).toThrow(`Unable to convert "Hello" into AnimalClass in parameter id`)
        })

    })

    describe("Nested Model", () => {
        @decorateClass({})
        class ClientClass {
            constructor(
                public id: number,
                public name: string,
                public join: Date
            ) { }
        }

        @decorateClass({})
        class AnimalClass {
            constructor(
                public id: number,
                public name: string,
                public deceased: boolean,
                public birthday: Date,
                public owner: ClientClass
            ) { }
        }

        const prop = { ...DefaultNumberProp, parameterType: AnimalClass }

        it("Should convert nested model", () => {
            const result: AnimalClass = convert({
                id: "200",
                name: "Mimi",
                deceased: "ON",
                birthday: "2018-1-1",
                owner: { id: "400", name: "John Doe", join: "2015-1-1" }
            }, prop)
            expect(result).toBeInstanceOf(AnimalClass)
            expect(result.owner).toBeInstanceOf(ClientClass)
            expect(result).toEqual({
                birthday: new Date("2018-1-1"),
                deceased: true,
                id: 200,
                name: "Mimi",
                owner: { id: 400, name: "John Doe", join: new Date("2015-1-1") }
            })
        })

        it("Should sanitize excess data", () => {
            const result: AnimalClass = convert({
                id: "200",
                name: "Mimi",
                deceased: "ON",
                birthday: "2018-1-1",
                excess: "Malicious Code",
                owner: { id: "400", name: "John Doe", join: "2015-1-1", excess: "Malicious Code" }
            }, prop)
            expect(result).toBeInstanceOf(AnimalClass)
            expect(result.owner).toBeInstanceOf(ClientClass)
            expect(result).toEqual({
                birthday: new Date("2018-1-1"),
                deceased: true,
                id: 200,
                name: "Mimi",
                owner: { id: 400, name: "John Doe", join: new Date("2015-1-1") }
            })
        })

        it("Should allow undefined values", () => {
            const result: AnimalClass = convert({
                id: "200",
                name: "Mimi",
                owner: { id: "400", name: "John Doe" }
            }, prop)
            expect(result).toBeInstanceOf(AnimalClass)
            expect(result.owner).toBeInstanceOf(ClientClass)
            expect(result).toEqual({
                id: 200,
                name: "Mimi",
                owner: { id: 400, name: "John Doe" }
            })
        })

        it("Should throw if non convertible value provided", () => {
            expect(() => convert({
                id: "200",
                name: "Mimi",
                deceased: "ON",
                birthday: "2018-1-1",
                owner: { id: "400", name: "John Doe", join: "Hello" }
            }, prop)).toThrow(`Unable to convert "Hello" into Date in parameter id->owner->join`)
        })

        it("Should throw if non convertible model provided", () => {
            expect(() => convert({
                id: "200",
                name: "Mimi",
                deceased: "ON",
                birthday: "2018-1-1",
                owner: "Hello"
            }, prop)).toThrow(`Unable to convert "Hello" into ClientClass in parameter id->owner`)
        })
    })

    describe("Array Converter", () => {
        const getProp = (type:Class) => ({
            ...DefaultNumberProp,
            parameterType: Array,
            decorators: [<ArrayBindingDecorator>{ type: "ParameterBinding", name: "Array", typeAnnotation: type }]
        })

        it("Should convert array of number", () => {
            const result = convert(["123", "123", "123"], getProp(Number))
            expect(result).toEqual([123, 123, 123])
        })
        it("Should convert array of model", () => {
            @model()
            class AnimalClass {
                constructor(
                    public id: number,
                    public name: string,
                    public deceased: boolean,
                    public birthday: Date
                ) { }
            }
            const result = convert([
                { id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1" },
                { id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1" },
                { id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1" }
            ], getProp(AnimalClass))
            expect(result).toEqual([
                { birthday: new Date("2018-1-1"), deceased: true, id: 200, name: "Mimi" },
                { birthday: new Date("2018-1-1"), deceased: true, id: 200, name: "Mimi" },
                { birthday: new Date("2018-1-1"), deceased: true, id: 200, name: "Mimi" }
            ])
        })

        it("Should convert nested array inside model", () => {
            @model()
            class TagModel {
                constructor(
                    public id: number,
                    public name: string,
                ) { }
            }
            @model()
            class AnimalClass {
                constructor(
                    public id: number,
                    public name: string,
                    public deceased: boolean,
                    public birthday: Date,
                    @bind.array(TagModel)
                    public tags: TagModel[]
                ) { }
            }
            const result = convert([
                { id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1", tags: [{ id: "300", name: "Tug" }] },
                { id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1", tags: [{ id: "300", name: "Tug" }] },
                { id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1", tags: [{ id: "300", name: "Tug" }] }
            ], getProp(AnimalClass))
            expect(result).toEqual([
                { birthday: new Date("2018-1-1"), deceased: true, id: 200, name: "Mimi", tags: [{ id: 300, name: "Tug" }] },
                { birthday: new Date("2018-1-1"), deceased: true, id: 200, name: "Mimi", tags: [{ id: 300, name: "Tug" }] },
                { birthday: new Date("2018-1-1"), deceased: true, id: 200, name: "Mimi", tags: [{ id: 300, name: "Tug" }] }
            ])
        })
    })

    describe("Custom Converter", () => {
        it("Should able to use custom converter", () => {
            const converters: TypeConverter[] = [{type: Boolean, converter: x => "Custom Boolean"}]
            const result = convert("TRUE", { ...DefaultNumberProp, parameterType: Boolean, converters: flattenConverters(converters) })
            expect(result).toBe("Custom Boolean")
        })
    })
})