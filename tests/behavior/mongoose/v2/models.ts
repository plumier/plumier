import { MongooseHelper, collection } from "@plumier/mongoose"

export const helper = new MongooseHelper()

@collection()
export class Tag {
    constructor(
        public name: string
    ) { }
}
helper.model(Tag)
@collection()
export class Animal {
    constructor(
        public name: string,
        @collection.ref(x => [Tag])
        public tags: Tag[]
    ) { }
}
helper.model(Animal)