import { domain, route, val, authorize, FormFile, api, relation } from "@plumier/core"
import { SwaggerFacility } from "@plumier/swagger"
import Plumier, { WebApiFacility } from "plumier"
import { JwtAuthFacility } from '@plumier/jwt'
import reflect, { type } from "tinspector"


@route.controller()
@domain()
export class User {
    constructor(
        @api.readonly()
        id:number,
        @val.required()
        public name: string,
        @val.required()
        public email: string,
        public dateOfBirth: Date,
        @relation()
        @type(x => [Animal])
        public animal:Animal[]
    ) { }
}

@domain()
export class Animal {
    constructor(
        public name:string,
        @relation()
        public owner:Animal
    ){}
}


new Plumier()
    .set(new WebApiFacility({ controller: __dirname }))
    .set(new JwtAuthFacility({ secret: "lorem" }))
    .set(new SwaggerFacility())
    .listen(8000)