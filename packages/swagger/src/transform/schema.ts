import {
    AuthorizeDecorator,
    Class,
    entityHelper,
    FormFile,
    RelationDecorator,
    NestedGenericControllerDecorator,
} from "@plumier/core"
import reflect, { IsDynamicType } from "@plumier/reflect"
import { ReferenceObject, SchemaObject } from "openapi3-ts"

import {
    BaseTransformContext,
    isApiReadOnly,
    isApiWriteOnly,
    isEnums,
    isRelation,
    isRequired,
    TransformContext,
} from "./shared"

type SchemaOverrideType = "RelationAsId" | "Required" | "Filter" | "RemoveArrayRelation" |
    "RemoveChildRelations" | "RemoveInverseProperty" | "ReadonlyFields" | "WriteonlyFields"
type SchemaOverride = (modelType: (Class | Class[]), ctx: TransformContext) => SchemaObject | undefined
interface TransformTypeOption {
    decorators?: any[],
    overrides?: SchemaOverrideType[]
}

class ClassNameStorage {
    constructor(private map: Map<Class, string>) { }

    getTypeByStructure(type: Class) {
        const getTypeName = (type: any) => Array.isArray(type) ? type[0].name : type.name
        const getProperties = (source: Class) => {
            const meta = reflect(source)
            return meta.properties.map(x => `${x.name}:${getTypeName(x.type)}`).sort().join("|")
        }
        const similar = Array.from(this.map.keys()).find(x => getProperties(x) === getProperties(type))
        return similar ?? type
    }

    getSimilarity(type: Class) {
        const name = type.name
        return Array.from(this.map.values()).filter(x => x.match(`^${name}\\d*$`)).length
    }

    get(type: Class): string {
        // if the class is a DynamicType then find the saved type with the same properties
        const obj = (type as any)[IsDynamicType] ? this.getTypeByStructure(type) : type
        const name = this.map.get(obj)
        if (!name) {
            const similar = this.getSimilarity(obj)
            if (similar === 0) {
                this.map.set(obj, obj.name)
                return obj.name
            }
            else {
                const newName = obj.name + similar
                this.map.set(obj, newName)
                return newName
            }
        }
        return name
    }
}

function refFactory(map: Map<Class, string>) {
    const storage = new ClassNameStorage(map)
    return (obj: Class) => {
        return storage.get(obj)
    }
}

// --------------------------------------------------------------------- //
// ------------------------------- HELPER ------------------------------ //
// --------------------------------------------------------------------- //

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

