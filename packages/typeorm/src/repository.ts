import { Class } from "@plumier/core"
import { Repository as NativeRepository, getManager } from "typeorm"
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity'

class Repository<T> {
    protected readonly nativeRepository: NativeRepository<T>
    constructor(type: Class<T>) {
        this.nativeRepository = getManager().getRepository(type)
    }

    find(offset: number, limit: number, query: Partial<T>) {
        return this.nativeRepository.find({ skip: offset, take: limit, where: query })
    }

    async insert(doc: QueryDeepPartialEntity<T>): Promise<{ id: any }> {
        const result = await this.nativeRepository.insert(doc)
        return { id: result.raw }
    }

    findById(id: any) {
        return this.nativeRepository.findOne(id)
    }

    async update(id: any, data: QueryDeepPartialEntity<T>) {
        await this.nativeRepository.update(id, data)
        return { id }
    }

    async delete(id: any) {
        await this.nativeRepository.delete(id)
        return { id }
    }
}

class OneToManyRepository<P, T>  {
    protected readonly nativeRepository: NativeRepository<T>
    protected readonly nativeParentRepository: NativeRepository<P>
    protected readonly inversePropertyName:string
    constructor(parent: Class<P>, type: Class<T>, protected relation: string) {
        this.nativeRepository = getManager().getRepository(type)
        this.nativeParentRepository = getManager().getRepository(parent)
        const join = this.nativeParentRepository.metadata.relations.find(x => x.propertyName === this.relation)
        this.inversePropertyName = join!.inverseSidePropertyPath;
    }

    async find(pid: any, offset: number, limit: number, query: Partial<T>) {
        return this.nativeRepository.find({ where: { [this.inversePropertyName]: pid }, skip: offset, take: limit })
    }
    async insert(pid: any, doc: QueryDeepPartialEntity<T>): Promise<{ id: any }> {
        const parent = await this.nativeParentRepository.findOne(pid)
        const inserted = await this.nativeRepository.insert(doc);
        await this.nativeParentRepository.createQueryBuilder()
            .relation(this.relation)
            .of(parent)
            .add(inserted.raw)
        return { id: inserted.raw }
    }

    findParentById(id: any) {
        return this.nativeParentRepository.findOne(id)
    }

    findById(id: any) {
        return this.nativeRepository.findOne(id)
    }

    async update(id: any, data: QueryDeepPartialEntity<T>) {
        await this.nativeRepository.update(id, data as any)
        return { id }
    }

    async delete(id: any) {
        await this.nativeRepository.delete(id)
        return { id }
    }
}

export {Repository, OneToManyRepository}