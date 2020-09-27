import {
    Class,
    getGenericControllerOneToOneRelations,
    OneToManyRepository,
    OrderQuery,
    relation,
    RelationDecorator,
    Repository,
} from "@plumier/core"
import mongoose, { Document, Model } from "mongoose"
import reflect from "tinspector"

import { globalHelper, MongooseHelper } from "./generator"

function getProjection(select: string[]) {
    return select.reduce((a, x) => {
        a[x] = 1
        return a
    }, {} as any)
}

class MongooseRepository<T> implements Repository<T>{
    readonly Model: Model<T & Document>
    protected readonly oneToOneRelations: string[]
    constructor(protected type: Class<T>, helper?: MongooseHelper) {
        const hlp = helper ?? globalHelper
        this.Model = hlp.model(type)
        this.oneToOneRelations = getGenericControllerOneToOneRelations(type).map(x => x.name)
    }

    find(offset: number, limit: number, query: Partial<T>, select: string[], order: OrderQuery[]): Promise<(T & mongoose.Document)[]> {
        const projection = getProjection(select)
        const q = this.Model.find(query as any, projection)
        if (order.length > 0) {
            const sort = order.reduce((a, b) => {
                a[b.column] = b.order
                return a
            }, {} as any)
            q.sort(sort)
        }
        const meta = reflect(this.type)
        const relations = meta.properties.filter(prop => prop.decorators.some((x:RelationDecorator) => x.kind === "plumier-meta:relation"))
        for (const prop of relations) {
            if (projection[prop.name])
                q.populate(prop.name)
        }
        return q.skip(offset).limit(limit) as any
    }

    async insert(doc: Partial<T>): Promise<{ id: any }> {
        const result = await new this.Model(doc).save()
        return { id: result._id.toHexString() }
    }

    findById(id: any, select: string[] = []): Promise<(T & mongoose.Document) | undefined> {
        const projection = getProjection(select)
        const q = this.Model.findById(id, projection)
        const meta = reflect(this.type)
        const relations = meta.properties.filter(prop => prop.decorators.some((x:RelationDecorator) => x.kind === "plumier-meta:relation"))
        for (const prop of relations) {
            if (projection[prop.name])
                q.populate(prop.name)
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
    constructor(protected parent: Class<P>, protected type: Class<T>, protected relation: string, helper?: MongooseHelper) {
        const hlp = helper ?? globalHelper
        this.Model = hlp.model(type)
        this.ParentModel = hlp.model(parent)
        this.oneToOneRelations = getGenericControllerOneToOneRelations(type).map(x => x.name)
    }

    async find(pid: string, offset: number, limit: number, query: Partial<T>, select: string[], order: OrderQuery[]): Promise<(T & mongoose.Document)[]> {
        const proj = getProjection(select)
        const sort = order.reduce((a, b) => {
            a[b.column] = b.order
            return a
        }, {} as any)
        const parent = await this.ParentModel.findById(pid)
            .populate({
                path: this.relation,
                match: query,
                options: { skip: offset, limit, sort },
                populate: this.oneToOneRelations.map(x => ({ path: x })),
                select: proj,
            })
        return (parent as any)[this.relation]
    }

    private getReverseProperty(){
        const meta = reflect(this.type)
        for (const prop of meta.properties) {
            if(prop.type === this.parent && prop.decorators.some((x:RelationDecorator) => x.kind === "plumier-meta:relation"))
                return prop.name
        }
    }

    async insert(pid: string, doc: Partial<T>): Promise<{ id: any }> {
        const parent = await this.ParentModel.findById(pid);
        const reverseProp = this.getReverseProperty()
        if(reverseProp){
            // add parent navigation
            (doc as any)[reverseProp] = parent!.id
        }
        const result = await new this.Model(doc).save();
        // add children navigation
        (parent as any)[this.relation].push(result._id)
        await parent!.save()
        return { id: result._id.toHexString() }
    }

    findParentById(id: any): Promise<(P & mongoose.Document) | undefined> {
        return this.ParentModel.findById(id) as any
    }

    findById(id: any, select: string[] = []): Promise<(T & mongoose.Document) | undefined> {
        const proj = getProjection(select)
        const q = this.Model.findById(id, proj)
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

export { MongooseRepository, MongooseOneToManyRepository }