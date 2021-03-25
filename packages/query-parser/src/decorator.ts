import { Class } from "@plumier/core";
import { decorateParameter, mergeDecorator, type as decType } from "@plumier/reflect";


interface QueryParserDecorator {
    type: Class | string | ((x:any) => Class | string)
    target: Class
}

interface FilterParserDecorator extends QueryParserDecorator{
    kind: "plumier-meta:filter-parser-decorator"
}

interface SelectParserDecorator extends QueryParserDecorator{
    kind: "plumier-meta:select-parser-decorator"
}

interface OrderParserDecorator extends QueryParserDecorator{
    kind: "plumier-meta:order-parser-decorator"
}

function filterParser(type: Class | string | ((x:any) => Class | string) ) {
    return mergeDecorator(
        decType(x => String),
        decorateParameter(x => <FilterParserDecorator>{ target: x, kind: "plumier-meta:filter-parser-decorator", type })
    )
}

function selectParser(type: Class | string | ((x:any) => Class | string) ) {
    return mergeDecorator(
        decType(x => String),
        decorateParameter(x => <SelectParserDecorator>{ target: x, kind: "plumier-meta:select-parser-decorator", type })
    )
}

function orderParser(type: Class | string | ((x:any) => Class | string) ) {
    return mergeDecorator(
        decType(x => String),
        decorateParameter(x => <OrderParserDecorator>{ target: x, kind: "plumier-meta:order-parser-decorator", type })
    )
}

export { 
    filterParser, FilterParserDecorator,
    selectParser, SelectParserDecorator,
    orderParser, OrderParserDecorator,
    QueryParserDecorator
}