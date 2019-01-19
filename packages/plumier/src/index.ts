import { arrayConverter, modelConverter, numberConverter, dateConverter, booleanConverter } from "./binder"
export { WebApiFacility, RestfulApiFacility, response } from "./application"
export { MultiPartFacility } from "./multipart"
export { FileActionResult, ServeStaticFacility, ServeStaticMiddleware, ServeStaticOptions } from "./serve-static"
export { val } from "@plumjs/validator"
export { reflect } from "tinspector"
export * from "@plumjs/jwt"

export const converters = {
    arrayConverter,
    modelConverter,
    numberConverter,
    dateConverter,
    booleanConverter
}

import { Plumier } from "./application"
export default Plumier