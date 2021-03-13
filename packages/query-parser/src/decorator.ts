import { Class } from "@plumier/core";
import { decorateParameter, mergeDecorator, type as decType } from "@plumier/reflect";

interface FilterParserDecorator {
    kind: "plumier-meta:filter-parser-decorator"
    type: (() => Class | string)
}

interface SelectParserDecorator {
    kind: "plumier-meta:select-parser-decorator"
    type: (() => Class | string)
}

interface OrderParserDecorator {
    kind: "plumier-meta:order-parser-decorator"
    type: (() => Class | string)
}

function filterParser(type: ((x:any) => Class | string) ) {
    return mergeDecorator(
        decType(x => String),
        decorateParameter(x => <FilterParserDecorator>{ kind: "plumier-meta:filter-parser-decorator", type })
    )
}

function selectParser(type: ((x:any) => Class | string) ) {
    return mergeDecorator(
        decType(x => String),
        decorateParameter(x => <SelectParserDecorator>{ kind: "plumier-meta:select-parser-decorator", type })
    )
}

function orderParser(type: ((x:any) => Class | string) ) {
    return mergeDecorator(
        decType(x => String),
        decorateParameter(x => <OrderParserDecorator>{ kind: "plumier-meta:order-parser-decorator", type })
    )
}

export { 
    filterParser, FilterParserDecorator,
    selectParser, SelectParserDecorator,
    orderParser, OrderParserDecorator,
}