import { Class, isCustomClass, consoleLog } from "@plumier/core"
import { ComponentsObject, ReferenceObject, SchemaObject, SecuritySchemeObject } from "openapi3-ts"
import reflect from "tinspector"

import { refFactory, transformType } from "./schema"
import { isRequired, TransformContext, isOneToMany, isInverseProperty } from "./shared"

import { PartialValidator, ValidatorDecorator } from "typedconverter"

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

function createPartial() {
    return <ValidatorDecorator>{ type: "tc:validator", validator: PartialValidator }
}

function transformArray(obj: Class[], ctx: TransformContext, isPartial: boolean): SchemaObject {
    return {
        type: "array",
        items: transformType(obj[0], ctx, isPartial ? { decorators: [createPartial()] } : undefined)
    }
}

function transformObject(obj: Class | Class[], ctx: TransformContext, isPartial: boolean): SchemaObject {
    if (Array.isArray(obj)) return transformArray(obj, ctx, isPartial)
    const meta = reflect(obj)
    const types = Array.from(ctx.map.keys())
    const required = []
    const properties = {} as { [propertyName: string]: (SchemaObject | ReferenceObject); }
    for (const prop of meta.properties) {
        // if property is a "one-to-many" or "inverse-property" then skip
        const isOneMany = !!prop.decorators.find(isOneToMany)
        const isInverse = !!prop.decorators.find(isInverseProperty)
        if (isOneMany || isInverse) continue;
        // collect required properties
        const isReq = !!prop.decorators.find(isRequired)
        if (isReq) required.push(prop.name)
        // if the type is not registered then make inline object
        if (isCustomClass(prop.type) && !types.some(x => x === prop.type))
            properties[prop.name] = transformObject(prop.type, ctx, isPartial)
        else
            properties[prop.name] = transformType(prop.type, ctx, { decorators: prop.decorators.concat(isPartial && createPartial()) })
    }
    const result: SchemaObject = { type: "object", properties }
    if (required.length > 0 && !isPartial) result.required = required
    return result
}

type SchemaType = { [key: string]: SchemaObject | ReferenceObject }

function transformComponent(ctx: TransformContext): ComponentsObject {
    const getRef = refFactory(ctx.map)
    const types = Array.from(ctx.map.keys())
    const bearer: SecuritySchemeObject = { type: "http", scheme: "bearer", bearerFormat: "JWT" }
    // generate partial schemas
    const partialSchemas: SchemaType = types.reduce((a, b) => {
        return { ...a, [`${getRef(b)!}-Partial`]: transformObject(b, ctx, true) }
    }, defaultSchemas)
    // add type schemas
    const schemas = types.reduce((a, b) => {
        return { ...a, [getRef(b)!]: transformObject(b, ctx, false) }
    }, partialSchemas)
    const result: ComponentsObject = { schemas }
    if (ctx.config.enableAuthorization)
        result.securitySchemes = { bearer }
    return result
}

export { transformComponent }