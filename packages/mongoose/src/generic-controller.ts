import {
    bind,
    Class,
    OneToManyRepository,
    RepoBaseControllerGeneric,
    RepoBaseOneToManyControllerGeneric,
    Repository,
    val,
} from "@plumier/core"
import { Context } from "koa"
import { generic } from "tinspector"

import { MongooseOneToManyRepository, MongooseRepository } from "./repository"

@generic.template("T", "TID")
@generic.type("T", "TID")
class MongooseControllerGeneric<T, TID> extends RepoBaseControllerGeneric<T, TID>{
    constructor(fac?: ((x: Class<T>) => Repository<T>)) {
        super(fac ?? (x => new MongooseRepository(x)))
    }

    get(@val.mongoId() id: TID, select: string, ctx: Context): Promise<T> {
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
class MongooseOneToManyControllerGeneric<P, T, PID, TID> extends RepoBaseOneToManyControllerGeneric<P, T, PID, TID> {
    constructor(fac?: ((p: Class<P>, t: Class<T>, rel: string) => OneToManyRepository<P, T>)) {
        super(fac ?? ((p, t, rel) => new MongooseOneToManyRepository(p, t, rel)))
    }

    list(@val.mongoId() pid: PID, offset: number = 0, limit: number = 50, filter: T, select: string, order: string, ctx: Context) {
        return super.list(pid, offset, limit, filter, select, order, ctx)
    }

    save(@val.mongoId() pid: PID, data: T, @bind.ctx() ctx: Context) {
        return super.save(pid, data, ctx)
    }

    get(@val.mongoId() pid: PID, @val.mongoId() id: TID, select: string, ctx: Context) {
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

export { MongooseControllerGeneric, MongooseOneToManyControllerGeneric }