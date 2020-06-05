import { Class, RepoBaseGenericOneToManyController, RepoBaseGenericController, Repository, OneToManyRepository } from "@plumier/core"
import mongoose, { Document, Model } from "mongoose"
import { generic } from "tinspector"

import { model } from "./generator"

class MongooseRepository<T> implements Repository<T>{
    readonly Model: Model<T & Document>
    constructor(type: Class<T>) {
        this.Model = model(type)
    }

    find(offset: number, limit: number, query: Partial<T>): Promise<(T & mongoose.Document)[]> {
        return this.Model.find(query as any).skip(offset).limit(limit) as any
    }

    async insert(doc: Partial<T>): Promise<{ id: any }> {
        const result = await new this.Model(doc).save()
        return { id: result._id.toHexString() }
    }

    findById(id: any): Promise<(T & mongoose.Document) | undefined> {
        return this.Model.findById(id) as any
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
    constructor(parent: Class<P>, type: Class<T>, protected relation: string) {
        this.Model = model(type)
        this.ParentModel = model(parent)
    }

    async find(pid: string, offset: number, limit: number, query: Partial<T>): Promise<(T & mongoose.Document)[]> {
        const parent = await this.ParentModel.findById(pid).populate(this.relation, null, query, { skip: offset, limit })
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
        return this.Model.findById(id) as any
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
class MongooseGenericController<T, TID> extends RepoBaseGenericController<T, TID>{
    constructor() {
        super(x => new MongooseRepository(x))
    }
}

@generic.template("P", "T", "PID", "TID")
@generic.type("P", "T", "PID", "TID")
class MongooseGenericOneToManyController<P, T, PID, TID> extends RepoBaseGenericOneToManyController<P, T, PID, TID> {
    constructor() {
        super((p, t, rel) => new MongooseOneToManyRepository(p, t, rel))
    }
}

export { MongooseGenericController, MongooseGenericOneToManyController, MongooseRepository, MongooseOneToManyRepository }