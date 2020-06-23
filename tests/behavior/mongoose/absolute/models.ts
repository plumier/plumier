import model, { collection } from "@plumier/mongoose"


@collection()
export class Absolute {
    constructor(public name:string){}
}
model(Absolute)