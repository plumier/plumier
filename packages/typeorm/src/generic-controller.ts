import { RepoBaseControllerGeneric, RepoBaseOneToManyControllerGeneric } from "@plumier/generic-controller"
import reflect, { generic } from "tinspector"

import { TypeORMOneToManyRepository, TypeORMRepository } from "./repository"

// --------------------------------------------------------------------- //
// ------------------------ GENERIC CONTROLLERS ------------------------ //
// --------------------------------------------------------------------- //

@generic.template("T", "TID")
@generic.type("T", "TID")
class TypeORMControllerGeneric<T, TID> extends RepoBaseControllerGeneric<T, TID>{
    constructor(){
        super(x => new TypeORMRepository(x))
    }
}

@generic.template("P", "T", "PID", "TID")
@generic.type("P", "T", "PID", "TID")
class TypeORMOneToManyControllerGeneric<P, T, PID, TID> extends RepoBaseOneToManyControllerGeneric<P, T, PID, TID> {
    constructor(){
        super((p, t, rel) => new TypeORMOneToManyRepository(p, t, rel))
    }
}


export { TypeORMControllerGeneric, TypeORMOneToManyControllerGeneric }