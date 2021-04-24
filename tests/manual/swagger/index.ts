import { api, authorize, authPolicy, entity, meta, route } from "@plumier/core"
import { JwtAuthFacility } from "@plumier/jwt"
import { SwaggerFacility } from "@plumier/swagger"
import Plumier, { genericController, WebApiFacility } from "plumier"
import reflect, { noop, type } from "@plumier/reflect"

class User {
    @meta.property()
    email!:string
    @meta.property()
    name!:string
}

export class UsersController {
    @api.description("Lorem ipsum *dolor* **sit amet** [lorem](https://localhost:8000)")
    @authorize.route("Admin", "Authenticated", "Public")
    @route.get("")
    @meta.type([User])
    get(@api.description("Lorem ipsum dolor sit amet") id: string) {
        return {} as any
    }
}

const admin = authPolicy().define("Admin", ({ user }) => user?.role === "Admin")

new Plumier()
    .set(new WebApiFacility({ controller: __dirname }))
    .set(new JwtAuthFacility({ secret: "lorem", authPolicies: [admin], globalAuthorize: "Admin" }))
    .set(new SwaggerFacility())
    .listen(8000)