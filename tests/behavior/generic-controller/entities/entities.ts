import { domain, entity } from "@plumier/core"
import { genericController } from "@plumier/generic-controller"
import reflect from "@plumier/reflect"

@genericController()
@domain()
export class Animal {
    constructor(
        @entity.primaryId()
        public id:number,
        public name: string
    ) { }
}

@genericController()
@domain()
export class User {
    constructor(
        @entity.primaryId()
        public id:number,
        public name: string,
        public email: string,
        @reflect.type([Animal])
        @entity.relation()
        @genericController()
        public animals: Animal[]
    ) { }
}