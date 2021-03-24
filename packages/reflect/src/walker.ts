import { extendsMetadata } from "./extends"
import { createClass, CustomTypeDefinition, reflection } from "./helpers"
import { getMetadata, getMetadataForApplyTo, getOwnMetadata, mergeMetadata } from "./metadata"
import { parseClass } from "./parser"
import {
    Class,
    ClassReflection,
    ConstructorReflection,
    DecoratorOption,
    DecoratorOptionId,
    DESIGN_PARAMETER_TYPE,
    DESIGN_RETURN_TYPE,
    DESIGN_TYPE,
    GenericTemplateDecorator,
    GenericTypeDecorator,
    MethodReflection,
    ParameterPropertiesDecorator,
    ParameterPropertyReflection,
    ParameterReflection,
    PrivateDecorator,
    PropertyReflection,
    Reflection,
    TypeDecorator,
    TypeOverride,
} from "./types"

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

type TypedReflection = ClassReflection | MethodReflection | PropertyReflection | ParameterReflection | ConstructorReflection | ParameterPropertyReflection
type WalkMemberVisitor = (value: TypedReflection, ctx: WalkMemberContext) => TypedReflection | undefined

interface WalkMemberContext {
    target: Class
    classPath: Class[]
    parent: Reflection
    memberVisitor: WalkMemberVisitor
}

interface WalkParentContext {
    target: Class
    memberVisitor: WalkMemberVisitor
    classPath: Class[]
}

// --------------------------------------------------------------------- //
// -------------------------- VISITOR HELPERS -------------------------- //
// --------------------------------------------------------------------- //

function getTypeOverrideFromDecorator(decorators: any[]) {
    const getType = (type: string | Class | CustomTypeDefinition) => typeof type === "object" ? createClass({ definition: type }) : type
    const override = decorators.find((x: TypeDecorator): x is TypeDecorator => x.kind === "Override")
    if (!override) return
    // extract type from the callback
    const rawType = reflection.isCallback(override.type) ? override.type({}) : override.type
    return { type: Array.isArray(rawType) ? [getType(rawType[0])] : getType(rawType), genericParams: override.genericParams }
}

class GenericMap {
    private maps: Map<string, TypeOverride>[] = []
    constructor(types: Class[]) {
        this.maps = this.createMaps(types)
    }
    private createMaps(types: Class[]) {
        const result = []
        for (const type of types) {
            const parent: Class = Object.getPrototypeOf(type)
            const parentTemplates = this.getTemplates(parent)!
            const parentTypes = this.getTypes(parent)
            // if parent have types but not template then the generic is stop, continue
            if (parentTypes && !parentTemplates) continue
            // if (!parentTemplates)
            //     throw new Error(`Configuration Error: ${parent.name} uses string template type @reflect.type(<string>) but doesn't specify @generic.template()`)
            const types = this.getTypes(type)
            if (!types) throw new Error(`Configuration Error: ${type.name} inherit from generic class but doesn't use @generic.type()`)
            if (parentTemplates.length !== types.length) throw new Error(`Configuration Error: Number of parameters mismatch between @generic.template() on ${parent.name} and @generic.type() on ${type.name}`)
            result.unshift(new Map(parentTemplates.map((x, i) => ([x, types[i]]))))
        }
        return result
    }
    private getTemplates(target: Class) {
        const decorator = getMetadata(target)
            .find((x: GenericTemplateDecorator): x is GenericTemplateDecorator => x.kind === "GenericTemplate")
        return decorator?.templates
    }
    private getTypes(target: Class) {
        const decorator = getMetadata(target)
            .find((x: GenericTypeDecorator): x is GenericTypeDecorator => x.kind === "GenericType")
        return decorator?.types
    }
    get(rawType: string | string[]) {
        const isArray = Array.isArray(rawType)
        const type = isArray ? rawType[0] : rawType
        const result = this.maps.reduce((val, map) => {
            // keep looking at the real type
            // if it is string then it still a generic type template
            return typeof val === "string" ? map.get(val)! : val
        }, type as TypeOverride) as Class
        return isArray ? [result] : result
    }
}

