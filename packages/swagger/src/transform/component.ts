import { ComponentsObject, SecuritySchemeObject, SchemaObject } from "openapi3-ts"

import { refFactory, TransformContext, transformObject } from "./shared"

const defaultSchemas: { [key: string]: SchemaObject } = {
    ".ValidationError": {
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
    ".DefaultErrorMessage": {
        type: "object",
        properties: {
            status: { type: "number" },
            message: { type: "string" }
        }
    }
}

function transformComponent(ctx: TransformContext): ComponentsObject {
    const getRef = refFactory(ctx.map)
    const types = Array.from(ctx.map.keys())
    const bearer: SecuritySchemeObject = { type: "http", scheme: "bearer", bearerFormat: "JWT" }
    const result:ComponentsObject = {
        schemas: types.reduce((a, b) => {
            return { ...a, [getRef(b)!]: transformObject(b, ctx) }
        }, defaultSchemas),
    }
    if(ctx.config.enableAuthorization)
        result.securitySchemes = { bearer }
    return result
}

export { transformComponent }