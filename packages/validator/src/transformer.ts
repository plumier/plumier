import reflect, { useCache } from "@plumier/reflect"

import { Class } from "./types"
import { Converter, defaultConverters } from './converter';

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

export interface PrimitiveNode {
    kind: "Primitive"
    type: Class
    converter: Converter
}

export interface ObjectNode {
    kind: "Object",
    type: Class
    properties: Map<string, SuperNode>
}

export interface ArrayNode {
    kind: "Array",
    type: Class
    element: SuperNode
}

export type SuperNode = PrimitiveNode | ObjectNode | ArrayNode

// --------------------------------------------------------------------- //
// -------------------------------- AST -------------------------------- //
// --------------------------------------------------------------------- //

function primitiveNode(type: Class): PrimitiveNode {
    return {
        kind: "Primitive", type,
        converter: defaultConverters.get(type)!
    }
}

function arrayNode(type: Class[]): ArrayNode {
    let defer: SuperNode
    return {
        kind: "Array", type: type[0],
        get element() {
            return defer || (defer = transform(type[0]))
        }
    }
}

function objectNode(type: Class): ObjectNode {
    let defer: Map<string, SuperNode>
    return {
        kind: "Object", type,
        get properties() {
            if (defer)
                return defer
            else {
                const meta = reflect(type)
                return defer = new Map(meta.properties.map(x => (<[string, ObjectNode]>[x.name, transformer(x.type)])))
            }
        }
    }
}

// --------------------------------------------------------------------- //
// ---------------------------- TRANSFORMER ---------------------------- //
// --------------------------------------------------------------------- //

function transformer(type: Class | Class[]) {
    if (type === Boolean || type === Number || type === Date || type === String)
        return primitiveNode(type)
    else if (Array.isArray(type))
        return arrayNode(type)
    else
        return objectNode(type)
}

// --------------------------------------------------------------------- //
// ------------------------------- CACHE ------------------------------- //
// --------------------------------------------------------------------- //

const astCache = new Map<Class, SuperNode>()
const arrayAstCache = new Map<Class, SuperNode>()

const transformArray = useCache(arrayAstCache, transformer, (type: any) => type[0])
const transformAll = useCache(astCache, transformer, (type) => type)

function transform(type: Class | Class[]) {
    const cachedTransformer = Array.isArray(type) ? transformArray : transformAll
    return cachedTransformer(type)
}

export { transform }