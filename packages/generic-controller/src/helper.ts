import { RelationDecorator, RelationPropertyDecorator } from "@plumier/core"
import reflect, { Class, GenericTypeDecorator } from "@plumier/reflect"


// --------------------------------------------------------------------- //
// ----------------------- ENTITY RELATION HELPER ---------------------- //
// --------------------------------------------------------------------- //


function getGenericTypeParameters(controller: Class) {
    const meta = reflect(controller)
    const genericDecorator = meta.decorators
        .find((x: GenericTypeDecorator): x is GenericTypeDecorator => x.kind == "GenericType" && x.target === controller)
    return {
        types: genericDecorator!.types.map(x => x as Class),
        meta
    }
}

function getGenericControllerRelation(controller: Class) {
    const { types, meta } = getGenericTypeParameters(controller)
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
    getGenericControllerRelation, getGenericTypeParameters
}