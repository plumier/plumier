# Controller Transformer

This module used to transform controllers into route url

There are three steps happened here:
1. Get file names from directory
2. Transform into reflection metadata using ./libs/reflect.ts
3. Transform reflection metadata into routes

## Regular Transformation

In short, transformation process is something like this

For example there is a controller defined like below:

```typescript
export class AnimalController {
    saveAnimal(){
    }
    getById(id){
    }
}
```

Reflection of above class is something like this:

```typescript
{
    type: "Class"
    name: "AnimalController", 
    methods: [
        { type: "Function", name: "saveAnimal", parameters: [] }
        { 
            type: "Function", 
            name: "getById", 
            parameters: [{type: "Parameter", name: "id"}] 
        }
    ]}
}
```

Above reflection then transformed into:

```
[
    { method: "GET", url: "/animal/saveanimal" },
    { method: "GET", url: "/animal/getbyid" }
]
```

## By Convention Transformation

Transformation by convention use controller action's name to get 
restful style route URL. Method conventions: 

Action   | Method  
----------------------
add      | POST
modify   | PUT
delete   | DELETE
get      | GET
list     | GET

Example we have controller below:

```typescript
export class AnimalController {
    add(model){}
    get(id){}
    list(last, limit){}
    delete(id){}
    modify(id, model){}
}
```

Reflection of above class is something like this:

```typescript
{
    type: "Class"
    name: "AnimalController", 
    methods: [
        { type: "Function", name: "add", parameters: [{type: "Parameter", name: "model"}] },
        { type: "Function", name: "get", parameters: [{type: "Parameter", name: "id"}] },
        { type: "Function", name: "list", parameters: [{type: "Parameter", name: "last"}, {type: "Parameter", name: "limit"}] },
        { type: "Function", name: "delete", parameters: [{type: "Parameter", name: "id"}] },
        { type: "Function", name: "modify", parameters: [{type: "Parameter", name: "id"}, {type: "Parameter", name: "model"}] },
    ]}
}
```

Above reflection will be transformed into:

```
[
    { method: "POST", url: "/animal" },
    { method: "GET", url: "/animal/:id" },
    { method: "GET", url: "/animal/list" },
    { method: "DELETE", url: "/animal/:id" },
    { method: "PUT", url: "/animal/:id" },
]
```

