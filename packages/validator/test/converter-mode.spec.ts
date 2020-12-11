import reflect from "@plumier/reflect"

import { convert } from "../src"


describe("Model Converter", () => {
    it("Should convert model and appropriate properties", () => {
        @reflect.parameterProperties()
        class AnimalClass {
            constructor(
                public id: number,
                public name: string,
                public deceased: boolean,
                public birthday: Date
            ) { }
        }

        const result = convert({ id: "200", name: "Mimi", deceased: "ON", birthday: "2018-2-2" }, { type: AnimalClass })
        expect(result.value).toBeInstanceOf(AnimalClass)
        expect(result.value).toEqual({ birthday: new Date("2018-2-2"), deceased: true, id: 200, name: "Mimi" })
    })

    it("Should not convert excess properties", () => {
        @reflect.parameterProperties()
        class AnimalClass {
            constructor(
                public id: number,
                public name: string,
            ) { }
        }

        const result = convert({ id: "200", name: "Mimi", deceased: "ON", birthday: "2018-2-2", }, { type: AnimalClass })
        expect(result.value).toBeInstanceOf(AnimalClass)
        expect(result.value).toEqual({ id: 200, name: "Mimi" })
    })


    it("Should allow undefined value", () => {
        @reflect.parameterProperties()
        class AnimalClass {
            constructor(
                public id: number,
                public name: string,
                public deceased: boolean,
                public birthday: Date
            ) { }
        }

        const result = convert({}, { type: AnimalClass })
        expect(result.value).toBeInstanceOf(AnimalClass)
        expect(result.value).toEqual({})
    })

    it("Should allow undefined value when provided", () => {
        @reflect.parameterProperties()
        class AnimalClass {
            constructor(
                public id: number,
                public name: string,
                public deceased: boolean,
                public birthday: Date
            ) { }
        }

        const result = convert({ id: undefined }, { type: AnimalClass })
        expect(result.value).toBeInstanceOf(AnimalClass)
        expect(result.value).toMatchSnapshot()
    })

    it("Should throw if provided non convertible value", () => {
        @reflect.parameterProperties()
        class AnimalClass {
            constructor(
                public id: number,
                public name: string,
                public deceased: boolean,
                public birthday: Date
            ) { }
        }

        const result = convert({ id: "200", name: "Mimi", deceased: "Hello", birthday: "2018-2-2" }, { type: AnimalClass })
        expect(result.issues).toEqual([{ path: "deceased", messages: [`Unable to convert "Hello" into Boolean`] }])
    })

    it("Should throw if provided non convertible value", () => {
        @reflect.parameterProperties()
        class AnimalClass {
            constructor(
                public id: number,
                public name: string,
                public deceased: boolean,
                public birthday: Date
            ) { }
        }

        const result = convert("Hello", { type: AnimalClass })
        expect(result.issues).toEqual([{ path: "", messages: [`Unable to convert "Hello" into AnimalClass`] }])
    })

    it("Should not populate optional properties with undefined", () => {
        @reflect.parameterProperties()
        class AnimalClass {
            constructor(
                public id: number,
                public name: string,
                public deceased: boolean | undefined,
                public birthday: Date | undefined
            ) { }
        }

        const result = convert({ id: "200", name: "Mimi", excess: "Hola" }, { type: AnimalClass })
        expect(result.value).toBeInstanceOf(AnimalClass)
        expect(Object.keys(result.value)).toEqual(["id", "name"])
        expect(result.value).toEqual({ id: 200, name: "Mimi" })
    })

    it("Should not convert if expected type is Object", () => {
        const result = convert({
            host: '127.0.0.1:61945',
            'accept-encoding': 'gzip, deflate',
            'user-agent': 'node-superagent/3.8.3',
            'content-type': 'application/json',
            'content-length': '67',
            connection: 'close'
        }, { type: Object })
        expect(result.value).toEqual({
            host: '127.0.0.1:61945',
            'accept-encoding': 'gzip, deflate',
            'user-agent': 'node-superagent/3.8.3',
            'content-type': 'application/json',
            'content-length': '67',
            connection: 'close'
        })
    })
})