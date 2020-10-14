import { Result, VisitorInvocation } from "typedconverter"

import { AuthorizeDecorator } from "./authorization"
import { ActionContext, FilterQuery } from "./types"


const findAuthorizeFilter = (x: AuthorizeDecorator): x is AuthorizeDecorator => x.type === "plumier-meta:authorize" && x.access === "filter"

const notFilter = (i: VisitorInvocation, ctx: ActionContext) => ctx.method !== "GET" || !i.parent || i.value === undefined || i.value === null

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
    const isNumber = (value: string) => !Number.isNaN(Number(value))
    const isDate = (value: string) => !Number.isNaN(new Date(value).getTime())
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

function exactFilterConverter(i: VisitorInvocation, ctx: ActionContext) {
    if (notFilter(i, ctx)) return i.proceed()
    const result = i.proceed()
    if (!!result.issues) return result
    return Result.create(<FilterQuery>{ type: "exact", value: result.value })
}

// the order in reverse.
// evaluation starts from range -> partial -> exact
export const filterConverters = [exactFilterConverter, partialFilterConverter, rangeFilterConverter, filterConverter]
