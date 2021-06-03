import { AuthorizeDecorator, CustomConverter } from "@plumier/core"
import reflect, { Class } from "@plumier/reflect"
import { Result } from "@plumier/validator"

import { OrderParserDecorator } from "../decorator"
import { getDecoratorType, ParserAst } from "../helper"

const queryRegex = /^(\+|\-)*\s*[a-zA-Z_]+[a-zA-Z0-9_]*/
const operatorRegex = /^(\+|\-)\s*/

interface OrderColumnNode {
    name: string
    order: "Asc" | "Desc"
    invalidProperty?: true
    authDecorators: AuthorizeDecorator[]
}

function parseQueryString(type: Class, query: string): OrderColumnNode[] {
    const tokens = query.split(",").map(x => x.trim())
    const meta = reflect(type)
    const result: OrderColumnNode[] = []
    for (const token of tokens) {
        if (queryRegex.test(token)) {
            const name = token.replace(operatorRegex, "")
            const order = token.startsWith("-") ? "Desc" : "Asc"
            const prop = meta.properties.find(x => x.name === name)
            const invalidProperty = !prop ? true : undefined
            const authDecorators = !prop ? [] : prop.decorators.filter((x: AuthorizeDecorator) => x.type === "plumier-meta:authorize" && x.access === "read")
            result.push({ name, order, invalidProperty, authDecorators })
        }
        else {
            result.push({ name: token, order: "Asc", invalidProperty: true, authDecorators: [] })
        }
    }
    return result
}

function createCustomOrderConverter(transformer: (nodes: OrderColumnNode[], type:Class) => any): CustomConverter {
    return (i, ctx) => {
        if (i.value === undefined || i.value === null) return i.proceed()
        const decorator = i.decorators.find((x: OrderParserDecorator): x is OrderParserDecorator => x.kind === "plumier-meta:order-parser-decorator")
        if (!decorator) return i.proceed()
        const controller = ctx.route.controller.type
        const type = getDecoratorType(controller, decorator)
        const nodes = parseQueryString(type, i.value + "")
        const invalids = nodes.filter(x => x.invalidProperty).map(x => `Invalid property ${x.name}`)
        if (invalids.length > 0) return Result.error(i.value, i.path, invalids)
        const result: any = transformer(nodes, type)
        result[ParserAst] = nodes
        return Result.create(result)
    }
}

export { createCustomOrderConverter, OrderColumnNode }