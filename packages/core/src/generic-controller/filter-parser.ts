import { Class } from "@plumier/reflect"
import { Grammar, Parser } from "nearley"

import grammar from "./filter-grammar"


type FilterNode = LogicalNode | ComparisonNode

interface LogicalNode {
    kind: "Logic"
    name: string
    left: FilterNode
    right: FilterNode
}

interface ComparisonNode {
    kind: "Comparison"
    name: string
    prop: string
    value: string | number | boolean
}

function parseFilter(query: string) {
    const parser = new Parser(Grammar.fromCompiled(grammar))
    parser.feed(query)
    const result = parser.finish()
    return result[0] as FilterNode
}

export { parseFilter, LogicalNode, ComparisonNode, FilterNode }