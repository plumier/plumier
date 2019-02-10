import { domain } from "@plumier/core"
import Plumier, { route, WebApiFacility } from "plumier"

@domain()
class User {
    constructor(
        public email: string,
        public displayName: string,
        public age: number
    ) { }
}

class MainController {
    @route.get("/")
    index() {
        return { message: "Hello world!" }
    }
    @route.post("/")
    save(data: User) {
        return data
    }
}

new Plumier()
    .set(new WebApiFacility({ controller: MainController }))
    .initialize()
    .then(x => x.listen(5555))
