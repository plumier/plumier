import { join } from "path"

import {
    array,
    autoProperties,
    decorate,
    decorateClass,
    decorateMethod,
    decorateParameter,
    decorateProperty,
    DECORATOR_KEY,
    ignore,
    reflect,
    type,
} from "../src"
import { myNameSpace } from "./mocks/mock.class-in-namespace"
import { MyClass } from "./mocks/mock.class";

describe("Class Introspection", () => {
    it("Should inspect class properly", () => {
        class DummyClass {
            dummyMethod() { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toEqual({
            type: 'Class',
            ctorParameters: [],
            name: 'DummyClass',
            methods:
                [{ type: 'Function', name: 'dummyMethod', parameters: [], decorators: [], returnType: undefined }],
            decorators: [],
            object: DummyClass,
            properties: []
        })
    })

    it("Should inspect class with constructor parameters", () => {
        class DummyClass {
            constructor(id: number, name: string) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toEqual({
            type: 'Class',
            ctorParameters: [
                { type: 'Parameter', name: 'id', decorators: [], typeAnnotation: undefined },
                { type: 'Parameter', name: 'name', decorators: [], typeAnnotation: undefined }],
            name: 'DummyClass',
            methods: [],
            decorators: [],
            object: DummyClass,
            properties: []
        })
    })

    it("Should inspect class with method parameters", () => {
        class DummyClass {
            dummyMethod(dummy: string, other: any) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toEqual({
            type: 'Class',
            name: 'DummyClass',
            ctorParameters: [],
            methods:
                [{
                    type: 'Function',
                    name: 'dummyMethod',
                    parameters: [
                        { type: 'Parameter', name: 'dummy', decorators: [], typeAnnotation: undefined },
                        { type: 'Parameter', name: 'other', decorators: [], typeAnnotation: undefined }],
                    decorators: [],
                    returnType: undefined
                }],
            decorators: [],
            object: DummyClass,
            properties: []
        })
    })

    it("Should inspect constructor parameters type with decorator", () => {
        @decorateClass({})
        class DummyClass {
            constructor(id: number, name: string) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toEqual({
            type: 'Class',
            ctorParameters: [
                { type: 'Parameter', name: 'id', decorators: [], typeAnnotation: Number },
                { type: 'Parameter', name: 'name', decorators: [], typeAnnotation: String }],
            name: 'DummyClass',
            methods: [],
            decorators: [{}],
            object: DummyClass,
            properties: []
        })
    })

    it("Should inspect parameters type with method decorator", () => {
        class DummyClass {
            @decorateMethod({})
            dummyMethod(dummy: string, other: any): number { return 1 }
        }
        const meta = reflect(DummyClass)
        expect(meta).toEqual({
            type: 'Class',
            ctorParameters: [],
            name: 'DummyClass',
            methods:
                [{
                    type: 'Function',
                    name: 'dummyMethod',
                    parameters: [
                        { type: 'Parameter', name: 'dummy', decorators: [], typeAnnotation: String },
                        { type: 'Parameter', name: 'other', decorators: [], typeAnnotation: Object }],
                    decorators: [{}],
                    returnType: Number
                }],
            decorators: [],
            object: DummyClass,
            properties: [],
        })
    })

    it("Should inspect array on constructor parameters", () => {
        class EmptyClass { }
        @decorateClass({})
        class DummyClass {
            constructor(@array(EmptyClass) empty: EmptyClass[]) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toEqual({
            type: 'Class',
            ctorParameters: [
                { type: 'Parameter', name: 'empty', decorators: [{ object: EmptyClass, type: "Array" }], typeAnnotation: [EmptyClass] }
            ],
            name: 'DummyClass',
            methods: [],
            decorators: [{}],
            object: DummyClass,
            properties: []
        })
    })

    it("Should inspect array on method parameter", () => {
        class EmptyClass { }
        class DummyClass {
            @decorateMethod({})
            dummyMethod(@array(EmptyClass) empty: EmptyClass[]) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toEqual({
            type: 'Class',
            ctorParameters: [],
            name: 'DummyClass',
            methods:
                [{
                    type: 'Function',
                    name: 'dummyMethod',
                    parameters: [{
                        type: 'Parameter', name: 'empty',
                        decorators: [{ object: EmptyClass, type: "Array" }],
                        typeAnnotation: [EmptyClass]
                    }],
                    decorators: [{}],
                    returnType: undefined
                }],
            decorators: [],
            object: DummyClass,
            properties: []
        })
    })

    it("Should able to override type with other type", () => {
        class OtherDummyClass { }
        class DummyClass {
            method(@type(OtherDummyClass, "Readonly") dummy: Readonly<OtherDummyClass>) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toEqual({
            type: 'Class',
            ctorParameters: [],
            name: 'DummyClass',
            methods:
                [{
                    type: 'Function',
                    name: 'method',
                    parameters:
                        [{
                            type: 'Parameter',
                            name: 'dummy',
                            decorators:
                                [{
                                    type: 'Override',
                                    object: OtherDummyClass,
                                    info: 'Readonly'
                                }],
                            typeAnnotation: OtherDummyClass
                        }],
                    decorators: [],
                    returnType: undefined
                }],
            decorators: [],
            object: DummyClass,
            properties: []
        })
    })
})

describe("Decorator", () => {
    it("Should decorate class", () => {
        @decorateClass({ info: "Some Info" })
        class DummyClass { }
        const meta = reflect(DummyClass)
        expect(meta).toEqual({
            type: 'Class',
            ctorParameters: [],
            name: 'DummyClass',
            methods: [],
            decorators: [{ info: "Some Info" }],
            object: DummyClass,
            properties: []
        })
    })

    it("Should able to decorate class multiple", () => {
        @decorateClass({ otherInfo: "Some Other Info" })
        @decorateClass({ info: "Some Info" })
        class DummyClass { }
        const meta = reflect(DummyClass)
        expect(meta).toEqual({
            type: 'Class',
            ctorParameters: [],
            name: 'DummyClass',
            methods: [],
            decorators: [{ info: "Some Info" }, { otherInfo: "Some Other Info" }],
            object: DummyClass,
            properties: []
        })
    })

    it("Should able to decorate class using callback", () => {
        @decorateClass(x => ({ name: x.name }))
        class DummyClass { }
        const meta = reflect(DummyClass)
        expect(meta).toEqual({
            type: 'Class',
            ctorParameters: [],
            name: 'DummyClass',
            methods: [],
            decorators: [{ name: "DummyClass" }],
            object: DummyClass,
            properties: []
        })
    })

    it("Should decorate method", () => {
        class DummyClass {
            @decorateMethod({ info: "Some Info" })
            method() { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toEqual({
            type: 'Class',
            ctorParameters: [],
            name: 'DummyClass',
            methods: [{
                name: "method",
                parameters: [],
                type: "Function",
                decorators: [{ info: "Some Info" }]
            }],
            decorators: [],
            object: DummyClass,
            properties: []
        })
    })

    it("Should able to decorate method multiple", () => {
        class DummyClass {
            @decorateMethod({ otherInfo: "Some Other Info" })
            @decorateMethod({ info: "Some Info" })
            method() { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toEqual({
            type: 'Class',
            ctorParameters: [],
            name: 'DummyClass',
            methods: [{
                name: "method",
                parameters: [],
                type: "Function",
                decorators: [{ info: "Some Info" }, { otherInfo: "Some Other Info" }]
            }],
            decorators: [],
            object: DummyClass,
            properties: []
        })
    })

    it("Should decorate method with callback", () => {
        class DummyClass {
            @decorateMethod((a, b) => ({ target: a.name, method: b }))
            method() { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toEqual({
            type: 'Class',
            ctorParameters: [],
            name: 'DummyClass',
            methods: [{
                name: "method",
                parameters: [],
                type: "Function",
                decorators: [{ target: "DummyClass", method: "method" }]
            }],
            decorators: [],
            object: DummyClass,
            properties: []
        })
    })

    it("Should decorate method", () => {
        class DummyClass {
            @decorateMethod({ info: "Some Info" })
            method() { }
        }
        const rrr = Reflect.getMetadata(DECORATOR_KEY, DummyClass)
        const meta = reflect(DummyClass)
        expect(meta).toEqual({
            type: 'Class',
            ctorParameters: [],
            name: 'DummyClass',
            methods: [{
                name: "method",
                parameters: [],
                type: "Function",
                decorators: [{ info: "Some Info" }]
            }],
            decorators: [],
            object: DummyClass,
            properties: []
        })
    })

    it("Should able to decorate method multiple", () => {
        class DummyClass {
            @decorateMethod({ otherInfo: "Some Other Info" })
            @decorateMethod({ info: "Some Info" })
            method() { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toEqual({
            type: 'Class',
            ctorParameters: [],
            name: 'DummyClass',
            methods: [{
                name: "method",
                parameters: [],
                type: "Function",
                decorators: [{ info: "Some Info" }, { otherInfo: "Some Other Info" }]
            }],
            decorators: [],
            object: DummyClass,
            properties: []
        })
    })

    it("Should decorate method with callback", () => {
        class DummyClass {
            @decorateMethod((a, b) => ({ target: a.name, method: b }))
            method() { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toEqual({
            type: 'Class',
            ctorParameters: [],
            name: 'DummyClass',
            methods: [{
                name: "method",
                parameters: [],
                type: "Function",
                decorators: [{ target: "DummyClass", method: "method" }]
            }],
            decorators: [],
            object: DummyClass,
            properties: []
        })
    })

    it("Should able to decorate method parameter", () => {
        class DummyClass {
            method(
                @decorateParameter({ info: "Some Info" })
                id: number
            ) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toEqual({
            type: 'Class',
            ctorParameters: [],
            name: 'DummyClass',
            methods: [{
                name: "method",
                parameters: [{
                    name: "id",
                    type: "Parameter",
                    typeAnnotation: Number,
                    decorators: [{ info: "Some Info" }]
                }],
                type: "Function",
                decorators: []
            }],
            decorators: [],
            object: DummyClass,
            properties: []
        })
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
        expect(meta).toEqual({
            type: 'Class',
            ctorParameters: [],
            name: 'DummyClass',
            methods: [{
                name: "method",
                parameters: [{
                    name: "id",
                    type: "Parameter",
                    typeAnnotation: Number,
                    decorators: [{ info: "Some Info" }, { otherInfo: "Some Other Info" }]
                }],
                type: "Function",
                decorators: []
            }],
            decorators: [],
            object: DummyClass,
            properties: []
        })
    })

    it("Should able to decorate method parameter with callback", () => {
        class DummyClass {
            method(
                @decorateParameter((a, b, c) => ({ target: a.name, name: b, index: c }))
                id: number
            ) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toEqual({
            type: 'Class',
            ctorParameters: [],
            name: 'DummyClass',
            methods: [{
                name: "method",
                parameters: [{
                    name: "id",
                    type: "Parameter",
                    typeAnnotation: Number,
                    decorators: [{ target: "DummyClass", name: "method", index: 0 }]
                }],
                type: "Function",
                decorators: []
            }],
            decorators: [],
            object: DummyClass,
            properties: []
        })
    })

    it("Should able to decorate constructor parameter", () => {
        class DummyClass {
            constructor(
                @decorateParameter({ info: "Some Info" })
                id: number
            ) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toEqual({
            type: 'Class',
            name: 'DummyClass',
            ctorParameters: [{
                name: "id",
                type: "Parameter",
                typeAnnotation: Number,
                decorators: [{ info: "Some Info" }]
            }],
            methods: [],
            decorators: [],
            object: DummyClass,
            properties: []
        })
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
        expect(meta).toEqual({
            type: 'Class',
            name: 'DummyClass',
            ctorParameters: [{
                name: "id",
                type: "Parameter",
                typeAnnotation: Number,
                decorators: [{ info: "Some Info" }, { otherInfo: "Some Other Info" }]
            }],
            methods: [],
            decorators: [],
            object: DummyClass,
            properties: []
        })
    })

    it("Should able to decorate constructor parameter", () => {
        class DummyClass {
            constructor(
                @decorateParameter((a, b, c) => ({ target: a.name, name: b, index: c }))
                id: number
            ) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toEqual({
            type: 'Class',
            name: 'DummyClass',
            ctorParameters: [{
                name: "id",
                type: "Parameter",
                typeAnnotation: Number,
                decorators: [{ target: "DummyClass", name: "constructor", index: 0 }]
            }],
            methods: [],
            decorators: [],
            object: DummyClass,
            properties: []
        })
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

describe("Module Introspection", () => {
    it("Should inspect function", async () => {
        const meta = await reflect(join(__dirname, "./mocks/mock.function.ts"))
        expect(meta.members[0]).toEqual({
            type: 'Function',
            name: 'myFunction',
            parameters:
                [{ type: 'Parameter', name: 'id', decorators: [], typeAnnotation: undefined },
                { type: 'Parameter', name: 'name', decorators: [], typeAnnotation: undefined }],
            decorators: []
        })
    })

    it("Should inspect function inside namespace", async () => {
        const meta = await reflect(join(__dirname, "./mocks/mock.function-in-namespace.ts"))
        expect(meta.members[0]).toEqual({
            type: 'Object',
            name: 'myNamespace',
            members:
                [{
                    type: 'Function',
                    name: 'myFunction',
                    parameters:
                        [{ type: 'Parameter', name: 'id', decorators: [], typeAnnotation: undefined },
                        { type: 'Parameter', name: 'name', decorators: [], typeAnnotation: undefined }],
                    decorators: []
                }]
        })
    })

    it("Should inspect class", async () => {
        const meta = await reflect(join(__dirname, "./mocks/mock.class.ts"))
        expect(meta.members[0]).toEqual({
            type: 'Class',
            ctorParameters: [],
            name: 'MyClass',
            methods:
                [{ type: 'Function', name: 'method', parameters: [], decorators: [], returnType: undefined }],
            decorators: [],
            object: MyClass,
            properties: []
        })
    })

    it("Should inspect class inside namespace", async () => {
        const meta = await reflect(join(__dirname, "./mocks/mock.class-in-namespace.ts"))
        expect(meta.members[0]).toMatchObject({
            type: 'Object',
            name: 'myNameSpace',
            members:
                [{
                    type: 'Class',
                    ctorParameters: [],
                    name: 'MyClass',
                    methods:
                        [{
                            type: 'Function',
                            name: 'method',
                            parameters: [],
                            decorators: []
                        }],
                    decorators: [],
                    object: myNameSpace.MyClass
                }]
        })
    })

    it("Should inspect module with constant", async () => {
        const meta = await reflect(join(__dirname, "./mocks/mock.module-with-value"))
        expect(meta.members.length).toBe(1)
        expect(meta.members[0]).toMatchObject({
            type: 'Class',
            ctorParameters: [],
            name: 'MyClass',
            methods:
                [{ type: 'Function', name: 'method', parameters: [], decorators: [] }],
            decorators: [],
        })
    })
})

describe("Cache Function", () => {

    it("Should cache call", () => {
        @decorateClass({ name: "MyClass" })
        class MyClass {
            method(par: string) { }
        }
        const meta1 = reflect(MyClass)
        const meta2 = reflect(MyClass)
        expect(meta1 == meta2).toBe(true)
    })

    it("Should differentiate class with scope", () => {
        const first = (() => {
            @decorateClass({ name: "first" })
            class MyClass {
                method(par: string) { }
            }
            return MyClass
        })()

        const second = (() => {
            @decorateClass({ name: "second" })
            class MyClass {
                method(par: string) { }
            }
            return MyClass
        })()

        expect(second === first).toBe(false)
        const firstMeta = reflect(first)
        const secondMeta = reflect(second)
        expect(firstMeta == secondMeta).toBe(false)
        expect(firstMeta).toEqual({
            type: 'Class',
            ctorParameters: [],
            name: 'MyClass',
            methods:
                [{
                    type: 'Function',
                    name: 'method',
                    parameters:
                        [{
                            type: 'Parameter',
                            name: 'par',
                            decorators: [],
                            typeAnnotation: undefined
                        }],
                    decorators: [],
                    returnType: undefined
                }],
            decorators: [{ name: 'first' }],
            object: first,
            properties: []
        })
        expect(secondMeta).toEqual({
            type: 'Class',
            ctorParameters: [],
            name: 'MyClass',
            methods:
                [{
                    type: 'Function',
                    name: 'method',
                    parameters:
                        [{
                            type: 'Parameter',
                            name: 'par',
                            decorators: [],
                            typeAnnotation: undefined
                        }],
                    decorators: [],
                    returnType: undefined
                }],
            decorators: [{ name: 'second' }],
            object: second,
            properties: []
        })
    })
})

describe("Property Introspection", () => {
    it("Should inspect class with properties", () => {
        class DummyClass {
            @decorateProperty({})
            dummyProp: string = "Hello"
        }
        const meta = reflect(DummyClass)
        expect(meta.properties[0].typeAnnotation).toBe(String)
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
        expect(meta.properties[0].typeAnnotation).toBe(String)
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
        expect(meta.properties[0].typeAnnotation).toBe(Number)
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
        expect(meta.properties[0].typeAnnotation).toBe(Number)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect class with get set with decorator callback", () => {
        class DummyClass {
            @decorateProperty((target, name) => ({ target, name }))
            get data() { return 1 }
            set data(value: number) { }
        }
        const meta = reflect(DummyClass)
        expect(meta.properties[0].typeAnnotation).toBe(Number)
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
        expect(meta.properties[0].typeAnnotation).toBe(String)
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
        expect(meta.properties[0].typeAnnotation).toBe(String)
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
        expect(meta.properties[0].typeAnnotation).toBe(String)
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
})

describe("Inheritance", () => {
    
})

