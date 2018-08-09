# Authorization


## Enable Facility
Authorization can be enabled by plugging `JwtAuthFacility` into Plumier application

```typescript
const app = new Plumier()
app.set(new JwtAuthFacility({ secret: "<your secret key>" }))
```

## Setup
Plumier authorization uses standard token based authentication using json web token, internally it uses [koa-jwt](https://github.com/koajs/jwt) middleware. 

To be able to authorize user, you need to specify `role` field when signing json web token on the login process. 

```typescript
class AuthController{
    //allow access to public
    @authorize.public()
    @route.post()
    async login(data: Login) {
        //check for username / password
        //if OK then return signed token
        return { 
            accessToken: jwt.sign({ 
                email: "<user email>", 
                //defined the role
                role: "<user role>" 
            }, "<your secret key>"),
        }
    }
}
```

Value of the role can be a string or an array of string that will be used by `@authorize.role(<user role>)`. 

## Custom Field Name
By default `JwtAuthFacility` will look for `role` field in your signed token. If you don't like the `role` field on the signed token you can specify the `roleField` with the name of the field in your token.

Example, your role field in the signed token is `access`

```typescript
jwt.sign({ 
    email: "<user email>", 
    //defined the role
    access: "<user role>" 
}, "<your secret key>"),

```

Specify the field name on the `JwtAuthFacility`

```typescript
const app = new Plumier()
app.set(new JwtAuthFacility({ secret: "<your secret key>", roleField: "access" }))
```

If you require a real time access to the role vs reading from token claim (because the user role changes needs to wait for the token to expired first), you can provide a function to get the user role for real time role access. But keep in mind that this trick will make every request touch the database that will impact performance:

```typescript
const app = new Plumier()
app.set(new JwtAuthFacility({ secret: "<your secret key>", roleField: async user => getUserRole(user._id) }))
```

## All Route is Secured
By enabling `JwtAuthFacility` all route is secured, means if end user access your API without token they will receive 403.


## Public Route
To make specific route accessible by public, use `@authorize.public()` to allow access to all user including user without token.

```typescript
export class ProductsController {
    @authorize.public()
    @route.get(":id")
    get(id: string) { }
}
```

| Route                | Access |
| -------------------- | ------ |
| `GET /products/<id>` | public |


## Role Authorization 
Authorize access to specific route using `@authorize.role(<list of role>)`

```typescript
export class ProductsController {
    @authorize.public()
    @route.get(":id")
    get(id: string) { }

    @authorize.role("admin")
    @route.post("")
    save(data: Product) {}
}
```

| Route                | Access |
| -------------------- | ------ |
| `GET /products/<id>` | public |
| `POST /products`     | admin  |


## Controller Decorator
Decorated action one by one will be cumbersome, you can apply `@authorize` decorator on controller to apply authorization on all routes contained.

```typescript
@authorize.role("admin")
export class ProductsController {
    @route.get(":id")
    get(id: string) { }

    @route.post("")
    save(data: Product) { }
}
```

| Route                | Access |
| -------------------- | ------ |
| `GET /products/<id>` | admin  |
| `POST /products`     | admin  |


## Controller Decorator Override
If controller and action decorated with `@authorize` decorator, the action authorization will replace the controller authorization

```typescript
@authorize.role("admin")
export class ProductsController {
    @authorize.role("admin", "user")
    @route.get(":id")
    get(id: string) { }

    @route.post("")
    save(data: Product) { }

    @route.put(":id")
    save(id:string, data: Partial<Product>) { }
}
```

| Route                | Access      |
| -------------------- | ----------- |
| `GET /products/<id>` | admin, user |
| `POST /products`     | admin       |
| `PUT /products/<id>` | admin       |


## Hierarchical Authorization