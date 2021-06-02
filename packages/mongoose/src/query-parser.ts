import { Class, entityHelper, SelectQuery } from "@plumier/core"
import {
    createCustomFilterConverter,
    EquationExpression,
    FilterNode,
    getKeyValue,
    LogicalExpression,
    NumberRangeLiteral,
    StringLiteral,
    StringRangeLiteral,
    UnaryExpression,
    createCustomSelectConverter,
    SelectColumnNode,
    OrderColumnNode,
    createCustomOrderConverter,
} from "@plumier/query-parser"


// --------------------------------------------------------------------- //
// -------------------------- FILTER CONVERTER ------------------------- //
// --------------------------------------------------------------------- //


function logic(node: LogicalExpression) {
    const left = filterTransformer(node.left)
    const right = filterTransformer(node.right)
    switch (node.operator) {
        case "and":
            return { $and: [left, right] }
        case "or":
            return { $or: [left, right] }
    }
}

function comparison(node: EquationExpression): {} {
    const [key, value] = getKeyValue(node)
    switch (node.operator) {
        case "eq":
            if (value.annotation === "Null")
                return { [key.value]: { $exists: true } }
            return { [key.value]: value.value }
        case "gt":
            return { [key.value]: { $gt: value.value } }
        case "gte":
            return { [key.value]: { $gte: value.value } }
        case "lt":
            return { [key.value]: { $lt: value.value } }
        case "lte":
            return { [key.value]: { $lte: value.value } }
        case "ne":
            if (value.annotation === "Null")
                return { [key.value]: { $exists: false } }
            return { [key.value]: { $ne: value.value } }
        case "like":
            const str = value as StringLiteral
            if (str.preference === "startsWith")
                return { [key.value]: { $regex: `^${value.value}`, $options: "i" } }
            if (str.preference === "endsWith")
                return { [key.value]: { $regex: `${value.value}$`, $options: "i" } }
            return { [key.value]: { $regex: `${value.value}`, $options: "i" } }
        case "range":
            const range = value as StringRangeLiteral | NumberRangeLiteral
            return {
                $and: [
                    { [key.value]: { $gte: range.value[0] } },
                    { [key.value]: { $lte: range.value[1] } },
                ]
            }
    }
}

function unary(node: UnaryExpression) {
    if (node.argument.operator === "or" || node.argument.operator === "and")
        throw new Error(`Global Not operator doesn't supported in MongoDB at col ${node.col}`)
    const arg = filterTransformer(node.argument)
    const key = Object.keys(arg)[0]
    const value = arg[key]
    return { [key]: { $not: value } }
}

function filterTransformer(node: FilterNode): any {
    switch (node.kind) {
        case "ComparisonExpression":
            return comparison(node)
        case "LogicalExpression":
            return logic(node)
        case "UnaryExpression":
            return unary(node)
    }
}

const filterConverter = createCustomFilterConverter(filterTransformer)


// --------------------------------------------------------------------- //
// -------------------------- SELECT CONVERTER ------------------------- //
// --------------------------------------------------------------------- //

function selectTransformer(nodes: SelectColumnNode[], type:Class): SelectQuery {
    const id = entityHelper.getIdProp(type)!
    const includeId = nodes.some(x => x.name === id.name) ? true : undefined
    // if the ID was not included than include it manually 
    // later it will be used as Authorization Response ID
    const columns: string[] = !includeId ? [id.name] : []
    const relations: string[] = []
    for (const node of nodes) {
        if (node.kind === "Column")
            columns.push(node.name)
        else
            relations.push(node.name)
    }
    return { includeId , columns, relations }
}

const selectConverter = createCustomSelectConverter(selectTransformer)


// --------------------------------------------------------------------- //
// -------------------------- ORDER CONVERTER -------------------------- //
// --------------------------------------------------------------------- //

function orderTransformer(nodes: OrderColumnNode[]) {
    const result:any = {}
    for (const node of nodes) {
        result[node.name] = node.order === "Asc" ? 1 : -1
    }
    return result
}

const orderConverter = createCustomOrderConverter(orderTransformer)

export { filterConverter, selectConverter, orderConverter }