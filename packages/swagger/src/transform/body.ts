import { FormFile, RouteInfo } from "@plumier/core"
import { ContentObject, ReferenceObject, RequestBodyObject, SchemaObject } from "openapi3-ts"
import { ParameterReflection, PropertyReflection } from "tinspector"

import { describeParameters, ParameterNode } from "./parameter"
import { transformType } from "./schema"
import { isPartialValidator, isRequired, TransformContext } from "./shared"


function transformJsonContent(schema: SchemaObject): ContentObject {
    return {
        "application/json": { schema },
        "application/x-www-form-urlencoded": { schema }
    }
}

function transformFileContent(schema: SchemaObject): ContentObject {
    return {
        "multipart/form-data": { schema },
    }
}

function transformProperties(props: (PropertyReflection | ParameterReflection)[], ctx: TransformContext): SchemaObject {
    const required = []
    const properties = {} as { [propertyName: string]: (SchemaObject | ReferenceObject); }
    for (const prop of props) {
        const isReq = !!prop.decorators.find(isRequired)
        if (isReq) required.push(prop.name)
        properties[prop.name] = transformType(prop.type, ctx, { decorators: prop.decorators })
    }
    const result: SchemaObject = { type: "object", properties }
    if (required.length > 0) result.required = required
    return result
}


function transformJsonBody(nodes: ParameterNode[], ctx: TransformContext): RequestBodyObject | undefined {
    // decorator binding
    const body = nodes.find(x => x.binding?.name === "body")
    if (body) {
        const schema = transformType(body.type, ctx, { decorators: body.meta.decorators })
        return { required: true, content: transformJsonContent(schema) }
    }
    // name binding
    const primitives = nodes.filter(x => x.typeName === "Primitive")
    if (primitives.length > 0 && primitives.length === nodes.length) {
        const schema = transformProperties(primitives.map(x => x.meta), ctx)
        return { required: true, content: transformJsonContent(schema) }
    }
    // model binding
    const model = nodes.find(x => x.typeName === "Array" || x.typeName === "Class")
    if (model) {
        const schema = transformType(model.type, ctx, { decorators: model.meta.decorators })
        return { required: true, content: transformJsonContent(schema) }
    }
}

function transformFileBody(nodes: ParameterNode[], ctx: TransformContext): RequestBodyObject | undefined {
    const params: (ParameterReflection | PropertyReflection)[] = []
    for (const node of nodes) {
        // decorator binding
        if (node.binding?.name === "formFile") {
            // get field name from tag and force the type even if not specified in parameter
            const type = Array.isArray(node.type) ? [FormFile] : FormFile
            params.push({ ...node.meta, name: node.name, type })
        }
        else
            params.push(node.meta)
    }
    const schema = transformProperties(params, ctx)
    return { required: true, content: transformFileContent(schema) }
}

function transformBody(route: RouteInfo, ctx: TransformContext): RequestBodyObject | undefined {
    const isFormFile = (par: ParameterNode) => (Array.isArray(par.type) && par.type[0] === FormFile) || par.type === FormFile || par.binding?.name === "formFile"
    if (route.method !== "post" && route.method !== "put" && route.method !== "patch") return
    const pars = describeParameters(route).filter(x => x.kind === "bodyCandidate")
    if (pars.some(x => isFormFile(x)))
        return transformFileBody(pars, ctx)
    else
        return transformJsonBody(pars, ctx)
}

export { transformBody }
