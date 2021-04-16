import { RepoBaseControllerGeneric, RepoBaseNestedControllerGeneric } from "@plumier/generic-controller";
import { generic } from "@plumier/reflect"

@generic.parameter("T", "TID")
@generic.argument("T", "TID")
export class MyControllerGeneric<T, TID> extends RepoBaseControllerGeneric<T, TID>{}

@generic.parameter("P", "PID", "T", "TID")
@generic.argument("P", "PID", "T", "TID")
export class MyNestedControllerGeneric<P, PID, T, TID> extends RepoBaseNestedControllerGeneric<P, PID, T, TID>{}