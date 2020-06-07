import { RepoBaseControllerGeneric, RepoBaseOneToManyControllerGeneric } from '@plumier/core';
import { generic } from "tinspector"

@generic.template("T", "TID")
@generic.type("T", "TID")
export class MyControllerGeneric<T, TID> extends RepoBaseControllerGeneric<T, TID>{ }

@generic.template("P", "T", "PID", "TID")
@generic.type("P", "T", "PID", "TID")
export class MyOneToManyControllerGeneric<P, T, PID, TID> extends RepoBaseOneToManyControllerGeneric<P, T, PID, TID>{ }