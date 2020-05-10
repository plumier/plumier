import { Class, FormFile } from "@plumier/core"
import { ReferenceObject, SchemaObject } from "openapi3-ts"
import { ParameterReflection, PropertyReflection } from "tinspector"
import { isRequired, TransformContext } from './shared'

function refFactory(map: Map<Class, string>) {
    return (obj: Class) => {
        const exists = map.get(obj)
        const names = Array.from(map.values()).filter(x => x === obj.name)
        if (!exists && names.length === 0) {
            map.set(obj, obj.name)
            return obj.name
        }
        if (!exists && names.length > 0) {
            const name = obj.name + names.length
            map.set(obj, name)
            return name
        }
        return exists
    }
}

// --------------------------------------------------------------------- //
// --------------------------- TRANSFORM TYPE -------------------------- //
// --------------------------------------------------------------------- //

function transformType(type: Class | Class[] | undefined | (PropertyReflection | ParameterReflection)[], ctx: TransformContext) {
    const isProp = (type: any): type is (PropertyReflection | ParameterReflection)[] => Array.isArray(type) && !!type[0].kind
    if (isProp(type)) {
        return transformProperties(type, ctx)
    }
    else {
        return transformTypeRef(type, ctx)
    }
}

function transformTypeRef(type: Class | Class[] | undefined, ctx: TransformContext): SchemaObject {
    const getRef = refFactory(ctx.map)
    if (type === undefined) return { type: "string" }
    if (Array.isArray(type)) return {
        type: "array",
        items: transformType(type[0], ctx)
    }
    if (type === String) return { type: "string" }
    if (type === Number) return { type: "number" }
    if (type === Boolean) return { type: "boolean" }
    if (type === Date) return { type: "string", format: "date-time", }
    if (type === FormFile) return { type: "string", format: "binary" }
    else
        return { type: "object", $ref: `#/components/schemas/${getRef(type)}` }
}

function transformProperties(props: (PropertyReflection | ParameterReflection)[], ctx: TransformContext): SchemaObject {
    const required = []
    const properties = {} as { [propertyName: string]: (SchemaObject | ReferenceObject); }
    for (const prop of props) {
        const isReq = !!prop.decorators.find(isRequired)
        if (isReq) required.push(prop.name)
        properties[prop.name] = transformTypeRef(prop.type, ctx)
    }
    const result: SchemaObject = { type: "object", properties }
    if (required.length > 0) result.required = required
    return result
}

export { refFactory, transformType }

