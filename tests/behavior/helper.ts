import Plumier, { Class, Configuration, WebApiFacility } from "plumier"
import reflect from "@plumier/reflect"

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