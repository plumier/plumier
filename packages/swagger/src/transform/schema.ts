import { Class, FormFile } from "@plumier/core"
import { ReferenceObject, SchemaObject } from "openapi3-ts"
import { ParameterReflection, PropertyReflection } from "tinspector"
import { isRequired, TransformContext, isEnums } from './shared'

function refFactory(map: Map<Class, string>) {
    return (obj: Class, isPartial: boolean = false) => {
        const getName = (name?: string) => isPartial ? `~${name}` : name
        const objName = obj.name;
        const typeName = map.get(obj)
        const names = Array.from(map.values()).filter(x => x === objName)
        // if type is not exits and no other type with the same name
        if (!typeName && names.length === 0) {
            map.set(obj, objName)
            return getName(objName)
        }
        // if type is not exists but there is other type with the same name
        if (!typeName && names.length > 0) {
            const name = objName + names.length
            map.set(obj, name)
            return getName(name)
        }
        return getName(typeName)
    }
}

// --------------------------------------------------------------------- //
// --------------------------- TRANSFORM TYPE -------------------------- //
// --------------------------------------------------------------------- //


function transformTypeRef(type: Class | Class[] | undefined, ctx: TransformContext, option: TransformTypeOption): SchemaObject {
    const getRef = refFactory(ctx.map)
    if (type === undefined) return { type: "string" }
    if (Array.isArray(type)) return {
        type: "array",
        items: transformType(type[0], ctx, option)
    }
    if (type === String) {
        const enums = option.decorators.find(isEnums)
        if (enums) return { type: "string", enum: enums.enums }
        else return { type: "string" }
    }
    if (type === Number) return { type: "number" }
    if (type === Boolean) return { type: "boolean" }
    if (type === Date) return { type: "string", format: "date-time", }
    if (type === FormFile) return { type: "string", format: "binary" }
    else
        return { type: "object", $ref: `#/components/schemas/${getRef(type, option.isPartial)}` }
}

function transformProperties(props: (PropertyReflection | ParameterReflection)[], ctx: TransformContext, option: TransformTypeOption): SchemaObject {
    const required = []
    const properties = {} as { [propertyName: string]: (SchemaObject | ReferenceObject); }
    for (const prop of props) {
        const isReq = !!prop.decorators.find(isRequired)
        if (isReq) required.push(prop.name)
        properties[prop.name] = transformTypeRef(prop.type, ctx, { ...option, decorators: prop.decorators })
    }
    const result: SchemaObject = { type: "object", properties }
    if (required.length > 0) result.required = required
    return result
}

interface TransformTypeOption {
    decorators: any[],
    isPartial: boolean
}
function transformType(type: Class | Class[] | undefined | (PropertyReflection | ParameterReflection)[], ctx: TransformContext, opt?: Partial<TransformTypeOption>) {
    const option: TransformTypeOption = { decorators: [], isPartial: false, ...opt }
    const isProp = (type: any): type is (PropertyReflection | ParameterReflection)[] => Array.isArray(type) && !!type[0].kind
    if (isProp(type)) {
        return transformProperties(type, ctx, option)
    }
    else {
        return transformTypeRef(type, ctx, option)
    }
}

export { refFactory, transformType }