// --------------------------------------------------------------------- //
// ------------------------- PURIFIER VISITORS ------------------------- //
// --------------------------------------------------------------------- //

namespace memberVisitors {
    export function addsDesignTypes(meta: TypedReflection, ctx: WalkMemberContext): TypedReflection {
        const getType = (type: any, i: number) => type[i] === Array ? [Object] : type[i]
        if (meta.kind === "Method") {
            const returnType: any = Reflect.getOwnMetadata(DESIGN_RETURN_TYPE, ctx.target.prototype, meta.name)
            return { ...meta, returnType }
        }
        else if (reflection.isParameterProperties(meta)) {
            const parTypes: any[] = Reflect.getOwnMetadata(DESIGN_PARAMETER_TYPE, ctx.target) || []
            return { ...meta, type: getType(parTypes, meta.index) }
        }
        else if (meta.kind === "Property") {
            const type: any = Reflect.getOwnMetadata(DESIGN_TYPE, ctx.target.prototype, meta.name)
            return { ...meta, type }
        }
        else if (meta.kind === "Parameter" && ctx.parent.kind === "Constructor") {
            const parTypes: any[] = Reflect.getOwnMetadata(DESIGN_PARAMETER_TYPE, ctx.target) || []
            return { ...meta, type: getType(parTypes, meta.index) }
        }
        else if (meta.kind === "Parameter" && ctx.parent.kind === "Method") {
            const parTypes: any[] = Reflect.getOwnMetadata(DESIGN_PARAMETER_TYPE, ctx.target.prototype, ctx.parent.name) || []
            return { ...meta, type: getType(parTypes, meta.index) }
        }
        else
            return meta
    }

    export function addsDecorators(meta: TypedReflection, ctx: WalkMemberContext): TypedReflection {
        if (meta.kind === "Parameter") {
            // constructor metadata are not inheritable
            const decorators = ctx.parent.name === "constructor"
                ? getOwnMetadata(ctx.target, ctx.parent.name, meta.index)
                : getMetadata(ctx.target, ctx.parent.name, meta.index)
            return { ...meta, decorators: meta.decorators.concat(decorators) }
        }
        if (reflection.isParameterProperties(meta)) {
            // get copy own metadata of constructor 
            const decorators = getOwnMetadata(ctx.target, "constructor", meta.index)
                // and also a copy of metadata of the property (using applyTo)
                .concat(...getMetadata(ctx.target, meta.name))
            return { ...meta, decorators: meta.decorators.concat(decorators) }
        }
        if (meta.kind === "Method" || meta.kind === "Property") {
            const decorators = getMetadata(ctx.target, meta.name)
            return { ...meta, decorators: meta.decorators.concat(decorators) }
        }
        if (meta.kind === "Class") {
            const decorators = getMetadata(meta.type)
            return { ...meta, decorators: meta.decorators.concat(decorators) }
        }
        return meta
    }

    export function addsApplyToDecorator(meta: TypedReflection, ctx: WalkMemberContext) {
        if (reflection.isParameterProperties(meta)) {
            // get copy own metadata of constructor 
            const decorators = getMetadataForApplyTo(ctx.target, "constructor", meta.index)
                // and also a copy of metadata of the property (using applyTo)
                .concat(...getMetadataForApplyTo(ctx.target, meta.name))
            return { ...meta, decorators: meta.decorators.concat(decorators) }
        }
        if (meta.kind === "Method" || meta.kind === "Property") {
            const decorators = getMetadataForApplyTo(ctx.target, meta.name)
            return { ...meta, decorators: mergeMetadata(decorators, meta.decorators, false) }
        }
        if (meta.kind === "Class") {
            const rawDecorators = getMetadataForApplyTo(meta.type)
            const removedDecorators = rawDecorators.filter(x => {
                const option: Required<DecoratorOption> = x[DecoratorOptionId]
                return option.removeApplied
            })
            const decorators = rawDecorators.filter(x => {
                const option: Required<DecoratorOption> = x[DecoratorOptionId]
                return !option.removeApplied
            })
            const result = { ...meta, decorators: meta.decorators.concat(decorators) }
            if (removedDecorators.length > 0)
                result.removedDecorators = removedDecorators
            return result
        }
        return meta
    }

