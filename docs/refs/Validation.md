---
id: validation
title: Validation
---

Plumier provided decorator based Validator powered by [Validator](https://github.com/chriso/validator.js) which has comprehensive list of validation logic. 

Validation handled internally by plumier (but possible to provided your own validation logic). By default if invalid value found Plumier will skip controller execution and throw `ValidationError`, if the `ValidationError` not handled it will automatically return http status 422 with an informative message.


## Validate Query

```typescript
export class AnimalController {
    @route.get()
    getAnimal(
        @val.mongoid()
        id:string){}
}
```

Above code will make sure the `id` parameter exists and a valid MongodDB id.

## Validate Request Body

```typescript
@domain()
export class AnimalDto {
    constructor(
        @val.alpha()
        public name:string

        //make sure birthday is not in the future
        //https://github.com/chriso/validator.js/blob/master/README.md
        @val.before()
        public birthday:Date
    ){}
}

export class AnimalController {
    @route.post()
    saveAnimal(model:AnimalDto){}
}
```

Above code will make sure:
* Animal name is exists and only contains alpha string
* Animal birthday should not in the future

## Required Validation
By default all property is optional, to make a property required Plumier provide `@val.required()` like below.

```typescript
@domain()
export class AnimalDto {
    constructor(
        @val.required()
        @val.alpha()
        public name:string
        @val.before()
        public birthday?:Date
    ){}
}
```

Code above showing that the `name` property is required, means its will returned 422 if provided empty value (null, undefined or empty string)

## Partial Validation
In some case you want all properties of your domain optional even if it has required property. In real world situation is in `PATCH` method when you allow user to supply some property and skip the `required` validator. Using this trick will reduce the need of creating another domain model. Plumier provided `@val.partial(<Type>)` to do that, Plumier will treat all properties of the class as optional even its decorated with `@val.required()`.

```typescript
@domain()
export class AnimalDto {
    constructor(
        @val.required()
        @val.alpha()
        public name:string
        @val.before()
        public birthday?:Date
    ){}
}

export class AnimalController {
    @route.patch(":id")
    modify(id:string, @val.partial(AnimalDto) data:Partial<AnimalDto>) {}
}
```

Using configuration above you can pass `{ "birthday": "2015-1-1" }` (without name) to the modify action without getting 422 error.


## Custom Error Message
You can provide `message` parameter on each validator decorator like below:

```typescript
@val.after({message: "Specified date must be in the future"})
```

## Custom Http Status 
By default Plumier will return http status 422 for some invalid values. You can override this behavior by provide a middleware and catch the `ValidationError` thrown by Plumier

```typescript
const app = new Plumier()
app.set(new WebApiFacility())
app.use({execute: async x => {
    try{
        return await x.proceed()
    }
    catch(e){
        if(e instanceof ValidationError){
            //e.issues contains information of validation:
            throw new HttpStatusError(500, "<Your custom message>")
        }
        else 
            throw e
    }
}})

```
