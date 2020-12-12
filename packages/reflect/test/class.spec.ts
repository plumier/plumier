import { decorateClass, decorateMethod, reflect } from "../src"

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

    it("Should inspect array on constructor parameters", () => {
        class EmptyClass { }
        @decorateClass({})
        class DummyClass {
            constructor(@reflect.type([EmptyClass]) empty: EmptyClass[]) { }
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

    it("Should inspect class with method parameters", () => {
        class DummyClass {
            dummyMethod(dummy: string, other: any) { }
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

    it("Should able to define return type of method", () => {
        class DummyClass {
            @reflect.type([Number])
            method() {
                return [1, 2, 3]
            }
        }
        const meta = reflect(DummyClass)
        expect(meta.methods[0].returnType).toEqual([Number])
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect async method with parameters", () => {
        class DummyClass {
            @decorateMethod({})
            async dummyMethod(dummy: string, other: any): Promise<number> { return 1 }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect destructed parameters type with method decorator", () => {
        class Domain {
            constructor(
                public date: Date,
                public name: string
            ) { }
        }
        class DummyClass {
            @decorateMethod({})
            dummyMethod(par: string, { date, name }: Domain): number { return 1 }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect array on method parameter but without type override", () => {
        class EmptyClass { }
        class DummyClass {
            @decorateMethod({})
            dummyMethod(empty: EmptyClass[]) { }
        }
        const meta = reflect(DummyClass)
        expect(meta.methods[0].parameters[0].type).toEqual([Object])
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect array on method parameter", () => {
        class EmptyClass { }
        class DummyClass {
            @decorateMethod({})
            dummyMethod(@reflect.type([EmptyClass]) empty: EmptyClass[]) { }
        }
        const meta = reflect(DummyClass)
        expect(meta.methods[0].parameters[0].type).toEqual([EmptyClass])
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect array on method parameter using @reflect.type", () => {
        class EmptyClass { }
        class DummyClass {
            @decorateMethod({})
            dummyMethod(@reflect.type([EmptyClass]) empty: EmptyClass[]) { }
        }
        const meta = reflect(DummyClass)
        expect(meta.methods[0].parameters[0].type).toEqual([EmptyClass])
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect destructed method parameter type", () => {
        class Domain {
            constructor(
                public date: Date,
                public name: string
            ) { }
        }
        class DummyClass {
            @decorateMethod({})
            dummyMethod(@reflect.type(Domain) { date, name }: Domain) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect deep nested destructed method parameter type", () => {
        class Domain {
            constructor(
                public a: Date,
                public b: string,
                public child: ChildDomain
            ) { }
        }
        class ChildDomain {
            constructor(
                public c: Date,
                public d: string,
                public child: GrandChildDomain
            ) { }
        }
        class GrandChildDomain {
            constructor(
                public e: Date,
                public f: string
            ) { }
        }
        class DummyClass {
            @decorateMethod({})
            dummyMethod(@reflect.type(Domain) { a, b, child: { c, d, child: { e, f } } }: Domain) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect property", () => {
        class DummyClass {
            @reflect.noop()
            myProp: number = 10
            @reflect.noop()
            myOtherProp: string = "hello"
        }

        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect getter and setter", () => {
        class DummyClass {
            get myProp() { return 1 }
            set myProp(val: number) { }
        }

        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect setter only", () => {
        class DummyClass {
            set myProp(val: number) { }
        }

        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect getter and setter with decorator", () => {
        class DummyClass {
            @reflect.noop()
            get myProp() { return 1 }
            set myProp(val: number) { }
        }

        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect parameter properties", () => {
        @reflect.parameterProperties()
        class DummyClass {
            constructor(
                public myProp:number,
                public myOtherProp:string,
            ){}
        }

        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

})