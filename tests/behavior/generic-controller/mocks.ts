import { RepoBaseControllerGeneric, RepoBaseOneToManyControllerGeneric } from "@plumier/core"
import { generic } from "@plumier/reflect"

@generic.template("T", "TID")
@generic.type("T", "TID")
export class MyControllerGeneric<T, TID> extends RepoBaseControllerGeneric<T, TID>{}

@generic.template("P", "PID", "T", "TID")
@generic.type("P", "PID", "T", "TID")
export class MyOneToManyControllerGeneric<P, PID, T, TID> extends RepoBaseOneToManyControllerGeneric<P, PID, T, TID>{}