import { CustomConverter } from "@plumier/core"
import { Class, generic, type } from "@plumier/reflect"
import converterFactory, { Result, ResultMessages } from "@plumier/validator"

import { FilterParserDecorator } from "./decorator"
import { EquationExpression, FilterNode, FilterNodeVisitor, filterNodeWalker, parseFilter } from "./parser"


function createVisitor(type: Class, path: string, error: ResultMessages[]): FilterNodeVisitor {
    const converter = converterFactory(type)
    return (node, prop, value) => {
        // we don't check property = property expression
        if (value.annotation === "Property") return node
        const result = converter({ [prop.value]: value.value })
        if (result.issues)
            error.push(...result.issues)
        const cleansed = result.value[prop.value]
        if (!(prop.value in result.value))
            error.push({ path: `${path}.${prop.value}`, messages: [`Unknown property ${prop.value}`] })
        if (node.right === prop)
            return <EquationExpression>{ ...node, left: { ...value, value: cleansed } }
        else
            return <EquationExpression>{ ...node, right: { ...value, value: cleansed } }
    }
}

function getDecoratorType(controller: Class, decorator: FilterParserDecorator) {
    // extract generic type from controller if string type provided
    const expType = decorator.type()
    return typeof expType === "string" ? generic.getGenericType(controller, expType) as Class : expType
}

function validateFilter(value: {}, path: string, type: Class): Result {
    const rawValue = Array.isArray(value) ? value : [value]
    if (rawValue.some(x => typeof x !== "string"))
        return Result.error(value, path, "String or array string value expected")
    const combined = (rawValue as string[]).map(x => x.startsWith("(") ? x : `(${x})`).join(" AND ")
    const node = parseFilter(combined)
    const issues: ResultMessages[] = []
    const visitor = createVisitor(type, path, issues)
    const cleansedNode = filterNodeWalker(node, visitor)
    if (issues.length > 0)
        return { value, issues }
    return Result.create(cleansedNode)
}

function createFilterConverter(transformer: ((node: FilterNode) => any)): CustomConverter {
    return (i, ctx) => {
        if (i.value === undefined || i.value === null) return i.proceed()
        const decorator = i.decorators.find((x: FilterParserDecorator): x is FilterParserDecorator => x.kind === "plumier-meta:filter-parser-decorator")
        if (!decorator) return i.proceed()
        try {
            const type = getDecoratorType(ctx.route.controller.type, decorator)
            const valResult = validateFilter(i.value, i.path, type)
            if (!!valResult.issues) return valResult
            return Result.create(transformer(valResult.value))
        }
        catch (e) {
            return Result.error(i.value, i.path, e.message)
        }
    }
}

export { createFilterConverter, getDecoratorType }