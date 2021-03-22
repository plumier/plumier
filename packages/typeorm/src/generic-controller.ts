import { api, authorize, Class, entity, KeyOf, OneToManyRepository, Repository } from "@plumier/core"
import {
    ControllerBuilder,
    createGenericControllerType,
    createOneToManyGenericControllerType,
    genericControllerRegistry,
    RepoBaseControllerGeneric,
    RepoBaseOneToManyControllerGeneric,
    GenericControllerConfiguration
} from "@plumier/generic-controller"
import reflect, { generic, noop, useCache } from "@plumier/reflect"
import { parse } from "acorn"
import pluralize from "pluralize"
import { getMetadataArgsStorage } from "typeorm"

import { TypeORMOneToManyRepository, TypeORMRepository } from "./repository"

// --------------------------------------------------------------------- //
// ------------------------------- HELPER ------------------------------ //
// --------------------------------------------------------------------- //


function normalizeEntityNoCache(type: Class) {
    const parent: Class = Object.getPrototypeOf(type)
    // loop through parent entities 
    if (!!parent) normalizeEntity(parent)
    const storage = getMetadataArgsStorage();
    const columns = storage.filterColumns(type)
    for (const col of columns) {
        Reflect.decorate([noop()], (col.target as Function).prototype, col.propertyName, void 0)
        if (col.options.primary)
            Reflect.decorate([entity.primaryId(), authorize.readonly()], (col.target as Function).prototype, col.propertyName, void 0)
    }
    const relations = storage.filterRelations(type)
    for (const col of relations) {
        const rawType: Class = (col as any).type()
        const type = col.relationType === "one-to-many" || col.relationType === "many-to-many" ? [rawType] : rawType
        Reflect.decorate([reflect.type(x => type)], (col.target as Function).prototype, col.propertyName, void 0)
        if (col.relationType === "many-to-one") {
            // TODO
            Reflect.decorate([entity.relation()], (col.target as Function).prototype, col.propertyName, void 0)
        }
        else {
            const inverseProperty = inverseSideParser(col.inverseSideProperty)
            const cache = genericControllerRegistry.get(rawType)
            // if entity handled with generic controller then hide all one to many relation
            if (cache)
                Reflect.decorate([api.readonly(), api.writeonly()], (col.target as Function).prototype, col.propertyName, void 0)
            Reflect.decorate([entity.relation({ inverseProperty })], (col.target as Function).prototype, col.propertyName, void 0)
        }
    }
}

const normalizeEntityCache = new Map<Class, any>()

const normalizeEntity = useCache(normalizeEntityCache, normalizeEntityNoCache, x => x)

// --------------------------------------------------------------------- //
// ---------------------- INVERSE PROPERTY PARSER ---------------------- //
// --------------------------------------------------------------------- //

function inverseSideParser(expr: string | ((t: any) => any) | undefined) {
    if (!expr || typeof expr === "string") return expr
    const node = parse(expr.toString(), { ecmaVersion: 2020 })
    return getMemberExpression(node)
}

function getContent(node: any): any {
    switch (node.type) {
        case "Program":
        case "BlockStatement":
            return node.body[node.body.length - 1]
        case "ArrowFunctionExpression":
            return node.body
        case "ExpressionStatement":
            return node.expression
        case "ReturnStatement":
            return node.argument
    }
}

function getMemberExpression(node: any): string {
    const content = getContent(node)
    if (content.type === "MemberExpression")
        return content.property.name
    else
        return getMemberExpression(content)
}

// --------------------------------------------------------------------- //
// ------------------------ GENERIC CONTROLLERS ------------------------ //
// --------------------------------------------------------------------- //

@generic.template("T", "TID")
@generic.type("T", "TID")
class TypeORMControllerGeneric<T = any, TID = any> extends RepoBaseControllerGeneric<T, TID>{
    constructor(fac?: ((x: Class<T>) => Repository<T>)) {
        super(fac ?? (x => new TypeORMRepository(x)))
    }
}

@generic.template("P", "T", "PID", "TID")
@generic.type("P", "T", "PID", "TID")
class TypeORMOneToManyControllerGeneric<P = any, T = any, PID =any, TID = any> extends RepoBaseOneToManyControllerGeneric<P, T, PID, TID> {
    constructor(fac?: ((p: Class<P>, t: Class<T>, rel: string) => OneToManyRepository<P, T>)) {
        super(fac ?? ((p, t, rel) => new TypeORMOneToManyRepository(p, t, rel)))
    }
}

type EntityWithRelation<T> = [Class<T>, KeyOf<T>]

function GenericController<T>(type:Class, config?: GenericControllerConfiguration): Class<TypeORMControllerGeneric<T>>
function GenericController<T>(type:EntityWithRelation<T>, config?: GenericControllerConfiguration): Class<TypeORMOneToManyControllerGeneric<T>>
function GenericController<T>(type: Class | EntityWithRelation<T>, config?: GenericControllerConfiguration) {
    const builder = new ControllerBuilder()
    if (config) config(builder)
    if (Array.isArray(type)) {
        const [parentEntity, relation] = type
        normalizeEntity(parentEntity)
        const meta = reflect(parentEntity)
        const prop = meta.properties.find(x => x.name === relation)!
        const entity = prop.type[0] as Class
        normalizeEntity(entity)
        return createOneToManyGenericControllerType(parentEntity, builder, entity, relation, TypeORMOneToManyControllerGeneric, pluralize)
    }
    normalizeEntity(type)
    return createGenericControllerType(type, builder, TypeORMControllerGeneric, pluralize)
}

export { TypeORMControllerGeneric, TypeORMOneToManyControllerGeneric, normalizeEntity, GenericController }