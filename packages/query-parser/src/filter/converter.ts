import { ActionContext, CustomConverter } from "@plumier/core"
import reflect, { Class, generic, type } from "@plumier/reflect"
import converterFactory, { Result, ResultMessages, VisitorExtension } from "@plumier/validator"

import { FilterParserDecorator } from "../decorator"
import { getDecoratorType, ParserAst } from "../helper"
import { EquationExpression, FilterNode, FilterNodeVisitor, filterNodeWalker, parseFilter } from "./parser"


function createNodeWalkerVisitor(type: Class, path: string, globalConverterVisitors: VisitorExtension[], error: ResultMessages[]): FilterNodeVisitor {
    return (node, prop, value) => {

        const meta = reflect(type)
        const leftProp = meta.properties.find(x => x.name === prop.value)
        if (!leftProp) throw new Error(`Unknown property ${prop.value}`)
        if (value.annotation === "Property") {
            if (!meta.properties.some(x => x.name === value.value))
                throw new Error(`Unknown property ${value.value}`)
            // we don't check further property = property expression
            return node
        }
        const expType = value.preference === "range" ? [leftProp.type] : leftProp.type
        // use global converter visitor to get advantage of Plumier application setup such as: relation converter etc
        const converter = converterFactory({ type: expType, path: `${path}.${prop.value}`, visitors: globalConverterVisitors, decorators: leftProp.decorators })
        const result = converter(value.value)
        if (result.issues)
            error.push(...result.issues)
        const cleansed = result.value
        if (node.right === prop)
            return <EquationExpression>{ ...node, left: { ...value, value: cleansed } }
        else
            return <EquationExpression>{ ...node, right: { ...value, value: cleansed } }
    }
}

function validateFilter(value: {}, path: string, type: Class, globalVisitors: VisitorExtension[]): Result {
    const rawValue = Array.isArray(value) ? value : [value]
    if (rawValue.some(x => typeof x !== "string"))
        return Result.error(value, path, "String or array string value expected")
    const combined = (rawValue as string[]).map(x => x.startsWith("(") ? x : `(${x})`).join(" AND ")
    const node = parseFilter(combined)
    const issues: ResultMessages[] = []
    const visitor = createNodeWalkerVisitor(type, path, globalVisitors, issues)
    const cleansedNode = filterNodeWalker(node, visitor)
    if (issues.length > 0)
        return { value, issues }
    return Result.create(cleansedNode)
}

function createCustomFilterConverter(transformer: ((node: FilterNode) => any)): CustomConverter {
    return (i, ctx) => {
        if (i.value === undefined || i.value === null) return i.proceed()
        const decorator = i.decorators.find((x: FilterParserDecorator): x is FilterParserDecorator => x.kind === "plumier-meta:filter-parser-decorator")
        if (!decorator) return i.proceed()
        try {
            const type = getDecoratorType(ctx.route.controller.type, decorator)
            const globalVisitors = ctx.config.typeConverterVisitors.map<VisitorExtension>(x => i => x(i, ctx))
            const valResult = validateFilter(i.value, i.path, type, globalVisitors)
            if (!!valResult.issues) return valResult
            const transformed: any = transformer(valResult.value)
            transformed[ParserAst] = valResult.value
            return Result.create(transformed)
        }
        catch (e) {
            return Result.error(i.value, i.path, e.message)
        }
    }
}

export { createCustomFilterConverter }