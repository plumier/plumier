import { join } from "path";

import { decorateClass, decorateMethod, decorateParameter, reflect, array, type } from "../src";
import { MyClass } from "./mock.class";
import { myNameSpace } from "./mock.class-in-namespace";
import { inspect } from 'util';

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
                [{ type: 'Function', name: 'dummyMethod', parameters: [], decorators: [] }],
            decorators: [],
            object: DummyClass
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
            object: DummyClass
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
                    decorators: []
                }],
            decorators: [],
            object: DummyClass
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
            object: DummyClass
        })
    })

    it("Should inspect parameters type with method decorator", () => {
        class DummyClass {
            @decorateMethod({})
            dummyMethod(dummy: string, other: any) { }
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
                    decorators: [{}]
                }],
            decorators: [],
            object: DummyClass
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
            object: DummyClass
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
                    decorators: [{}]
                }],
            decorators: [],
            object: DummyClass
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
                    decorators: []
                }],
            decorators: [],
            object: DummyClass
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
            object: DummyClass
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
            object: DummyClass
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
            object: DummyClass
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
            object: DummyClass
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
            object: DummyClass
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
            object: DummyClass
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
            object: DummyClass
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
            object: DummyClass
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
            object: DummyClass
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
            object: DummyClass
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
            object: DummyClass
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
            object: DummyClass
        })
    })
})

describe("Module Introspection", () => {
    it("Should inspect function", async () => {
        const meta = await reflect(join(__dirname, "./mock.function.ts"))
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
        const meta = await reflect(join(__dirname, "./mock.function-in-namespace.ts"))
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
        const meta = await reflect(join(__dirname, "./mock.class.ts"))
        expect(meta.members[0]).toEqual({
            type: 'Class',
            ctorParameters: [],
            name: 'MyClass',
            methods:
                [{ type: 'Function', name: 'method', parameters: [], decorators: [] }],
            decorators: [],
            object: MyClass
        })
    })

    it("Should inspect class inside namespace", async () => {
        const meta = await reflect(join(__dirname, "./mock.class-in-namespace.ts"))
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
})