import { domain, authorize } from "@plumjs/core"
import Plumier, { route, WebApiFacility, JwtAuthFacility } from "@plumjs/plumier"
import { secret } from '../options';


@domain()
class Domain {
    constructor(
        @authorize.role("Machine")
        id: number = 0,
        @authorize.role("Machine")
        createdAt: Date = new Date()
    ) { }
}

@domain()
class User extends Domain {
    constructor(
        public email: string,
        public displayName: string,
        public age: number,
        @authorize.role("Admin")
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
    .set(new WebApiFacility({ controller: MainController }))
    .set(new JwtAuthFacility({ secret }))
    .initialize()
    .then(x => x.listen(5555))
