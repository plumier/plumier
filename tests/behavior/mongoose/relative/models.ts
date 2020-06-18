import { domain } from '@plumier/core';
import model from '@plumier/mongoose';


@domain()
export class Relative {
    constructor(public name:string){}
}
model(Relative)