import { Node, parse } from "acorn"
import { useCache } from "./helpers"

import { getAllMetadata } from "./storage"
import {
    Class,
    ClassReflection,
    ConstructorReflection,
    DecoratorOption,
    DecoratorOptionId,
    FunctionReflection,
    MethodReflection,
    ParameterPropertyReflection,
    ParameterReflection,
    PropertyReflection,
} from "./types"

// --------------------------------------------------------------------- //
// ------------------------------ HELPERS ------------------------------ //
// --------------------------------------------------------------------- //

function getNode(node: Node, criteria: (x: any) => boolean): Node | undefined {
    if (criteria(node)) return node
    if (!(node as any).body) return
    if (Array.isArray((node as any).body)) {
        for (const child of (node as any).body) {
            const result = getNode(child, criteria)
            if (result) return result
        }
    }
    return getNode((node as any).body, criteria)
}

type RootNode = string | KeyValueNode | ObjectNode | ArrayNode
type KeyValueNode = { kind: "KeyValue", key: string, value: RootNode }
interface ObjectNode { kind: "Object", members: RootNode[] }
interface ArrayNode { kind: "Array", members: RootNode[] }

function getNamesFromAst(nodes: any[]) {
    const getName = (node: any): undefined | RootNode => {
        if (node.type === "Identifier") return node.name
        if (node.type === "AssignmentPattern") return node.left.name
        if (node.type === "RestElement") return node.argument.name
        if (node.type === "Property") {
            if (node.value.type === "Identifier") return node.value.name
            else {
                return { kind: "KeyValue", key: node.key.name, value: getName(node.value)! }
            }
        }
        if (node.type === "ObjectPattern") {
            return { kind: "Object", members: node.properties.map((x: any) => getName(x)) }
        }
        //if (node.type === "ArrayPattern") {
            return { kind: "Array", members: node.elements.map((x: any) => getName(x)) }
        //}
    }
    return nodes.map(x => getName(x)).filter((x): x is RootNode => !!x)
}

function getCode(fn: Class | Function) {
    const syntaxReplacement = [
        { pattern: /^class(\s*)extends\s*BaseClass\s*{\s*}/gm, replacement: "class DynamicClass extends Parent {}" },
        { pattern: /^class(\s*){\s*}/gm, replacement: "class DynamicClass {}" },
    ]
    const code = fn.toString()
    const exclude = syntaxReplacement.find(x => code.search(x.pattern) > -1)
    if (exclude) {
        return exclude.replacement
    }
    else
        return code.replace("[native code]", "")
}

function getMethodParameters(fn: Class, method: string) {
    const body = getCode(fn)
    const ast = parse(body, { ecmaVersion: 2020 })
    const ctor = getNode(ast, x => x.type === "MethodDefinition" && x.kind === "method" && x.key.name === method)
    return getNamesFromAst(ctor ? (ctor as any).value.params : [])
}

function getConstructorParameters(fn: Class) {
    const body = getCode(fn)
    const ast = parse(body, { ecmaVersion: 2020 })
    const ctor = getNode(ast, x => x.type === "MethodDefinition" && x.kind === "constructor")
    return getNamesFromAst(ctor ? (ctor as any).value.params : [])
}

function getFunctionParameters(fn: Function) {
    try {
        const body = getCode(fn)
        const ast:any = parse(body, { ecmaVersion: 2020 })
        const expBody = ast.body[0]
        if(expBody.type === "FunctionDeclaration")
            return getNamesFromAst((ast as any).body[0].params)
        else 
            return getNamesFromAst((ast as any).body[0].expression.params)
    }
    catch {
        return []
    }
}

