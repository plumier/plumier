import Plumier, { Class, Configuration, WebApiFacility } from "plumier"
import reflect, { generic } from "@plumier/reflect"
import { Repository, OneToManyRepository, GenericControllers } from "@plumier/core";
import { RepoBaseControllerGeneric, RepoBaseOneToManyControllerGeneric } from "@plumier/generic-controller";

export function fixture(controller: Class | Class[] | string | string[], config?: Partial<Configuration>) {
    const mergedConfig = <Configuration>{ mode: "production", ...config }
    return new Plumier()
        .set(new WebApiFacility({ controller }))
        .set(mergedConfig)
}

type MockType = {
    prototype: any
};

export function mock<T>(type: Class<T>): MockType {
    const newType = reflect.create({ parent: type })
    const meta = reflect(newType)
    for (const method of meta.methods) {
        type.prototype[method.name] = jest.fn()
    }
    return newType as any
}

mock.mockClear = (type:MockType) => {
    const meta = reflect(type as any as Class)
    for (const method of meta.methods) {
        (type as any).prototype[method.name].mockClear();
    }
}

export function random() {
    return new Date().getTime().toString(32)
}

export async function expectError(operation:Promise<any>) {
    const fn = jest.fn()
    try{
        await operation
        return fn
    }
    catch(e){
        fn(e)
        return fn
    }
}


export class MockRepo<T> implements Repository<T>{
    constructor(private fn: jest.Mock) { }
    count(query?: any): Promise<number> {
        throw new Error('Method not implemented.')
    }
    async find(offset: number, limit: number, query: any): Promise<T[]> {
        this.fn(offset, limit, query)
        return []
    }
    async insert(data: Partial<T>) {
        this.fn(data)
        return data as T
    }
    async findById(id: any): Promise<T | undefined> {
        this.fn(id)
        return {} as any
    }
    async update(id: any, data: Partial<T>) {
        this.fn(id, data)
        return data as T
    }
    async delete(id: any) {
        this.fn(id)
        return { id } as any
    }
}

export class MockOneToManyRepo<P, T> implements OneToManyRepository<P, T>{
    constructor(private fn: jest.Mock) { }
    count(pid: any, query?: any): Promise<number> {
        throw new Error('Method not implemented.')
    }
    async find(pid: any, offset: number, limit: number, query: any): Promise<T[]> {
        this.fn(pid, offset, limit, query)
        return []
    }
    async findParentById(id: any): Promise<P | undefined> {
        return {} as any
    }
    async insert(pid: any, data: Partial<T>) {
        this.fn(data)
        return { id: 123, ...data } as any
    }
    async findById(id: any): Promise<T | undefined> {
        this.fn(id)
        return {} as any
    }
    async update(id: any, data: Partial<T>) {
        this.fn(id, data)
        return { id: 123, ...data } as any
    }
    async delete(id: any) {
        this.fn(id)
        return { id } as any
    }
}

export class DefaultControllerGeneric<T, TID> extends RepoBaseControllerGeneric<T, TID>{
    constructor() { super(fac => new MockRepo<T>(jest.fn())) }
}

export class DefaultOneToManyControllerGeneric<P, T, PID, TID> extends RepoBaseOneToManyControllerGeneric<P, T, PID, TID>{
    constructor() { super(fac => new MockOneToManyRepo<P, T>(jest.fn())) }
}
