import { Class, OneToManyRepository, Repository, SelectQuery } from "@plumier/core"
import { getGenericControllerOneToOneRelations } from "@plumier/generic-controller"
import reflect from "@plumier/reflect"
import mongoose, { Document, Model } from "mongoose"

import { globalHelper, MongooseHelper } from "./generator"
import { RefDecorator } from "./types"

class MongooseRepository<T> implements Repository<T>{
    readonly Model: Model<T & Document>
    protected readonly oneToOneRelations: string[]
    constructor(protected type: Class<T>, helper?: MongooseHelper) {
        const hlp = helper ?? globalHelper
        this.Model = hlp.model(type)
        this.oneToOneRelations = getGenericControllerOneToOneRelations(type).map(x => x.name)
    }

    async count(query?: any): Promise<number> {
        return this.Model.find(query).count()
    }

    find(offset: number, limit: number, query: any, select: SelectQuery, order: any): Promise<(T & mongoose.Document)[]> {
        const q = this.Model.find(query, select.columns)
        if (order) {
            q.sort(order)
        }
        q.populate(select.relations)
        return q.skip(offset).limit(limit) as any
    }

    async insert(doc: Partial<T>) {
        return new this.Model(doc).save()
    }

    findById(id: any, select: SelectQuery = {}): Promise<(T & mongoose.Document) | undefined> {
        return this.Model.findById(id, select.columns)
            .populate(select.relations) as any
    }

    async update(id: any, data: Partial<T>) {
        return this.Model.findByIdAndUpdate(id, data as any) as any
    }

    async delete(id: any) {
        return this.Model.findByIdAndRemove(id) as any
    }
}

class MongooseOneToManyRepository<P, T> implements OneToManyRepository<P, T>  {
    readonly Model: Model<T & Document>
    readonly ParentModel: Model<P & Document>
    readonly inverseProperty?: string
    constructor(protected parent: Class<P>, protected type: Class<T>, protected relation: string, helper?: MongooseHelper) {
        const hlp = helper ?? globalHelper
        this.Model = hlp.model(type)
        this.ParentModel = hlp.model(parent)
        const meta = reflect(parent)
        const prop = meta.properties.find(x => x.name === relation)!
        this.inverseProperty = prop.decorators.find((x: RefDecorator): x is RefDecorator => x.name === "MongooseRef")!.inverseProperty
    }

    async count(pid: string, query?: any): Promise<number> {
        const data = await this.ParentModel.findById(pid)
            .populate({
                path: this.relation,
                match: query,
            })
        return (data as any)[this.relation].length
    }

    async find(pid: string, offset: number, limit: number, query: any, select: SelectQuery, order: any): Promise<(T & mongoose.Document)[]> {
        const parent = await this.ParentModel.findById(pid)
            .populate({
                path: this.relation,
                match: query,
                options: { skip: offset, limit, sort:order },
                populate: select.relations,
                select: select.columns,
            })
        return (parent as any)[this.relation]
    }

    async insert(pid: string, doc: Partial<T>) {
        const parent = await this.ParentModel.findById(pid);
        if (this.inverseProperty) {
            // add parent navigation
            (doc as any)[this.inverseProperty] = parent!.id
        }
        const result = await new this.Model(doc).save();
        // add children navigation
        (parent as any)[this.relation].push(result._id)
        await parent!.save()
        return result
    }

    findParentById(id: any): Promise<(P & mongoose.Document) | undefined> {
        return this.ParentModel.findById(id) as any
    }

    findById(id: any, select: SelectQuery = {}): Promise<(T & mongoose.Document) | undefined> {
        return this.Model.findById(id, select.columns)
            .populate(select.relations) as any
    }

    async update(id: any, data: Partial<T>) {
        return this.Model.findByIdAndUpdate(id, data as any) as any
    }

    async delete(id: any) {
        return this.Model.findByIdAndRemove(id) as any
    }
}

export { MongooseRepository, MongooseOneToManyRepository }