    export function removeGenericTypeOverridden(meta: TypedReflection, ctx: WalkMemberContext): TypedReflection {
        const isGeneric = (decorator: any): decorator is { type: TypeOverride[], genericParams: (string | string[])[] } => {
            const singleType = Array.isArray(decorator.type) ? decorator.type[0] : decorator.type
            return typeof singleType === "string" || decorator.genericParams.length > 0
        }
        if (meta.kind === "Constructor") return meta
        const decorators = meta.decorators.filter((x: TypeDecorator) => x.kind !== "Override" || !isGeneric(x))
        return { ...meta, decorators }
    }

    export function addsTypeOverridden(meta: TypedReflection, ctx: WalkMemberContext): TypedReflection {
        if (meta.kind === "Constructor" || meta.kind === "Class") return meta
        const overridden = getTypeOverrideFromDecorator(meta.decorators)
        if (!overridden) return meta
        // if class doesn't have generic template and doesn't have generic type then generic inheritance already stop
        const targetMeta = getMetadata(ctx.target)
        const hasTemplate = targetMeta.some((x: GenericTemplateDecorator) => x.kind === "GenericTemplate")
        const hasType = targetMeta.some((x: GenericTypeDecorator) => x.kind === "GenericType")
        const type = Array.isArray(overridden.type) ? overridden.type[0] : overridden.type
        if (typeof type === "string" && !hasTemplate && !hasType) return meta
        if (meta.kind === "Method")
            return { ...meta, returnType: overridden.type }
        return { ...meta, type: overridden.type }
    }

    export function addsGenericOverridden(meta: TypedReflection, ctx: WalkMemberContext): TypedReflection {
        const isGeneric = (decorator: any): decorator is { type: TypeOverride[], genericParams: (string | string[])[] } => {
            const singleType = Array.isArray(decorator.type) ? decorator.type[0] : decorator.type
            return typeof singleType === "string" || decorator.genericParams.length > 0
        }
        const isString = (decorator: any): decorator is { type: (string | string[])[], genericParams: (string | string[])[] } => {
            const singleType = Array.isArray(decorator.type) ? decorator.type[0] : decorator.type
            return typeof singleType === "string"
        }
        const getGenericType = (map: GenericMap, decorator: any) => {
            const converted = []
            for (const param of decorator.genericParams) {
                converted.push(map.get(param))
            }
            return createClass({ parent: decorator.type as Class, genericParams: converted })
        }
        if (meta.kind === "Constructor" || meta.kind === "Class") return meta
        // if class doesn't have generic template and doesn't have generic type then generic inheritance already stop
        const targetMeta = getMetadata(ctx.target)
        const hasTemplate = targetMeta.some((x: GenericTemplateDecorator) => x.kind === "GenericTemplate")
        const hasType = targetMeta.some((x: GenericTypeDecorator) => x.kind === "GenericType")
        if(!hasTemplate && !hasType) return meta
        const decorator = getTypeOverrideFromDecorator(meta.decorators)
        if (!decorator || !decorator.type || !isGeneric(decorator)) return meta
        const map = new GenericMap(ctx.classPath)
        const type = isString(decorator) ? map.get(decorator.type as any) : getGenericType(map, decorator)

        // if current class has @generic.template() then process
        if (meta.kind === "Method") {
            // if type is not a generic template type then return immediately
            return { ...meta, returnType: type }
        }
        return { ...meta, type }
    }

