import { SelectQuery } from "@plumier/core"
import {
    ColumnNode,
    createCustomFilterConverter,
    createCustomSelectConverter,
    EquationExpression,
    FilterNode,
    getKeyValue,
    LogicalExpression,
    NumberRangeLiteral,
    StringLiteral,
    StringRangeLiteral,
    UnaryExpression,
} from "@plumier/filter-parser"
import { Between, IsNull, LessThan, LessThanOrEqual, Like, MoreThan, MoreThanOrEqual, Not } from "typeorm"


// --------------------------------------------------------------------- //
// -------------------------- FILTER CONVERTER ------------------------- //
// --------------------------------------------------------------------- //

function logic(node: LogicalExpression) {
    const left = transform(node.left)
    const right = transform(node.right)
    switch (node.operator) {
        case "and":
            return { ...left, ...right }
        case "or":
            return [left, right]
    }
}

function comparison(node: EquationExpression): {} {
    const [key, value] = getKeyValue(node)
    switch (node.operator) {
        case "eq":
            if (value.annotation === "Null")
                return { [key.value]: IsNull() }
            return { [key.value]: value.value }
        case "gt":
            return { [key.value]: MoreThan(value.value) }
        case "gte":
            return { [key.value]: MoreThanOrEqual(value.value) }
        case "lt":
            return { [key.value]: LessThan(value.value) }
        case "lte":
            return { [key.value]: LessThanOrEqual(value.value) }
        case "ne":
            if (value.annotation === "Null")
                return { [key.value]: Not(IsNull()) }
            return { [key.value]: Not(value.value) }
        case "like":
            const str = value as StringLiteral
            if (str.preference === "startsWith")
                return { [key.value]: Like(`${value.value}%`) }
            if (str.preference === "endsWith")
                return { [key.value]: Like(`%${value.value}`) }
            return { [key.value]: Like(`%${value.value}%`) }
        case "range":
            const range = value as StringRangeLiteral | NumberRangeLiteral
            return { [key.value]: Between(range.value[0], range.value[1]) }
    }
}

function unary(node: UnaryExpression) {
    const arg = transform(node.argument)
    return Not(arg)
}

function transform(node: FilterNode): any {
    switch (node.kind) {
        case "ComparisonExpression":
            return comparison(node)
        case "LogicalExpression":
            return logic(node)
        case "UnaryExpression":
            return unary(node)
    }
}

const filterConverter = createCustomFilterConverter(transform)



// --------------------------------------------------------------------- //
// -------------------------- SELECT CONVERTER ------------------------- //
// --------------------------------------------------------------------- //

function selectTransformer(nodes: ColumnNode[]): SelectQuery {
    const columns: string[] = []
    const relations: string[] = []
    for (const node of nodes) {
        if (node.kind === "Column")
            columns.push(node.name)
        else
            relations.push(node.name)
    }
    return { columns, relations }
}

const selectConverter = createCustomSelectConverter(selectTransformer)


export { filterConverter, selectConverter }