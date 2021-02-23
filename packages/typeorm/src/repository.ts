import {
    Class,
    FilterEntity,
    FilterQuery,
    getGenericControllerOneToOneRelations,
    OneToManyRepository,
    OrderQuery,
    RelationDecorator,
    Repository,
} from "@plumier/core"
import reflect from "@plumier/reflect"
import {
    Between,
    getManager,
    LessThan,
    LessThanOrEqual,
    Like,
    MoreThan,
    MoreThanOrEqual,
    Not,
    Repository as NativeRepository,
} from "typeorm"

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


function transformFilter<T>(filters: FilterEntity<T>) {
    type Transformer = (filter: FilterQuery) => any
    const transformMap: { [key: string]: Transformer } = {
        "range": (filter: FilterQuery) => (Between(filter.value[0], filter.value[1])),
        "partial": (filter: FilterQuery) => {
            const value = filter.partial === "end" ? `${filter.value}%` :
                filter.partial === "start" ? `%${filter.value}` : `%${filter.value}%`
            return Like(value)
        },
        "equal": (filter: FilterQuery) => filter.value,
        "ne": (filter: FilterQuery) => (Not(filter.value)),
        "gte": (filter: FilterQuery) => (MoreThanOrEqual(filter.value)),
        "lte": (filter: FilterQuery) => (LessThanOrEqual(filter.value)),
        "gt": (filter: FilterQuery) => (MoreThan(filter.value)),
        "lt": (filter: FilterQuery) => (LessThan(filter.value)),
    }
    const result: any = {}
    for (const key in filters) {
        const filter = filters[key]!
        const transform = transformMap[filter.type]
        result[key] = transform(filter)
    }
    return result
}

class TypeORMRepository<T> implements Repository<T> {
    readonly nativeRepository: NativeRepository<T>
    protected readonly oneToOneRelations: string[]
    constructor(protected type: Class<T>) {
        this.nativeRepository = getManager().getRepository(type)
        this.oneToOneRelations = getGenericControllerOneToOneRelations(type).map(x => x.name)
    }

    count(query?: FilterEntity<T>): Promise<number> {
        return this.nativeRepository.count({
            where: transformFilter({ ...query }),
        })
    }

    find(offset: number, limit: number, query: FilterEntity<T>, selection: string[], order: OrderQuery[]): Promise<T[]> {
        const { select, relations } = normalizeSelect(this.type, selection)
        return this.nativeRepository.find({
            skip: offset,
            take: limit,
            where: transformFilter(query),
            relations, select,
            order: parseOrder(order)
        })
    }

    async insert(doc: Partial<T>) {
        return this.nativeRepository.save(doc as any)
    }

    findById(id: any, selection: string[]): Promise<T | undefined> {
        const { select, relations } = normalizeSelect(this.type, selection)
        return this.nativeRepository.findOne(id, { relations, select })
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
    count(pid: any, query?: FilterEntity<T>): Promise<number> {
        return this.nativeRepository.count({
            where: { [this.inversePropertyName]: pid, ...transformFilter({ ...query }) },
        })
    }

    async find(pid: any, offset: number, limit: number, query: FilterEntity<T>, selection: string[], order: OrderQuery[]): Promise<T[]> {
        const { select, relations } = normalizeSelect(this.type, selection)
        return this.nativeRepository.find({
            where:
                { [this.inversePropertyName]: pid, ...transformFilter(query) },
            skip: offset,
            take: limit,
            relations,
            select,
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

    findById(id: any, selection: string[]): Promise<T | undefined> {
        const { select, relations } = normalizeSelect(this.type, selection)
        return this.nativeRepository.findOne(id, { relations, select })
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


export { TypeORMRepository, TypeORMOneToManyRepository, transformFilter }