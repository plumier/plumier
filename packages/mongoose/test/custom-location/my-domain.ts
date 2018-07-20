import { domain } from "@plumjs/core";

@domain()
export class CustomLocationDomain{
    constructor(public name:string){}
}

@domain()
export class ParentCustomLocationDomain{
    constructor(public child:CustomLocationDomain){}
} 