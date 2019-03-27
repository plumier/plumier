import { decorate, decorateParameter, mergeDecorator } from "tinspector"
import { Context } from "vm"

import { Converters } from "./converter"
import { errorMessage } from "./error-message"
import { RouteInfo } from "./route-generator"
import { ValidatorDecorator, ValidatorId } from "./validator"

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

export type AuthorizeStore = { [key: string]: (info: AuthorizeMetadataInfo) => Promise<boolean> }
export type AuthorizeCallback = (info: AuthorizeMetadataInfo, location: "Class" | "Parameter" | "Method") => Promise<boolean>
export type ConverterFunction = (value: any, path: string[], expectedType: Function | Function[], converters: Converters) => any

export interface AuthorizeDecorator {
    type: "plumier-meta:authorize",
    authorize: string | ((info: AuthorizeMetadataInfo) => Promise<boolean>),
    tag: string
}

export interface AuthorizeMetadataInfo {
    role: string[]
    user: any
    ctx: Context
    route: RouteInfo
    parameters: any[]
    value?: any
}


// --------------------------------------------------------------------- //
// ----------------------------- DECORATOR ----------------------------- //
// --------------------------------------------------------------------- //

export class AuthDecoratorImpl {

    custom(authorize: string | AuthorizeCallback, tag: string = "Custom") {
        return decorate((...args: any[]) => {
            const type = args.length === 1 ? "Class" : args.length === 2 ? "Method" : "Parameter"
            return <AuthorizeDecorator>{
                type: "plumier-meta:authorize", tag,
                authorize: typeof authorize === "string" ? authorize : (info: AuthorizeMetadataInfo) => authorize(info, type),
            }
        }, ["Class", "Parameter", "Method", "Property"])
    }

    /**
     * Authorize controller/action to public
     */
    public() {
        return decorate((...args: any[]) => {
            if (args.length === 3 && typeof args[2] === "number")
                throw new Error(errorMessage.PublicNotInParameter)
            return <AuthorizeDecorator>{ type: "plumier-meta:authorize", tag: "Public" }
        }, ["Class", "Parameter", "Method", "Property"])
    }

    /**
     * Authorize controller/action accessible by specific role
     * @param roles List of roles allowed
     */
    role(...roles: string[]) {
        const roleDecorator = this.custom(async (info, location) => {
            const { role, value } = info
            const isAuthorized = roles.some(x => role.some(y => x === y))
            return location === "Parameter" ? !!value && isAuthorized : isAuthorized
        }, roles.join("|"))
        const optionalDecorator = (...args: any[]) => {
            if (args.length === 3 && typeof args[2] === "number")
                decorateParameter(<ValidatorDecorator>{ type: "ValidatorDecorator", validator: ValidatorId.optional })(args[0], args[1], args[2])
        }
        return mergeDecorator(roleDecorator, optionalDecorator)
    }
}

export const authorize = new AuthDecoratorImpl()

