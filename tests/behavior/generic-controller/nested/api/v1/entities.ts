import { domain, relation, route } from "@plumier/core";
import reflect from "tinspector"

@route.controller()
@domain()
export class Animal {
    constructor(
        public name: string
    ) { }
}

@route.controller()
@domain()
export class User {
    constructor(
        public name: string,
        public email: string,
        @reflect.type([Animal])
        @relation()
        @route.controller()
        public animals: Animal[]
    ) { }
}