import { arrayConverter, modelConverter, numberConverter, dateConverter, booleanConverter } from "./binder"

export {
    ActionResult,
    Application,
    bind,
    Configuration,
    Class,
    DependencyResolver,
    Facility,
    FileUploadInfo,
    FileParser,
    HeaderPart,
    HttpMethod,
    HttpStatusError,
    Invocation,
    KoaMiddleware,
    middleware,
    Middleware,
    domain,
    PlumierApplication,
    PlumierConfiguration,
    RequestPart,
    route,
    RouteInfo,
    TypeConverter,
    ConversionError,
    ValidationError,
    ValidationIssue,
    ConverterFunction
} from "@plumier/core"
export { WebApiFacility, RestfulApiFacility, response } from "./application"
export { MultiPartFacility } from "./multipart"
export { FileActionResult, ServeStaticFacility, ServeStaticMiddleware, ServeStaticOptions } from "./serve-static"
export { val } from "@plumier/validator"
export * from "@plumier/jwt"

export const converters = {
    arrayConverter,
    modelConverter,
    numberConverter,
    dateConverter,
    booleanConverter
}

import { Plumier } from "./application"
export default Plumier