import { decorate, decorateParameter, mergeDecorator } from "tinspector"

import { AuthorizeCallback, AuthorizeDecorator } from "../application/authorization"
import { ValidatorDecorator, ValidatorId } from "../application/validator"
import { AuthorizeMetadataInfo, errorMessage } from "../types"

class AuthDecoratorImpl {
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

const authorize = new AuthDecoratorImpl()

export {authorize, AuthDecoratorImpl}