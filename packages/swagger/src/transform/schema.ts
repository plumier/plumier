import { Class, FormFile } from "@plumier/core"
import { ReferenceObject, SchemaObject } from "openapi3-ts"
import { ParameterReflection, PropertyReflection } from "tinspector"
import { isRequired, TransformContext, isEnums, isPartialValidator } from './shared'


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


function transformType(type: Class | Class[] | undefined, ctx: TransformContext, opt?: Partial<TransformTypeOption>): SchemaObject {
    const option: TransformTypeOption = { decorators: [], ...opt }
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
    else {
        const isPartial = !!opt?.decorators?.find(isPartialValidator) 
        const name = isPartial ? `${getRef(type)}-Partial` : getRef(type)
        return { type: "object", $ref: `#/components/schemas/${name}` }
    }
}


export { refFactory, transformType }

