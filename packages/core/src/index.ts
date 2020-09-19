// TypeScript bug https://github.com/microsoft/TypeScript/issues/18877
import { val } from "typedconverter"
import "./decorator/val"
export { val }
export { AuthorizerFunction, checkAuthorize, RoleField, Authorizer, CustomAuthorizer, CustomAuthorizerFunction, AuthorizationContext, AuthorizerContext, AuthorizeDecorator, updateRouteAuthorizationAccess } from "./authorization";
export { HeaderPart, RequestPart, BindingDecorator, binder, ParameterBinderMiddleware, CustomBinderFunction } from "./binder";
export { invoke } from "./application-pipeline";
export { response } from "./response";
export { generateRoutes, findClassRecursive, appendRoute, IgnoreDecorator, RouteDecorator } from "./route-generator";
export { analyzeRoutes, printAnalysis } from "./route-analyzer";
export { router } from "./router";
export { Class, consoleLog, findFilesRecursive, getChildValue, hasKeyOf, isCustomClass, printTable, toBoolean, cleanupConsole, ellipsis, analyzeModel, AnalysisMessage, entityHelper, globAsync } from "./common";
export { AuthDecoratorImpl, authorize } from "./decorator/authorize";
export { ApiDescriptionDecorator, ApiEnumDecorator, ApiFieldNameDecorator, ApiRequiredDecorator, ApiResponseDecorator, ApiTagDecorator, api, ApiReadOnlyDecorator, ApiWriteOnlyDecorator } from "./decorator/api"
export { bind } from "./decorator/bind";
export { domain, middleware } from "./decorator/common";
export { route, RouteDecoratorImpl, GenericControllerDecorator } from "./decorator/route";
export { EntityIdDecorator, RelationDecorator, primaryId, relation } from "./decorator/entity";
export { preSave, postSave, RequestHookDecorator } from "./decorator/request-hook";
export {
    DefaultControllerGeneric, DefaultOneToManyControllerGeneric, RepoBaseControllerGeneric, RepoBaseOneToManyControllerGeneric,
    IdentifierResult, getGenericControllerOneToOneRelations, genericControllerRegistry, DefaultOneToManyRepository, DefaultRepository
} from "./generic-controller"
export { HttpStatus } from "./http-status";
export { RequestHookMiddleware } from "./request-hook"
export { validate, ValidatorMiddleware, CustomValidator, ValidatorDecorator, CustomValidatorFunction, AsyncValidatorResult, ValidatorContext, } from "./validator"
export {
    ActionResult, Application, Configuration, DefaultFacility,
    DependencyResolver, Facility, HttpMethod, HttpStatusError, Invocation, KoaMiddleware,
    Middleware, MiddlewareFunction, MiddlewareDecorator, MiddlewareUtil, PlumierApplication, PlumierConfiguration, RedirectActionResult,
    ActionContext, RouteInfo, RouteAnalyzerFunction, RouteAnalyzerIssue,
    ValidationError, errorMessage, DefaultDependencyResolver,
    CustomMiddleware, CustomMiddlewareFunction, FormFile, HttpCookie,
    Metadata, GlobalMetadata, Omit, Optional, RouteMetadata, VirtualRoute,
    GenericController, ControllerGeneric, OneToManyControllerGeneric, Repository, OneToManyRepository, OrderQuery
} from "./types";