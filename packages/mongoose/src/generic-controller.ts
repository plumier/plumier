import {
    Class,
    GenericController,
    GenericOneToManyController,
    HttpStatusError,
    IdentifierResult,
    route,
    val,
} from "@plumier/core"
import { Document, Model } from "mongoose"
import { generic } from "tinspector"

import { model } from "./generator"

class Repository<T> {
    protected readonly Model: Model<T & Document>
    constructor(type: Class<T>) {
        this.Model = model(type)
    }

    find(offset:number, limit:number, query: Partial<T>) {
        return this.Model.find(query as any).skip(offset).limit(limit)
    }

    async insert(doc: Partial<T>): Promise<{ id: any }> {
        const result = await new this.Model(doc).save()
        return { id: result._id.toHexString() }
    }

    findById(id: any) {
        return this.Model.findById(id)
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

class OneToManyRepository<P, T>  {
    protected readonly Model: Model<T & Document>
    protected readonly ParentModel: Model<P & Document>
    constructor(parent: Class<P>, type: Class<T>, protected relation: string) {
        this.Model = model(type)
        this.ParentModel = model(parent)
    }

    async find(pid: string, offset: number, limit: number, query: Partial<T>) {
        const parent = await this.ParentModel.findById(pid).populate({
            path: this.relation,
            options: {
                skip: offset, limit,
                match: query
            }
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

    findParentById(id: any) {
        return this.ParentModel.findById(id)
    }

    findById(id: any) {
        return this.Model.findById(id)
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

@generic.template("T", "TID")
@generic.type("T", "TID")
class MongooseGenericController<T, TID> extends GenericController<T, TID>{
    private readonly repo: Repository<T>
    constructor() {
        super()
        this.repo = new Repository(this.entityType)
    }

    list(offset: number = 0, limit: number = 50, query: T) {
        return this.repo.find(offset, limit, query) as any
    }

    async save(data: T) {
        return this.repo.insert(data)
    }

    @route.ignore()
    protected async findOneOrThrowNotFound(id: TID) {
        const data = await this.repo.findById(id)
        if (!data) throw new HttpStatusError(404)
        return data
    }

    get(@val.mongoId() id: TID): Promise<T> {
        return this.findOneOrThrowNotFound(id)
    }

    async modify(@val.mongoId() id: TID, data: T) {
        await this.findOneOrThrowNotFound(id)
        await this.repo.update(id, data)
        return new IdentifierResult(id)
    }

    async delete(@val.mongoId() id: TID) {
        await this.findOneOrThrowNotFound(id)
        await this.repo.delete(id)
        return new IdentifierResult(id)
    }
}

@generic.template("P", "T", "PID", "TID")
@generic.type("P", "T", "PID", "TID")
class MongooseGenericOneToManyController<P, T, PID, TID> extends GenericOneToManyController<P, T, PID, TID> {
    protected readonly repo: OneToManyRepository<P, T>
    constructor() {
        super()
        this.repo = new OneToManyRepository(this.parentEntityType, this.entityType, this.propertyName)
    }

    @route.ignore()
    protected async findParentOrThrowNotFound(id: PID) {
        const data = await this.repo.findParentById(id)
        if (!data) throw new HttpStatusError(404, "Parent not found")
        return data
    }

    @route.ignore()
    protected async findOneOrThrowNotFound(id: TID) {
        const data = await this.repo.findById(id)
        if (!data) throw new HttpStatusError(404, "Data not found")
        return data
    }

    async list(@val.mongoId() pid: PID, offset: number = 0, limit: number = 50, query: T) {
        return this.repo.find(pid as any, offset, limit, query)
    }

    async save(@val.mongoId() pid: PID, data: T) {
        await this.findParentOrThrowNotFound(pid)
        const { id } = await this.repo.insert(pid as any, data)
        return new IdentifierResult(id)
    }

    async get(@val.mongoId() pid: PID, @val.mongoId() id: TID) {
        await this.findParentOrThrowNotFound(pid)
        return this.findOneOrThrowNotFound(id)
    }

    async modify(@val.mongoId() pid: PID, @val.mongoId() id: TID, data: T) {
        await this.findParentOrThrowNotFound(pid)
        await this.findOneOrThrowNotFound(id)
        await this.repo.update(id, data)
        return new IdentifierResult(id)
    }

    async delete(@val.mongoId() pid: PID, @val.mongoId() id: TID) {
        await this.findParentOrThrowNotFound(pid)
        await this.findOneOrThrowNotFound(id)
        await this.repo.delete(id)
        return new IdentifierResult(id)
    }
}

export { MongooseGenericController, MongooseGenericOneToManyController, Repository, OneToManyRepository }