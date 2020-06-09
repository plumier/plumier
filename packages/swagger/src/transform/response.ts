import { RouteInfo, ApiResponseDecorator } from "@plumier/core"
import { ResponseObject, ResponsesObject } from "openapi3-ts"

import { transformType } from "./schema"
import { TransformContext, isResponse } from "./shared"

function validationResponse(): ResponsesObject {
    return {
        description: "Validation error",
        content: {
            "application/json": {
                schema: { $ref: "#/components/schemas/System-ValidationError" }
            },
        }
    }
}

function securityResponse(description: string): ResponseObject {
    return {
        description,
        content: {
            "application/json": {
                schema: { $ref: "#/components/schemas/System-DefaultErrorMessage" }
            },
        }
    }
}

function successResponse(route: RouteInfo, ctx: TransformContext) {
    return !!route.action.returnType ? { schema: transformType(route.action.returnType, ctx) } : { schema: { type: "object" } }
}

function responseFromDecorator(dec:ApiResponseDecorator, ctx:TransformContext){
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
    if (route.action.parameters.length > 0)
        response["422"] = validationResponse()
    if (secured) {
        response["401"] = securityResponse("Unauthorized error")
        response["403"] = securityResponse("Forbidden error")
    }
    return response
}

export { transformResponses }