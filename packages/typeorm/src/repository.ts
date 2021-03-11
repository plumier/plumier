import { Class, OneToManyRepository, OrderQuery, Repository, SelectQuery } from "@plumier/core"
import { getGenericControllerOneToOneRelations } from "@plumier/generic-controller"
import { getManager, Repository as NativeRepository } from "typeorm"

function parseOrder<T>(order: OrderQuery[]): { [P in keyof T]?: 1 | -1 } {
    return order.reduce((a, b) => {
        a[b.column] = b.order
        return a
    }, {} as any)
}

class TypeORMRepository<T> implements Repository<T> {
    readonly nativeRepository: NativeRepository<T>
    protected readonly oneToOneRelations: string[]
    constructor(protected type: Class<T>) {
        this.nativeRepository = getManager().getRepository(type)
        this.oneToOneRelations = getGenericControllerOneToOneRelations(type).map(x => x.name)
    }

    count(query?: any): Promise<number> {
        return this.nativeRepository.count({
            where: query,
        })
    }

    find(offset: number, limit: number, query: any, selection: SelectQuery, order: OrderQuery[]): Promise<T[]> {
        return this.nativeRepository.find({
            skip: offset,
            take: limit,
            where: query,
            relations: selection.relations, 
            select:selection.columns,
            order: parseOrder(order)
        })
    }

    async insert(doc: Partial<T>) {
        return this.nativeRepository.save(doc as any)
    }

    findById(id: any, selection: SelectQuery = {}): Promise<T | undefined> {
        return this.nativeRepository.findOne(id, { relations:selection.relations, select:selection.columns })
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

class TypeORMOneToManyRepository<P, T> implements OneToManyRepository<P, T> {
    readonly nativeRepository: NativeRepository<T>
    readonly nativeParentRepository: NativeRepository<P>
    protected readonly inversePropertyName: string
    protected readonly oneToOneRelations: string[]
    constructor(protected parent: Class<P>, protected type: Class<T>, protected relation: string) {
        this.nativeRepository = getManager().getRepository(type)
        this.nativeParentRepository = getManager().getRepository(parent)
        const join = this.nativeParentRepository.metadata.relations.find(x => x.propertyName === this.relation)
        this.inversePropertyName = join!.inverseSidePropertyPath;
        this.oneToOneRelations = getGenericControllerOneToOneRelations(type).map(x => x.name)
    }
    count(pid: any, query?: any): Promise<number> {
        return this.nativeRepository.count({
            where: { [this.inversePropertyName]: pid, ...query },
        })
    }

    async find(pid: any, offset: number, limit: number, query: any, selection: SelectQuery, order: OrderQuery[]): Promise<T[]> {
        return this.nativeRepository.find({
            where:
                { [this.inversePropertyName]: pid, ...query },
            skip: offset,
            take: limit,
            relations: selection.relations,
            select:selection.columns,
            order: parseOrder(order)
        })
    }

    async insert(pid: any, data: Partial<T>) {
        const parent = await this.nativeParentRepository.findOne(pid)
        const result = await this.nativeRepository.insert(data as any);
        const first = result.identifiers[0]
        const idName = Object.keys(first)[0]
        const id = (first as any)[idName]
        await this.nativeParentRepository.createQueryBuilder()
            .relation(this.relation)
            .of(parent)
            .add(id)
        return (await this.nativeRepository.findOne(id))!
    }

    findParentById(id: any): Promise<P | undefined> {
        return this.nativeParentRepository.findOne(id)
    }

    findById(id: any, selection: SelectQuery): Promise<T | undefined> {
        return this.nativeRepository.findOne(id, { relations: selection.relations, select:selection.columns })
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


export { TypeORMRepository, TypeORMOneToManyRepository }
