import { decorate, decorateClass, decorateMethod, decorateProperty } from "tinspector"

import { Class } from "../common"

interface ApiRequiredDecorator { kind: "ApiRequired" }
interface ApiResponseDecorator { kind: "ApiResponse", status: number, mime: string, type: Class | Class[] }
interface ApiFieldNameDecorator { kind: "ApiFieldName", alias: string }
interface ApiEnumDecorator { kind: "ApiEnum", enums: string[] }
interface ApiDescriptionDecorator { kind: "ApiDescription", desc: string }
interface ApiHidePropertyDecorator { kind: "ApiHideProperty", location?: "request" | "response" }
interface ApiTagDecorator { kind: "ApiTag", tag: string, description?: string, externalDoc?: string }
namespace api {

    /**
     * Specify response type of an action
     * @param status Http status 
     * @param mime Mime type
     * @param type Data type returned
     */
    export function response(status: number, mime: string, type: Class | Class[]) {
        return decorateMethod(<ApiResponseDecorator>{ kind: "ApiResponse", status, mime, type })
    }

    /**
     * Specify API description for an action, parameters etc
     * @param desc Description
     */
    export function description(desc: string) {
        return decorate(<ApiDescriptionDecorator>{ kind: "ApiDescription", desc })
    }

    export function tag(tag: string) {
        return decorateClass(<ApiTagDecorator>{ kind: "ApiTag", tag })
    }

    /**
     * Hide property of the type from schema generation
     * @param location location of the type which property will be hidden
     */
    export function hide(location?: "request" | "response") {
        return decorateProperty(<ApiHidePropertyDecorator>{ kind: "ApiHideProperty", location })
    }

    export namespace params {
        /**
         * Mark parameter or property as required
         */
        export function required() {
            return decorateProperty(<ApiRequiredDecorator>{ kind: "ApiRequired" })
        }

        /**
         * Specify new name for a field
         * @param alias the new name
         */
        export function name(alias: string) {
            return decorateProperty(<ApiFieldNameDecorator>{ kind: "ApiFieldName", alias })
        }

        /**
         * Specify enumeration value
         * @param enums list of enumeration values
         */
        export function enums(...enums: string[]) {
            return decorateProperty(<ApiEnumDecorator>{ kind: "ApiEnum", enums })
        }
    }

}

export {
    ApiRequiredDecorator, ApiResponseDecorator, ApiFieldNameDecorator, ApiEnumDecorator,
    ApiDescriptionDecorator, ApiTagDecorator, api, ApiHidePropertyDecorator
}