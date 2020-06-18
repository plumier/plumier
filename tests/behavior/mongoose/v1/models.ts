import model, { collection } from "@plumier/mongoose"

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