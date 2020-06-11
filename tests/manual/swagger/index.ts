import { domain, route, val, authorize, FormFile, api } from "@plumier/core"
import { SwaggerFacility } from "@plumier/swagger"
import Plumier, { WebApiFacility } from "plumier"
import { JwtAuthFacility } from '@plumier/jwt'
import reflect from "tinspector"

@domain()
class Animal {
    constructor(
        public name:string
    ){}
}

@domain()
class User {
    constructor(
        @api.params.readOnly()
        id:number,
        @val.required()
        public name: string,
        @val.required()
        public email: string,
        public dateOfBirth: Date,
        @api.params.readOnly()
        public animal:Animal
    ) { }
}

@api.tag("Lorem")
export class UsersController {

    @route.post("")
    save(user: User) { }

    @route.post("/animal")
    animal(user: Animal) { }

    @authorize.public()
    @route.get(":id")
    @reflect.type(User)
    get(id: string, @api.description("lorem ipsum") @val.enums({enums: ["animal", "human"]}) type:string) { }

    @api.description("Lorem ipsum dolor")
    @route.post("upload")
    upload( user: FormFile) { }
}

new Plumier()
    .set(new WebApiFacility({ controller: __dirname }))
    .set(new JwtAuthFacility({ secret: "lorem" }))
    .set(new SwaggerFacility())
    .listen(8000)