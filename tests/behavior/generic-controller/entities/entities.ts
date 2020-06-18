import { domain } from "@plumier/core";
import reflect from "tinspector"
import { crud } from '@plumier/generic-controller';

@domain()
export class Animal {
    constructor(
        public name: string
    ) { }
}
@domain()
export class User {
    constructor(
        public name: string,
        public email: string,
        @reflect.type([Animal])
        @crud.oneToMany(Animal)
        public animals: Animal[]
    ) { }
}