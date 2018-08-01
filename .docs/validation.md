# Validation
Plumier provided decorator based Validator powered by [ValidatorJS](https://github.com/chriso/validator.js) which has comprehensive list of validation logic. 

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
* Animal birthday is optional and should not in the future

## Optional Validation
By default all property treated as required follow the TypeScript strict null check except it declarated with `?` or `| undefined`. To do that Plumier provided `@val.optional()` validation to skip check for required property.

```typescript
@domain()
export class AnimalDto {
    constructor(
        @val.alpha()
        public name:string
        @val.before()
        @val.optional()
        public birthday?:Date
    ){}
}
```

Code above showing birthday property decorated with `@val.optional()` decorator, means its value can be undefined or null. 
> It is best practice to make the birthday property optional type `?` or `|undefined` if you enable `strict` compiler option, so the possibility of null/undefined value can be detected by the compiler.

## Partial Validation
In some case you want all properties of your domain optional by default by providing `Partial<Type>`. The problem of using `Partial<Type>` is the design type emit it into `Object` so we unable to inspect the properties of the type.

Plumier provided `@val.partial(<Type>)` to do that, so system can inspect the properties properly.

```typescript
@domain()
export class AnimalDto {
    constructor(
        @val.alpha()
        public name:string
        @val.before()
        @val.optional()
        public birthday?:Date
    ){}
}

export class AnimalController {
    @route.put(":id")
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

