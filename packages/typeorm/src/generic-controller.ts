import {
    Class,
    OneToManyRepository,
    RepoBaseControllerGeneric,
    RepoBaseOneToManyControllerGeneric,
    Repository,
} from "@plumier/core"
import { generic } from "tinspector"

import { TypeORMOneToManyRepository, TypeORMRepository } from "./repository"

// --------------------------------------------------------------------- //
// ------------------------ GENERIC CONTROLLERS ------------------------ //
// --------------------------------------------------------------------- //

@generic.template("T", "TID")
@generic.type("T", "TID")
class TypeORMControllerGeneric<T, TID> extends RepoBaseControllerGeneric<T, TID>{
    constructor(fac?: ((x: Class<T>) => Repository<T>)) {
        super(fac ?? (x => new TypeORMRepository(x)))
    }
}

@generic.template("P", "T", "PID", "TID")
@generic.type("P", "T", "PID", "TID")
class TypeORMOneToManyControllerGeneric<P, T, PID, TID> extends RepoBaseOneToManyControllerGeneric<P, T, PID, TID> {
    constructor(fac?: ((p: Class<P>, t: Class<T>, rel: string) => OneToManyRepository<P, T>)) {
        super(fac ?? ((p, t, rel) => new TypeORMOneToManyRepository(p, t, rel)))
    }
}


export { TypeORMControllerGeneric, TypeORMOneToManyControllerGeneric }