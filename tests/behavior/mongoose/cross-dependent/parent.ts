import model, { proxy, collection } from "@plumier/mongoose"
import { noop } from "tinspector"
import { Child } from './child'

@collection()
export class Parent {
    @noop()
    name:string 

    @collection.ref(x => [Child])
    children:Child[]
}
export const ParentModel = proxy(Parent)
