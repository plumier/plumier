import { Class, isCustomClass } from "@plumier/core"
import { ComponentsObject, SchemaObject, SecuritySchemeObject } from "openapi3-ts"
import reflect from "@plumier/reflect"

import { refFactory, transformType } from "./schema"
import { BaseTransformContext, TransformContext } from "./shared"

type SchemasObject = { [key: string]: SchemaObject }

const defaultSchemas: { [key: string]: SchemaObject } = {}

function createSchema(obj: Class, ctx: BaseTransformContext): SchemaObject {
    const meta = reflect(obj)
    const properties: SchemasObject = {}
    for (const prop of meta.properties) {
        properties[prop.name] = transformType(prop.type, ctx, { decorators: prop.decorators })
    }
    return { type: "object", properties }
}

function getUnregisterDependentTypes(type: Class, ctx: BaseTransformContext): Class[] {
    const meta = reflect(type)
    const registered = Array.from(ctx.map.keys())
    const types = []
    for (const prop of meta.properties) {
        const propType = Array.isArray(prop.type) ? prop.type[0] : prop.type
        if (isCustomClass(propType) && !registered.some(x => x === propType)) {
            //register the property type immediately to prevent circular loop
            refFactory(ctx.map)(propType)
            const childTypes = getUnregisterDependentTypes(propType, ctx)
            types.push(...childTypes)
            types.push(propType)
        }
    }
    return types;
}

function transformComponent(ctx: BaseTransformContext): ComponentsObject {
    const getRef = refFactory(ctx.map)
    const types = Array.from(ctx.map.keys())
    const schemas: SchemasObject = types.reduce((a, b) => {
        const result = { ...a }
        // loop through unregistered dependent types
        const dependents = getUnregisterDependentTypes(b, ctx)
        for (const type of dependents) {
            result[getRef(type)!] = createSchema(type, ctx)
        }
        // create schema of the type
        result[getRef(b)!] = createSchema(b, ctx)
        return result
    }, defaultSchemas)
    const result: ComponentsObject = { schemas }
    if (ctx.config.enableAuthorization)
        result.securitySchemes = { ...ctx.config.openApiSecuritySchemes }
    return result
}

export { transformComponent }