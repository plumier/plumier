import { BindingDecorator, Class, RouteInfo } from "@plumier/core"
import { ParameterReflection, PropertyReflection } from "@plumier/reflect"

import { isBind, isName, isRequired } from "./shared"

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

interface ParameterNode {
    // undecided: assume that all non decorated parameters can be body request
    kind: "path" | "query" | "header" | "cookie" | "undecided"
    name: string,
    required: boolean
    binding?: BindingDecorator
    typeName: "Class" | "Array" | "Primitive"
    type: Class | Class[] | undefined,
    meta: ParameterReflection | PropertyReflection
}

// --------------------------------------------------------------------- //
// --------------------------- MAIN FUNCTIONS -------------------------- //
// --------------------------------------------------------------------- //

function analyzeParameter(par: ParameterReflection, route: RouteInfo) {
    const obj = <ParameterNode>{ kind: "undecided", name: par.name, typeName: par.typeClassification!, required: false, type: par.type, meta: par }
    const urlParams = route.url.split("/").filter(x => x.startsWith(":")).map(x => x.substr(1))
    if (urlParams.some(x => x.toLowerCase() === route.paramMapper.alias(par.name).toLowerCase())) {
        obj.kind = "path"
        obj.name = route.paramMapper.alias(par.name).toLowerCase()
    }
    for (const dec of par.decorators) {
        if (isRequired(dec)) obj.required = true
        if (isName(dec)) obj.name = dec.alias
        else if (isBind(dec)) {
            obj.binding = dec
            if (dec.name === "query" || dec.name === "header" || dec.name === "cookie")
                obj.kind = dec.name
        }
    }
    return obj
}

function analyzeParameters(route: RouteInfo) {
    const result = []
    for (const par of route.action.parameters) {
        const analyzed = analyzeParameter(par, route)
        result.push(analyzed)
    }
    return result
}

export { ParameterNode, analyzeParameters }