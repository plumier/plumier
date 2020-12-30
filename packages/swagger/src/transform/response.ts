import { ApiHideRelationDecorator, ApiResponseDecorator, Class, ResponseTypeDecorator, RouteInfo } from "@plumier/core"
import { ResponseObject, ResponsesObject, SchemaObject } from "openapi3-ts"
import { reflection } from "@plumier/reflect"

import { SchemaOverrideType, transformType, transformTypeAdvance } from "./schema"
import { isResponse, TransformContext } from "./shared"

function successResponse(route: RouteInfo, ctx: TransformContext): SchemaObject {
    const getType = (resp: ResponseTypeDecorator | undefined) => {
        return !!resp ? (reflection.isCallback(resp.type) ? resp.type({}) : resp.type) as (Class | Class[]) : undefined
    }
    const responseType = route.action.decorators.find((x:ResponseTypeDecorator):x is ResponseTypeDecorator => x.kind === "plumier-meta:response-type")
    const type = getType(responseType) ?? route.action.returnType
    if (!!type) {
        const overrides: SchemaOverrideType[] = []
        // if contains @api.noRelation() then adds remove all relations
        if (!!route.action.decorators.find((x: ApiHideRelationDecorator) => x.kind === "ApiNoRelation")) {
            overrides.push("RemoveChildRelations")
            overrides.push("RemoveReverseRelation")
            overrides.push("RemoveArrayRelation")
        }
        overrides.push("WriteonlyFields")
        return { schema: transformTypeAdvance(type, ctx, { decorators: route.action.decorators, overrides }) }
    }
    return { schema: { type: "object" } }
}

function responseFromDecorator(dec: ApiResponseDecorator, ctx: TransformContext) {
    return {
        [dec.status]: {
            description: "",
            content: {
                [dec.mime]: {
                    schema: transformType(dec.type, ctx)
                }
            }
        }
    }
}

function transformResponses(route: RouteInfo, ctx: TransformContext, isPublic: boolean): { [status: string]: ResponseObject } {
    const dec = route.action.decorators.find(isResponse)
    if (dec) return responseFromDecorator(dec, ctx)
    const secured = ctx.config.enableAuthorization && !isPublic
    const response: ResponsesObject = {
        "200": {
            description: "Response body",
            content: {
                "application/json": successResponse(route, ctx)
            }
        }
    }
    return response
}

export { transformResponses }