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

