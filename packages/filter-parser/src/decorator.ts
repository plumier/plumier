import { Class } from "@plumier/core";
import { decorateParameter, mergeDecorator, type as decType } from "@plumier/reflect";

interface FilterParserDecorator {
    kind: "plumier-meta:filter-parser-decorator"
    type: (() => Class | string)
}


function filterParser(type: ((x:any) => Class | string) ) {
    return mergeDecorator(
        decType(x => String),
        decorateParameter(x => <FilterParserDecorator>{ kind: "plumier-meta:filter-parser-decorator", type })
    )
}

export { filterParser, FilterParserDecorator }