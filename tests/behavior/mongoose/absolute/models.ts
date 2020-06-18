import { domain } from '@plumier/core';
import model from '@plumier/mongoose';


@domain()
export class Absolute {
    constructor(public name:string){}
}
model(Absolute)