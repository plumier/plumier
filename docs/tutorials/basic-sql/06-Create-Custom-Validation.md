---
id: create-custom-validation
title: Create Custom Validation
---

Previously we applied `@val.email()` validation on our `User` domain. In this section we will create a custom validation to validate uniqueness of user email. We will check through the database if the email already used we will return validation error message.

## Create Validation Decorator

Create new directory and file under `src` name `validator/unique-email-validator.ts` and write code below

```typescript
import { val } from "plumier"
import { db } from "../model/db";

export function uniqueEmail() {
    return val.custom(async x => {
        const user = await db("User").where({ email: x }).first()
        return user ? "Email already used" : undefined 
    })
}
```

Above code showing that we used `@val.custom()` decorator to create a new decorator. We used Knex.js query builder to query if user already exists with provided email.

`@val.custom()` decorator receive a callback function on its parameter the signature of the callback is `(value:string) => Promise<string|undefined>` 

## Apply Validation To The Domain
Next we will apply validator that we created into the domain. Navigate to the `model/domain.ts` file and add `@uniqueEmail()` decorator above the email property like code below:

```typescript
//add import to the decorator
import { uniqueEmail } from "../validator/unique-email-validator";

@domain()
export class User extends Domain {
    constructor(
        @val.email()
        @uniqueEmail() //<--- add this
        public email: string,
        public password: string,
        public name: string,
        public role: "User" | "Admin"
    ) { super() }
}
```

By applying validator like above Plumier will check for email uniqueness on every request. 

## Testing Validation
Next we will test our custom validator by adding user with the same email. Enter command below twice on Visual Studio Code integrated terminal.

```bash
$ http POST :8000/api/v1/users email=jane.doe@gmail.com password=123456 name="Jane Doe" role="User"
```

Code above if executed twice will returned validation error with status 422 like below

```bash
HTTP/1.1 422 Unprocessable Entity
Connection: keep-alive
Content-Length: 61
Content-Type: application/json; charset=utf-8
Date: Sat, 09 Mar 2019 02:59:49 GMT
Vary: Origin

[
    {
        "messages": [
            "Email already used"
        ],
        "path": [
            "user",
            "email"
        ]
    }
]
```