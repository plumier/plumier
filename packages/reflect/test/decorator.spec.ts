import {
    autoProperties,
    decorate,
    decorateClass,
    decorateMethod,
    decorateParameter,
    decorateProperty,
    ignore,
    reflect,
} from "../src"

describe("Decorator", () => {
    it("Should decorate class", () => {
        @decorateClass({ info: "Some Info" })
        class DummyClass { }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to decorate class multiple", () => {
        @decorateClass({ otherInfo: "Some Other Info" })
        @decorateClass({ info: "Some Info" })
        class DummyClass { }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to decorate class using callback", () => {
        @decorateClass(x => ({ name: x.name }))
        class DummyClass { }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should decorate method", () => {
        class DummyClass {
            @decorateMethod({ info: "Some Info" })
            method() { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to decorate method multiple", () => {
        class DummyClass {
            @decorateMethod({ otherInfo: "Some Other Info" })
            @decorateMethod({ info: "Some Info" })
            method() { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should decorate method with callback", () => {
        class DummyClass {
            @decorateMethod((a, b) => ({ target: a.name, method: b }))
            method() { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should decorate method", () => {
        class DummyClass {
            @decorateMethod({ info: "Some Info" })
            method() { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to decorate method multiple", () => {
        class DummyClass {
            @decorateMethod({ otherInfo: "Some Other Info" })
            @decorateMethod({ info: "Some Info" })
            method() { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should decorate method with callback", () => {
        class DummyClass {
            @decorateMethod((a, b) => ({ target: a.name, method: b }))
            method() { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to decorate method parameter", () => {
        class DummyClass {
            method(
                @decorateParameter({ info: "Some Info" })
                id: number
            ) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to decorate method parameter multiple", () => {
        class DummyClass {
            method(
                @decorateParameter({ otherInfo: "Some Other Info" })
                @decorateParameter({ info: "Some Info" })
                id: number
            ) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to decorate method parameter with callback", () => {
        class DummyClass {
            method(
                @decorateParameter((a, b, c) => ({ target: a.name, name: b, index: c }))
                id: number
            ) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to decorate constructor parameter", () => {
        class DummyClass {
            constructor(
                @decorateParameter({ info: "Some Info" })
                id: number
            ) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to decorate constructor parameter multiple", () => {
        class DummyClass {
            constructor(
                @decorateParameter({ otherInfo: "Some Other Info" })
                @decorateParameter({ info: "Some Info" })
                id: number
            ) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to decorate constructor parameter", () => {
        class DummyClass {
            constructor(
                @decorateParameter((a, b, c) => ({ target: a.name, name: b, index: c }))
                id: number
            ) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect class with properties", () => {
        class DummyClass {
            @decorateProperty({})
            dummyProp: string = "Hello"
        }
        const meta = reflect(DummyClass)
        expect(meta.properties[0].type).toBe(String)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect class with properties multiple", () => {
        class DummyClass {
            @decorateProperty({ value: 1 })
            @decorateProperty({ value: 2 })
            dummyProp: string = "Hello"
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect class with properties with callback", () => {
        class DummyClass {
            @decorateProperty((target, name) => ({ target, name }))
            dummyProp: string = "Hello"
        }
        const meta = reflect(DummyClass)
        expect(meta.properties[0].type).toBe(String)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect class with get set", () => {
        class DummyClass {
            get data() { return 1 }
            set data(value: number) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect class with get set with decorator", () => {
        class DummyClass {
            @decorateProperty({})
            get data() { return 1 }
            set data(value: number) { }
        }
        const meta = reflect(DummyClass)
        expect(meta.properties[0].type).toBe(Number)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect class with get set with decorator multiple", () => {
        class DummyClass {
            @decorateProperty({ value: 1 })
            @decorateProperty({ value: 2 })
            get data() { return 1 }
            set data(value: number) { }
        }
        const meta = reflect(DummyClass)
        expect(meta.properties[0].type).toBe(Number)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect class with get set with decorator callback", () => {
        class DummyClass {
            @decorateProperty((target, name) => ({ target, name }))
            get data() { return 1 }
            set data(value: number) { }
        }
        const meta = reflect(DummyClass)
        expect(meta.properties[0].type).toBe(Number)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect constructor property", () => {
        @autoProperties()
        class DummyClass {
            constructor(public data: string) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect constructor property with decorator", () => {
        @autoProperties()
        class DummyClass {
            constructor(@decorateProperty({}) public data: string) { }
        }
        const meta = reflect(DummyClass)
        expect(meta.properties[0].type).toBe(String)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect constructor property with decorator multiple", () => {
        @autoProperties()
        class DummyClass {
            constructor(
                @decorateProperty({ value: 1 })
                @decorateProperty({ value: 2 })
                public data: string) { }
        }
        const meta = reflect(DummyClass)
        expect(meta.properties[0].type).toBe(String)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect constructor property with decorator callback", () => {
        @autoProperties()
        class DummyClass {
            constructor(
                @decorateProperty((target, name) => ({ target, name }))
                public data: string) { }
        }
        const meta = reflect(DummyClass)
        expect(meta.properties[0].type).toBe(String)
        expect(meta).toMatchSnapshot()
    })

    it("Should not inspect private constructor property", () => {
        @autoProperties()
        class DummyClass {
            constructor(public data: string, @ignore() myPrivateField: string) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    describe("Error Handling", () => {
        it("Should throw when method decorator applied on wrong location", () => {
            try {
                @decorate({}, ["Method", "Parameter"])
                class DummyClass { }
            }
            catch (e) {
                expect(e.message).toBe('Reflect Error: Decorator of type Method, Parameter applied into Class')
            }
        })

        it("Should throw when method decorator applied on wrong location", () => {
            try {
                class DummyClass {
                    @decorate({}, ["Method"])
                    myProp = 200
                }
            }
            catch (e) {
                expect(e.message).toBe('Reflect Error: Decorator of type Method applied into Property')
            }
        })

        it("Should throw when method decorator applied on wrong location", () => {
            try {
                class DummyClass {
                    @decorate({}, ["Property"])
                    myFunction() { }
                }
            }
            catch (e) {
                expect(e.message).toBe('Reflect Error: Decorator of type Property applied into Method')
            }
        })

        it("Should throw when method decorator applied on wrong location", () => {
            try {
                class DummyClass {
                    constructor(@decorate({}, ["Parameter"]) param: string) { }
                }
            }
            catch (e) {
                expect(e.message).toBe('Reflect Error: Decorator of type Property applied into Parameter')
            }
        })
    })
})