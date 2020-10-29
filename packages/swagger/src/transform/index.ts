import { RouteInfo, RouteMetadata } from "@plumier/core"
import { InfoObject, OpenApiBuilder } from "openapi3-ts"

import { transformComponent } from "./component"
import { transformPaths } from "./path"
import { refFactory } from "./schema"
import { BaseTransformContext, TransformContext } from "./shared"

function transform(routes: RouteMetadata[], ctx: BaseTransformContext, info?: InfoObject) {
    const paths = transformPaths(routes, ctx)
    const components = transformComponent(ctx)
    return OpenApiBuilder.create({
        openapi: "3.0.0",
        info: { title: "Api Explorer", version: "1.0.0", ...info},
        paths, components,
    }).getSpec()
}

export { transform, refFactory }