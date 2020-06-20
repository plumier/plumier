import { Class, route } from "@plumier/core"
import reflect, { GenericTypeDecorator } from "tinspector"

export interface OneToManyDecorator {
    kind: "GenericDecoratorOneToMany"
    propertyName: string,
    type: Class | Class[] | ((x: any) => Class | Class[]),
    parentType: Class
}

export interface IdentifierDecorator {
    kind: "GenericDecoratorId",
}

export interface InversePropertyDecorator {
    kind: "GenericInverseProperty"
}

export interface GenericControllerDecorator {
    kind: "GenericController"
}

export interface Repository<T> {
    find(offset: number, limit: number, query: Partial<T>): Promise<T[]>
    insert(data: Partial<T>): Promise<{ id: any }>
    findById(id: any): Promise<T | undefined>
    update(id: any, data: Partial<T>): Promise<{ id: any }>
    delete(id: any): Promise<{ id: any }>
}

export interface OneToManyRepository<P, T> {
    find(pid: any, offset: number, limit: number, query: Partial<T>): Promise<T[]>
    insert(pid: any, data: Partial<T>): Promise<{ id: any }>
    findParentById(id: any): Promise<P | undefined>
    findById(id: any): Promise<T | undefined>
    update(id: any, data: Partial<T>): Promise<{ id: any }>
    delete(id: any): Promise<{ id: any }>
}

export abstract class BaseControllerGeneric {
    @route.ignore()
    protected getGenericTypeParameters() {
        const meta = reflect(this.constructor as Class)
        const genericDecorator = meta.decorators
            .find((x: GenericTypeDecorator): x is GenericTypeDecorator => x.kind == "GenericType" && x.target === this.constructor)
        return {
            types: genericDecorator!.types.map(x => x as Class),
            meta
        }
    }
}

export abstract class ControllerGeneric<T, TID> extends BaseControllerGeneric{
    protected readonly entityType: Class<T>
    constructor() {
        super()
        const { types } = this.getGenericTypeParameters()
        this.entityType = types[0]
    }
}

export abstract class OneToManyControllerGeneric<P, T, PID, TID>  extends BaseControllerGeneric{
    protected readonly entityType: Class<T>
    protected readonly parentEntityType: Class<P>
    protected readonly relation: string

    constructor() {
        super()
        const { types, meta } = this.getGenericTypeParameters()
        this.parentEntityType = types[0]
        this.entityType = types[1]
        const oneToMany = meta.decorators.find((x: OneToManyDecorator): x is OneToManyDecorator => x.kind === "GenericDecoratorOneToMany")
        this.relation = oneToMany!.propertyName
    }
}
