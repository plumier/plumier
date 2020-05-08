import { RouteInfo } from "@plumier/core"
import { OpenApiBuilder, InfoObject } from "openapi3-ts"

import { transformComponent } from "./component"
import { transformPaths } from "./path"
import { TransformContext } from "./shared"
import { refFactory } from "./shared"


function transform(routes: RouteInfo[], ctx: TransformContext, info?: InfoObject) {
    const paths = transformPaths(routes, ctx)
    const components = transformComponent(ctx)
    return OpenApiBuilder.create({
        openapi: "3.0.0",
        info: { title: "Api Explorer", version: "1.0.0", ...info},
        paths, components,
    }).getSpec()
}

export { transform, refFactory }