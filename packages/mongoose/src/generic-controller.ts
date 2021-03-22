import { bind, Class, OneToManyRepository, Repository, val, SelectQuery, KeyOf } from "@plumier/core"
import { ControllerBuilder, createGenericControllerType, createOneToManyGenericControllerType, GenericControllerConfiguration, RepoBaseControllerGeneric, RepoBaseOneToManyControllerGeneric } from "@plumier/generic-controller"
import reflect, { generic } from "@plumier/reflect"
import { Context } from "koa"
import pluralize from "pluralize"

import { MongooseOneToManyRepository, MongooseRepository } from "./repository"

@generic.template("T", "TID")
@generic.type("T", "TID")
class MongooseControllerGeneric<T = any, TID = string> extends RepoBaseControllerGeneric<T, TID>{
    constructor(fac?: ((x: Class<T>) => Repository<T>)) {
        super(fac ?? (x => new MongooseRepository(x)))
    }

    get(@val.mongoId() id: TID, select: SelectQuery, ctx: Context): Promise<T> {
        return super.get(id, select, ctx)
    }

    modify(@val.mongoId() id: TID, data: T, @bind.ctx() ctx: Context) {
        return super.modify(id, data, ctx)
    }

    replace(@val.mongoId() id: TID, data: T, @bind.ctx() ctx: Context) {
        return super.replace(id, data, ctx)
    }

    delete(@val.mongoId() id: TID, ctx: Context) {
        return super.delete(id, ctx)
    }
}

@generic.template("P", "T", "PID", "TID")
@generic.type("P", "T", "PID", "TID")
class MongooseOneToManyControllerGeneric<P = any, T = any, PID = string, TID = string> extends RepoBaseOneToManyControllerGeneric<P, T, PID, TID> {
    constructor(fac?: ((p: Class<P>, t: Class<T>, rel: string) => OneToManyRepository<P, T>)) {
        super(fac ?? ((p, t, rel) => new MongooseOneToManyRepository(p, t, rel)))
    }

    list(@val.mongoId() pid: PID, offset: number = 0, limit: number = 50, filter: any, select: SelectQuery, order: string, ctx: Context) {
        return super.list(pid, offset, limit, filter, select, order, ctx)
    }

    save(@val.mongoId() pid: PID, data: T, @bind.ctx() ctx: Context) {
        return super.save(pid, data, ctx)
    }

    get(@val.mongoId() pid: PID, @val.mongoId() id: TID, select: SelectQuery, ctx: Context) {
        return super.get(pid, id, select, ctx)
    }

    modify(@val.mongoId() pid: PID, @val.mongoId() id: TID, data: T, @bind.ctx() ctx: Context) {
        return super.modify(pid, id, data, ctx)
    }

    replace(@val.mongoId() pid: PID, @val.mongoId() id: TID, data: T, @bind.ctx() ctx: Context) {
        return super.replace(pid, id, data, ctx)
    }

    delete(@val.mongoId() pid: PID, @val.mongoId() id: TID, ctx: Context) {
        return super.delete(pid, id, ctx)
    }
}

type EntityWithRelation<T> = [Class<T>, KeyOf<T>]

/**
 * Create a generic controller with CRUD functionality based on Entity
 * @param type entity used as the generic controller parameter
 * @param config configuration to authorize/enable/disable some actions
 */
function GenericController<T>(type:Class, config?: GenericControllerConfiguration): Class<MongooseControllerGeneric<T>>
/**
 * Create a nested generic controller with CRUD functionality based on Entity's One-To-Many relation property
 * @param type Tuple of [Entity, relationName] used as the generic controller parameter
 * @param config configuration to authorize/enable/disable some actions
 */
function GenericController<T>(type:EntityWithRelation<T>, config?: GenericControllerConfiguration): Class<MongooseOneToManyControllerGeneric<T>>
function GenericController<T>(type: Class | EntityWithRelation<T>, config?: GenericControllerConfiguration) {
    const builder = new ControllerBuilder()
    if (config) config(builder)
    if (Array.isArray(type)) {
        const [parentEntity, relation] = type
        const meta = reflect(parentEntity)
        const prop = meta.properties.find(x => x.name === relation)!
        const entity = prop.type[0] as Class
        return createOneToManyGenericControllerType(parentEntity, builder, entity, relation, MongooseOneToManyControllerGeneric, pluralize)
    }
    return createGenericControllerType(type, builder, MongooseControllerGeneric, pluralize)
}

export { MongooseControllerGeneric, MongooseOneToManyControllerGeneric, GenericController }