// add schema override to inform user that the relation can be filled with ID
function addRelationAsIdOverride(modelType: (Class | Class[]), ctx: TransformContext) {
    const meta = getMetadata(modelType)
    const result: SchemaObject = { type: "object", properties: {} }
    for (const property of meta.properties) {
        const relation = property.decorators.find((x: RelationDecorator): x is RelationDecorator => x.kind === "plumier-meta:relation")
        if (relation) {
            const isArray = property.typeClassification === "Array"
            const propType = isArray ? property.type[0] : property.type
            const idType = entityHelper.getIdType(propType)!
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

function removeArrayRelationsOverride(modelType: (Class | Class[]), ctx: TransformContext) {
    const meta = getMetadata(modelType)
    const result: SchemaObject = { type: "object", properties: {} }
    for (const property of meta.properties) {
        const relation = property.decorators.find(isRelation)
        if (relation && Array.isArray(property.type)) {
            result.properties![property.name] = { readOnly: true, writeOnly: true }
        }
    }
    return Object.keys(result.properties!).length === 0 ? undefined : result
}

function removeInversePropertyOverride(modelType: (Class | Class[]), ctx: TransformContext) {
    const meta = getMetadata(modelType)
    const result: SchemaObject = { type: "object", properties: {} }
    const reverseDec = ctx.route.controller.decorators.find((x: NestedGenericControllerDecorator): x is NestedGenericControllerDecorator => x.kind === "plumier-meta:relation-prop-name")
    if (!reverseDec) return
    const info = entityHelper.getRelationInfo([reverseDec.type, reverseDec.relation])
    for (const property of meta.properties) {
        if (property.name === info.childProperty) {
            result.properties![property.name] = { readOnly: true, writeOnly: true }
        }
    }
    return Object.keys(result.properties!).length === 0 ? undefined : result
}

function removeChildRelationsOverride(modelType: (Class | Class[]), ctx: TransformContext) {
    const meta = getMetadata(modelType)
    const result: SchemaObject = { type: "object", properties: {} }
    for (const property of meta.properties) {
        const relation = property.decorators.find(isRelation)
        if (relation && property.typeClassification === "Class") {
            const childMeta = getMetadata(property.type as Class)
            const childSchema: SchemaObject = { type: "object", properties: {} }
            for (const prop of childMeta.properties) {
                const relation = prop.decorators.find(isRelation)
                if (relation) {
                    childSchema.properties![prop.name] = { readOnly: true, writeOnly: true }
                }
            }
            result.properties![property.name] = addSchema(transformType(property.type, ctx), childSchema)
        }
    }
    return Object.keys(result.properties!).length === 0 ? undefined : result
}

function addReadonlyFieldOverride(modelType: (Class | Class[]), ctx: TransformContext) {
    const meta = getMetadata(modelType)
    const result: SchemaObject = { type: "object", properties: {} }
    for (const property of meta.properties) {
        const readonly = property.decorators.find(isApiReadOnly)
        if (readonly) {
            result.properties![property.name] = { readOnly: true }
        }
    }
    return Object.keys(result.properties!).length === 0 ? undefined : result
}

function addWriteonlyFieldOverride(modelType: (Class | Class[]), ctx: TransformContext) {
    const meta = getMetadata(modelType)
    const result: SchemaObject = { type: "object", properties: {} }
    for (const property of meta.properties) {
        const writeonly = property.decorators.find(isApiWriteOnly)
        if (writeonly) {
            result.properties![property.name] = { writeOnly: true }
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
    const base: SchemaObject = {}
    if (!!opt?.decorators?.find(isApiWriteOnly))
        base.writeOnly = true
    if (!!opt?.decorators?.find(isApiReadOnly))
        base.readOnly = true
    if (type === undefined) return { ...base, type: "string", }
    if (type === String) {
        const enums = option.decorators!.find(isEnums)
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
        return { $ref: `#/components/schemas/${getRef(type)}` }
    }
}


function transformTypeAdvance(type: Class | Class[] | undefined, ctx: TransformContext, opt: Partial<TransformTypeOption>): SchemaObject {
    const extensions = new Map(<([SchemaOverrideType, SchemaOverride])[]>[
        // transform relation data type as primitive type
        ["RelationAsId", addRelationAsIdOverride],
        // add required annotation
        ["Required", addRequiredOverride],
        // remove array relations
        ["RemoveArrayRelation", removeArrayRelationsOverride],
        // remove deep nested child relation
        ["RemoveChildRelations", removeChildRelationsOverride],
        // remove inverse property
        ["RemoveInverseProperty", removeInversePropertyOverride],
        // apply all readonly fields
        ["ReadonlyFields", addReadonlyFieldOverride],
        // apply all writeonly fields
        ["WriteonlyFields", addWriteonlyFieldOverride],
    ])
    const rootSchema = transformType(type, ctx, opt)
    if (!type) return rootSchema
    if (!opt.overrides) return rootSchema
    return opt.overrides.reduce((x, ovr) => {
        const ext = extensions.get(ovr)!
        const extResult = ext(type, ctx)
        return extResult ? addSchema(x, extResult) : x
    }, rootSchema)
}


export { refFactory, transformType, transformTypeAdvance, TransformTypeOption, SchemaOverrideType }

