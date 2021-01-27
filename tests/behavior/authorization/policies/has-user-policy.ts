import { authPolicy } from 'plumier';


export const HasUserPolicy = authPolicy()
    .define("HasUser", i => i.user?.role === "user")
    