import { reflect, ObjectReflection, getConstructorParameters, getParameterNames, DESIGN_PARAMETER_TYPE } from "../../src/libs/reflect";
import * as Path from "path"
import { inspect } from 'util';
import { AnimalController } from '../application/controller/basic-controller';
import { AnimalClass } from './reflect.mocks';

describe("getParameterNames", () => {
    it("Test", () => {
        const meta = Reflect.getMetadata(DESIGN_PARAMETER_TYPE, AnimalClass.prototype, "myMethod")
    })
    it("Should parse constructor parameter", () => {
        function MyFunction(one: number, two: number, three: number) { }
        expect(getParameterNames(MyFunction)).toEqual(["one", "two", "three"])
    })

    it("Should parse if some comment on parameter", () => {
        function MyFunction( /* constructor(a,b,c) {} */ one: number, /* constructor(a,b,c) {} */ two: number, /* constructor(a,b,c) {} */ three: number) { }
        expect(getParameterNames(MyFunction)).toEqual(["one", "two", "three"])
    })

    it("Should parse if parameter arranged in multiline", () => {
        function MyFunction(
                /* constructor(a,b,c) {} */ one: number,
                /* constructor(a,b,c) {} */ two: number,
                /* constructor(a,b,c) {} */ three: number) { }
        expect(getParameterNames(MyFunction)).toEqual(["one", "two", "three"])
    })

    it("Should parse if default parameters", () => {
        function MyFunction(one: number = 4, two: number = 2, three: number = 3) { }
        expect(getParameterNames(MyFunction)).toEqual(["one", "two", "three"])
    })

    it("Should parse async function", () => {
        async function MyFunction(one: number = 4, two: number = 2, three: number = 3) { }
        expect(getParameterNames(MyFunction)).toEqual(["one", "two", "three"])
    })
})

describe("getConstructorParams", () => {
    it("Should parse constructor parameter", () => {
        class MyClass {
            constructor(one: number, two: number, three: number) { }
        }
        expect(getConstructorParameters(MyClass)).toEqual(["one", "two", "three"])
    })

    it("Should parse if some comment on parameter", () => {
        class MyClass {
            constructor( /* constructor(a,b,c) {} */ one: number, /* constructor(a,b,c) {} */ two: number, /* constructor(a,b,c) {} */ three: number) { }
        }
        expect(getConstructorParameters(MyClass)).toEqual(["one", "two", "three"])
    })

    it("Should parse if parameter arranged in multiline", () => {
        class MyClass {
            constructor(
                /* constructor(a,b,c) {} */ one: number,
                /* constructor(a,b,c) {} */ two: number,
                /* constructor(a,b,c) {} */ three: number) { }
        }
        expect(getConstructorParameters(MyClass)).toEqual(["one", "two", "three"])
    })

    it("Should parse if default parameters", () => {
        class MyClass {
            constructor(one: number = 4, two: number = 2, three: number = 3) { }
        }
        expect(getConstructorParameters(MyClass)).toEqual(["one", "two", "three"])
    })

    it("Should return empty array if no parameters", () => {
        class MyClass {
            constructor() { }
        }
        expect(getConstructorParameters(MyClass)).toEqual([])
    })

    it("Should return empty array if no constructor", () => {
        class MyClass {
            constructor() { }
        }
        expect(getConstructorParameters(MyClass)).toEqual([])
    })
})

