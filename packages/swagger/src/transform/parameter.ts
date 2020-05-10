import { BindingDecorator, Class, FormFile, RouteInfo } from "@plumier/core"
import { ParameterObject } from "openapi3-ts"
import reflect, { ParameterReflection, PropertyReflection } from "tinspector"

import { transformType } from "./schema"
import { isRequired, TransformContext } from "./shared"

interface ParameterNode {
    kind: "path" | "query" | "header" | "cookie" | "bodyCandidate"
    name: string,
    required: boolean
    binding?: BindingDecorator
    typeName: "Class" | "Array" | "Primitive"
    type: Class | Class[] | undefined,
    meta: ParameterReflection | PropertyReflection
}

function describeParameter(par: ParameterReflection, route: RouteInfo) {
    const isBind = (dec: BindingDecorator): dec is BindingDecorator => dec.type === "ParameterBinding"
    const obj = <ParameterNode>{ kind: "bodyCandidate", name: par.name, typeName: par.typeClassification!, required: false, type: par.type, meta: par }
    const urlParams = route.url.split("/").filter(x => x.startsWith(":")).map(x => x.substr(1))
    if (urlParams.some(x => x === par.name)) {
        obj.kind = "path"
    }
    for (const dec of par.decorators) {
        if (isRequired(dec)) obj.required = true
        else if (isBind(dec)) {
            obj.binding = dec
            if (dec.name === "query" || dec.name === "header" || dec.name === "cookie")
                obj.kind = dec.name
        }
    }
    return obj
}

function describeParameters(route: RouteInfo) {
    return route.action.parameters.map(x => describeParameter(x, route))
}

function transformNode(node: ParameterNode, ctx: TransformContext): ParameterObject[] {
    if (node.typeName === "Class") {
        const meta = reflect(node.type as Class)
        return meta.properties.map(x => (<ParameterObject>{
            name: x.name, in: node.kind, required: !!x.decorators.find(isRequired),
            schema: transformType(x.type, ctx)
        }))
    }
    else {
        return [<ParameterObject>{
            name: node.name, in: node.kind,
            required: node.required,
            schema: transformType(node.type, ctx)
        }]
    }
}

function transformNodes(nodes: ParameterNode[], ctx: TransformContext): ParameterObject[] {
    const result = []
    for (const node of nodes) {
        result.push(...transformNode(node, ctx))
    }
    return result
}

function transformParameters(route: RouteInfo, ctx: TransformContext) {
    const nodes = describeParameters(route)
    const result: ParameterObject[] = []
    const bodyCandidates = []
    for (const node of nodes) {
        // skip ctx, request, body, user, custom, formFile
        if (["ctx", "request", "body", "user", "custom", "formFile"].some(x => x === node.binding?.name)) continue
        // skip form file name binding
        if ((Array.isArray(node.type) && node.type[0] === FormFile) || node.type === FormFile) continue
        if (node.kind === "bodyCandidate") {
            bodyCandidates.push(node)
        }
        else {
            result.push(...transformNode(node, ctx))
        }
    }
    // if in POST or PUT if all candidates is primitive type then its a name binding for body, return immediately
    if ((route.method === "post" || route.method == "put") && bodyCandidates.every(x => x.typeName === "Primitive")) return result
    result.push(...transformNodes(bodyCandidates.filter(x => x.typeName === "Primitive" || !x.type).map(x => ({ ...x, kind: "query" })), ctx))
    return result
}

export { describeParameters, transformParameters, ParameterNode }