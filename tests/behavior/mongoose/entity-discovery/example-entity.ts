import { meta } from "@plumier/core"
import { MongooseHelper, collection } from "@plumier/mongoose"

export const helper = new MongooseHelper()

@collection()
export class ChildOfNestedEntity {
    constructor(
        public name: string
    ) { }
}


@collection()
export class NestedEntity {
    constructor(
        public name: string,
        @collection.ref(x => [ChildOfNestedEntity])
        public tags: ChildOfNestedEntity[]
    ) { }
}

@meta.parameterProperties()
export class NonCollection {
    constructor(
        public name: string,
        public tags: ChildOfNestedEntity[]
    ) { }
}