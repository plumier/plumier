import { Grammar, Parser } from "nearley"

import grammar from "./grammar"


type FilterNode = LogicExpression | ComparisonExpression | UnaryExpression | PropertyLiteral | BooleanLiteral |
    NumberLiteral | StringLiteral | LikeExpression | RangeExpression

type Literal = BooleanLiteral | NumberLiteral | PropertyLiteral | StringLiteral |
    StringRangeLiteral | NumberLiteral | NumberRangeLiteral | NullLiteral

type EquationExpression = ComparisonExpression | LikeExpression | RangeExpression


interface LogicExpression {
    kind: "LogicExpression"
    operator: "and" | "or"
    left: FilterNode
    right: FilterNode
    col: number
}

interface ComparisonExpression {
    kind: "ComparisonExpression"
    operator: "gt" | "lt" | "gte" | "lte" | "ne" | "eq"
    left: Literal
    right: Literal
    col: number
}

interface LikeExpression {
    kind: "ComparisonExpression"
    operator: "like"
    left: PropertyLiteral
    right: StringLiteral
    col: number
}

interface RangeExpression {
    kind: "ComparisonExpression"
    operator: "range"
    left: PropertyLiteral
    right: StringRangeLiteral | NumberRangeLiteral
    col: number
}

interface UnaryExpression {
    kind: "UnaryExpression"
    operator: "not"
    argument: FilterNode
    col: number
}

interface PropertyLiteral {
    kind: "Literal",
    annotation: "Property",
    value: "string"
    col: number
}

interface BooleanLiteral {
    kind: "Literal",
    annotation: "Boolean"
    value: boolean
    col: number
}

interface NumberLiteral {
    kind: "Literal",
    annotation: "Number"
    value: number
    col: number
}

interface StringLiteral {
    kind: "Literal",
    annotation: "String"
    preference: "startsWith" | "endsWith" | "contains" | "none"
    value: string
    col: number
}

interface StringRangeLiteral {
    kind: "Literal",
    annotation: "String"
    value: [string, string]
    col: number
}

interface NumberRangeLiteral {
    kind: "Literal",
    annotation: "Number"
    value: [number, number]
    col: number
}

interface NullLiteral {
    kind: "Literal",
    annotation: "Null"
    value: undefined
    col: number
}


function parseFilter(query: string) {
    try {
        const parser = new Parser(Grammar.fromCompiled(grammar))
        parser.feed(query)
        const result = parser.finish()
        return result[0] as FilterNode
    }
    catch (e) {
        const token = `${query.slice(0, e.offset)}>${query.slice(e.offset)}`;
        throw new Error(`Syntax error at col ${e.offset}: ${token}`)
    }
}

type FilterNodeVisitor = (node: EquationExpression, prop: PropertyLiteral, value: Literal) => EquationExpression

function filterNodeWalker(node: FilterNode, visitor: FilterNodeVisitor): FilterNode {
    switch (node.kind) {
        case "ComparisonExpression":
            const { left, right } = node
            if (left.annotation === "Property" && right.annotation == "Property")
                return visitor(node, left, right)
            if (left.annotation === "Property" && right.annotation !== "Property")
                return visitor(node, left, right)
            return visitor(node, (right as PropertyLiteral), left)
        case "UnaryExpression":
            return { ...node, argument: filterNodeWalker(node.argument, visitor) }
        default:
            // "LogicExpression"
            const newNode = node as LogicExpression
            return {
                ...newNode,
                left: filterNodeWalker(newNode.left, visitor),
                right: filterNodeWalker(newNode.right, visitor)
            }
    }
}

export {
    parseFilter, filterNodeWalker, FilterNode, LikeExpression, Literal, RangeExpression, FilterNodeVisitor,
    LogicExpression, ComparisonExpression, UnaryExpression, PropertyLiteral, BooleanLiteral, NullLiteral,
    NumberLiteral, NumberRangeLiteral, StringLiteral, StringRangeLiteral, EquationExpression
}