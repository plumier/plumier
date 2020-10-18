import { JwtAuthFacility } from "@plumier/jwt"
import Plumier, { authorize, domain, RestfulApiFacility, route } from "plumier"

import { secret } from "../options"

@domain()
class Domain {
    constructor(
        @authorize.route("Machine")
        id: number = 0,
        @authorize.route("Machine")
        createdAt: Date = new Date()
    ) { }
}

@domain()
class User extends Domain {
    constructor(
        public email: string,
        public displayName: string,
        public age: number,
        @authorize.route("Admin")
        role: "Admin" | "User"
    ) { super() }
}

class MainController {
    @route.post("/")
    save(data: User) {
        return data
    }
}

new Plumier()
    .set(new RestfulApiFacility({ controller: MainController }))
    .set(new JwtAuthFacility({ secret }))
    .initialize()
    .then(x => x.listen(5555))
