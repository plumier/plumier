import { Class, NestedRepository, Repository, SelectQuery, EntityRelationInfo, entityHelper } from "@plumier/core"
import { EntityWithRelation } from "@plumier/generic-controller"
import { getManager, getRepository, Repository as NativeRepository } from "typeorm"

class TypeORMRepository<T> implements Repository<T> {
    readonly nativeRepository: NativeRepository<T>
    constructor(protected type: Class<T>) {
        this.nativeRepository = getManager().getRepository(type)
    }

    async count(query?: any): Promise<number> {
        if (query === undefined) return 0
        return this.nativeRepository.count({
            where: query,
        })
    }

    find(offset: number, limit: number, query: any, selection: SelectQuery, order: any): Promise<T[]> {
        return this.nativeRepository.find({
            skip: offset,
            take: limit,
            where: query,
            relations: selection.relations,
            select: selection.columns,
            order
        })
    }

    async insert(doc: Partial<T>) {
        return this.nativeRepository.save(doc as any)
    }

    findById(id: any, selection: SelectQuery = {}): Promise<T | undefined> {
        return this.nativeRepository.findOne(id, { relations: selection.relations, select: selection.columns })
    }

    async update(id: any, data: T) {
        await this.nativeRepository.update(id, data)
        return this.nativeRepository.findOne(id)
    }

    async delete(id: any) {
        const data = this.nativeRepository.findOne(id)
        await this.nativeRepository.delete(id)
        return data
    }
}

class TypeORMNestedRepository<P, T> implements NestedRepository<P, T> {
    readonly nativeRepository: NativeRepository<T>
    readonly nativeParentRepository: NativeRepository<P>
    readonly relation: EntityRelationInfo
    constructor([type, property]: EntityWithRelation<P, T> | EntityWithRelation<T, P>) {
        this.relation = entityHelper.getRelationInfo([type, property])
        this.nativeRepository = getManager().getRepository(this.relation.child)
        this.nativeParentRepository = getManager().getRepository(this.relation.parent)
    }
    count(pid: any, query?: any): Promise<number> {
        return this.nativeRepository.count({
            where: { [this.relation.childProperty!]: pid, ...query },
        })
    }

    async find(pid: any, offset: number, limit: number, query: any, selection: SelectQuery, order: any): Promise<T[]> {
        return this.nativeRepository.find({
            where:
                { [this.relation.childProperty!]: pid, ...query },
            skip: offset,
            take: limit,
            relations: selection.relations,
            select: selection.columns,
            order
        })
    }

    async insert(pid: any, data: Partial<T>) {
        const parent = await this.nativeParentRepository.findOne(pid)
        if (this.relation.parentProperty) {
            const result = await this.nativeRepository.save(data as any);
            await this.nativeParentRepository.createQueryBuilder()
                .relation(this.relation.parentProperty!)
                .of(parent)
                .add(result)
            return result
        }
        else {
            return this.nativeRepository.save({ [this.relation.childProperty!]: pid, ...data })
        }
    }

    findParentById(id: any): Promise<P | undefined> {
        return this.nativeParentRepository.findOne(id)
    }

    findById(id: any, selection: SelectQuery): Promise<T | undefined> {
        return this.nativeRepository.findOne(id, { relations: selection.relations, select: selection.columns })
    }

    async update(id: any, data: T) {
        await this.nativeRepository.update(id, data as any)
        return this.nativeRepository.findOne(id)
    }

    async delete(id: any) {
        const data = this.nativeRepository.findOne(id)
        await this.nativeRepository.delete(id)
        return data
    }
}


export { TypeORMRepository, TypeORMNestedRepository }
