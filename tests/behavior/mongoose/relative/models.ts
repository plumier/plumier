import model, { collection } from "@plumier/mongoose"


@collection()
export class Relative {
    constructor(public name:string){}
}
model(Relative)