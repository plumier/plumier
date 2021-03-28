import { Node, parse } from "acorn"

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

function getNamesFromAst(nodes: any[]) {
    const getName = (node: any): undefined | string | { [key: string]: string[] } => {
        if (node.type === "Identifier") return node.name
        if (node.type === "AssignmentPattern") return node.left.name
        if (node.type === "RestElement") return node.argument.name
        if (node.type === "Property") {
            if (node.value.type === "Identifier") return node.value.name
            else {
                const result: { [key: string]: any } = {}
                result[node.key.name] = getName(node.value)
                return result
            }
        }
        //if (node.type === "ObjectPattern") {
        return node.properties.map((x: any) => getName(x))
        //}
    }
    return nodes.map(x => getName(x)).filter((x): x is string | { [key: string]: string[] } => !!x)
}

function getCode(fn: Class | Function) {
    const code = fn.toString()
    if (code.search(/^class(\s*)extends\s*option.extends\s*{\s*}/gm) > -1) {
        return "class DynamicClass extends Parent {}"
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
        const ast = parse(body, { ecmaVersion: 2020 })
        return getNamesFromAst((ast as any).body[0].params)
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
            const opt:DecoratorOption = x.data[DecoratorOptionId]
            return opt.applyTo!.length === 0
        })
        .map(x => x.memberName as string)
    const names = members.concat(properties)
        .filter(name => name !== "constructor" && !~name.indexOf("__"))
    return [...new Set(names)]
}

function printDestruct(params: any[]) {
    const result: string[] = []
    for (const key in params) {
        const par = params[key];
        if (typeof par === "string")
            result.push(par)
        else {
            const key = Object.keys(par)[0]
            result.push(`${key}: ${printDestruct(par[key])}`)
        }
    }
    return `{ ${result.join(", ")} }`
}

// --------------------------------------------------------------------- //
// ------------------------------- PARSER ------------------------------ //
// --------------------------------------------------------------------- //

function parseParameter(name: string | { [key: string]: string[] }, index: number): ParameterReflection {
    let parName
    let fields: { [key: string]: any[] } = {}
    if (typeof name === "object") {
        parName = printDestruct(name as any)
        fields = name
    }
    else {
        parName = name
    }
    return { kind: "Parameter", name: parName, decorators: [], fields, index, type: undefined }
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

function parseClass(fn: Class): ClassReflection {
    const proto = Object.getPrototypeOf(fn)
    return {
        kind: "Class", name: fn.name, type: fn, decorators: [],
        methods: parseMethods(fn),
        properties: parseProperties(fn),
        ctor: parseConstructor(fn),
        super: proto.prototype ? proto : Object,
    }
}

export { parseClass, parseFunction, getMethodParameters, getConstructorParameters, getFunctionParameters, getClassMembers }