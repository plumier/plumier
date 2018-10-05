import { ConversionError, Converters } from "@plumjs/core";
import { array, decorateClass, reflect } from "@plumjs/reflect";

import { domain, TypeConverter } from "../../../src";
import { convert, DefaultConverters, flattenConverters, TypeConverters, modelConverter, arrayConverter } from "../../../src/binder";

const CONVERTERS: Converters = {
    default: DefaultConverters,
    converters: flattenConverters(TypeConverters)
}

describe("Converter", () => {
    describe("Number Converter", () => {
        it("Should convert number", () => {
            const result = convert("123", ["id"], Number, CONVERTERS)
            expect(result).toBe(123)
        })
        it("Should convert float", () => {
            const result = convert("123.123", ["id"], Number, CONVERTERS)
            expect(result).toBe(123.123)
        })
        it("Should convert negative", () => {
            const result = convert("-123", ["id"], Number, CONVERTERS)
            expect(result).toBe(-123)
        })
        it("Should convert negative float", () => {
            const result = convert("-123.123", ["id"], Number, CONVERTERS)
            expect(result).toBe(-123.123)
        })
        it("Should return undefined if provided null", () => {
            const result = convert(null, ["id"], Number, CONVERTERS)
            expect(result).toBeUndefined()
        })
        it("Should return undefined if provided undefined", () => {
            const result = convert(undefined, ["id"], Number, CONVERTERS)
            expect(result).toBeUndefined()
        })
        it("Should not convert string", () => {
            expect(() => convert("hello", ["id"], Number, CONVERTERS)).toThrow(new ConversionError({ path: ["id"], messages: [`Unable to convert "hello" into Number in parameter id`] }))
        })
    })

    describe("Boolean Converter", () => {
        it("Should convert Trusty string to true", () => {
            const result = ["ON", "TRUE", "1", "YES", 1].map(x => convert(x, ["id"], Boolean, CONVERTERS))
            expect(result.every(x => x == true)).toEqual(true)
        })
        it("Should convert Falsy into false", () => {
            const result = ["OFF", "FALSE", "0", "NO", 0].map(x => convert(x, ["id"], Boolean, CONVERTERS))
            expect(result.every(x => x == false)).toEqual(true)
        })
        it("Should return undefined if provided null", () => {
            const result = convert(null, ["id"], Boolean, CONVERTERS)
            expect(result).toBeUndefined()
        })
        it("Should return undefined if provided undefined", () => {
            const result = convert(undefined, ["id"], Boolean, CONVERTERS)
            expect(result).toBeUndefined()
        })
        it("Should throw error when provided non convertible string", () => {
            expect(() => convert("Hello", ["id"], Boolean, CONVERTERS)).toThrow(new ConversionError({ path: ["id"], messages: [`Unable to convert "Hello" into Boolean`] }))
        })
        it("Should throw error when provided non convertible number", () => {
            expect(() => convert(200, ["id"], Boolean, CONVERTERS)).toThrow(new ConversionError({ path: ["id"], messages: [`Unable to convert "200" into Boolean`] }))
        })
    })

    describe("Date Converter", () => {
        it("Should convert date", () => {
            const result = convert("2018-12-22", ["id"], Date, CONVERTERS)
            expect(result.getTime()).toEqual(new Date("2018-12-22").getTime())
        })
        it("Should convert date", () => {
            const result = convert("12/22/2018", ["id"], Date, CONVERTERS)
            expect(result.getTime()).toEqual(new Date("12/22/2018").getTime())
        })
        it("Should return undefined if provided null", () => {
            const result = convert(null, ["id"], Date, CONVERTERS)
            expect(result).toBeUndefined()
        })
        it("Should return undefined if provided undefined", () => {
            const result = convert(undefined, ["id"], Date, CONVERTERS)
            expect(result).toBeUndefined()
        })
        it("Should throw error when provided non convertible string", () => {
            expect(() => convert("Hello", ["id"], Date, CONVERTERS)).toThrow(new ConversionError({ path: ["id"], messages: [`Unable to convert "Hello" into Date `] }))
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

            const result = convert({ id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1" }, ["id"], AnimalClass, CONVERTERS)
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

            const result = convert({ id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1", }, ["id"], AnimalClass, CONVERTERS)
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

            const result = convert({ id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1" }, ["id"], AnimalClass, CONVERTERS)
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

            const result = convert({}, ["id"], AnimalClass, CONVERTERS)
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
                convert({ id: "200", name: "Mimi", deceased: "Hello", birthday: "2018-1-1" }, ["id"], AnimalClass, CONVERTERS)
            }).toThrow(new ConversionError({ path: ["id", "deceased"], messages: [`Unable to convert "Hello" into Boolean`] }))
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
                convert("Hello", ["id"], AnimalClass, CONVERTERS)
            }).toThrow(new ConversionError({ path: ["id"], messages: [`Unable to convert "Hello" into AnimalClass`] }))
        })

        it("Should not populate optional properties with undefined", () => {
            @decorateClass({})
            class AnimalClass {
                constructor(
                    public id: number,
                    public name: string,
                    public deceased: boolean | undefined,
                    public birthday: Date | undefined
                ) { }
            }

            const result = convert({ id: "200", name: "Mimi", excess: "Hola" }, ["id"], AnimalClass, CONVERTERS)
            expect(result).toBeInstanceOf(AnimalClass)
            expect(Object.keys(result)).toEqual(["id", "name"])
            expect(result).toEqual({ id: 200, name: "Mimi" })
        })

        it("Should throw error if provided expectedType of type of array", () => {
            @decorateClass({})
            class AnimalClass {
                constructor(
                    public id: number,
                    public name: string,
                    public deceased: boolean,
                    public birthday: Date
                ) { }
            }
            expect(() => modelConverter({ id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1" }, ["id"], [AnimalClass], CONVERTERS))
                .toThrow(ConversionError)
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

        it("Should convert nested model", () => {
            const result: AnimalClass = convert({
                id: "200",
                name: "Mimi",
                deceased: "ON",
                birthday: "2018-1-1",
                owner: { id: "400", name: "John Doe", join: "2015-1-1" }
            }, ["id"], AnimalClass, CONVERTERS)
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
            }, ["id"], AnimalClass, CONVERTERS)
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
            }, ["id"], AnimalClass, CONVERTERS)
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
            }, ["id"], AnimalClass, CONVERTERS)).toThrow(new ConversionError({ path: ["id", "owner", "join"], messages: [`Unable to convert "Hello" into Date`] }))
        })

        it("Should throw if non convertible model provided", () => {
            expect(() => convert({
                id: "200",
                name: "Mimi",
                deceased: "ON",
                birthday: "2018-1-1",
                owner: "Hello"
            }, ["id"], AnimalClass, CONVERTERS)).toThrow(new ConversionError({ path: ["id", "owner"], messages: [`Unable to convert "Hello" into ClientClass`] }))
        })
    })

    describe("Array Converter", () => {
        it("Should convert array of number", () => {
            const result = convert(["123", "123", "123"], ["id"], [Number], CONVERTERS)
            expect(result).toEqual([123, 123, 123])
        })

        it("Should convert array of model", () => {
            @domain()
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
            ], [], [AnimalClass], CONVERTERS)
            expect(result).toEqual([
                { birthday: new Date("2018-1-1"), deceased: true, id: 200, name: "Mimi" },
                { birthday: new Date("2018-1-1"), deceased: true, id: 200, name: "Mimi" },
                { birthday: new Date("2018-1-1"), deceased: true, id: 200, name: "Mimi" }
            ])
        })

        it("Should convert nested array inside model", () => {
            @domain()
            class TagModel {
                constructor(
                    public id: number,
                    public name: string,
                ) { }
            }
            @domain()
            class AnimalClass {
                constructor(
                    public id: number,
                    public name: string,
                    public deceased: boolean,
                    public birthday: Date,
                    @array(TagModel)
                    public tags: TagModel[]
                ) { }
            }
            const result = convert([
                { id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1", tags: [{ id: "300", name: "Tug" }] },
                { id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1", tags: [{ id: "300", name: "Tug" }] },
                { id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1", tags: [{ id: "300", name: "Tug" }] }
            ], ["id"], [AnimalClass], CONVERTERS)
            expect(result).toEqual([
                { birthday: new Date("2018-1-1"), deceased: true, id: 200, name: "Mimi", tags: [{ id: 300, name: "Tug" }] },
                { birthday: new Date("2018-1-1"), deceased: true, id: 200, name: "Mimi", tags: [{ id: 300, name: "Tug" }] },
                { birthday: new Date("2018-1-1"), deceased: true, id: 200, name: "Mimi", tags: [{ id: 300, name: "Tug" }] }
            ])
        })

        it("Should throw error if provided non array on expectedType", () => {
            expect(() => arrayConverter(["123", "123", "123"], ["id"], Number, CONVERTERS)).toThrow(ConversionError)
        })
    })

    describe("Custom Converter", () => {
        it("Should able to use custom converter", () => {
            const converters: TypeConverter[] = [{ type: Boolean, converter: x => "Custom Boolean" }]

            const result = convert("TRUE", [], Boolean, {
                default: DefaultConverters,
                converters: flattenConverters(TypeConverters.concat(converters))
            })
            expect(result).toBe("Custom Boolean")
        })
    })
})