import { authPolicy } from '@plumier/core';


export const HasUserPolicy = authPolicy()
    .define("HasUser", i => i.role.some(x => x === "user"))