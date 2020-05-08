import { BindingDecorator, Class, RouteInfo } from "@plumier/core"
import { ParameterObject } from "openapi3-ts"
import reflect, { ParameterReflection, PropertyReflection } from "tinspector"

import { isRequired, TransformContext, transformTypeRef } from "./shared"


interface ParameterNode {
    kind: "path" | "query" | "header" | "cookie" | "undetermined"
    name: string,
    required: boolean
    binding: "ctx" | "request" | "body" | "user" | "fromFile" | "custom" | undefined
    typeName: "Class" | "Array" | "Primitive"
    type: Class | Class[] | undefined,
    meta: ParameterReflection | PropertyReflection
}

function describeParameter(par: ParameterReflection, route: RouteInfo) {
    const isBind = (dec: BindingDecorator): dec is BindingDecorator => dec.type === "ParameterBinding"
    const obj = <ParameterNode>{ kind: "undetermined", name: par.name, typeName: par.typeClassification!, required: false, type: par.type, meta: par }
    const urlParams = route.url.split("/").filter(x => x.startsWith(":")).map(x => x.substr(1))
    if (urlParams.some(x => x === par.name)) {
        obj.kind = "path"
    }
    for (const dec of par.decorators) {
        if (isRequired(dec)) obj.required = true
        else if (isBind(dec)) {
            if (dec.name === "query" || dec.name === "header" || dec.name === "cookie")
                obj.kind = dec.name
            else
                obj.binding = dec.name as any
        }
    }
    return obj
}

function describeParameters(route: RouteInfo) {
    return route.action.parameters.map(x => describeParameter(x, route))
}

function transformParameters(route: RouteInfo, ctx: TransformContext) {
    const nodeToParam = (x: ParameterNode) => (<ParameterObject>{ name: x.name, in: "query", required: x.required, schema: transformTypeRef(x.type, ctx) })
    const nodes = describeParameters(route)
    const parameters: ParameterObject[] = []
    const undetermined: ParameterNode[] = []
    for (const node of nodes) {
        // skip processing parameter with binding ctx | request | body | user | fromFile | custom
        if (!!node.binding) continue;
        if (node.kind !== "undetermined") {
            const par = <ParameterObject>{
                name: node.name,
                in: node.kind,
                required: node.required,
            }
            if (node.typeName === "Class") {
                const meta = reflect(node.type as Class)
                const pars = meta.properties.map(x => (<ParameterObject>{
                    name: x.name, in: node.kind, required: !!x.decorators.find(isRequired),
                    schema: transformTypeRef(x.type, ctx)
                }))
                parameters.push(...pars)
            }
            else
                parameters.push({ ...par, schema: transformTypeRef(node.type, ctx) })
        }
        else
            undetermined.push(node)
    }
    if (undetermined.length === 0) return parameters
    // undetermined parameter can be a Request Body or a query parameter
    if (route.method === "post" || route.method === "put") {
        // in post method, if there are no parameter candidate of body request, 
        // then its possibly it uses name binding (spread model properties into parameters)
        const bodyCandidates = undetermined.filter(x => x.typeName === "Array" || x.typeName === "Class" || x.binding === "body" || x.binding === "fromFile")
        if (bodyCandidates.length > 0) {
            // if already a body request candidate, then the rest undetermined is a query parameter
            const pars = undetermined.filter(x => x.typeName === "Primitive")
                .map(x => nodeToParam(x))
            parameters.push(...pars)
        }
    }
    else {
        const pars = undetermined.filter(x => x.typeName === "Primitive" || x.type === undefined)
            .map(x => nodeToParam(x))
        parameters.push(...pars)
    }
    return parameters
}

export { describeParameters, transformParameters, ParameterNode }