function getClassMembers(fun: Function) {
    const isGetter = (name: string) => Object.getOwnPropertyDescriptor(fun.prototype, name)!.get
    const isSetter = (name: string) => Object.getOwnPropertyDescriptor(fun.prototype, name)!.set
    const isFunction = (name: string) => typeof fun.prototype[name] === "function";
    const members = Object.getOwnPropertyNames(fun.prototype)
        .filter(name => isGetter(name) || isSetter(name) || isFunction(name))
    const properties = (getAllMetadata(fun as Class) || [])
        .filter(x => !!x.memberName && !x.parIndex)
        .filter(x => {
            const opt: DecoratorOption = x.data[DecoratorOptionId]
            return opt.applyTo!.length === 0
        })
        .map(x => x.memberName as string)
    const names = members.concat(properties)
        .filter(name => name !== "constructor" && !~name.indexOf("__"))
    return [...new Set(names)]
}

function getName(param: RootNode): string {
    const getNames = (p: RootNode[]) => p.map(x => getName(x))
    if (typeof param === "string") return param
    if (param.kind === "KeyValue") return `${param.key}: ${getName(param.value)}`
    if (param.kind === "Object") return `{ ${getNames(param.members).join(", ")} }`
    return `[${getNames(param.members).join(", ")}]`
}

function getField(params: RootNode): any {
    const getFields = (p: RootNode[]) => p.map(x => getField(x))
    if (typeof params === "string") return params
    if (params.kind === "KeyValue") return { [params.key]: getField(params.value) }
    if (params.kind === "Object") return [...getFields(params.members)]
    return [...getFields(params.members)]
}
// --------------------------------------------------------------------- //
// ------------------------------- PARSER ------------------------------ //
// --------------------------------------------------------------------- //

function parseParameter(name: RootNode, index: number): ParameterReflection {
    return { kind: "Parameter", name: getName(name), decorators: [], fields: getField(name), index, type: undefined }
}

function parseFunction(fn: Function): FunctionReflection {
    const parameters = getFunctionParameters(fn).map((x, i) => ({ ...parseParameter(x, i), type: undefined, typeClassification: undefined }))
    return { kind: "Function", name: fn.name, parameters, returnType: undefined }
}

function parseMethods(owner: Class): MethodReflection[] {
    const result: MethodReflection[] = []
    const members = getClassMembers(owner)
    for (const name of members) {
        const des = Reflect.getOwnPropertyDescriptor(owner.prototype, name)
        if (des && typeof des.value === "function" && !des.get && !des.set) {
            const parameters = getMethodParameters(owner, name).map((x, i) => parseParameter(x, i))
            result.push({ kind: "Method", name, parameters, decorators: [], returnType: undefined })
        }
    }
    return result
}

function parseProperties(owner: Class): PropertyReflection[] {
    const result: PropertyReflection[] = []
    const members = getClassMembers(owner)
    for (const name of members) {
        const des = Reflect.getOwnPropertyDescriptor(owner.prototype, name)
        if (!des || des.get || des.set) {
            result.push({ kind: "Property", name, decorators: [], get: des?.get, set: des?.set })
        }
    }
    // include constructor parameter
    const params = getConstructorParameters(owner)
    for (const [i, name] of params.entries()) {
        const { fields, ...par } = parseParameter(name, i)
        result.push(<ParameterPropertyReflection>{ ...par, kind: "Property", isParameter: true, get: undefined, set: undefined })
    }
    return result
}

function parseConstructor(fn: Class): ConstructorReflection {
    const params = getConstructorParameters(fn)
    return {
        kind: "Constructor",
        name: "constructor",
        parameters: params.map((x, i) => parseParameter(x, i)),
    }
}

function parseClassNoCache(fn: Class): ClassReflection {
    const proto = Object.getPrototypeOf(fn)
    return {
        kind: "Class", name: fn.name, type: fn, decorators: [],
        methods: parseMethods(fn),
        properties: parseProperties(fn),
        ctor: parseConstructor(fn),
        super: proto.prototype ? proto : Object,
    }
}

const cacheStore = new Map<Class, ClassReflection>()
const parseClass = useCache(cacheStore, parseClassNoCache, x => x)

export { parseClass, parseFunction, getMethodParameters, getConstructorParameters, getFunctionParameters, getClassMembers }