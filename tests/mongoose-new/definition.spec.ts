import { domain, Class } from "@plumier/core"
import { getDefinition, document, ModelStore } from "@plumier/mongoose"
import reflect from "tinspector"

describe("Definition", () => {
    describe("Primitive Data Type", () => {
        it("Should able to extract primitive types definition", () => {
            @document()
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
            @document()
            class Dummy {
                constructor(
                    @document.default("123")
                    @document.property({ uppercase: true })
                    public stringProp: string,
                ) { }
            }
            expect(getDefinition(Dummy, new Map())).toMatchSnapshot()
        })
    
        it("Should able to extract array of primitive types definition", () => {
            @document()
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
            @document()
            class Nest {
                constructor(
                    public stringProp: string,
                    public dateProp: Date
                ) { }
            }
            @document()
            class Dummy {
                constructor(
                    child: Nest
                ) { }
            }
            expect(getDefinition(Dummy, new Map())).toMatchSnapshot()
        })

        it("Should able to extract nested object with schema option", () => {
            @document()
            class Nest {
                constructor(
                    @document.default("123")
                    @document.property({uppercase: true})
                    public stringProp: string,
                    public dateProp: Date
                ) { }
            }
            @document()
            class Dummy {
                constructor(
                    child: Nest
                ) { }
            }
            expect(getDefinition(Dummy, new Map())).toMatchSnapshot()
        })
    
        it("Should able to define nested object with ref (populate)", () => {
            @document()
            class Nest {
                constructor(
                    public stringProp: string,
                    public dateProp: Date
                ) { }
            }
            @document()
            class Dummy {
                constructor(
                    @document.ref(Nest)
                    child: Nest
                ) { }
            }
            const map = new Map<Class, ModelStore>()
            map.set(Nest, { name: "Nest", definition: {}, option: {} })
            expect(getDefinition(Dummy, map)).toMatchSnapshot()
        })
    
    
        it("Should able to define nested object array with ref (populate)", () => {
            @document()
            class Nest {
                constructor(
                    public stringProp: string,
                    public dateProp: Date
                ) { }
            }
            @document()
            class Dummy {
                constructor(
                    @document.ref([Nest])
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
            @document()
            class Nest {
                constructor(
                    public stringProp: string,
                    public dateProp: Date
                ) { }
            }
            @document()
            class Dummy {
                constructor(
                    @document.ref(Nest)
                    child: Nest
                ) { }
            }
            expect(() => getDefinition(Dummy, new Map())).toThrowErrorMatchingSnapshot()
        })
    
        it("Should throw error when reference type not registered in nested array", () => {
            @document()
            class Nest {
                constructor(
                    public stringProp: string,
                    public dateProp: Date
                ) { }
            }
            @document()
            class Dummy {
                constructor(
                    @document.ref([Nest])
                    children: Nest[]
                ) { }
            }
            expect(() => getDefinition(Dummy, new Map())).toThrowErrorMatchingSnapshot()
        })
    })

})