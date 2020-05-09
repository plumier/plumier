import { Class, isCustomClass } from "@plumier/core"
import { ComponentsObject, ReferenceObject, SchemaObject, SecuritySchemeObject } from "openapi3-ts"
import reflect from "tinspector"

import { refFactory, transformType } from "./schema"
import { isRequired, TransformContext } from "./shared"

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

function transformArray(obj: Class[], ctx: TransformContext): SchemaObject {
    return {
        type: "array",
        items: transformObject(obj[0], ctx)
    }
}

function transformObject(obj: Class | Class[], ctx: TransformContext): SchemaObject {
    if (Array.isArray(obj)) return transformArray(obj, ctx)
    const meta = reflect(obj)
    const types = Array.from(ctx.map.keys())
    const required = []
    const properties = {} as { [propertyName: string]: (SchemaObject | ReferenceObject); }
    for (const prop of meta.properties) {
        const isReq = !!prop.decorators.find(isRequired)
        if (isReq) required.push(prop.name)
        // if the type is not registered then make inline object
        if (isCustomClass(prop.type) && !types.some(x => x === prop.type))
            properties[prop.name] = transformObject(prop.type, ctx)
        else
            properties[prop.name] = transformType(prop.type, ctx)
    }
    const result: SchemaObject = { type: "object", properties }
    if (required.length > 0) result.required = required
    return result
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