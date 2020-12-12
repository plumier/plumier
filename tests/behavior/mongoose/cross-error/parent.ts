import model, { proxy, collection } from "@plumier/mongoose"
import { noop } from "@plumier/reflect"
import { Child } from './child'

@collection()
export class Parent {
    @noop()
    name:string 

    @collection.ref([Child])
    children:Child[]
}
