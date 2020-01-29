import Plumier, { domain, RestfulApiFacility, route } from "plumier"

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
    .set(new RestfulApiFacility({ controller: MainController }))
    .initialize()
    .then(x => x.listen(5555))
