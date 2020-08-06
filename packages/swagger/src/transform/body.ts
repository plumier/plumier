import { Class, entityHelper, FormFile, RelationDecorator, RouteInfo } from "@plumier/core"
import { ContentObject, ReferenceObject, RequestBodyObject, SchemaObject } from "openapi3-ts"
import reflect, { ParameterReflection, PropertyReflection } from "tinspector"

import { describeParameters, ParameterNode } from "./parameter"
import { getRequiredProps, transformType } from "./schema"
import { TransformContext } from "./shared"

function addSchema(target: SchemaObject | ReferenceObject, schema: SchemaObject): SchemaObject {
    if ("type" in target && target.type === "array")
        return { ...target, items: addSchema(target.items!, schema) }
    if ("allOf" in target && target.allOf)
        return { allOf: [...target.allOf, schema] }
    else
        return { allOf: [target, schema] }
}

function addRelationProperties(rootSchema: SchemaObject, modelType: (Class | Class[]), ctx: TransformContext): SchemaObject {
    const type = Array.isArray(modelType) ? modelType[0] : modelType
    const meta = reflect(type)
    const result: SchemaObject = { type: "object", properties: {} }
    for (const property of meta.properties) {
        const relation = property.decorators.find((x: RelationDecorator): x is RelationDecorator => x.kind === "plumier-meta:relation")
        if (relation) {
            const isArray = property.typeClassification === "Array"
            const propType = isArray ? property.type[0] : property.type
            const idType = entityHelper.getIdType(propType)
            result.properties![property.name] = transformType(isArray ? [idType] : idType, ctx)
        }
    }
    const count = Object.keys(result.properties!).length
    return count == 0 ? rootSchema : addSchema(rootSchema, result)
}

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
    const properties = {} as { [propertyName: string]: (SchemaObject | ReferenceObject); }
    for (const prop of props) {
        properties[prop.name] = transformType(prop.type, ctx, { decorators: prop.decorators })
    }
    const required = getRequiredProps(props)
    const result: SchemaObject = { type: "object", properties, required }
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
        let schema = transformType(model.type, ctx, { decorators: model.meta.decorators })
        // convert relational model into appropriate ID type
        // to inform user that its able to provide the ID instead of the object
        const relation = addRelationProperties(schema, model.type!, ctx)
        return { required: true, content: transformJsonContent(relation) }
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
    const pars = describeParameters(route)
        .filter(x => x.kind === "bodyCandidate")
        .filter(x => !["ctx", "request", "user", "custom"].some(y => y === x.binding?.name))
    if (pars.some(x => isFormFile(x)))
        return transformFileBody(pars, ctx)
    else
        return transformJsonBody(pars, ctx)
}

export { transformBody }
