import { x } from '@hapi/joi'
import { BindingDecorator, Class, FormFile, RouteInfo } from "@plumier/core"
import { ParameterObject } from "openapi3-ts"
import reflect, { ParameterReflection, PropertyReflection } from "tinspector"

import { addRelationProperties, transformType } from "./schema"
import { isBind, isDescription, isName, isPartialValidator, isRequired, TransformContext, isGenericId, isApiReadOnly } from "./shared"

interface ParameterNode {
    // undecided: assume that all non decorated parameters can be body request
    kind: "path" | "query" | "header" | "cookie" | "undecided"
    name: string,
    required: boolean
    binding?: BindingDecorator
    typeName: "Class" | "Array" | "Primitive"
    type: Class | Class[] | undefined,
    meta: ParameterReflection | PropertyReflection
}

function describeParameter(par: ParameterReflection, route: RouteInfo) {
    const obj = <ParameterNode>{ kind: "undecided", name: par.name, typeName: par.typeClassification!, required: false, type: par.type, meta: par }
    const urlParams = route.url.split("/").filter(x => x.startsWith(":")).map(x => x.substr(1))
    if (urlParams.some(x => x.toLowerCase() === route.paramMapper.alias(par.name).toLowerCase())) {
        obj.kind = "path"
        obj.name = route.paramMapper.alias(par.name).toLowerCase()
    }
    for (const dec of par.decorators) {
        if (isRequired(dec)) obj.required = true
        if (isName(dec)) obj.name = dec.alias
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
    // split decorator binding defined with class into flat properties
    if (node.typeName === "Class" && node.binding) {
        const meta = reflect(node.type as Class)
        const isPartial = !!node.meta.decorators.find(isPartialValidator)
        const result = []
        for (const prop of meta.properties) {
            result.push(<ParameterObject>{
                name: prop.name, in: node.kind, required: isPartial ? false : !!prop.decorators.find(isRequired),
                schema: transformType(prop.type, ctx, { decorators: prop.decorators }),
            })
        }
        return result
    }
    else {
        const desc = node.meta.decorators.find(isDescription)
        const schema = transformType(node.type, ctx, { decorators: node.meta.decorators })
        const schemaWithRelation = addRelationProperties(schema, node.type ?? Object, ctx)
        return [<ParameterObject>{
            name: node.name, in: node.kind,
            required: node.required,
            schema: schemaWithRelation,
            description: desc?.desc
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

function getParameterCandidates(nodes: ParameterNode[]) {
    const result = []
    for (const node of nodes) {
        // skip ctx, request, body, user, custom, formFile
        if (["ctx", "request", "body", "user", "custom", "formFile"].some(x => x === node.binding?.name)) continue
        // skip form file name binding
        if ((Array.isArray(node.type) && node.type[0] === FormFile) || node.type === FormFile) continue
        result.push(node)
    }
    return result
}

function transformParameters(route: RouteInfo, ctx: TransformContext) {
    const reMapCandidate = (can: ParameterNode): ParameterNode => ({ ...can, kind: "query" })
    const nodes = getParameterCandidates(describeParameters(route))
    const result: ParameterObject[] = []
    let candidates = []
    for (const node of nodes) {
        if (node.kind === "undecided")
            candidates.push(node)
        else
            result.push(...transformNode(node, ctx))
    }
    if (["put", "post", "patch"].some(x => x === route.method)) {
        // check if all candidates is a primitive type then its should be spread name binding
        if (candidates.every(x => x.typeName === "Primitive"))
            return result
        const canNodes = candidates.filter(x => x.typeName === "Primitive").map(reMapCandidate)
        return result.concat(transformNodes(canNodes, ctx))
    }
    return result.concat(transformNodes(candidates.map(reMapCandidate), ctx))
}

export { describeParameters, transformParameters, ParameterNode }