import { RelationDecorator, RelationPropertyDecorator } from "@plumier/core"
import reflect, { Class, generic, GenericTypeDecorator } from "@plumier/reflect"


// --------------------------------------------------------------------- //
// ----------------------- ENTITY RELATION HELPER ---------------------- //
// --------------------------------------------------------------------- //

const genericControllerRegistry = new Map<Class, boolean>()

function updateGenericControllerRegistry(cls: Class) {
    genericControllerRegistry.set(cls, true)
}

function getGenericControllerRelation(controller: Class) {
    const meta = reflect(controller)
    const types = generic.getGenericTypeParameters(controller)
    const parentEntityType = types[0]
    const entityType = types[1]
    const oneToMany = meta.decorators.find((x: RelationPropertyDecorator): x is RelationPropertyDecorator => x.kind === "plumier-meta:relation-prop-name")
    const relation = oneToMany!.name
    return { parentEntityType, entityType, relation, inverseProperty: oneToMany!.inverseProperty }
}

function getGenericControllerInverseProperty(controller: Class) {
    const rel = getGenericControllerRelation(controller)
    return rel.inverseProperty
}

function getGenericControllerOneToOneRelations(type: Class) {
    const meta = reflect(type)
    const result = []
    for (const prop of meta.properties) {
        if (prop.decorators.find((x: RelationDecorator) => x.kind === "plumier-meta:relation") && prop.typeClassification !== "Array") {
            result.push(prop)
        }
    }
    return result
}


export {
    getGenericControllerOneToOneRelations, getGenericControllerInverseProperty,
    getGenericControllerRelation, updateGenericControllerRegistry, genericControllerRegistry
}