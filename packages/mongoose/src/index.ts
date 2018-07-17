import { reflect } from "@plumjs/reflect"
import {Class, Facility, Application} from "@plumjs/core"

export class MongooseFacility implements Facility {
    constructor(opt: { model: string | Class | Class[], uri: string }) { }

    async setup(app:Application){

    }
}

async function loadModels(opt: string | Class | Class[]) {
    if (Array.isArray(opt))
        return opt.map(x => reflect(x))
    else if (typeof opt === "string")
        return (await reflect(opt)).members
    else
        return [reflect(opt)]
}
