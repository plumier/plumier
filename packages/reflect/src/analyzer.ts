import { generic } from "./decorators"
import { createClass, reflection } from "./helpers"
import { getMetadata, getMetadataForApplyTo, getOwnMetadata, mergeMetadata } from "./storage"
import {
    Class,
    DecoratorOption,
    DecoratorOptionId,
    DESIGN_PARAMETER_TYPE,
    DESIGN_RETURN_TYPE,
    DESIGN_TYPE,
    MethodReflection,
    ParameterPropertiesDecorator,
    ParameterPropertyReflection,
    ParameterReflection,
    PrivateDecorator,
    PropertyReflection,
    TypeDecorator,
} from "./types"
import { TypedReflection, WalkMemberContext } from "./walker"

// --------------------------------------------------------------------- //
// -------------------------- ADD DESIGN TYPE -------------------------- //
// --------------------------------------------------------------------- //

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

// --------------------------------------------------------------------- //
// --------------------------- ADD DECORATORS -------------------------- //
// --------------------------------------------------------------------- //

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

// --------------------------------------------------------------------- //
// ----------------------- ADD APPLY-TO DECORATOR ---------------------- //
// --------------------------------------------------------------------- //

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

// --------------------------------------------------------------------- //
// ------------------ ADD DATA TYPE BY TYPE DECORATOR ------------------ //
// --------------------------------------------------------------------- //

// check if a generic type @type("T")
function isGeneric(decorator: TypeDecorator) {
    const [singleType] = reflection.getTypeFromDecorator(decorator)
    return typeof singleType === "string"
}

// check if a dynamic type @type({ name: String, age: Number })
function isDynamic(decorator: TypeDecorator) {
    const [singleType] = reflection.getTypeFromDecorator(decorator)
    return typeof singleType === "object"
}

// check if a type with generic parameter @type(Type, "T", "U")
function isTypeWithGenericParameter(decorator: TypeDecorator) {
    const [singleType] = reflection.getTypeFromDecorator(decorator)
    return typeof singleType === "function" && decorator.genericParams.length > 0
}

function setType(meta: MethodReflection | PropertyReflection | ParameterReflection | ParameterPropertyReflection, type: Class | Class[]) {
    if (meta.kind === "Method")
        return { returnType: type }
    return { type }
}

export function addsTypeByTypeDecorator(meta: TypedReflection, ctx: WalkMemberContext): TypedReflection {
    if (meta.kind === "Constructor" || meta.kind === "Class") return meta
    const decorator = meta.decorators.find((x: TypeDecorator): x is TypeDecorator => x.kind === "Override")
    if (!decorator) return meta
    if (isGeneric(decorator)) {
        const type = generic.getType(decorator, ctx.target)!
        return { ...meta, ...setType(meta, type) }
    }
    if (isDynamic(decorator)) {
        const [rawType, isArray] = reflection.getTypeFromDecorator(decorator)
        const type = createClass(rawType as {})
        return { ...meta, ...setType(meta, isArray ? [type] : type as any) }
    }
    if (isTypeWithGenericParameter(decorator)) {
        const genericParams: any[] = decorator.genericParams.map(x => generic.getType({ type: x, target: decorator.target }, ctx.target))
        const [parentType, isArray] = reflection.getTypeFromDecorator(decorator)
        const dynType = createClass({}, { extends: parentType as any, genericParams })
        const type = isArray ? [dynType] : dynType
        return { ...meta, ...setType(meta, type) }
    }
    const [type, isArray] = reflection.getTypeFromDecorator(decorator)
    return { ...meta, ...setType(meta, isArray ? [type] : type as any) }
}

// --------------------------------------------------------------------- //
// ----------------------- ADD TYPE CLASSIFICATION --------------------- //
// --------------------------------------------------------------------- //

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

// --------------------------------------------------------------------- //
// ---------------------- ADD PARAMETER PROPERTIES --------------------- //
// --------------------------------------------------------------------- //

export function addsParameterProperties(meta: TypedReflection, ctx: WalkMemberContext): TypedReflection | undefined {
    if (reflection.isParameterProperties(meta) && ctx.parent.kind === "Class") {
        const isParamProp = ctx.parent.decorators.some((x: ParameterPropertiesDecorator) => x.type === "ParameterProperties")
        return !!isParamProp ? meta : undefined
    }
    return meta
}

// --------------------------------------------------------------------- //
// --------------------------- REMOVE IGNORE --------------------------- //
// --------------------------------------------------------------------- //

export function removeIgnored(meta: TypedReflection, ctx: WalkMemberContext): TypedReflection | undefined {
    if (meta.kind === "Property" || meta.kind === "Method") {
        const decorator = meta.decorators.find((x: PrivateDecorator): x is PrivateDecorator => x.kind === "Ignore")
        return !decorator ? meta : undefined
    }
    return meta
}
