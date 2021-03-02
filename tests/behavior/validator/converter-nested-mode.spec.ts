import reflect from "@plumier/reflect"

import factory from "@plumier/validator"


describe("Nested Model", () => {
    @reflect.parameterProperties()
    class ClientClass {
        constructor(
            public id: number,
            public name: string,
            public join: Date
        ) { }
    }

    @reflect.parameterProperties()
    class AnimalClass {
        constructor(
            public id: number,
            public name: string,
            public deceased: boolean,
            public birthday: Date,
            public owner: ClientClass
        ) { }
    }
    const convert = factory({ type: AnimalClass })

    it("Should convert nested model", () => {
        const { value: result } = convert({
            id: "200",
            name: "Mimi",
            deceased: "ON",
            birthday: "2018-2-2",
            owner: { id: "400", name: "John Doe", join: "2015-2-2" }
        })
        expect(result).toBeInstanceOf(AnimalClass)
        expect(result.owner).toBeInstanceOf(ClientClass)
        expect(result).toEqual({
            birthday: new Date("2018-2-2"),
            deceased: true,
            id: 200,
            name: "Mimi",
            owner: { id: 400, name: "John Doe", join: new Date("2015-2-2") }
        })
    })

    it("Should sanitize excess data", () => {
        const { value: result } = convert({
            id: "200",
            name: "Mimi",
            deceased: "ON",
            birthday: "2018-2-2",
            excess: "Malicious Code",
            owner: { id: "400", name: "John Doe", join: "2015-2-2", excess: "Malicious Code" }
        })
        expect(result).toBeInstanceOf(AnimalClass)
        expect(result.owner).toBeInstanceOf(ClientClass)
        expect(result).toEqual({
            birthday: new Date("2018-2-2"),
            deceased: true,
            id: 200,
            name: "Mimi",
            owner: { id: 400, name: "John Doe", join: new Date("2015-2-2") }
        })
    })

    it("Should allow undefined values", () => {
        const { value: result } = convert({
            id: "200",
            name: "Mimi",
            owner: { id: "400", name: "John Doe" }
        })
        expect(result).toBeInstanceOf(AnimalClass)
        expect(result.owner).toBeInstanceOf(ClientClass)
        expect(result).toEqual({
            id: 200,
            name: "Mimi",
            owner: { id: 400, name: "John Doe" }
        })
    })

    it("Should throw if non convertible value provided", () => {
        const result = convert({
            id: "200",
            name: "Mimi",
            deceased: "ON",
            birthday: "2018-2-2",
            owner: { id: "400", name: "John Doe", join: "Hello" }
        })
        expect(result.issues).toEqual([{ path: "owner.join", messages: [`Unable to convert "Hello" into Date`] }])
    })

    it("Should throw if non convertible model provided", () => {
        const result = convert({
            id: "200",
            name: "Mimi",
            deceased: "ON",
            birthday: "2018-2-2",
            owner: "Hello"
        })
        expect(result.issues).toEqual([{ path: "owner", messages: [`Unable to convert "Hello" into ClientClass`] }])
    })

    it("Should not error when provided nested model with cross dependency", () => {
        @reflect.parameterProperties()
        class AnimalClass {
            constructor(
                public name: string,
                @reflect.type(x => ClientClass)
                public client: any
            ) { }
        }

        @reflect.parameterProperties()
        class ClientClass {
            constructor(
                public name: string,
                @reflect.type(x => AnimalClass)
                public animal: any
            ) { }
        }
        const convert = factory({ type: AnimalClass })
        const result = convert(<AnimalClass>{ name: "Mimi", client: { name: "Hola" } })
        expect(result.value).toBeInstanceOf(AnimalClass)
        expect(result.value).toMatchSnapshot()
    })
})