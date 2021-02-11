import { authorize, authPolicy } from "@plumier/core";

export class UserController {
    @authorize.route("AbcAdmin")
    get() { return { lorem: "ipsum" } }
}

authPolicy()
    .register("AbcAdmin", ({ user }) => user?.role === "AbcAdmin")