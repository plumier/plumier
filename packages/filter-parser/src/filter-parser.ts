import { Class } from "@plumier/reflect"
import { Grammar, Parser } from "nearley"

import grammar from "./filter-grammar"


type FilterNode = ComparisonNode | BinaryNode | UnaryNode | ParenthesisNode

interface ComparisonNode {
    type: "Comparison"
    name: "gt" | "lt" | "gte" | "lte" | "ne" | "eq" | "range" | "endsWith" | "startsWith" | "contains"
    prop: string
    value: any
}

interface BinaryNode {
    type: "Binary"
    name: "and" | "or"
    left: FilterNode
    right: FilterNode
}

interface UnaryNode {
    type: "Unary"
    name: "not"
    expr: FilterNode
}

interface ParenthesisNode {
    type: "Parenthesis"
    expr: FilterNode
}

function parseFilter(query: string) {
    //try {
        const parser = new Parser(Grammar.fromCompiled(grammar))
        parser.feed(query)
        const result = parser.finish()
        return result[0] as FilterNode
    // }
    // catch (e) {
    //     const [msg0, , msg1, msg2] = e.message.split("\n")
    //     throw new Error([msg0, msg1, msg2].join("\n"))
    // }
}

export { parseFilter, FilterNode }