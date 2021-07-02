import {
    api,
    Class,
    ControllerGeneric,
    entityHelper,
    entityProvider,
    errorMessage,
    GenericControllers,
    KeyOf,
    NestedControllerGeneric,
    RelationDecorator,
    NestedGenericControllerDecorator,
    ApiTagDecorator,
    EntityRelationInfo,
} from "@plumier/core"
import reflect, { decorateClass, generic } from "@plumier/reflect"
import { Key, pathToRegexp } from "path-to-regexp"

import {
    authorizeActions,
    ControllerBuilder,
    createRouteDecorators,
    decorateCustomQuery,
    decorateTagByClass,
    decorateTagByRelation,
    decorateTransformers,
    GenericControllerConfiguration,
    ignoreActions,
} from "./configuration"


// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

type EntityWithRelation<T = any, R = any> = [Class<T>, KeyOf<T>, Class<R>?]

interface CreateGenericControllerOption {
    config?: GenericControllerConfiguration,
    controllers: GenericControllers
    normalize: (entities: Class | EntityWithRelation) => void
    nameConversion: (x: string) => string
}

// --------------------------------------------------------------------- //
// ------------------------------- HELPER ------------------------------ //
// --------------------------------------------------------------------- //

function validatePath(path: string, entity: Class, oneToMany = false) {
    if (!path.match(/\/:\w*$/))
        throw new Error(errorMessage.CustomRouteEndWithParameter.format(path, entity.name))
    const keys: Key[] = []
    pathToRegexp(path, keys)
    if (!oneToMany && keys.length > 1)
        throw new Error(errorMessage.CustomRouteMustHaveOneParameter.format(path, entity.name))
    if (oneToMany && (keys.length != 2))
        throw new Error(errorMessage.CustomRouteRequiredTwoParameters.format(path, entity.name))
    return oneToMany ? { pid: keys[0].name.toString(), id: keys[1].name.toString() } : { pid: "", id: keys[0].name.toString() }
}

function getIdType(entity: Class) {
    const idType = entityHelper.getIdType(entity)
    if (!idType)
        throw new Error(errorMessage.EntityRequireID.format(entity.name))
    return idType
}

interface ControllerFactoryOption {
    builder: ControllerBuilder
    controller: Class<ControllerGeneric>
    nameConversion: (x: string) => string
    skipTag: boolean
}

function createGenericControllerType(entity: Class, opt: ControllerFactoryOption) {
    const config = opt.builder.toObject()
    // get type of ID column on entity
    const idType = getIdType(entity)
    // create controller type dynamically 
    const Controller = generic.create({ extends: opt.controller, name: opt.controller.name }, entity, idType)
    let path = config.path ?? `${opt.nameConversion(entity.name)}/:id`
    const map = validatePath(path, entity)
    Reflect.decorate([
        entityProvider(entity, "id", { applyTo: ["get", "modify", "replace", "delete"] }),
        ignoreActions(config),
        ...createRouteDecorators(path, map),
        ...authorizeActions(config),
        ...decorateTransformers(config),
        ...decorateCustomQuery(config),
    ], Controller)
    if (!opt.skipTag) {
        Reflect.decorate([
            ...decorateTagByClass(entity, opt.nameConversion),
        ], Controller)
    }
    return Controller
}

function createNestedGenericControllerType(type: EntityWithRelation, opt: ControllerFactoryOption) {
    const info = entityHelper.getRelationInfo(type)
    const config = opt.builder.toObject()
    const parentIdType = getIdType(info.parent)
    const idType = getIdType(info.child)
    const Controller = generic.create({ extends: opt.controller, name: opt.controller.name }, info.parent, info.child, parentIdType, idType)
    // add root decorator
    const childPath = info.type === "OneToMany" ? info.parentProperty! : opt.nameConversion(info.child.name).toLowerCase()
    let path = config.path ?? `${opt.nameConversion(info.parent.name)}/:pid/${childPath}/:id`
    const map = validatePath(path, info.parent, true)
    Reflect.decorate([
        // re-assign oneToMany decorator which will be used on OneToManyController constructor
        decorateClass(<NestedGenericControllerDecorator>{ kind: "plumier-meta:relation-prop-name", type: type[0], relation: type[1] }),
        ignoreActions(config),
        entityProvider(info.parent, "pid", { applyTo: ["list", "save"] }),
        entityProvider(info.child, "id", { applyTo: ["get", "modify", "replace", "delete"] }),
        ...createRouteDecorators(path, map),
        ...authorizeActions(config),
        ...decorateTransformers(config),
        ...decorateCustomQuery(config),
    ], Controller)
    if (!opt.skipTag) {
        Reflect.decorate([
            ...decorateTagByRelation(info, opt.nameConversion)
        ], Controller)
    }
    return Controller
}

// --------------------------------------------------------------------- //
// -------------------------- FACTORY FACTORY -------------------------- //
// --------------------------------------------------------------------- //

function createGenericController<T>(type: Class | EntityWithRelation<T>, option: CreateGenericControllerOption) {
    const builder = new ControllerBuilder()
    option.normalize(type)
    if (option.config) option.config(builder)
    const opt = { builder, nameConversion: option.nameConversion }
    if (Array.isArray(type)) {
        return createNestedGenericControllerType(type, { ...opt, controller: option.controllers[1], skipTag: true })
    }
    return createGenericControllerType(type, { ...opt, controller: option.controllers[0], skipTag: true })
}

export {
    createGenericController, CreateGenericControllerOption, EntityWithRelation,
    createGenericControllerType, createNestedGenericControllerType
}

