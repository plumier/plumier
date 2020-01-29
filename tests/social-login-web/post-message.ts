import "@plumier/serve-static"
import "@plumier/social-login"

import { response, route } from "@plumier/core"
import { join } from "path"
import Plumier, { WebApiFacility } from "plumier"


class HomeController {
    @route.get("/")
    index() {
        return response.file(join(__dirname, "./post-message.html"))
    }

    @route.get("/dialog")
    dialog(){
        return response.postMessage({lorem: "Ipsum dolor"})
    }
}

new Plumier()
    .set(new WebApiFacility({controller: HomeController}))
    .initialize()
    .then(x => x.listen(8000))