import { AuthorizeDecorator, CustomConverter, RelationDecorator, RelationPropertyDecorator } from "@plumier/core"
import reflect, { Class } from "@plumier/reflect"
import { Result } from "@plumier/validator"

import { SelectParserDecorator } from "../decorator"
import { getDecoratorType, ParserAst } from "../helper"

type ColumnKind = "Column" | "RelationSingle" | "RelationArray" | "InverseProperty"

interface ColumnNode {
    kind: ColumnKind
    name: string
    invalidProperty?: true
    skipAuthCheck?: true
    authDecorators: AuthorizeDecorator[]
}

interface SelectionOption {
    exclude: ColumnKind[],
    skipAuthCheck?: true
}

function getDefaultSelection(controller: Class, type: Class, opt?: Partial<SelectionOption>) {
    const option: SelectionOption = { exclude: [], ...opt }
    const meta = reflect(type)
    const result: ColumnNode[] = []
    const ctlMeta = reflect(controller)
    const ctlRelation = ctlMeta.decorators.find((x: RelationPropertyDecorator): x is RelationPropertyDecorator => x.kind === "plumier-meta:relation-prop-name")
    for (const prop of meta.properties) {
        const isInverseProperty = prop.name === ctlRelation?.inverseProperty
        const relation = prop.decorators.find((x: RelationDecorator): x is RelationDecorator => x.kind === "plumier-meta:relation")
        const kind: ColumnKind =
            isInverseProperty ? "InverseProperty" :
                !relation ? "Column" :
                    Array.isArray(prop.type) ? "RelationArray" : "RelationSingle"
        if (option.exclude.some(x => x === kind)) continue
        const authDecorators = prop.decorators.filter((x: AuthorizeDecorator) => x.type === "plumier-meta:authorize" && x.access === "read")
        result.push({ kind, name: prop.name, skipAuthCheck: option.skipAuthCheck, authDecorators })
    }
    return result
}

function parseQueryString(controller: Class, type: Class, query: string): ColumnNode[] {
    const tokens = query.split(",").map(x => x.trim())
    const defaultNodes = getDefaultSelection(controller, type)
    const result: ColumnNode[] = []
    for (const token of tokens) {
        const exists = defaultNodes.find(x => x.name === token)
        if (exists)
            result.push(exists)
        else
            result.push({ kind: "Column", name: token, invalidProperty: true, authDecorators: [] })
    }
    return result
}

function createCustomSelectConverter(transformer: (nodes: ColumnNode[]) => any): CustomConverter {
    return (i, ctx) => {
        const decorator = i.decorators.find((x: SelectParserDecorator): x is SelectParserDecorator => x.kind === "plumier-meta:select-parser-decorator")
        if (!decorator) return i.proceed()
        const controller = ctx.route.controller.type
        const type = getDecoratorType(controller, decorator.type())
        // default selection: all column except RelationArray and InverseProperty
        // skip auth check, let response authorizer does its job
        let nodes: ColumnNode[]
        if (i.value === undefined || i.value === null) {
            nodes = getDefaultSelection(controller, type, { exclude: ["InverseProperty", "RelationArray"], skipAuthCheck: true })
        }
        else {
            nodes = parseQueryString(controller, type, i.value + "")
            const invalids = nodes.filter(x => x.invalidProperty).map(x => `Invalid property ${x.name}`)
            if (invalids.length > 0) return Result.error(i.value, i.path, invalids)
        }
        const result: any = transformer(nodes)
        result[ParserAst] = nodes
        return Result.create(result)
    }
}

export { createCustomSelectConverter, ColumnNode }