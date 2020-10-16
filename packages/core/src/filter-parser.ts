import { Result, VisitorInvocation } from "typedconverter"
import { defaultConverters } from 'typedconverter/src/converter'

import { AuthorizeDecorator } from "./authorization"
import { Class, entityHelper, isCustomClass } from './common'
import { RelationDecorator } from './decorator/entity'
import { ActionContext, FilterQuery } from "./types"


const findAuthorizeFilter = (x: AuthorizeDecorator): x is AuthorizeDecorator => x.type === "plumier-meta:authorize" && x.access === "filter"
const notFilter = (i: VisitorInvocation, ctx: ActionContext) => ctx.method !== "GET" || !i.parent || i.value === undefined || i.value === null
const isNumber = (value: string) => !Number.isNaN(Number(value))
const isDate = (value: string) => !Number.isNaN(new Date(value).getTime())
const isComparableValue = (value: string) => isNumber(value) || isDate(value)
const isComparableType = (type: Class) => type === Date || type === Number

function convert(decorators: any[], type: Class, value: string): [any, string?] {
    if (isCustomClass(type)) {
        if (decorators.find((x: RelationDecorator) => x.kind === "plumier-meta:relation")) {
            const idType = entityHelper.getIdType(type)
            const converter = defaultConverters.get(idType)!
            return [converter(value)]
        }
        return [, "Nested type filters are not supported"]
    }
    const converter = defaultConverters.get(type)!
    const result = converter(value)
    if (!result) return [, `Unable to convert "${value}" into ${type.name}`]
    return [result]
}

function filterConverter(i: VisitorInvocation, ctx: ActionContext) {
    if (notFilter(i, ctx)) return i.proceed()
    if (!i.decorators.find(findAuthorizeFilter))
        return Result.error(i.value, i.path, `Property ${i.path} is not filterable`)
    return i.proceed()
}

function partialFilterConverter(i: VisitorInvocation, ctx: ActionContext) {
    if (notFilter(i, ctx)) return i.proceed()
    const value = i.value.toString()
    if (!value.startsWith("*") && !value.endsWith("*")) return i.proceed()
    if (i.type !== String) return Result.error(i.value, i.path, "Partial filter only applicable on string field")
    if (value.startsWith("*") && value.endsWith("*"))
        return Result.create(<FilterQuery>{ type: "partial", partial: "both", value: value.substr(0, value.length - 1).substr(1) })
    if (value.startsWith("*"))
        return Result.create(<FilterQuery>{ type: "partial", partial: "start", value: value.substr(1) })
    return Result.create(<FilterQuery>{ type: "partial", partial: "end", value: value.substr(0, value.length - 1) })
}

function rangeFilterConverter(i: VisitorInvocation, ctx: ActionContext) {
    if (notFilter(i, ctx)) return i.proceed()
    const value = i.value.toString()
    const tokens = value.split("...")
    if (tokens.length !== 2) return i.proceed()
    if (i.type === Date) {
        if (!isDate(tokens[0])) return Result.error(i.value, i.path, `Unable to convert "${tokens[0]}" into date`)
        if (!isDate(tokens[1])) return Result.error(i.value, i.path, `Unable to convert "${tokens[1]}" into date`)
        return Result.create(<FilterQuery>{ type: "range", value: [new Date(tokens[0]), new Date(tokens[1])] })
    }
    if (i.type === Number) {
        if (!isNumber(tokens[0])) return Result.error(i.value, i.path, `Unable to convert "${tokens[0]}" into number`)
        if (!isNumber(tokens[1])) return Result.error(i.value, i.path, `Unable to convert "${tokens[1]}" into number`)
        return Result.create(<FilterQuery>{ type: "range", value: [Number(tokens[0]), Number(tokens[1])] })
    }
    return Result.error(i.value, i.path, "Range filter only applicable on date and number filed")
}

function conditionalFilter(i: VisitorInvocation, ctx: ActionContext, sign: string, type: "gte" | "gt" | "lte" | "lt") {
    if (notFilter(i, ctx)) return i.proceed()
    const token = i.value.toString()
    if (!token.startsWith(sign)) return i.proceed()
    if (!isComparableType(i.type))
        return Result.error(i.value, i.path, `${type.toUpperCase()} ${sign} filter only applicable on date and number filed`)
    const value = token.substr(sign.length)
    if (!isComparableValue(value))
        return Result.error(i.value, i.path, `Unable to convert "${value}" into ${i.type.name}`)
    return Result.create(<FilterQuery>{ type, value })
}

function greaterThanOrEqualConverter(i: VisitorInvocation, ctx: ActionContext) {
    return conditionalFilter(i, ctx, ">=", "gte")
}

function lessThanOrEqualConverter(i: VisitorInvocation, ctx: ActionContext) {
    return conditionalFilter(i, ctx, "<=", "lte")
}

function greaterThanConverter(i: VisitorInvocation, ctx: ActionContext) {
    return conditionalFilter(i, ctx, ">", "gt")
}

function lessThanConverter(i: VisitorInvocation, ctx: ActionContext) {
    return conditionalFilter(i, ctx, "<", "lt")
}

function notEqualConverter(i: VisitorInvocation, ctx: ActionContext) {
    if (notFilter(i, ctx)) return i.proceed()
    const token = i.value.toString()
    if (!token.startsWith("!")) return i.proceed()
    const raw = token.substring(1)
    const [value, error] = convert(i.decorators, i.type, raw)
    if (error) return Result.error(i.value, i.path, error)
    return Result.create(<FilterQuery>{ type: "ne", value: value })
}

function exactFilterConverter(i: VisitorInvocation, ctx: ActionContext) {
    if (notFilter(i, ctx)) return i.proceed()
    const [value, error] = convert(i.decorators, i.type, i.value.toString())
    if (error) return Result.error(i.value, i.path, error)
    return Result.create(<FilterQuery>{ type: "equal", value: value })
}

// order of the converter from the most important
export const filterConverters = [
    filterConverter,
    greaterThanOrEqualConverter,
    lessThanOrEqualConverter,
    greaterThanConverter,
    lessThanConverter,
    notEqualConverter,
    rangeFilterConverter,
    partialFilterConverter,
    exactFilterConverter
].reverse()
