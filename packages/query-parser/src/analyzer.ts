import { AuthorizeDecorator, AuthPolicy, Class, getPolicyInfo, isCustomClass, RouteAnalyzerFunction, RouteAnalyzerIssue, RouteInfo, RouteMetadata, VirtualRoute } from "@plumier/core";
import reflect, { ParameterReflection } from "@plumier/reflect";
import { FilterParserDecorator, OrderParserDecorator, SelectParserDecorator } from "./decorator";
import { getDecoratorType } from "./helper";


function checkIfPropertyContainsOnlyEntityPolicy(route: RouteInfo, policies: AuthPolicy[]): RouteAnalyzerIssue[] {
    const getDecorator = (par: ParameterReflection) => {
        const filterParser = par.decorators.find((x: FilterParserDecorator) => x.kind === "plumier-meta:filter-parser-decorator")
        const selectParser = par.decorators.find((x: SelectParserDecorator) => x.kind === "plumier-meta:select-parser-decorator")
        const orderParser = par.decorators.find((x: OrderParserDecorator) => x.kind === "plumier-meta:order-parser-decorator")
        return filterParser ? { kind: "FilterParser", type: getDecoratorType(route.controller.type, filterParser) } 
            : selectParser ? { kind: "SelectParser" , type: getDecoratorType(route.controller.type, selectParser) } 
            : orderParser ? { kind: "OrderParser" , type: getDecoratorType(route.controller.type, orderParser) } 
            : undefined
    }
    const result: RouteAnalyzerIssue[] = []
    for (const par of route.action.parameters) {
        const type: Class = Array.isArray(par.type) ? par.type[0] : par.type
        const dec = getDecorator(par)
        if (dec) {
            const meta = reflect(dec.type)
            for (const prop of meta.properties) {
                const decs = prop.decorators.filter((x: AuthorizeDecorator): x is AuthorizeDecorator => x.type === "plumier-meta:authorize")
                const info = getPolicyInfo(decs, policies)
                if (info.length > 0 && info.every(x => x.type === "EntityPolicy" && x.access === "read")) {
                    result.push({ type: "warning", message: `${dec.kind} unable to authorize property ${dec.type.name}.${prop.name} because its contains only entity policies` })
                }
            }
        }
    }
    return result
}

export function createQueryParserAnalyzer(policies:AuthPolicy[]):RouteAnalyzerFunction {
    return (info:RouteMetadata) => info.kind === "ActionRoute" ? checkIfPropertyContainsOnlyEntityPolicy(info, policies) : []
}