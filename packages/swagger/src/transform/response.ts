import { RouteInfo } from "@plumier/core"
import { ResponseObject, ResponsesObject } from "openapi3-ts"

import { TransformContext, transformTypeRef } from "./shared"

function validationResponse(): ResponsesObject {
    return {
        description: "Validation error",
        content: {
            "application/json": {
                schema: { $ref: "#/components/schemas/.ValidationError" }
            },
        }
    }
}

function securityResponse(description: string): ResponseObject {
    return {
        description,
        content: {
            "application/json": {
                schema: { $ref: "#/components/schemas/.DefaultErrorMessage" }
            },
        }
    }
}

function successResponse(route: RouteInfo, ctx: TransformContext) {
    return !!route.action.returnType ? { schema: transformTypeRef(route.action.returnType, ctx) } : { schema: { type: "object" } }
}

function transformResponses(route: RouteInfo, ctx: TransformContext, isPublic: boolean): { [status: string]: ResponseObject } {
    const secured = ctx.config.enableAuthorization && !isPublic
    const response: ResponsesObject = {
        "200": {
            description: "Response body",
            content: {
                "application/json": successResponse(route, ctx)
            }
        }
    }
    if (route.action.parameters.length > 0)
        response["422"] = validationResponse()
    if (secured) {
        response["401"] = securityResponse("Unauthorized error")
        response["403"] = securityResponse("Forbidden error")
    }
    return response
}

export { transformResponses }