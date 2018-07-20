import { domain } from "@plumjs/core";

@domain()
export class MyDomain{
    constructor(public name:string){}
}

@domain()
export class MyParentDomain{
    constructor(public child:MyDomain){}
} 