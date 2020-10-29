import { AuthorizeDecorator, Class, entityHelper, FormFile, RelationDecorator, getGenericControllerRelation } from "@plumier/core"
import { ReferenceObject, SchemaObject } from "openapi3-ts"
import reflect, { ParameterReflection, PropertyReflection } from "tinspector"
import { isRequired, TransformContext, isEnums, isPartialValidator, isApiWriteOnly, isApiReadOnly, BaseTransformContext, isGenericId, isRelation } from './shared'
import { ObjectSchema, options } from '@hapi/joi'

type SchemaOverrideType = "RelationAsId" | "Required" | "Filter" | "RemoveArrayRelation" | "RemoveChildRelations" | "RemoveReverseRelation"
type SchemaOverride = (modelType: (Class | Class[]), ctx: TransformContext) => SchemaObject | undefined
interface TransformTypeOption {
    decorators?: any[],
    overrides?: SchemaOverrideType[]
}

function refFactory(map: Map<Class, string>) {
    return (obj: Class) => {
        const objName = obj.name;
        const typeName = map.get(obj)
        const names = Array.from(map.values()).filter(x => x.match(`^${objName}\\d*$`))
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
// ------------------------------- HELPER ------------------------------ //
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

function addSchema(target: SchemaObject | ReferenceObject, schema: SchemaObject): SchemaObject {
    if ("type" in target && target.type === "array")
        return { ...target, items: addSchema(target.items!, schema) }
    if ("allOf" in target && target.allOf)
        return { allOf: [...target.allOf, schema] }
    else
        return { allOf: [target, schema] }
}

// --------------------------------------------------------------------- //
// -------------------------- SCHEMA OVERRIDES ------------------------- //
// --------------------------------------------------------------------- //


function getMetadata(modelType: (Class | Class[])) {
    const type = Array.isArray(modelType) ? modelType[0] : modelType
    return reflect(type)
}

function getReverseRelation(ctl: Class) {
    const rel = getGenericControllerRelation(ctl)
    const meta = reflect(rel.entityType)
    for (const prop of meta.properties) {
        if (prop.type === rel.parentEntityType)
            return prop.name
    }
}

function readOnly(type: Class | Class[], ctx: TransformContext) {
    const propType = transformType(type, ctx)
    return { ...propType, readOnly: true }
}

// add schema override to inform user that the relation can be filled with 
function addRelationAsIdOverride(modelType: (Class | Class[]), ctx: TransformContext) {
    const meta = getMetadata(modelType)
    const result: SchemaObject = { type: "object", properties: {} }
    for (const property of meta.properties) {
        const relation = property.decorators.find((x: RelationDecorator): x is RelationDecorator => x.kind === "plumier-meta:relation")
        if (relation) {
            const isArray = property.typeClassification === "Array"
            const propType = isArray ? property.type[0] : property.type
            const idType = entityHelper.getIdType(propType)
            result.properties![property.name] = transformType(isArray ? [idType] : idType, ctx)
        }
    }
    return Object.keys(result.properties!).length === 0 ? undefined : result
}

function addRequiredOverride(modelType: (Class | Class[]), ctx: TransformContext) {
    const meta = getMetadata(modelType)
    const result: SchemaObject = { type: "object", required: [] }
    for (const property of meta.properties) {
        const isReq = !!property.decorators.find(isRequired)
        if (isReq)
            result.required!.push(property.name)
    }
    return result.required!.length === 0 ? undefined : result
}

function addFilterOverride(modelType: (Class | Class[]), ctx: TransformContext) {
    const meta = getMetadata(modelType)
    const result: SchemaObject = { type: "object", properties: {} }
    for (const property of meta.properties) {
        const isFilter = !!property.decorators.find((x: AuthorizeDecorator) => x.type === "plumier-meta:authorize" && x.access === "filter")
        if (!isFilter) {
            result.properties![property.name] = readOnly(property.type, ctx)
        }
    }
    return Object.keys(result.properties!).length === 0 ? undefined : result
}

function removeArrayRelationsOverride(modelType: (Class | Class[]), ctx: TransformContext) {
    const meta = getMetadata(modelType)
    const result: SchemaObject = { type: "object", properties: {} }
    for (const property of meta.properties) {
        const relation = property.decorators.find(isRelation)
        if (relation && Array.isArray(property.type)) {
            result.properties![property.name] = readOnly(property.type, ctx)
        }
    }
    return Object.keys(result.properties!).length === 0 ? undefined : result
}

function removeReverseRelationsOverride(modelType: (Class | Class[]), ctx: TransformContext) {
    const meta = getMetadata(modelType)
    const result: SchemaObject = { type: "object", properties: {} }
    const reverse = getReverseRelation(ctx.route.controller.type)
    if (!reverse) return
    for (const property of meta.properties) {
        if (property.name === reverse) {
            result.properties![property.name] = readOnly(property.type, ctx)
        }
    }
    return Object.keys(result.properties!).length === 0 ? undefined : result
}

function removeChildRelationsOverride(modelType: (Class | Class[]), ctx: TransformContext) {
    const meta = getMetadata(modelType)
    const result: SchemaObject = { type: "object", properties: {} }
    for (const property of meta.properties) {
        const relation = property.decorators.find(isRelation)
        if (relation) {
            const childMeta = reflect(property.type as Class)
            for (const prop of childMeta.properties) {
                const relation = property.decorators.find(isRelation)
                if (relation) {
                    const schema = transformType(prop.type, ctx)
                    result.properties![property.name] = addSchema(schema, readOnly(prop.type, ctx))
                }
            }
        }
    }
    return Object.keys(result.properties!).length === 0 ? undefined : result
}


// --------------------------------------------------------------------- //
// --------------------------- MAIN FUNCTION --------------------------- //
// --------------------------------------------------------------------- //

function transformType(type: Class | Class[] | undefined, ctx: BaseTransformContext, opt?: Partial<TransformTypeOption>): SchemaObject {
    const option: TransformTypeOption = { decorators: [], ...opt }
    const getRef = refFactory(ctx.map)
    const writeOnly = !!opt?.decorators?.find(isApiWriteOnly) ? true : undefined
    const readOnly = !!opt?.decorators?.find(isApiReadOnly) ? true : undefined
    const base = { readOnly, writeOnly }
    if (type === undefined) return { ...base, type: "string", }
    if (type === String) {
        const enums = (option.decorators ?? []).find(isEnums)
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


function transformTypeAdvance(type: Class | Class[] | undefined, ctx: TransformContext, opt?: Partial<TransformTypeOption>): SchemaObject {
    const extensions = new Map(<([SchemaOverrideType, SchemaOverride])[]>[
        ["RelationAsId", addRelationAsIdOverride],
        ["Required", addRequiredOverride],
        ["Filter", addFilterOverride],
        ["RemoveArrayRelation", removeArrayRelationsOverride],
        ["RemoveChildRelations", removeChildRelationsOverride],
        ["RemoveReverseRelation", removeReverseRelationsOverride],
    ])
    const rootSchema = transformType(type, ctx, opt)
    if (!type) return rootSchema
    if (!opt?.overrides) return rootSchema
    return opt.overrides.reduce((x, ovr) => {
        const ext = extensions.get(ovr)!
        const extResult = ext(type, ctx)
        return extResult ? addSchema(x, extResult) : x
    }, rootSchema)
}


export { refFactory, transformType, transformTypeAdvance, getRequiredProps, TransformTypeOption }

