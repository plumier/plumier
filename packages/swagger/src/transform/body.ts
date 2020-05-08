import { Class, RouteInfo } from "@plumier/core"
import { ContentObject, RequestBodyObject } from "openapi3-ts"
import { ParameterReflection, PropertyReflection } from "tinspector"

import { describeParameters } from "./parameter"
import { TransformContext, transformPropertiesToObject, transformTypeRef } from "./shared"

function transformContent(type: Class | Class[], ctx:TransformContext): ContentObject {
    return {
        "application/json": { schema: transformTypeRef(type, ctx) },
        "application/x-www-form-urlencoded": { schema: transformTypeRef(type, ctx) }
    }
}

function createPropertiesContent(properties: (PropertyReflection|ParameterReflection)[], ctx:TransformContext) {
    const schema = transformPropertiesToObject(properties, ctx)
    return {
        "application/json": { schema },
        "application/x-www-form-urlencoded": { schema }
    }
}

function transformBody(route: RouteInfo, ctx:TransformContext): RequestBodyObject | undefined {
    if (route.method !== "post" && route.method !== "put") return
    const pars = describeParameters(route)
    // choose either (with priority)
    // 1. @bind.body()
    // 2. Model binding, parameter with Class type parameter 
    // 3. Name binding, if 1 and 2 not match any undetermined parameters with primitive type can be body
    const body = pars.find(x => x.binding === "body")
    if (body)
        return { required: true, content: transformContent(body.type!, ctx) }
    // model binding
    const model = pars.find(x => x.kind === "undetermined" && x.typeName !== "Primitive")
    if (model)
        return { required: true, content: transformContent(model.type!, ctx) }
    const types = pars.filter(x => x.kind === "undetermined" && x.typeName === "Primitive")
    if (types.length > 0)
        return { required: true, content: createPropertiesContent(types.map(x => x.meta), ctx) }
}

export { transformBody }
