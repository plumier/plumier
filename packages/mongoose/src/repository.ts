import {
    Class,
    entityHelper,
    EntityRelationInfo,
    ManyToOneRelationInfo,
    OneToManyRelationInfo,
    NestedRepository,
    Repository,
    SelectQuery,
} from "@plumier/core"
import { EntityWithRelation } from "@plumier/generic-controller"
import mongoose, { Document, Model } from "mongoose"

import { globalHelper, MongooseHelper, PojoDocument } from "./generator"

class MongooseRepository<T> implements Repository<T>{
    readonly Model: Model<PojoDocument<T>>
    constructor(protected type: Class<T>, helper?: MongooseHelper) {
        const hlp = helper ?? globalHelper
        this.Model = hlp.model(type)
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
        return new this.Model(doc).save() as any
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

class MongooseNestedRepository<P=any, T=any> implements NestedRepository<P, T>  {
    readonly ChildModel: Model<PojoDocument<T>>
    readonly ParentModel: Model<PojoDocument<P>>
    readonly relation: EntityRelationInfo
    constructor([type, property]: EntityWithRelation<P,T> | EntityWithRelation<T,P>, helper?: MongooseHelper) {
        const hlp = helper ?? globalHelper
        this.relation = entityHelper.getRelationInfo([type, property])
        this.ChildModel = hlp.model(this.relation.child)
        this.ParentModel = hlp.model(this.relation.parent)
    }

    private async countByManyToOne(relation: ManyToOneRelationInfo, pid: string, query?: any): Promise<number> {
        return this.ChildModel.find({ [relation.childProperty]: pid, ...query } as any).count()
    }

    private async countByOneToMany(relation: OneToManyRelationInfo, pid: string, query?: any): Promise<number> {
        const data = await this.ParentModel.findById(pid)
            .populate({
                path: relation.parentProperty,
                match: query,
            })
        return (data as any)[relation.parentProperty].length
    }

    async count(pid: string, query?: any): Promise<number> {
        if (this.relation.type === "ManyToOne")
            return this.countByManyToOne(this.relation, pid, query)
        else
            return this.countByOneToMany(this.relation, pid, query)
    }

    async findByOneToMany(relation: OneToManyRelationInfo, pid: string, offset: number, limit: number, query: any, select: SelectQuery, order: any): Promise<(T & mongoose.Document)[]> {
        const parent = await this.ParentModel.findById(pid)
            .populate({
                path: relation.parentProperty,
                match: query,
                options: { skip: offset, limit, sort: order },
                populate: select.relations,
                select: select.columns,
            })
        return (parent as any)[relation.parentProperty]
    }

    async findByManyToOne(relation: ManyToOneRelationInfo, pid: string, offset: number, limit: number, query: any, select: SelectQuery, order: any): Promise<(T & mongoose.Document)[]> {
        return this.ChildModel.find({ [relation.childProperty]: pid, ...query } as any, select.columns)
            .skip(offset).limit(limit)
            .populate(select.relations)
    }

    async find(pid: string, offset: number, limit: number, query: any, select: SelectQuery, order: any): Promise<(T & mongoose.Document)[]> {
        if (this.relation.type === "ManyToOne")
            return this.findByManyToOne(this.relation, pid, offset, limit, query, select, order)
        else
            return this.findByOneToMany(this.relation, pid, offset, limit, query, select, order)
    }

    async insert(pid: string, doc: Partial<T>) {
        const parent = await this.ParentModel.findById(pid);
        if (this.relation.childProperty) {
            // add parent navigation
            (doc as any)[this.relation.childProperty] = parent!.id
        }
        const result = await new this.ChildModel(doc).save();
        // add children navigation
        if (this.relation.parentProperty) {
            (parent as any)[this.relation.parentProperty].push(result._id)
            await parent!.save()
        }
        return result as any
    }

    findParentById(id: any) {
        return this.ParentModel.findById(id) as any
    }

    findById(id: any, select: SelectQuery = {}): Promise<(T & mongoose.Document) | undefined> {
        return this.ChildModel.findById(id, select.columns)
            .populate(select.relations) as any
    }

    async update(id: any, data: Partial<T>) {
        return this.ChildModel.findByIdAndUpdate(id, data as any) as any
    }

    async delete(id: any) {
        return this.ChildModel.findByIdAndRemove(id) as any
    }
}

export { MongooseRepository, MongooseNestedRepository }