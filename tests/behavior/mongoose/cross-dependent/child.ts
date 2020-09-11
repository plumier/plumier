import model, {proxy, collection } from "@plumier/mongoose"
import { noop } from "tinspector"
import { Parent } from './parent'

@collection()
export class Child {
    @noop()
    name:string 

    @collection.ref(x => Parent)
    children:Parent
}

export const ChildModel = proxy(Child)