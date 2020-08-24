import { Class, OneToManyRepository, Repository, getGenericControllerOneToOneRelations } from "@plumier/core"
import { getManager, Repository as NativeRepository } from "typeorm"

class TypeORMRepository<T> implements Repository<T> {
    protected readonly nativeRepository: NativeRepository<T>
    protected readonly oneToOneRelations: string[]
    constructor(type: Class<T>) {
        this.nativeRepository = getManager().getRepository(type)
        this.oneToOneRelations = getGenericControllerOneToOneRelations(type).map(x => x.name)
    }

    find(offset: number, limit: number, query: Partial<T>): Promise<T[]> {
        return this.nativeRepository.find({ skip: offset, take: limit, where: query, relations: this.oneToOneRelations })
    }

    async insert(doc: T): Promise<{ id: any }> {
        const result = await this.nativeRepository.insert(doc)
        return { id: result.raw }
    }

    findById(id: any): Promise<T | undefined> {
        return this.nativeRepository.findOne(id, { relations: this.oneToOneRelations })
    }

    async update(id: any, data: T): Promise<{ id: any }> {
        await this.nativeRepository.update(id, data)
        return { id }
    }

    async delete(id: any): Promise<{ id: any }> {
        await this.nativeRepository.delete(id)
        return { id }
    }
}

class TypeORMOneToManyRepository<P, T> implements OneToManyRepository<P, T> {
    protected readonly nativeRepository: NativeRepository<T>
    protected readonly nativeParentRepository: NativeRepository<P>
    protected readonly inversePropertyName: string
    protected readonly oneToOneRelations: string[]
    constructor(parent: Class<P>, type: Class<T>, protected relation: string) {
        this.nativeRepository = getManager().getRepository(type)
        this.nativeParentRepository = getManager().getRepository(parent)
        const join = this.nativeParentRepository.metadata.relations.find(x => x.propertyName === this.relation)
        this.inversePropertyName = join!.inverseSidePropertyPath;
        this.oneToOneRelations = getGenericControllerOneToOneRelations(type).map(x => x.name)
    }

    async find(pid: any, offset: number, limit: number, query: Partial<T>): Promise<T[]> {
        return this.nativeRepository.find({
            where:
                { [this.inversePropertyName]: pid, ...query },
            skip: offset,
            take: limit,
            relations: this.oneToOneRelations
        })
    }

    async insert(pid: any, data: T): Promise<{ id: any }> {
        const parent = await this.nativeParentRepository.findOne(pid)
        const inserted = await this.nativeRepository.insert(data);
        await this.nativeParentRepository.createQueryBuilder()
            .relation(this.relation)
            .of(parent)
            .add(inserted.raw)
        return { id: inserted.raw }
    }

    findParentById(id: any): Promise<P | undefined> {
        return this.nativeParentRepository.findOne(id)
    }

    findById(id: any): Promise<T | undefined> {
        return this.nativeRepository.findOne(id, { relations: this.oneToOneRelations })
    }

    async update(id: any, data: T): Promise<{ id: any }> {
        await this.nativeRepository.update(id, data as any)
        return { id }
    }

    async delete(id: any): Promise<{ id: any }> {
        await this.nativeRepository.delete(id)
        return { id }
    }
}

export { TypeORMRepository, TypeORMOneToManyRepository }