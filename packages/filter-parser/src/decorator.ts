import { Class } from "@plumier/core";
import { decorateParameter, mergeDecorator, type as decType } from "@plumier/reflect";

interface FilterParserDecorator {
    kind: "plumier-meta:filter-parser-decorator"
    type: Class
}


function filterParser(type: Class) {
    return mergeDecorator(
        decType(x => String),
        decorateParameter(<FilterParserDecorator>{ kind: "plumier-meta:filter-parser-decorator", type })
    )
}

export { filterParser, FilterParserDecorator }