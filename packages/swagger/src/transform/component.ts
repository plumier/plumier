import { Class, isCustomClass } from "@plumier/core"
import { ComponentsObject, ReferenceObject, SchemaObject, SecuritySchemeObject } from "openapi3-ts"
import reflect from "tinspector"

import { refFactory, transformType, TransformTypeOption } from "./schema"
import { TransformContext, isApiReadOnly, isApiWriteOnly } from "./shared"

type SchemasObject = { [key: string]: SchemaObject }

const defaultSchemas: { [key: string]: SchemaObject } = {
    "System-ValidationError": {
        type: "object",
        properties: {
            status: { type: "number" },
            message: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        path: { type: "array", items: { type: "string" } },
                        messages: { type: "array", items: { type: "string" } }
                    }
                }
            }
        }
    },
    "System-DefaultErrorMessage": {
        type: "object",
        properties: {
            status: { type: "number" },
            message: { type: "string" }
        }
    }
}


function createArraySchema(obj: Class[], ctx: TransformContext): SchemaObject {
    const exists = ctx.map.get(obj[0])
    if (exists) return transformType(obj, ctx)
    return {
        type: "array",
        items: createSchema(obj[0], ctx)
    }
}

function createSchema(obj: Class | Class[], ctx: TransformContext): SchemaObject {
    if (Array.isArray(obj)) return createArraySchema(obj, ctx)
    const meta = reflect(obj)
    const types = Array.from(ctx.map.keys())
    const properties: SchemasObject = {}
    for (const prop of meta.properties) {
        // if the type is not registered then make inline object
        if (isCustomClass(prop.type) && !types.some(x => x === prop.type)) {
            const writeOnly = !!prop.decorators.find(isApiWriteOnly) ? true : undefined
            const readOnly = !!prop.decorators.find(isApiReadOnly) ? true : undefined
            const schema = createSchema(prop.type, ctx)
            properties[prop.name] = { ...schema, readOnly, writeOnly }
        }
        else
            properties[prop.name] = transformType(prop.type, ctx, { decorators: prop.decorators })
    }
    return { type: "object", properties }
}

function transformComponent(ctx: TransformContext): ComponentsObject {
    const getRef = refFactory(ctx.map)
    const types = Array.from(ctx.map.keys())
    const bearer: SecuritySchemeObject = { type: "http", scheme: "bearer", bearerFormat: "JWT" }
    const schemas: SchemasObject = types.reduce((a, b) => {
        return { ...a, [getRef(b)!]: createSchema(b, ctx) }
    }, defaultSchemas)
    const result: ComponentsObject = { schemas }
    if (ctx.config.enableAuthorization)
        result.securitySchemes = { bearer }
    return result
}

export { transformComponent }