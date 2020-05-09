import { domain, route, val, authorize, FormFile } from "@plumier/core"
import { SwaggerFacility } from "@plumier/swagger"
import Plumier, { WebApiFacility } from "plumier"
import { JwtAuthFacility } from '@plumier/jwt'



@domain()
class User {
    constructor(
        @val.required()
        public name: string,
        @val.required()
        public email: string,
        public dateOfBirth: Date,
    ) { }
}

export class UsersController {

    @route.post("")
    save(user: User) { }

    @authorize.public()
    @route.get(":id")
    get(id: string) { }

    @route.post("upload")
    upload(user: FormFile) { }
}

new Plumier()
    .set(new WebApiFacility({ controller: __dirname }))
    .set(new JwtAuthFacility({ secret: "lorem" }))
    .set(new SwaggerFacility())
    .listen(8000)