    export function addsTypeClassification(meta: TypedReflection, ctx: WalkMemberContext): TypedReflection | undefined {
        const get = (type: any): "Class" | "Array" | "Primitive" | undefined => {
            if (type === undefined) return undefined
            else if (Array.isArray(type)) return "Array"
            else if (reflection.isCustomClass(type)) return "Class"
            else return "Primitive"
        }
        if (meta.kind === "Method")
            return { ...meta, typeClassification: get(meta.returnType) }
        else if (meta.kind === "Property" || meta.kind === "Parameter")
            return { ...meta, typeClassification: get(meta.type) }
        else if (meta.kind === "Class")
            return { ...meta, typeClassification: "Class" }
        return meta
    }

    export function addsParameterProperties(meta: TypedReflection, ctx: WalkMemberContext): TypedReflection | undefined {
        if (reflection.isParameterProperties(meta) && ctx.parent.kind === "Class") {
            const isParamProp = ctx.parent.decorators.some((x: ParameterPropertiesDecorator) => x.type === "ParameterProperties")
            return !!isParamProp ? meta : undefined
        }
        return meta
    }

    export function removeIgnored(meta: TypedReflection, ctx: WalkMemberContext): TypedReflection | undefined {
        if (meta.kind === "Property" || meta.kind === "Method") {
            const decorator = meta.decorators.find((x: PrivateDecorator): x is PrivateDecorator => x.kind === "Ignore")
            return !decorator ? meta : undefined
        }
        return meta
    }
}

// --------------------------------------------------------------------- //
// ------------------------------ WALKERS ------------------------------ //
// --------------------------------------------------------------------- //


/**
 * Walk into type member metadata (properties, parameters, methods, ctor etc)
 * @param ref type metadata
 * @param ctx traversal context
 */
function walkReflectionMembers(ref: TypedReflection, ctx: WalkMemberContext) {
    // apply visitor for each metadata traversed
    const result = ctx.memberVisitor(ref, ctx)
    for (const key in result) {
        // walk into type metadata members specified
        if (["parameters", "properties", "methods", "ctor"].some(x => x === key)) {
            const item: TypedReflection | TypedReflection[] = (result as any)[key]
            if (Array.isArray(item)) {
                const node = item.map((x, i) => walkReflectionMembers(x, { ...ctx, parent: result }));
                (result as any)[key] = node.filter(x => !!x)
            }
            else {
                const node = walkReflectionMembers(item, { ...ctx, parent: item });
                (result as any)[key] = node
            }
        }
    }
    return result as ClassReflection
}

function walkTypeMembers(type: Class, memberVisitor: WalkMemberVisitor, classPath: Class[]) {
    const rawMeta = parseClass(type)
    return walkReflectionMembers(rawMeta, { memberVisitor, parent: rawMeta, target: type, classPath })
}

/**
 * Walk into type super class. 
 * @param type type to reflect
 */
function walkTypeMembersRecursive(type: Class, ctx: WalkParentContext): ClassReflection {
    const defaultRef: ClassReflection = {
        super: Object,
        kind: "Class", type: Object, name: "Object",
        ctor: {} as ConstructorReflection,
        methods: [], properties: [], decorators: []
    }
    const parent: Class = Object.getPrototypeOf(type)
    // walk the super class member first
    const parentMeta = !!parent.prototype ?
        walkTypeMembersRecursive(parent, { ...ctx, classPath: ctx.classPath.concat(type) }) : defaultRef
    // then walk the current type members
    const childMeta = walkTypeMembers(type, ctx.memberVisitor, ctx.classPath)
    // merge current type and super class members
    return extendsMetadata(childMeta, parentMeta)
}

export { walkTypeMembersRecursive, walkReflectionMembers, memberVisitors, WalkMemberVisitor, GenericMap }