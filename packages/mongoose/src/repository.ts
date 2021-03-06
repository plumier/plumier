import {
    Class,
    OneToManyRepository,
    OrderQuery,
    RelationDecorator,
    Repository,
} from "@plumier/core"
import { FilterNode } from "@plumier/filter-parser"
import { getGenericControllerOneToOneRelations, parseSelect } from "@plumier/generic-controller"
import reflect from "@plumier/reflect"
import mongoose, { Document, Model } from "mongoose"

import { globalHelper, MongooseHelper } from "./generator"
import { RefDecorator } from "./types"

function getProjection(select: string[]) {
    return select.reduce((a, x) => {
        a[x] = 1
        return a
    }, {} as any)
}

function getPopulate(type: Class, parentProjections: any) {
    const meta = reflect(type)
    const getProp = (prop: string) => meta.properties.find(x => x.name === prop)
    const populate = []
    for (const proj in parentProjections) {
        const prop = getProp(proj)
        if (!prop || prop.typeClassification === "Primitive") continue;
        if (!prop.decorators.find((x: RelationDecorator) => x.kind === "plumier-meta:relation")) continue;
        populate.push({
            path: proj,
            select: parseSelect(Array.isArray(prop.type) ? prop.type[0] : prop.type)
        })
    }
    return populate
}

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

    find(offset: number, limit: number, query: any, select: string[], order: OrderQuery[]): Promise<(T & mongoose.Document)[]> {
        const projection = getProjection(select)
        const q = this.Model.find(query, projection)
        if (order.length > 0) {
            const sort = order.reduce((a, b) => {
                a[b.column] = b.order
                return a
            }, {} as any)
            q.sort(sort)
        }
        q.populate(getPopulate(this.type, projection))
        return q.skip(offset).limit(limit) as any
    }

    async insert(doc: Partial<T>) {
        return new this.Model(doc).save()
    }

    findById(id: any, select: string[] = []): Promise<(T & mongoose.Document) | undefined> {
        const projection = getProjection(select)
        const populate = getPopulate(this.type, projection)
        const q = this.Model.findById(id, projection)
            .populate(populate)
        return q as any
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

    async find(pid: string, offset: number, limit: number, query: any, select: string[], order: OrderQuery[]): Promise<(T & mongoose.Document)[]> {
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
                populate: getPopulate(this.type, proj),
                select: proj,
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

    findById(id: any, select: string[] = []): Promise<(T & mongoose.Document) | undefined> {
        const proj = getProjection(select)
        const q = this.Model.findById(id, proj)
            .populate(getPopulate(this.type, proj))
        return q as any
    }

    async update(id: any, data: Partial<T>) {
        return this.Model.findByIdAndUpdate(id, data as any) as any
    }

    async delete(id: any) {
        return this.Model.findByIdAndRemove(id) as any
    }
}

export { MongooseRepository, MongooseOneToManyRepository }