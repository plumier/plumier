import { domain, Class } from "@plumier/core"
import { getDefinition, collection, ModelStore } from "@plumier/mongoose"
import reflect from "tinspector"

describe("Definition", () => {
    describe("Primitive Data Type", () => {
        it("Should able to extract primitive types definition", () => {
            @collection()
            class Dummy {
                constructor(
                    public stringProp: string,
                    public numberProp: number,
                    public booleanProp: boolean,
                    public dateProp: Date
                ) { }
            }
            expect(getDefinition(Dummy, new Map())).toMatchSnapshot()
        })

        it("Should able to add schema configuration", () => {
            @collection()
            class Dummy {
                constructor(
                    @collection.property({ default: "123" })
                    @collection.property({ uppercase: true })
                    public stringProp: string,
                ) { }
            }
            expect(getDefinition(Dummy, new Map())).toMatchSnapshot()
        })

        it("Should able to extract array of primitive types definition", () => {
            @collection()
            class Dummy {
                constructor(
                    @reflect.type([String])
                    public stringProp: string[],
                    @reflect.type([String])
                    public numberProp: number[],
                    @reflect.type([String])
                    public booleanProp: boolean[],
                    @reflect.type([String])
                    public dateProp: Date[]
                ) { }
            }
            expect(getDefinition(Dummy, new Map())).toMatchSnapshot()
        })
    })

    describe("Nested Data Type", () => {
        it("Should able to extract nested object", () => {
            @collection()
            class Nest {
                constructor(
                    public stringProp: string,
                    public dateProp: Date
                ) { }
            }
            @collection()
            class Dummy {
                constructor(
                    child: Nest
                ) { }
            }
            expect(getDefinition(Dummy, new Map())).toMatchSnapshot()
        })

        it("Should able to extract nested object with schema option", () => {
            @collection()
            class Nest {
                constructor(
                    @collection.property({ default: "123" })
                    @collection.property({ uppercase: true })
                    public stringProp: string,
                    public dateProp: Date
                ) { }
            }
            @collection()
            class Dummy {
                constructor(
                    child: Nest
                ) { }
            }
            expect(getDefinition(Dummy, new Map())).toMatchSnapshot()
        })

        it("Should able to define nested object with ref (populate)", () => {
            @collection()
            class Nest {
                constructor(
                    public stringProp: string,
                    public dateProp: Date
                ) { }
            }
            @collection()
            class Dummy {
                constructor(
                    @collection.ref(Nest)
                    child: Nest
                ) { }
            }
            const map = new Map<Class, ModelStore>()
            map.set(Nest, { name: "Nest", definition: {}, option: {} })
            expect(getDefinition(Dummy, map)).toMatchSnapshot()
        })


        it("Should able to define nested object array with ref (populate)", () => {
            @collection()
            class Nest {
                constructor(
                    public stringProp: string,
                    public dateProp: Date
                ) { }
            }
            @collection()
            class Dummy {
                constructor(
                    @collection.ref([Nest])
                    children: Nest[]
                ) { }
            }
            const map = new Map<Class, ModelStore>()
            map.set(Nest, { name: "Nest", definition: {}, option: {} })
            expect(getDefinition(Dummy, map)).toMatchSnapshot()
        })
    })

    describe("Error Handling", () => {
        it("Should throw error when reference type not registered in nested model", () => {
            @collection()
            class Nest {
                constructor(
                    public stringProp: string,
                    public dateProp: Date
                ) { }
            }
            @collection()
            class Dummy {
                constructor(
                    @collection.ref(Nest)
                    child: Nest
                ) { }
            }
            expect(() => getDefinition(Dummy, new Map())).toThrowErrorMatchingSnapshot()
        })

        it("Should throw error when reference type not registered in nested array", () => {
            @collection()
            class Nest {
                constructor(
                    public stringProp: string,
                    public dateProp: Date
                ) { }
            }
            @collection()
            class Dummy {
                constructor(
                    @collection.ref([Nest])
                    children: Nest[]
                ) { }
            }
            expect(() => getDefinition(Dummy, new Map())).toThrowErrorMatchingSnapshot()
        })
    })

})