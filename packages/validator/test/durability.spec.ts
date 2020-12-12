import reflect from "@plumier/reflect"

import { convert } from "../src"


describe("Durability test", () => {

    it("Should not error if provided non safe to string", () => {
        const result = convert(Object.create(null), { type: Number })
        expect(result.issues).toEqual([{
            path: "",
            messages: ['Unable to convert "[object Object]" into Number']
        }])
    })

    it("Should provide informative error message", () => {
        @reflect.parameterProperties()
        class AnimalClass {
            constructor(
                public id: number,
                public name: string,
                public deceased: boolean,
                public birthday: Date
            ) { }
        }

        const result = convert({ id: "200", name: "Mimi", deceased: "ABC", birthday: "DEF" }, { type: AnimalClass })
        expect(result.issues).toEqual(
            [{ "messages": ["Unable to convert \"ABC\" into Boolean"], "path": "deceased" },
            { "messages": ["Unable to convert \"DEF\" into Date"], "path": "birthday" }])
    })

    it("Should provide informative error message on array", () => {
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
            { id: "200", name: "Mimi", deceased: "ABC", birthday: "DEF" },
        ], { type: [AnimalClass] })
        expect(result.issues).toEqual(
            [{ "messages": ["Unable to convert \"ABC\" into Boolean"], "path": "1.deceased" },
            { "messages": ["Unable to convert \"DEF\" into Date"], "path": "1.birthday" }])
    })

    it("Should give informative information on array if provided string value type", () => {
        const result = convert("Hello", { type: [Number] })
        expect(result.issues).toEqual(
            [{ "messages": ["Unable to convert \"Hello\" into Array<Number>"], "path": "" }])
    })

    it("Should give informative information on array if provided object value type", () => {
        const result = convert({ message: "Hello" }, { type: [Number] })
        expect(result.issues).toEqual(
            [{ "messages": ["Unable to convert \"[object Object]\" into Array<Number>"], "path": "" }])
    })
})