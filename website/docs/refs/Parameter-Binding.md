---
id: parameter-binding
title: Parameter Binding
---

Parameter binding is a process on passing request part (context/query/body) into action parameters. Plumier provided 3 kind of parameter binding: Decorator Binding, Name Binding, Model Binding. 

* Decorator binding: Bind specific koa context into action parameter by using `@bind` decorator.
* Name binding: Bind query or request body part into action parameter based on parameter name.
* Model binding: Bind request body into parameter which is of type custom class and doesn't match above criteria (decorator binding, name binding)

## Decorator Binding
Bind action parameter using `@bind` decorator, there are 5 types of decorator bindings.

### Ctx Binding
Bind Koa context to action's parameter 

```typescript
export class AnimalController {
    @route.post()
    save(@bind.ctx() model:Koa.Context){

    }
}
```

Part of context can be issued by providing path

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


### Request Binding
Bind request to action's parameter

```typescript
export class AnimalController {
    @route.post()
    save(@bind.request() model:Koa.Request){

    }
}
```

part of request can be issued by providing path parameter

```typescript
export class AnimalController {
    @route.post()
    save(@bind.request("ip") ip:string){

    }
}
```

### Request Body Binding
Bind request body to action's parameter, this feature is the same with model binding but you can specify which property of the body will be bound to the parameter

```typescript
export class AnimalController {
    @route.post()
    save(@bind.body() model:any){

    }
}
```

You can specify model type to get correct conversion of the model's properties

```typescript
export class AnimalController {
    @route.post()
    save(@bind.body() model:AnimalDto){

    }
}
```

You can bind part of the body by specify the parameter

```typescript
export class AnimalController {
    @route.post()
    save(@bind.body("id") id:number){

    }
}
```

### Query Binding
Bind query to action's parameter 

```typescript
export class AnimalController {
    @route.post()
    save(@bind.query() model:any){

    }
}
```

You can specify the model to get correct conversion

```typescript
@domain()
export class AnimalDto {
    constructor(
        public id:number,
        public name:string,
        public birthday:Date,
        public deceased:boolean
    ){}
}

export class AnimalController {
    @route.get()
    save(@bind.query() model:AnimalDto){

    }
}
```

And the query string will be populated to the body properly

```
GET /animal/save?id=200&name=Mimi&deceased=ON&birthday=2018-1-1
Result populated to model: 
AnimalDto{
    id: 200,
    name: "Mimi",
    deceased: true,
    birthday: Date //equals to new Date(2018,1,1)
}
```

It can be combined with the model binding to get bound request body and query

```typescript
class AnimalController {
    @route.post()
    save(@bind.query() page: PagingDto, model: AnimalDto) {
        return { page, model }
    }
}
```

### Login User Binding

Bind login user to action's parameter. This functionalities require `JwtAuthFacility` see how to setup user authorization [here](Authorization.md)

```typescript
export class AnimalController {
    @route.get()
    save(@bind.user() user:User){

    }
}
```

`User` type is type of claim that you specify when you sign the access token.

### File Parser Binding
Bind multi part file parser into action parameter, see more detail on [File Upload Section](../overview/File-Upload.md#Bind-File-Parser)


## Name Binding
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


## Model Binding 
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

## File Binding 
Unlike File Parser parameter binding, File binding works like name binding and retrieve file(s) that already parsed into the parameter. Parameter type should be of type `FormFile`. 

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
class PictureController {
    @route.post()
    save(image: FormFile[]) {
        
    }
}
```

## Behavior
In order to properly bound the request, plumier use priority based on parameter binding kind above.

* Decorator binding is be the first priority
* Name binding is the second priority
* Model binding is the last

Its mean when an action parameter decorated with `@bind` decorator it will not further check for name binding nor model binding. If an action parameter doesn't decorated with `@bind` but its name match with a query parameter, it will not further check for model binding and so on.