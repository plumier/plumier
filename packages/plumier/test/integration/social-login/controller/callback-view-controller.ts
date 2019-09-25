import "@plumier/social-login"
import "@plumier/serve-static"

import { response } from "@plumier/core"
import { join } from "path"


export class ViewController {

    popup(){
        return response.callbackView({type: "auth", lorem:"ipsum"})
    }

    index(){
        return response.file(join(__dirname, "./callback-opener.html"))
    }
}