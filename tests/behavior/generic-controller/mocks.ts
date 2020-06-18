import { Class, findClassRecursive } from "@plumier/core"
import {
    GenericControllerFacility,
    RepoBaseControllerGeneric,
    RepoBaseOneToManyControllerGeneric,
} from "@plumier/generic-controller"
import { generic } from "tinspector"

export class MyCRUDModuleFacility extends GenericControllerFacility {
    protected defaultController = MyControllerGeneric
    protected defaultOneToManyController = MyOneToManyControllerGeneric
    protected getEntities(entities: string | Class<any> | Class<any>[]): Class<any>[] {
        if (typeof entities === "function") return [entities]
        else if (Array.isArray(entities)) {
            const result = []
            for (const entity of entities) {
                result.push(...this.getEntities(entity))
            }
            return result
        }
        else {
            const classes = findClassRecursive(entities, x => true).map(x => x.type)
            return this.getEntities(classes)
        }
    }
}


@generic.template("T", "TID")
@generic.type("T", "TID")
export class MyControllerGeneric<T, TID> extends RepoBaseControllerGeneric<T, TID>{}

@generic.template("P", "PID", "T", "TID")
@generic.type("P", "PID", "T", "TID")
export class MyOneToManyControllerGeneric<P, PID, T, TID> extends RepoBaseOneToManyControllerGeneric<P, PID, T, TID>{}