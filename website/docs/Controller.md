---
id: controller
title: Controller
---

Controller is a group of similar functionalities, for example `UserController` contains functionalities to manage User. Plumier controller is a plain ES6 class contains several methods that will handle http request. Further it provided convention to automatically generate route based on its name, methods name and parameters name.

## Controller Naming
Plumier doesn't strictly limit the controller name, but controller must has name that end with `Controller`. This is useful when you have a non controller class inside `controller/` directory. Controller naming best practice is using plural word, such as `AnimalsController`, `UsersController` 

## Parameter Binding
Controller parameter can be bound into some Http Request part automatically by using Parameter Binding. 

Parameter binding is a Plumier feature to automatically bound request part (context/query/body) into action parameters. Plumier provided 3 kind of parameter binding: Decorator Binding, Name Binding, Model Binding. 

* Decorator binding: Bind specific koa context into action parameter by using `@bind` decorator.
* Name binding: Bind query or request body part into action parameter based on parameter name.
* Model binding: Bind request body into parameter which is of type custom class and doesn't match above criteria (decorator binding, name binding)

### Decorator Binding
Bind action parameter using `@bind` decorator like example below

```typescript
export class AnimalController {
    @route.post()
    save(@bind.ctx() ctx:Koa.Context){

    }
}
```

Some binding decorator accepts string parameter to access its child

```typescript
export class AnimalController {
    @route.post()
    save(@bind.ctx("request.body") model:any){

    }
}
```

Above code will be the same as access `ctx.request.body`. 

Allowed path example: 
* Using dot to access child property `request.ip` etc
* Using array notation `request.body[0]`

There are several built in binding decorator provided 

