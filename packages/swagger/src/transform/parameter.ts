import { Class, EntityFilterDecorator, FormFile, RouteInfo } from "@plumier/core"
import { ParameterObject } from "openapi3-ts"
import reflect from "tinspector"

import { analyzeParameters, ParameterNode } from "./parameter-analyzer"
import { transformType, transformTypeAdvance, TransformTypeOption } from "./schema"
import { isDescription, TransformContext } from "./shared"

function createParameterObject(node: ParameterNode, ctx: TransformContext, opt?: Partial<TransformTypeOption>) {
    const desc = node.meta.decorators.find(isDescription)
    const schema = transformTypeAdvance(node.type, ctx, { ...opt, decorators: node.meta.decorators })
    return <ParameterObject>{
        name: node.name, in: node.kind,
        required: node.required ? true : undefined,
        schema, description: desc?.desc
    }
}

function transformNode(node: ParameterNode, ctx: TransformContext): ParameterObject[] {
    // if its an entity filter
    if (node.meta.decorators.find((x: EntityFilterDecorator) => x.kind === "plumier-meta:entity-filter")) {
        return [createParameterObject(node, ctx, { overrides: ["RelationAsId", "Filter"] })]
    }
    // split decorator binding defined with class into flat properties
    if (node.typeName === "Class" && node.binding) {
        const meta = reflect(node.type as Class)
        const result = []
        for (const prop of meta.properties) {
            result.push(<ParameterObject>{
                name: prop.name, in: node.kind,
                schema: transformType(prop.type, ctx, { decorators: prop.decorators }),
            })
        }
        return result
    }
    else {
        return [createParameterObject(node, ctx)]
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
    const remapCandidate = (can: ParameterNode): ParameterNode => ({ ...can, kind: "query" })
    const nodes = getParameterCandidates(analyzeParameters(route))
    const result: ParameterObject[] = []
    let candidates = []
    for (const node of nodes) {
        if (node.kind === "undecided")
            candidates.push(node)
        else
            result.push(...transformNode(node, ctx))
    }
    if (["put", "post", "patch"].some(x => x === route.method)) {
        // check if all candidates are primitive types then its should be spread name binding
        if (candidates.every(x => x.typeName === "Primitive"))
            return result
        const canNodes = candidates.filter(x => x.typeName === "Primitive").map(remapCandidate)
        return result.concat(transformNodes(canNodes, ctx))
    }
    return result.concat(transformNodes(candidates.map(remapCandidate), ctx))
}

export { analyzeParameters, transformParameters, ParameterNode }