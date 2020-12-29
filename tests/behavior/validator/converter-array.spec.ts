import reflect from "@plumier/reflect"

import { convert } from "@plumier/validator"



describe("Array Converter", () => {
    it("Should convert array of number", () => {
        const result = convert(["123", "123", "123"], { type: [Number] })
        expect(result.value).toEqual([123, 123, 123])
    })

    it("Should convert array of model", () => {
        @reflect.parameterProperties()
        class AnimalClass {
            constructor(
                public id: number,
                public name: string,
                public deceased: boolean,
                public birthday: Date
            ) { }
        }
        const result = convert([
            { id: "200", name: "Mimi", deceased: "ON", birthday: "2018-2-2" },
            { id: "200", name: "Mimi", deceased: "ON", birthday: "2018-2-2" },
            { id: "200", name: "Mimi", deceased: "ON", birthday: "2018-2-2" }
        ], { type: [AnimalClass] })
        expect(result.value).toEqual([
            { birthday: new Date("2018-2-2"), deceased: true, id: 200, name: "Mimi" },
            { birthday: new Date("2018-2-2"), deceased: true, id: 200, name: "Mimi" },
            { birthday: new Date("2018-2-2"), deceased: true, id: 200, name: "Mimi" }
        ])
    })

    it("Should convert array of Object as is", () => {
        const result = convert([
            { id: "200", name: "Mimi", deceased: "ON", birthday: "2018-2-2" },
            { id: "200", name: "Mimi", deceased: "ON", birthday: "2018-2-2" },
            { id: "200", name: "Mimi", deceased: "ON", birthday: "2018-2-2" }
        ], { type: [Object] })
        expect(result.value).toMatchSnapshot()
    })

    it("Should convert nested array inside model", () => {
        @reflect.parameterProperties()
        class TagModel {
            constructor(
                public id: number,
                public name: string,
            ) { }
        }
        @reflect.parameterProperties()
        class AnimalClass {
            constructor(
                public id: number,
                public name: string,
                public deceased: boolean,
                public birthday: Date,
                @reflect.type([TagModel])
                public tags: TagModel[]
            ) { }
        }
        const result = convert([
            { id: "200", name: "Mimi", deceased: "ON", birthday: "2018-2-2", tags: [{ id: "300", name: "Tug" }] },
            { id: "200", name: "Mimi", deceased: "ON", birthday: "2018-2-2", tags: [{ id: "300", name: "Tug" }] },
            { id: "200", name: "Mimi", deceased: "ON", birthday: "2018-2-2", tags: [{ id: "300", name: "Tug" }] }
        ], { type: [AnimalClass] })
        expect(result.value).toEqual([
            { birthday: new Date("2018-2-2"), deceased: true, id: 200, name: "Mimi", tags: [{ id: 300, name: "Tug" }] },
            { birthday: new Date("2018-2-2"), deceased: true, id: 200, name: "Mimi", tags: [{ id: 300, name: "Tug" }] },
            { birthday: new Date("2018-2-2"), deceased: true, id: 200, name: "Mimi", tags: [{ id: 300, name: "Tug" }] }
        ])
    })

    it("Should error if provided expectedType of type of array", () => {
        @reflect.parameterProperties()
        class AnimalClass {
            constructor(
                public id: number,
                public name: string,
                public deceased: boolean,
                public birthday: Date
            ) { }
        }
        const result = convert("123", { type: [AnimalClass] })
        expect(result.issues).toEqual([{ messages: ["Unable to convert \"123\" into Array<AnimalClass>",], path: "" }])
    })

    it("Should error if provided wrong vlaue in nested array", () => {
        @reflect.parameterProperties()
        class TagModel {
            constructor(
                public id: number,
                public name: string,
            ) { }
        }
        @reflect.parameterProperties()
        class AnimalModel {
            constructor(
                public id: number,
                public name: string,
                public deceased: boolean,
                public birthday: Date,
                @reflect.type([TagModel])
                public tags: TagModel[]
            ) { }
        }
        const value = [{
            id: "200", name: "Mimi", deceased: "ON", birthday: "2018-2-2",
            tags: [{ id: "500", name: "Rabies" }, { id: "600", name: "Rabies Two" }]
        }, {
            id: "200", name: "Mimi", deceased: "ON", birthday: "2018-2-2",
            tags: [{ id: "500", name: "Rabies" }, { id: "Hello", name: "Rabies Two" }]
        }]
        const result = convert(value, { type: [AnimalModel] })
        expect(result.issues).toEqual([{ path: "1.tags.1.id", messages: ["Unable to convert \"Hello\" into Number"] }])
    })

})

describe("Guess Array Element", () => {
    it("Should able to guess single value as Array based on type", () => {
        const b = convert("1234", { type: [Number], guessArrayElement: true })
        expect(b.value).toEqual([1234])
    })

    it("Should work for array of Object", () => {
        const b = convert("1234", { type: [Object], guessArrayElement: true })
        expect(b.value).toEqual(["1234"])
    })

    it("Should work for array on nested Object without type override", () => {
        @reflect.parameterProperties()
        class TagModel {
            constructor(
                public id: number,
                public name: string,
            ) { }
        }
        @reflect.parameterProperties()
        class AnimalClass {
            constructor(
                public tags: TagModel[] // <-- no type override
            ) { }
        }
        const b = convert({ tags: { id: "123", name: "lorem" } }, { type: AnimalClass, guessArrayElement: true })
        expect(b.value).toMatchSnapshot()
    })
})