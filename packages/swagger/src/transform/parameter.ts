import { Class, FormFile, RouteInfo } from "@plumier/core"
import { ParameterObject } from "openapi3-ts"
import reflect from "tinspector"

import { analyzeParameters, ParameterNode } from "./parameter-analizer"
import { transformType } from "./schema"
import { isApiReadOnly, isDescription, isGenericId, isPartialValidator, isRequired, TransformContext } from "./shared"

function transformNode(node: ParameterNode, ctx: TransformContext): ParameterObject[] {
    if (node.typeName === "Class" && node.binding) {
        const meta = reflect(node.type as Class)
        const isPartial = !!node.meta.decorators.find(isPartialValidator)
        const result = []
        for (const prop of meta.properties) {
            // skip nested models on query parameters
            if (prop.typeClassification !== "Primitive") continue
            // skip ID parameter on query parameter 
            if (prop.decorators.find(isGenericId)) continue
            // skip readOnly property
            if (prop.decorators.find(isApiReadOnly)) continue
            
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

function transformParameters(route: RouteInfo, ctx: TransformContext) {
    const nodes = analyzeParameters(route)
    const result: ParameterObject[] = []
    let candidates = []
    for (const node of nodes) {
        // skip ctx, request, body, user, custom, formFile
        if (["ctx", "request", "body", "user", "custom", "formFile"].some(x => x === node.binding?.name)) continue
        // skip form file name binding
        if ((Array.isArray(node.type) && node.type[0] === FormFile) || node.type === FormFile) continue
        if (node.kind === "undecided") {
            candidates.push(node)
        }
        else {
            result.push(...transformNode(node, ctx))
        }
    }
    if ((route.method === "post" || route.method === "put" || route.method === "patch")) {
        // if post/put/patch if all candidates is primitive type then its a name binding for body, return immediately
        if (candidates.every(x => x.typeName === "Primitive"))
            return result
        // if post/put/patch only take the primitives (because custom class is a body)
        candidates = candidates.filter(x => x.typeName === "Primitive")
    }
    const queries = transformNodes(candidates.map(x => ({ ...x, kind: "query" })), ctx)
    result.push(...queries)
    return result
}

export { analyzeParameters, transformParameters, ParameterNode }