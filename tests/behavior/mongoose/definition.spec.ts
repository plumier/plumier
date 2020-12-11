import { collection, getDefinition } from "@plumier/mongoose"
import reflect from "@plumier/reflect"

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

        it("Should use object if no type definition found", () => {
            @collection()
            class Dummy {
                constructor(
                    public stringProp: string[],
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

    })

})