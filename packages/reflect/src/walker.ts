import { extendsMetadata } from "./extends"
import { parseClass } from "./parser"
import {
    Class,
    ClassReflection,
    ConstructorReflection,
    MethodReflection,
    ParameterPropertyReflection,
    ParameterReflection,
    PropertyReflection,
    Reflection,
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

export { walkTypeMembersRecursive, walkReflectionMembers, WalkMemberVisitor, TypedReflection, WalkMemberContext }