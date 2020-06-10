import { Class, FormFile } from "@plumier/core"
import { ReferenceObject, SchemaObject } from "openapi3-ts"
import reflect, { ParameterReflection, PropertyReflection } from "tinspector"
import { isRequired, TransformContext, isEnums, isPartialValidator, isApiWriteOnly, isApiReadOnly } from './shared'


interface TransformTypeOption {
    decorators: any[],
}

function refFactory(map: Map<Class, string>) {
    return (obj: Class) => {
        const objName = obj.name;
        const typeName = map.get(obj)
        const names = Array.from(map.values()).filter(x => x === objName)
        // if type is not exits and no other type with the same name
        if (!typeName && names.length === 0) {
            map.set(obj, objName)
            return objName
        }
        // if type is not exists but there is other type with the same name
        if (!typeName && names.length > 0) {
            const name = objName + names.length
            map.set(obj, name)
            return name
        }
        return typeName
    }
}

// --------------------------------------------------------------------- //
// --------------------------- TRANSFORM TYPE -------------------------- //
// --------------------------------------------------------------------- //


function getRequiredProps(opt: (PropertyReflection | ParameterReflection)[] | Class) {
    const props = Array.isArray(opt) ? opt : reflect(opt).properties
    const required = []
    for (const prop of props) {
        const isReq = !!prop.decorators.find(isRequired)
        if (isReq) required.push(prop.name)
    }
    return required.length > 0 ? required : undefined
}

function transformType(type: Class | Class[] | undefined, ctx: TransformContext, opt?: Partial<TransformTypeOption>): SchemaObject {
    const option: TransformTypeOption = { decorators: [], ...opt }
    const getRef = refFactory(ctx.map)
    const writeOnly = !!opt?.decorators?.find(isApiWriteOnly) ? true : undefined
    const readOnly = !!opt?.decorators?.find(isApiReadOnly) ? true : undefined
    const base = { readOnly, writeOnly }
    if (type === undefined) return { ...base, type: "string", }
    if (type === String) {
        const enums = option.decorators.find(isEnums)
        if (enums) return { ...base, type: "string", enum: enums.enums }
        else return { ...base, type: "string" }
    }
    if (type === Number) return { ...base, type: "number" }
    if (type === Boolean) return { ...base, type: "boolean" }
    if (type === Date) return { ...base, type: "string", format: "date-time" }
    if (type === FormFile) return { ...base, type: "string", format: "binary" }
    if (Array.isArray(type)) return {
        ...base,
        type: "array",
        items: transformType(type[0], ctx, option)
    }
    else {
        const schema = { $ref: `#/components/schemas/${getRef(type)}` }
        const required = !opt?.decorators?.find(isPartialValidator) ? getRequiredProps(type) : undefined
        if (writeOnly || readOnly || required)
            return { allOf: [schema, { ...base, type: "object", required }] }
        return schema
    }
}

export { refFactory, transformType, getRequiredProps, TransformTypeOption }

