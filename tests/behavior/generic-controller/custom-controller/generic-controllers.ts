import { RepoBaseControllerGeneric, RepoBaseOneToManyControllerGeneric } from '@plumier/generic-controller';
import { generic } from "tinspector"

@generic.template("T", "TID")
@generic.type("T", "TID")
export class HostedControllerGeneric<T, TID> extends RepoBaseControllerGeneric<T, TID>{ }

@generic.template("P", "T", "PID", "TID")
@generic.type("P", "T", "PID", "TID")
export class HostedOneToManyControllerGeneric<P, T, PID, TID> extends RepoBaseOneToManyControllerGeneric<P, T, PID, TID>{ }