| Decorator         | Description                                                          |
| ----------------- | -------------------------------------------------------------------- |
| `@bind.ctx()`     | Bind request context into parameter                                  |
| `@bind.request()` | Bind request into parameter                                          |
| `@bind.body()`    | Bind request body into parameter                                     |
| `@bind.query()`   | Bind request query into parameter                                    |
| `@bind.header()`  | Bind request header into parameter                                   |
| `@bind.user()`    | Bind JWT claim (current user) into parameter                         |
| `@bind.file()`    | Bind file into parameter. [See here](File-Upload.md#Bind-File-Parser) on detail how to use file binding |
| `@bind.actionResult()` | Bind action result into parameter. Only work with entity [request hook](Generic-Controller.md#request-hook) |


### Name Binding
Action parameter automatically assigned with query parameter or part of body request based on its name. For example: 

```
GET /animal/get?type=canine&page=1
```

```typescript
class AnimalController {
    @route.get()
    get(type:string, page:number){}
}
```

`type` and `page` parameter above automatically assigned with `canine` and `1`. 

```
POST /auth/login
body:
{
    username: "admin",
    password: "super secret pwd"
}
```

```typescript
class AuthController {
    @route.post()
    login(username:string, password:string){}
}
```

`username` and `password` will automatically assigned with part of request body `admin` and `super secret pwd`.

More complex example:

```
POST /animal/save?type=canine
body: 
{ 
    name: "Mimi", 
    birthDate: "2018-1-1", 
    owner: { firstName: "John", lastName: "Doe" }
}
```


```typescript
@domain()
class Human {
    constructor(
        firstName:string,
        lastName:string
    ){}
}

class AnimalController {
    @route.post()
    save(type:string, name:string, birthDate:Date, owner:Human){}
}
```

Example above showing that `type` parameter assigned with the query string `canine` and the request body spread into 3 parameters `name`, `birthDate` and `owner`.


### Model Binding 
Model binding is the default behavior of parameter binding. Plumier by default will assigned request body to any parameter that has custom class type and doesn't match any binding criteria (Name Binding/Decorator binding).

```typescript
@domain()
class Animal{
    constructor(
        public name:string,
        public birthDate:Date,
        public owner:Human
    )
}

class AnimalController {
    @route.post()
    save(type:string, animal:Animal){}
}
```

Request

```
POST /animal/save?type=canine
body: 
{ 
    name: "Mimi", 
    birthDate: "2018-1-1", 
    owner: { firstName: "John", lastName: "Doe" }
}
```

Above code, the `animal` parameter in `save` action will automatically bound with request body.

### File Binding 
Unlike File binding, File binding works like name binding and retrieve file(s) that already parsed into the parameter. Parameter type should be of type `FormFile`. 

```typescript
interface FormFile {
    size:number
    path:string
    name:string
    type:string
    mtime?:string
}
```

* `size`: Size of the file (bytes)
* `path`: Temporary path of the uploaded file
* `name`: File name provided by client
* `type`: Mime type of the file 
* `mtime`: The file timestamp

By default this feature is not enable, you need to enable this feature like below: 

```typescript
new Plumier()
    .set(new WebApiFacility({ bodyParser: { multipart: true } }))
```

Than on the controller simply do something like below

```typescript 
class PictureController {
    @route.post()
    save(image: FormFile) {
        
    }
}
```

Above code will handle multipart form below

```html
<form method="post" enctype="multipart/form-data" action="/picture/save">
    <input type="file" name="image"/>
    <input type="submit" value="Upload"/>
</form>
```

For multiple file upload, method's parameter can be specified using array like below

```typescript 
import { type } from "tinspector"

class PictureController {
    @route.post()
    save(@type(FormFile) image: FormFile[]) {
        
    }
}
```

### Binding Behavior
In order to properly bound the request, plumier use priority based on parameter binding kind above.

* Decorator binding is be the first priority
* Name binding is the second priority
* Model binding is the last

Its mean when an action parameter decorated with `@bind` decorator it will not further check for name binding nor model binding. If an action parameter doesn't decorated with `@bind` but its name match with a query parameter, it will not further check for model binding and so on.


## Type Conversion
Plumier automatically convert values provided by parameter binding match with parameter data type. If provided value doesn't match provided data type type http 422 error will be thrown. 

### Number Converter

```typescript
export class AnimalController {
    @route.get()
    get(id:number){}
}
```

id parameter will automatically convert to `number` inside `get` action

```
GET /animal/get?id=123    -> 123
GET /animal/get?id=123.33 -> 123.33
GET /animal/get?id=hello  -> Error status 400 
```

### Boolean Converter
```typescript
export class AnimalController {
    @route.get()
    get(id:boolean){}
}
```
id parameter will automatically convert to `boolean` inside `get` action
```
GET /animal/get?id=ON    -> true
GET /animal/get?id=on    -> true
GET /animal/get?id=On    -> true
GET /animal/get?id=TRUE  -> true
GET /animal/get?id=True  -> true
GET /animal/get?id=true  -> true
GET /animal/get?id=Hello -> Error status 400 
// working values (case insensitive): 
// ON, OFF, YES, NO, TRUE, FALSE, 1, 0
```

### Date Converter
```typescript
export class AnimalController {
    @route.get()
    get(id:Date){}
}
```
id parameter will automatically convert to `Date` inside `get` action
```
GET /animal/get?id=2018-2-1    -> equals to new Date(2018, 2, 1)
GET /animal/get?id=hello       -> Error status 400
```

### Object Converter
Object converter only works for POST and PUT method

```typescript
@domain() 
class Animal {
    constructor(
        public id:number,
        public name:string,
        public deceased:boolean,
        public birthday:Date
    ){}
}

export class AnimalController {
    @route.post()
    save(model:Animal){}
}
```
model parameter will automatically convert to `Animal` inside `save` action
```
POST /animal/save
JSON Payload: { id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1" }
Result: 
AnimalController {
    id: 200,
    name: "Mimi",
    deceased: true,
    birthday: Date //equals to new Date(2018,1,1)
}
```

Object converter also supported deep nested object conversion

```typescript
@domain()
class Client {
    constructor(
        public id: number,
        public name: string,
        public join: Date
    ) { }
}
@domain()
class Animal {
    constructor(
        public id: number,
        public name: string,
        public deceased: boolean,
        public birthday: Date,
        public owner: Client
    ) { }
}

export class AnimalController {
    @route.post()
    save(model:Animal){}
}
```

model parameter will automatically convert to `Animal` inside `save` action

```
POST /animal/save
JSON Payload: {
    id: "200",
    name: "Mimi",
    deceased: "ON",
    birthday: "2018-1-1",
    owner: {
        id: "400",
        name: "John Doe",
        join: "2015-1-1"
    }
}

Result: 
Animal {
    birthday: new Date("2018-1-1"), 
    deceased: true, 
    id: 200, 
    name: "Mimi",
    owner: Client {
        id: 400,
        name: "John Doe",
        join: new Date("2015-1-1")
    }
}
```

### Array Converter
Array converter a little bit different due to TypeScript [design type emit limitation](https://github.com/Microsoft/TypeScript/issues/12463), use Tinspector `@type()` decorator to specify array element data type.

```typescript
import { type } from "tinspector"

@domain() 
class AnimalDto {
    constructor(
        public id:number
        public name:string
        public deceased:boolean
        public birthday:Date
    ){}
}

export class AnimalController {
    @route.post()
    save(@type([AnimalDto]) model:AnimalDto[]){}
}
```

```
POST /animal/save
JSON Payload: [{ id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1" }]
Result: 
[{
    id: 200,
    name: "Mimi",
    deceased: true,
    birthday: Date //equals to new Date(2018,1,1)
}]
```

## Routing Basic 

Plumier create routes automatically from controllers. By default it will looks into the `./controller` directory. 

### Name Convention
Plumier generates routes by convention using controller name, method name and parameter names. By default it will serve GET http method.

```typescript
export class AnimalController {
    list(offset:number, limit:number)
}
```

```
GET /animal/list?offset=<number>&limit=<number>
```

### Route Decorator
Furthermore route generation process can be overridden using `@route` decorator. 

```typescript
export class AnimalController {
    @route.put()
    modify(id:number, model:AnimalDto)
}
```

```
POST /animal/modify?id=<value>
```

#### Custom Route Path 

#### Route Parameters 

#### Root Path 

#### Absolute/Relative Path


## Action Result
Controller can return JavaScript object that will be formatted into JSON result. For more advance result that require setting http status or response header can be done using `ActionResult`.

`ActionResult` is a special class that used to create an Http Response. `ActionResult` has ability to modify Http Response which make it possible to make a custom response such as return an html, file, file download etc. 

### Signature
`ActionResult` signature has some similarities with the http response like below:

```typescript
class ActionResult {
    static fromContext(ctx: Context) : ActionResult
    constructor(public body?: any, public status?: number)
    setHeader(key: string, value: string) : ActionResult
    setStatus(status: number): ActionResult
    execute(ctx: Context): Promise<void> 
}
```

* `fromContext` create `ActionResult` from Koa context
* `setHeader` set header that will be used by Http Response
* `setStatus` set Http Status that will be use by Http Response
* `execute` internally called by Plumier to generate Koa context and render the response

`setHeader` and `setStatus` designed to be chainable, so it will be able to create `ActionResult` object like below

```typescript
return new ActionResult({ message: "The body" })
    .setStatus(400)
    .setHeader("key", "value")
```

### Action Result Implementation
Currently now Plumier has three types of `ActionResult` implementation: 

* `ActionResult` by default will returned JSON response
* `RedirectActionResult` used to redirect request to specific url, internally it calls Koa `Context.redirect` 
* `FileActionResult` returned a file response based on provided file path. This class only enable when `@plumier/serve-static` installed.

A shorthand namespace available to access all of above implementation called `response` 

```typescript
import {route, response} from "plumier"

class AnimalController {
    @route.get()
    index(){
        return response.redirect(<url>)
    }
}
```

### Custom Action Result

It is possible to extends the ability of `ActionResult` to modify the Http response to return custom http response. The main logic is on the `execute` method.

For example the implementation of `FileActionResult` is quite simple as below

```typescript
import send from "koa-send"
import { extname } from "path"

export class FileActionResult extends ActionResult {
    constructor(path: string) {
        super(path)
    }

    async execute(ctx: Context) {
        await super.execute(ctx)
        ctx.type = extname(this.body)
        await send(ctx, this.body)
    }
}
```

## Throwing Errors
Any uncaught error will automatically handled by Plumier and translated into http response with status 500. You can throw `HttpStatusError` to provide custom error message with some http status that will be rendered into proper JSON response with appropriate status.

## Registration
By default controller registration done by traverse through all files contains Controller class inside `controller/` directory.

Position of the `controller/` directory should be the same directory level with the script file that call `Plumier.initialize()` method. 

```typescript
new Plumier()
    .set(new WebApiFacility())
    .initialize()
    .then(koa => koa.listen(8000))
```

Registration above will search for controllers classes inside `controller/` directory that the same level as the script above.

Registration can be specified from `WebApiFacility` or `RestfulApiFacility` by providing one of below:

#### Absolute directory

```typescript
new Plumier()
    .set(new WebApiFacility({ controller: join(__dirname, "custom-path") }))
    .initialize()
    .then(koa => koa.listen(8000))
```

#### Relative directory

```typescript
new Plumier()
    .set(new WebApiFacility({ controller: "custom-path" }))
    .initialize()
    .then(koa => koa.listen(8000))
```

#### Controller class

```typescript
new Plumier()
    .set(new WebApiFacility({ controller: AnimalsController }))
    .initialize()
    .then(koa => koa.listen(8000))
```

#### Array of controller class 

```typescript
new Plumier()
    .set(new WebApiFacility({ controller: [
        AnimalsController,
        UsersController
    }))
    .initialize()
    .then(koa => koa.listen(8000))
```
