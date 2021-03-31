import { errorMessage, RelationDecorator, NestedGenericControllerDecorator, SelectQuery } from "@plumier/core"
import reflect, { Class, generic, GenericTypeDecorator } from "@plumier/reflect"
import { Context } from "koa"
import { ResponseTransformerDecorator } from "./decorator"

// --------------------------------------------------------------------- //
// ----------------------- ENTITY RELATION HELPER ---------------------- //
// --------------------------------------------------------------------- //



// get one custom query
interface GetOneParams { pid?: any, id: any, select: SelectQuery }
type GetOneCustomQueryFunction<T = any> = (params: GetOneParams, ctx: Context) => Promise<T>
interface GetOneCustomQueryDecorator {
    kind: "plumier-meta:get-one-query",
    query: GetOneCustomQueryFunction
}

// get many custom query
interface GetManyParams<T> { pid?: any, limit: number, offset: number, select: SelectQuery, filter: any, order: any }
type GetManyCustomQueryFunction<T = any> = (params: GetManyParams<T>, ctx: Context) => Promise<T[]>
interface GetManyCustomQueryDecorator {
    kind: "plumier-meta:get-many-query",
    query: GetManyCustomQueryFunction
}


const genericControllerRegistry = new Map<Class, boolean>()

function updateGenericControllerRegistry(cls: Class) {
    genericControllerRegistry.set(cls, true)
}


function getTransformer(type: Class, methodName: string) {
    const meta = reflect(type)
    const method = meta.methods.find(x => methodName === x.name)!
    return method.decorators.find((x: ResponseTransformerDecorator): x is ResponseTransformerDecorator => x.kind === "plumier-meta:response-transformer")?.transformer
}

function getOneCustomQuery(type: Class): GetOneCustomQueryFunction | undefined {
    const meta = reflect(type)
    const decorator = meta.decorators.find((x: GetOneCustomQueryDecorator): x is GetOneCustomQueryDecorator => x.kind === "plumier-meta:get-one-query")
    return decorator?.query
}

function getManyCustomQuery(type: Class): GetManyCustomQueryFunction | undefined {
    const meta = reflect(type)
    const decorator = meta.decorators.find((x: GetManyCustomQueryDecorator): x is GetManyCustomQueryDecorator => x.kind === "plumier-meta:get-many-query")
    return decorator?.query
}


export {
    updateGenericControllerRegistry, genericControllerRegistry,
    getTransformer, getOneCustomQuery, getManyCustomQuery,
    GetOneParams, GetOneCustomQueryFunction, GetOneCustomQueryDecorator,
    GetManyParams, GetManyCustomQueryFunction, GetManyCustomQueryDecorator,
}