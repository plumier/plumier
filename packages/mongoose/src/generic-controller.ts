import {
    Class,
    getGenericControllerOneToOneRelations,
    OneToManyRepository,
    RepoBaseControllerGeneric,
    RepoBaseOneToManyControllerGeneric,
    Repository,
    val,
    bind,
} from "@plumier/core"
import mongoose, { Document, Model } from "mongoose"
import { generic } from "tinspector"
import {Context} from "koa"

import { globalHelper, MongooseHelper } from "./generator"

class MongooseRepository<T> implements Repository<T>{
    readonly Model: Model<T & Document>
    protected readonly oneToOneRelations: string[]
    constructor(type: Class<T>, helper?: MongooseHelper) {
        const hlp = helper ?? globalHelper
        this.Model = hlp.model(type)
        this.oneToOneRelations = getGenericControllerOneToOneRelations(type).map(x => x.name)
    }

    find(offset: number, limit: number, query: Partial<T>): Promise<(T & mongoose.Document)[]> {
        const q = this.Model.find(query as any)
        for (const prop of this.oneToOneRelations) {
            q.populate(prop)
        }
        return q.skip(offset).limit(limit) as any
    }

    async insert(doc: Partial<T>): Promise<{ id: any }> {
        const result = await new this.Model(doc).save()
        return { id: result._id.toHexString() }
    }

    findById(id: any): Promise<(T & mongoose.Document) | undefined> {
        const q = this.Model.findById(id)
        for (const prop of this.oneToOneRelations) {
            q.populate(prop)
        }
        return q as any
    }

    async update(id: any, data: Partial<T>) {
        await this.Model.findByIdAndUpdate(id, data as any)
        return { id }
    }

    async delete(id: any) {
        await this.Model.findByIdAndRemove(id)
        return { id }
    }
}

class MongooseOneToManyRepository<P, T> implements OneToManyRepository<P, T>  {
    readonly Model: Model<T & Document>
    readonly ParentModel: Model<P & Document>
    protected readonly oneToOneRelations: string[]
    constructor(parent: Class<P>, type: Class<T>, protected relation: string, helper?: MongooseHelper) {
        const hlp = helper ?? globalHelper
        this.Model = hlp.model(type)
        this.ParentModel = hlp.model(parent)
        this.oneToOneRelations = getGenericControllerOneToOneRelations(type).map(x => x.name)
    }

    async find(pid: string, offset: number, limit: number, query: Partial<T>): Promise<(T & mongoose.Document)[]> {
        const parent = await this.ParentModel.findById(pid)
            .populate({
                path: this.relation,
                match: query,
                options: { skip: offset, limit },
                populate: this.oneToOneRelations.map(x => ({ path: x }))
            })
        return (parent as any)[this.relation]
    }

    async insert(pid: string, doc: Partial<T>): Promise<{ id: any }> {
        const parent = await this.ParentModel.findById(pid);
        const result = await new this.Model(doc).save();
        (parent as any)[this.relation].push(result._id)
        await parent!.save()
        return { id: result._id.toHexString() }
    }

    findParentById(id: any): Promise<(P & mongoose.Document) | undefined> {
        return this.ParentModel.findById(id) as any
    }

    findById(id: any): Promise<(T & mongoose.Document) | undefined> {
        const q = this.Model.findById(id)
        for (const prop of this.oneToOneRelations) {
            q.populate(prop)
        }
        return q as any
    }

    async update(id: any, data: Partial<T>): Promise<{ id: any }> {
        await this.Model.findByIdAndUpdate(id, data as any)
        return { id }
    }

    async delete(id: any): Promise<{ id: any }> {
        await this.Model.findByIdAndRemove(id)
        return { id }
    }
}

@generic.template("T", "TID")
@generic.type("T", "TID")
class MongooseControllerGeneric<T, TID> extends RepoBaseControllerGeneric<T, TID>{
    constructor(fac?: ((x: Class<T>) => Repository<T>)) {
        super(fac ?? (x => new MongooseRepository(x)))
    }

    get(@val.mongoId() id: TID, ctx:Context): Promise<T> {
        return super.get(id, ctx)
    }

    modify(@val.mongoId() id: TID, data: T, @bind.ctx() ctx:Context) {
        return super.modify(id, data, ctx)
    }

    replace(@val.mongoId() id: TID, data: T, @bind.ctx() ctx:Context) {
        return super.replace(id, data, ctx)
    }

    delete(@val.mongoId() id: TID, ctx:Context) {
        return super.delete(id, ctx)
    }
}

@generic.template("P", "T", "PID", "TID")
@generic.type("P", "T", "PID", "TID")
class MongooseOneToManyControllerGeneric<P, T, PID, TID> extends RepoBaseOneToManyControllerGeneric<P, T, PID, TID> {
    constructor(fac?: ((p: Class<P>, t: Class<T>, rel: string) => OneToManyRepository<P, T>)) {
        super(fac ?? ((p, t, rel) => new MongooseOneToManyRepository(p, t, rel)))
    }

    list(@val.mongoId() pid: PID, offset: number = 0, limit: number = 50, query: T, ctx:Context) {
        return super.list(pid, offset, limit, query, ctx)
    }

    save(@val.mongoId() pid: PID, data: T, @bind.ctx() ctx:Context) {
        return super.save(pid, data, ctx)
    }

    get(@val.mongoId() pid: PID, @val.mongoId() id: TID, ctx:Context) {
        return super.get(pid, id, ctx)
    }

    modify(@val.mongoId() pid: PID, @val.mongoId() id: TID, data: T, @bind.ctx() ctx:Context) {
        return super.modify(pid, id, data, ctx)
    }

    replace(@val.mongoId() pid: PID, @val.mongoId() id: TID, data: T, @bind.ctx() ctx:Context) {
        return super.replace(pid, id, data, ctx)
    }

    delete(@val.mongoId() pid: PID, @val.mongoId() id: TID, ctx:Context) {
        return super.delete(pid, id, ctx)
    }
}

export { MongooseControllerGeneric, MongooseOneToManyControllerGeneric, MongooseRepository, MongooseOneToManyRepository }