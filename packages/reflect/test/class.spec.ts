import { array, decorateClass, decorateMethod, reflect, type } from "../src"

describe("Class Introspection", () => {
    it("Should inspect class properly", () => {
        class DummyClass {
            dummyMethod() { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect class with constructor parameters", () => {
        class DummyClass {
            constructor(id: number, name: string) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect class with method parameters", () => {
        class DummyClass {
            dummyMethod(dummy: string, other: any) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect constructor parameters type with decorator", () => {
        @decorateClass({})
        class DummyClass {
            constructor(id: number, name: string) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect parameters type with method decorator", () => {
        class DummyClass {
            @decorateMethod({})
            dummyMethod(dummy: string, other: any): number { return 1 }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect array on constructor parameters", () => {
        class EmptyClass { }
        @decorateClass({})
        class DummyClass {
            constructor(@array(EmptyClass) empty: EmptyClass[]) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect array on method parameter", () => {
        class EmptyClass { }
        class DummyClass {
            @decorateMethod({})
            dummyMethod(@array(EmptyClass) empty: EmptyClass[]) { }
        }
        const meta = reflect(DummyClass)
        expect(meta.methods[0].parameters[0].type).toEqual([EmptyClass])
        expect(meta).toMatchSnapshot()
    })

    it("Should able to override type with other type", () => {
        class OtherDummyClass { }
        class DummyClass {
            method(@type(OtherDummyClass, "Readonly") dummy: Readonly<OtherDummyClass>) { }
        }
        const meta = reflect(DummyClass)
        expect(meta.methods[0].parameters[0].decorators[0].type).toEqual(OtherDummyClass)
        expect(meta.methods[0].parameters[0].decorators[0].info).toEqual("Readonly")
        expect(meta).toMatchSnapshot()
    })
})