import { ClassReflection, MethodReflection, ParameterReflection, PropertyReflection } from "./types"

type MemberReflection = PropertyReflection | MethodReflection

function mergeMembers<T extends MemberReflection>(children: T[], parents: T[]): T[] {
    const result = [...children]
    for (const parent of parents) {
        if (!!result.find(x => x.name === parent.name)) continue
        result.push(parent)
    }
    return result
}

function extendsMetadata(child: ClassReflection, parent: ClassReflection): ClassReflection {
    return {
        ...child,
        methods: mergeMembers(child.methods, parent.methods),
        properties: mergeMembers(child.properties, parent.properties)
    }
}

export { extendsMetadata }