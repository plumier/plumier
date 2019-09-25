import Plumier, { WebApiFacility } from "plumier/lib"
import { join } from 'path'

async function start(){
    const callback = await new Plumier()
            .set({ mode: "production" })
            .set(new WebApiFacility({controller: join(__dirname, "../controller")}))
            .initialize()
     callback.listen(8000)
}

start()