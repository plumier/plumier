import { join } from "path"
import Plumier, { WebApiFacility } from "plumier"

async function start(){
    const callback = await new Plumier()
            .set({ mode: "production" })
            .set(new WebApiFacility({controller: join(__dirname, "../controller")}))
            .initialize()
     callback.listen(9000)
}

start()