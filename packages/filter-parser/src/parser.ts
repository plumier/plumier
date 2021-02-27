import { Grammar, Parser } from "nearley"

import grammar from "./grammar"


type FilterNode = BinaryExpression | UnaryExpression | PropertyLiteral | BooleanLiteral |
    NumberLiteral | StringLiteral | LikeExpression | RangeExpression

interface BinaryExpression {
    kind: "BinaryExpression"
    operator: "gt" | "lt" | "gte" | "lte" | "ne" | "eq" | "and" | "or" 
    left: FilterNode
    right: FilterNode
}

interface LikeExpression {
    kind: "BinaryExpression"
    operator: "like"
    left: PropertyLiteral
    right: StringLiteral
}

interface RangeExpression {
    kind: "BinaryExpression"
    operator: "range"
    left: PropertyLiteral
    right: StringRangeLiteral | NumberRangeLiteral
}

interface UnaryExpression {
    kind: "UnaryExpression"
    operator: "not"
    argument: FilterNode
}

interface PropertyLiteral {
    kind: "Property",
    value: "string"
}

interface BooleanLiteral {
    kind: "Boolean"
    value: boolean
}

interface NumberLiteral {
    kind: "Number"
    value: number
}

interface StringLiteral {
    kind: "String"
    preference: "startsWith" | "endsWith" | "contains" | "none"
    value: string
}

interface StringRangeLiteral {
    kind: "String"
    value: [string, string]
}

interface NumberRangeLiteral {
    kind: "Number"
    value: [number, number]
}

function parseFilter(query: string) {
    try {
        const parser = new Parser(Grammar.fromCompiled(grammar))
        parser.feed(query)
        const result = parser.finish()
        return result[0] as FilterNode
    }
    catch (e) {
        const token =`${query.slice(0, e.offset)}>${query.slice(e.offset)}`; 
        throw new Error(`Syntax error at col ${e.offset}: ${token}`)
    }
}

export {
    parseFilter, FilterNode, LikeExpression,
    BinaryExpression, UnaryExpression, PropertyLiteral, BooleanLiteral, 
    NumberLiteral, NumberRangeLiteral, StringLiteral, StringRangeLiteral,
}