import { Class, isCustomClass, Configuration } from "@plumier/core"
import { ReferenceObject, SchemaObject } from "openapi3-ts"
import reflect, { ParameterReflection, PropertyReflection } from "tinspector"
import { RequiredValidator, ValidatorDecorator } from "typedconverter"

interface TransformContext {
    map: Map<Class, string>
    config:Configuration
}

const isRequired = (dec: ValidatorDecorator): dec is ValidatorDecorator => dec.type === "tc:validator" && dec.validator === RequiredValidator

function transformTypeRef(type: Class | Class[] | undefined, ctx: TransformContext): SchemaObject {
    const getRef = refFactory(ctx.map)
    if (type === undefined) return { type: "string" }
    if (Array.isArray(type)) return {
        type: "array",
        items: { $ref: `#/components/schemas/${getRef(type[0])}` }
    }
    if (type === String) return { type: "string" }
    if (type === Number) return { type: "number" }
    if (type === Boolean) return { type: "boolean" }
    if (type === Date) return { type: "string", format: "date-time", }
    else
        return { type: "object", $ref: `#/components/schemas/${getRef(type)}` }
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
    return transformPropertiesToObject(meta.properties, ctx)
}

function transformPropertiesToObject(props: (PropertyReflection | ParameterReflection)[], ctx: TransformContext): SchemaObject {
    const types = Array.from(ctx.map.keys())
    const required = []
    const properties = {} as { [propertyName: string]: (SchemaObject | ReferenceObject); }
    for (const prop of props) {
        const isReq = !!prop.decorators.find(isRequired)
        if (isReq) required.push(prop.name)
        if (isCustomClass(prop.type) && !types.some(x => x === prop.type))
            properties[prop.name] = transformObject(prop.type, ctx)
        else
            properties[prop.name] = transformTypeRef(prop.type, ctx)
    }
    const result: SchemaObject = { type: "object", properties }
    if (required.length > 0) result.required = required
    return result
}

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

export { refFactory, transformTypeRef, TransformContext, isRequired, transformObject, transformPropertiesToObject }

