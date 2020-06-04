import { GenericController, GenericOneToManyController, HttpStatusError, IdentifierResult, route } from "@plumier/core"
import reflect, { generic } from "tinspector"
import { TypeORMRepository, TypeORMOneToManyRepository } from './repository'

// --------------------------------------------------------------------- //
// ------------------------ GENERIC CONTROLLERS ------------------------ //
// --------------------------------------------------------------------- //

@generic.template("T", "TID")
@generic.type("T", "TID")
class TypeOrmGenericController<T, TID> extends GenericController<T, TID>{
    constructor(){
        super(x => new TypeORMRepository(x))
    }
}

@generic.template("P", "T", "PID", "TID")
@generic.type("P", "T", "PID", "TID")
class TypeOrmGenericOneToManyController<P, T, PID, TID> extends GenericOneToManyController<P, T, PID, TID> {
    constructor(){
        super((p, t, rel) => new TypeORMOneToManyRepository(p, t, rel))
    }
}


export { TypeOrmGenericController, TypeOrmGenericOneToManyController }