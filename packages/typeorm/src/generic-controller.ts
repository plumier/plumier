import { Class, entity, GenericControllers, Repository } from "@plumier/core"
import {
    createGenericController,
    EntityWithRelation,
    GenericControllerConfiguration,
    NestedRepositoryFactory,
    RepoBaseControllerGeneric,
    RepoBaseNestedControllerGeneric,
} from "@plumier/generic-controller"
import reflect, { generic } from "@plumier/reflect"
import pluralize from "pluralize"

import { normalizeEntity } from "./helper"
import { TypeORMNestedRepository, TypeORMRepository } from "./repository"


// --------------------------------------------------------------------- //
// ------------------------ GENERIC CONTROLLERS ------------------------ //
// --------------------------------------------------------------------- //

@generic.parameter("T", "TID")
@generic.argument("T", "TID")
class TypeORMControllerGeneric<T = any, TID = any> extends RepoBaseControllerGeneric<T, TID>{
    constructor(fac?: ((x: Class<T>) => Repository<T>)) {
        super(fac ?? (x => new TypeORMRepository(x)))
    }
}

@generic.parameter("P", "T", "PID", "TID")
@generic.argument("P", "T", "PID", "TID")
class TypeORMNestedControllerGeneric<P = any, T = any, PID = any, TID = any> extends RepoBaseNestedControllerGeneric<P, T, PID, TID> {
    constructor(fac?: NestedRepositoryFactory<P, T>) {
        super(fac ?? (p => new TypeORMNestedRepository(p)))
    }
}

/**
 * Generic controller factory factory, used to create a generic controller factory with custom generic controller implementation
 * @param controllers Custom generic controller implementation
 * @returns generic controller
 */
function createGenericControllerTypeORM(controllers?: GenericControllers) {
    return <T>(type: Class | EntityWithRelation<T>, config?: GenericControllerConfiguration) =>
        createGenericController(type, {
            controllers: controllers ?? [TypeORMControllerGeneric, TypeORMNestedControllerGeneric],
            nameConversion: pluralize,
            config, normalize: type => {
                if (Array.isArray(type)) {
                    const [parentEntity, relation] = type
                    normalizeEntity(parentEntity)
                    const meta = reflect(parentEntity)
                    const prop = meta.properties.find(x => x.name === relation)!
                    const entity: Class = Array.isArray(prop.type) ? prop.type[0] : prop.type
                    normalizeEntity(entity)
                }
                else
                    normalizeEntity(type)
            }
        })
}

/**
 * Create a generic controller with CRUD functionality based on Entity
 * @param type entity used as the generic controller parameter
 * @param config configuration to authorize/enable/disable some actions
 */
function GenericController<T>(type: Class, config?: GenericControllerConfiguration): Class<TypeORMControllerGeneric<T>>
/**
 * Create a nested generic controller with CRUD functionality based on Entity's One-To-Many on Many-To-One relation property
 * @param relation Tuple of [Entity, relationName] used to specify entity relation as a reference of the nested generic controller
 * @param config configuration to authorize/enable/disable some actions
 */
function GenericController<T>(relation: EntityWithRelation<T>, config?: GenericControllerConfiguration): Class<TypeORMNestedControllerGeneric<T>>
function GenericController<T>(type: Class | EntityWithRelation<T>, config?: GenericControllerConfiguration) {
    const factory = createGenericControllerTypeORM()
    return factory(type, config)
}

export { TypeORMControllerGeneric, TypeORMNestedControllerGeneric, GenericController, createGenericControllerTypeORM, EntityWithRelation }