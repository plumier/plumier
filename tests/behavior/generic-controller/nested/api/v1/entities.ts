import { domain, entity, route } from "@plumier/core";
import reflect from "@plumier/reflect"

@route.controller()
@domain()
export class Animal {
    constructor(
        @entity.primaryId()
        public id:number,
        public name: string
    ) { }
}

@route.controller()
@domain()
export class User {
    constructor(
        @entity.primaryId()
        public id:number,
        public name: string,
        public email: string,
        @reflect.type([Animal])
        @entity.relation()
        @route.controller()
        public animals: Animal[]
    ) { }
}