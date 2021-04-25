import { bind, Class, GenericControllers, NestedRepository, Repository, SelectQuery, val } from "@plumier/core"
import {
    createGenericController,
    EntityWithRelation,
    GenericControllerConfiguration,
    NestedRepositoryFactory,
    RepoBaseControllerGeneric,
    RepoBaseNestedControllerGeneric,
} from "@plumier/generic-controller"
import reflect, { generic } from "@plumier/reflect"
import { Context } from "koa"
import pluralize from "pluralize"

import { MongooseNestedRepository, MongooseRepository } from "./repository"

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


class MongooseNestedControllerGeneric<P = any, T = any, PID = string, TID = string> extends RepoBaseNestedControllerGeneric<P, T, PID, TID> {
    constructor(fac?: NestedRepositoryFactory<P,T>) {
        super(fac ?? (t => new MongooseNestedRepository(t)))
    }

    list(@val.mongoId() pid: PID, offset: number = 0, limit: number = 50, filter: any, select: SelectQuery, order: any, ctx: Context) {
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

/**
 * Generic controller factory factory, used to create a generic controller factory with custom generic controller implementation
 * @param controllers Custom generic controller implementation
 * @returns generic controller
 */
function createGenericControllerMongoose(controllers?: GenericControllers) {
    return <T>(type: Class | EntityWithRelation<T>, config?: GenericControllerConfiguration) =>
        createGenericController(type, {
            controllers: controllers ?? [MongooseControllerGeneric, MongooseNestedControllerGeneric],
            nameConversion: pluralize,
            config
        })
}

/**
 * Create a generic controller with CRUD functionality based on Entity
 * @param type entity used as the generic controller argument
 * @param config configuration to authorize/enable/disable some actions
 */
function GenericController<T>(type: Class, config?: GenericControllerConfiguration): Class<MongooseControllerGeneric<T>>
/**
 * Create a nested generic controller with CRUD functionality based on Entity's One-To-Many on Many-To-One relation property
 * @param relation Tuple of [Entity, relationName] used to specify entity relation as a reference of the nested generic controller
 * @param config configuration to authorize/enable/disable some actions
 */
function GenericController<T>(relation: EntityWithRelation<T>, config?: GenericControllerConfiguration): Class<MongooseNestedControllerGeneric<T>>
function GenericController<T>(type: Class | EntityWithRelation<T>, config?: GenericControllerConfiguration) {
    const factory = createGenericControllerMongoose()
    return factory(type, config)
}

export { MongooseControllerGeneric, MongooseNestedControllerGeneric, GenericController, createGenericControllerMongoose }