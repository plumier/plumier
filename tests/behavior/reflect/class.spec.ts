import { decorateClass, decorateMethod, noop, reflect, type } from "@plumier/reflect"

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
            dummyMethod({ date, name }: Domain): number { return 1 }
        }
        const meta = reflect(DummyClass)
        expect(meta.methods[0].parameters[0]).toMatchSnapshot()
    })

    it("Should reflect destructed tuple parameters type", () => {
        type Tuple = [string, number]
        class DummyClass {
            @decorateMethod({})
            dummyMethod([name, age]: Tuple) { }
        }
        const meta = reflect(DummyClass)
        expect(meta.methods[0].parameters[0]).toMatchSnapshot()
    })

    it("Should inspect deep nested destructed method parameter type", () => {
        class Domain {
            constructor(
                public a: Date,
                public b: string,
                public child: ChildDomain,
                public tuple: Tuple
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
        type Tuple = [string, Domain]
        class DummyClass {
            @decorateMethod({})
            dummyMethod(@reflect.type(Domain) { a, b, tuple: [name, { a: a1, b: b1 }], child: { c, d, child: { e, f } } }: Domain) { }
        }
        const meta = reflect(DummyClass)
        expect(meta.methods[0].parameters[0]).toMatchSnapshot()
    })

    it("Should ignore method parameters with this", () => {
        class DummyClass {
            @decorateMethod({})
            dummyMethod(this: string, data: number): number { return 1; }
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
                public myProp: number,
                public myOtherProp: string,
            ) { }
        }

        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect static method", () => {
        class DummyClass {
            static myStaticMethod() {}
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect static method's parameters ", () => {
        class DummyClass {
            static myStaticMethod(par1:number, par2:string) {}
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect static method return type with decorator", () => {
        class DummyClass {
            @noop()
            static myStaticMethod(par1:number, par2:string):Number { return 1 }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect static method return type with decorator override", () => {
        class DummyClass {
            @type([Number])
            static myStaticMethod(par1:number, par2:string):Number[] { return [1] }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect static method's parameter type with decorator", () => {
        class DummyClass {
            @noop()
            static myStaticMethod(par1:number, par2:string) {}
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to distinguish between static method and instance method with the same name", () => {
        class DummyClass {
            static method() {}
            method() {}
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect static property", () => {
        class DummyClass {
            @noop()
            static myProp:string
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })
    
    it("Should inspect static property type with decorator override", () => {
        class DummyClass {
            @type([Number])
            static myProp:number[]
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect static getter and setter", () => {
        class DummyClass {
            static get myProp():number { return 1 }
            static set myProp(value:number) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect static getter and setter type", () => {
        class DummyClass {
            @noop()
            static get myProp():number { return 1 }
            static set myProp(value:number) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })
})