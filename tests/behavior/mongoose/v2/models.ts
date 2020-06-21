import { generator, collection } from "@plumier/mongoose"
import { Mongoose } from "mongoose"

export const { mongoose, model } = generator(new Mongoose())

@collection()
export class Tag {
    constructor(
        public name: string
    ) { }
}
model(Tag)
@collection()
export class Animal {
    constructor(
        public name: string,
        @collection.ref(x => [Tag])
        public tags: Tag[]
    ) { }
}
model(Animal)