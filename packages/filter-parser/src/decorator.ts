import { Class } from "@plumier/core";
import { decorateParameter, mergeDecorator, type as decType } from "@plumier/reflect";

interface FilterDecorator {
    kind: "plumier-meta:filter-decorator"
    type:Class
}


function stringFilter(type:Class) {
    return mergeDecorator(
        decType(x => String),
        decorateParameter(<FilterDecorator>{kind: "plumier-meta:filter-decorator", type})
    ) 
}

export {stringFilter, FilterDecorator}