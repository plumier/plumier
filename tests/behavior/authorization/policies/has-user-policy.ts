import { authPolicy } from 'plumier';


export const HasUserPolicy = authPolicy()
    .define("HasUser", i => i.role.some(x => x === "user"))
    