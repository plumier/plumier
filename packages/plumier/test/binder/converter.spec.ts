import { decorateClass, reflect } from "../../src/libs/reflect";
import { convert, flattenConverters, DefaultConverterList } from '../../src/binder';
import { TypeConverter, model, bind } from '../../src';
import { inspect } from 'util';


describe("Converter", () => {
    describe("Number Converter", () => {
        it("Should convert number", () => {
            const result = convert("123", Number, flattenConverters(DefaultConverterList))
            expect(result).toBe(123)
        })
        it("Should convert float", () => {
            const result = convert("123.123", Number, flattenConverters(DefaultConverterList))
            expect(result).toBe(123.123)
        })
        it("Should convert negative", () => {
            const result = convert("-123", Number, flattenConverters(DefaultConverterList))
            expect(result).toBe(-123)
        })
        it("Should convert negative float", () => {
            const result = convert("-123.123", Number, flattenConverters(DefaultConverterList))
            expect(result).toBe(-123.123)
        })
        it("Should not convert string", () => {
            const result = convert("hello", Number, flattenConverters(DefaultConverterList))
            expect(result).toBeNaN()
        })
    })

    describe("Boolean Converter", () => {
        it("Should convert ON as true", () => {
            const result = convert("ON", Boolean, flattenConverters(DefaultConverterList))
            expect(result).toEqual(true)
        })
        it("Should convert On as true", () => {
            const result = convert("On", Boolean, flattenConverters(DefaultConverterList))
            expect(result).toEqual(true)
        })
        it("Should convert on as true", () => {
            const result = convert("on", Boolean, flattenConverters(DefaultConverterList))
            expect(result).toEqual(true)
        })
        it("Should convert TRUE as true", () => {
            const result = convert("TRUE", Boolean, flattenConverters(DefaultConverterList))
            expect(result).toEqual(true)
        })
        it("Should convert True as true", () => {
            const result = convert("True", Boolean, flattenConverters(DefaultConverterList))
            expect(result).toEqual(true)
        })
        it("Should convert true as true", () => {
            const result = convert("true", Boolean, flattenConverters(DefaultConverterList))
            expect(result).toEqual(true)
        })
        it("Should convert 1 as true", () => {
            const result = convert("1", Boolean, flattenConverters(DefaultConverterList))
            expect(result).toEqual(true)
        })
        it("Should anything else as false", () => {
            let result = convert("0", Boolean, flattenConverters(DefaultConverterList))
            expect(result).toEqual(false)
            result = convert("FALSE", Boolean, flattenConverters(DefaultConverterList))
            expect(result).toEqual(false)
            result = convert("OFF", Boolean, flattenConverters(DefaultConverterList))
            expect(result).toEqual(false)
        })
    })

    describe("Date Converter", () => {
        it("Should convert date", () => {
            const result = convert("2018-12-22", Date, flattenConverters(DefaultConverterList))
            expect(result.getTime()).toEqual(new Date("2018-12-22").getTime())
        })
    })

    describe("Model Converter", () => {
        it("Should convert properties based on constructor properties", () => {
            @decorateClass({})
            class AnimalClass {
                constructor(
                    public id: number,
                    public name: string,
                    public deceased: boolean,
                    public birthday: Date
                ) { }
            }

            const result = convert({ id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1" }, AnimalClass, flattenConverters(DefaultConverterList))
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

            const result = convert({ id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1", }, AnimalClass, flattenConverters(DefaultConverterList))
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

            const result = convert({ id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1" }, AnimalClass, flattenConverters(DefaultConverterList))
            expect(result).toBeInstanceOf(AnimalClass)
            expect(result).toEqual({ id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1" })
        })

        it("Should convert nested model", () => {
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

            const result: AnimalClass = convert({
                id: "200",
                name: "Mimi",
                deceased: "ON",
                birthday: "2018-1-1",
                owner: {
                    id: "400",
                    name: "John Doe",
                    join: "2015-1-1"
                }
            }, AnimalClass, flattenConverters(DefaultConverterList))
            expect(result).toBeInstanceOf(AnimalClass)
            expect(result.owner).toBeInstanceOf(ClientClass)
            expect(result).toEqual({
                birthday: new Date("2018-1-1"),
                deceased: true,
                id: 200,
                name: "Mimi",
                owner: {
                    id: 400,
                    name: "John Doe",
                    join: new Date("2015-1-1")
                }
            })
        })
    })

    describe("Array Converter", () => {
        it("Should convert array", () => {
            const result = convert(["123", "123", "123"], Number, flattenConverters(DefaultConverterList))
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
            ], AnimalClass, flattenConverters(DefaultConverterList))
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
            ], AnimalClass, flattenConverters(DefaultConverterList))
            expect(result).toEqual([
                { birthday: new Date("2018-1-1"), deceased: true, id: 200, name: "Mimi", tags: [{ id: 300, name: "Tug" }] },
                { birthday: new Date("2018-1-1"), deceased: true, id: 200, name: "Mimi", tags: [{ id: 300, name: "Tug" }] },
                { birthday: new Date("2018-1-1"), deceased: true, id: 200, name: "Mimi", tags: [{ id: 300, name: "Tug" }] }
            ])
        })
    })

    describe("Custom Converter", () => {
        it("Should able to use custom converter", () => {
            const converters: TypeConverter = [[Boolean, x => "Custom Boolean"]]
            const result = convert("TRUE", Boolean, flattenConverters(converters))
            expect(result).toBe("Custom Boolean")
        })
    })
})