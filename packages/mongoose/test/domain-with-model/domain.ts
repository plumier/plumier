import { domain } from "@plumjs/core";
import { model } from '@plumjs/mongoose';


@domain()
export class MyDomain {
    constructor(public name:string){}
}

export const MyModel = model(MyDomain) 