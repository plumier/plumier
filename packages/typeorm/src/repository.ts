import {
    Class,
    getGenericControllerOneToOneRelations,
    OneToManyRepository,
    OrderQuery,
    RelationDecorator,
    Repository,
} from "@plumier/core"
import reflect from "tinspector"
import { getManager, Repository as NativeRepository } from "typeorm"

function normalizeSelect<T>(type: Class<T>, selections: string[]): { select: (keyof T)[], relations: string[] } {
    const meta = reflect(type)
    const select: (keyof T)[] = []
    const relations: string[] = []
    for (const sel of selections) {
        const prop = meta.properties.find(x => x.name === sel)
        if (!prop) continue
        if (prop.decorators.find((x: RelationDecorator) => x.kind === "plumier-meta:relation"))
            relations.push(sel as any)
        else
            select.push(sel as any)
    }
    return { select, relations }
}

function parseOrder<T>(order: OrderQuery[]): { [P in keyof T]?: 1 | -1 } {
    return order.reduce((a, b) => {
        a[b.column] = b.order
        return a
    }, {} as any)
}

class TypeORMRepository<T> implements Repository<T> {
    protected readonly nativeRepository: NativeRepository<T>
    protected readonly oneToOneRelations: string[]
    constructor(protected type: Class<T>) {
        this.nativeRepository = getManager().getRepository(type)
        this.oneToOneRelations = getGenericControllerOneToOneRelations(type).map(x => x.name)
    }

    find(offset: number, limit: number, query: Partial<T>, selection: string[], order: OrderQuery[]): Promise<T[]> {
        const { select, relations } = normalizeSelect(this.type, selection)
        return this.nativeRepository.find({
            skip: offset,
            take: limit,
            where: query,
            relations, select,
            order: parseOrder(order)
        })
    }

    async insert(doc: T): Promise<{ id: any }> {
        const result = await this.nativeRepository.insert(doc)
        return { id: result.raw }
    }

    findById(id: any, selection: string[]): Promise<T | undefined> {
        const { select, relations } = normalizeSelect(this.type, selection)
        return this.nativeRepository.findOne(id, { relations, select })
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
    constructor(protected parent: Class<P>, protected type: Class<T>, protected relation: string) {
        this.nativeRepository = getManager().getRepository(type)
        this.nativeParentRepository = getManager().getRepository(parent)
        const join = this.nativeParentRepository.metadata.relations.find(x => x.propertyName === this.relation)
        this.inversePropertyName = join!.inverseSidePropertyPath;
        this.oneToOneRelations = getGenericControllerOneToOneRelations(type).map(x => x.name)
    }

    async find(pid: any, offset: number, limit: number, query: Partial<T>, selection: string[], order: OrderQuery[]): Promise<T[]> {
        const { select, relations } = normalizeSelect(this.type, selection)
        return this.nativeRepository.find({
            where:
                { [this.inversePropertyName]: pid, ...query },
            skip: offset,
            take: limit,
            relations, select,
            order: parseOrder(order)
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

    findById(id: any, selection: string[]): Promise<T | undefined> {
        const { select, relations } = normalizeSelect(this.type, selection)
        return this.nativeRepository.findOne(id, { relations, select })
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