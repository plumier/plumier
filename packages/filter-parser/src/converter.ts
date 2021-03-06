import { CustomConverter } from "@plumier/core"
import reflect, { Class, generic, type } from "@plumier/reflect"
import converterFactory, { Result, ResultMessages } from "@plumier/validator"

import { FilterParserDecorator } from "./decorator"
import { EquationExpression, FilterNode, FilterNodeVisitor, filterNodeWalker, Literal, parseFilter, PropertyLiteral } from "./parser"


function createVisitor(type: Class, path: string, error: ResultMessages[]): FilterNodeVisitor {
    return (node, prop, value) => {
        // we don't check property = property expression
        if (value.annotation === "Property") return node
        const meta = reflect(type)
        const propType = meta.properties.find(x => x.name === prop.value)!.type as Class
        const expType = value.preference === "range" ? [propType] : propType
        const converter = converterFactory({type: expType})
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