import { domain, relation } from "@plumier/core";
import reflect from "tinspector"

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
        @relation()
        public animals: Animal[]
    ) { }
}