describe("Static Reflection", () => {
    it("Should have object root", async () => {
        const result = await reflect(Path.join(__dirname, "./reflect.mocks"))
        expect(result).toMatchObject({
            type: 'Object',
            name: 'module',
        })
    })
    it("Should reflect function with parameter", async () => {
        const result = await reflect(Path.join(__dirname, "./reflect.mocks"))
        expect(result.members[0]).toMatchObject({
            type: 'Function',
            name: 'myFun',
            decorators: [],
            parameters:
                [{ type: 'Parameter', decorators: [], name: 'firstPar' },
                { type: 'Parameter', decorators: [], name: 'secondPar' }]
        })
    })
    it("Should reflect function without parameter", async () => {
        const result = await reflect(Path.join(__dirname, "./reflect.mocks"))
        expect(result.members[1]).toMatchObject({ type: 'Function', decorators: [], name: 'myOtherFun', parameters: [] })
    })
    it("Should reflect class", async () => {
        const result = await reflect(Path.join(__dirname, "./reflect.mocks"))
        expect(result.members[2]).toMatchObject({
            decorators: [],
            type: 'Class',
            name: 'MyClass',
            methods:
                [{
                    type: 'Function',
                    name: 'myMethod',
                    decorators: [],
                    parameters:
                        [{ type: 'Parameter', name: 'firstPar', decorators: [], },
                        { type: 'Parameter', name: 'secondPar', decorators: [], }]
                },
                { type: 'Function', name: 'myOtherMethod', parameters: [], decorators: [], }]
        })
    })
    it("Should reflect decorated class", async () => {
        const result = await reflect(Path.join(__dirname, "./reflect.mocks"))
        expect(result.members[3]).toMatchObject({
            type: 'Class',
            ctorParameters: [
                { type: 'Parameter', name: 'id', decorators: [], typeAnnotation: Number },
                { type: 'Parameter', name: 'name', decorators: [], typeAnnotation: String }
            ],
            name: 'AnimalClass',
            methods:
                [{
                    type: 'Function',
                    name: 'myMethod',
                    parameters:
                        [{
                            type: 'Parameter',
                            name: 'firstPar',
                            decorators:
                                [{ required: true }]
                        },
                        {
                            type: 'Parameter',
                            name: 'secondPar',
                            decorators:
                                [{ required: false }]
                        }],
                    decorators:
                        [{ url: '/get' }]
                },
                {
                    type: 'Function',
                    name: 'myOtherMethod',
                    parameters:
                        [{
                            type: 'Parameter',
                            name: 'par1',
                            decorators:
                                [{ required: true }]
                        },
                        { type: 'Parameter', name: 'par2', decorators: [] }],
                    decorators: []
                }],
            decorators:
                [{ url: '/animal' }]
        })
    })
    it("Should reflect namespace", async () => {
        const result = await reflect(Path.join(__dirname, "./reflect.mocks"))
        expect(result.members[4]).toMatchObject({
            type: 'Object',
            name: 'myNamespace'
        })
    })

    it("Should reflect function inside namespace", async () => {
        const result = await reflect(Path.join(__dirname, "./reflect.mocks"))
        expect((<ObjectReflection>result.members[4]).members[0]).toMatchObject({
            type: 'Function',
            name: 'myFunInsideNamespace',
            decorators: [],
            parameters:
                [{ type: 'Parameter', decorators: [], name: 'firstPar' },
                { type: 'Parameter', decorators: [], name: 'secondPar' }]
        })
    })

    it("Should reflect function without parameter inside namespace", async () => {
        const result = await reflect(Path.join(__dirname, "./reflect.mocks"))
        expect((<ObjectReflection>result.members[4]).members[1]).toMatchObject({
            type: 'Function',
            name: 'myOtherFunInsideNamespace',
            decorators: [],
            parameters: []
        })
    })

    it("Should reflect class inside namespace", async () => {
        const result = await reflect(Path.join(__dirname, "./reflect.mocks"))
        expect((<ObjectReflection>result.members[4]).members[2]).toMatchObject({
            decorators: [],
            type: 'Class',
            name: 'MyClassInsideNamespace',
            methods:
                [{
                    type: 'Function',
                    name: 'myMethod',
                    decorators: [],
                    parameters:
                        [{ type: 'Parameter', decorators: [], name: 'firstPar' },
                        { type: 'Parameter', decorators: [], name: 'secondPar' }]
                },
                { type: 'Function', decorators: [], name: 'myOtherMethod', parameters: [] }]
        })
    })

    it("Should reflect decorated class inside namespace", async () => {
        const result = await reflect(Path.join(__dirname, "./reflect.mocks"))
        expect((<ObjectReflection>result.members[4]).members[3]).toMatchObject({
            type: 'Class',
            ctorParameters: [
                { type: 'Parameter', name: 'id', decorators: [], typeAnnotation: Number },
                { type: 'Parameter', name: 'name', decorators: [], typeAnnotation: String }
            ],
            name: 'AnimalClass',
            methods:
                [{
                    type: 'Function',
                    name: 'myMethod',
                    parameters:
                        [{
                            type: 'Parameter',
                            name: 'firstPar',
                            decorators: [{ required: true }]
                        },
                        {
                            type: 'Parameter',
                            name: 'secondPar',
                            decorators: [{ required: false }]
                        }],
                    decorators: [{ url: '/get' }]
                },
                {
                    type: 'Function',
                    name: 'myOtherMethod',
                    parameters:
                        [{
                            type: 'Parameter',
                            name: 'par1',
                            decorators:
                                [{ required: true }]
                        },
                        { type: 'Parameter', name: 'par2', decorators: [] }],
                    decorators: []
                }],
            decorators: [{ url: '/animal' }]
        })
    })

    it("Should able to reflect global module", async () => {
        const result = await reflect("jest")
        expect(result.type).toEqual("Object")
        expect(result.members!.length).toBeGreaterThan(0)
    })
})

describe("Type Introspection", () => {
    it("Should able to introspect class", () => {
        class AnimalClass {
            constructor(id: number, name: string) { }
            setClient(client: any) { }
            getId() { }
        }
        const result = reflect(AnimalClass)
        expect(result).toEqual({
            type: 'Class',
            ctorParameters: [
                { type: 'Parameter', name: 'id', decorators: [], typeAnnotation:undefined },
                { type: 'Parameter', name: 'name', decorators: [], typeAnnotation:undefined }
            ],
            name: 'AnimalClass',
            methods:
                [{
                    type: 'Function',
                    name: 'setClient',
                    parameters: [{ type: 'Parameter', name: 'client', decorators: [], typeAnnotation:undefined }],
                    decorators: []
                },
                {
                    type: 'Function',
                    name: 'getId',
                    parameters: [],
                    decorators: []
                }],
            decorators: [],
            object: AnimalClass
        })
    })
})
