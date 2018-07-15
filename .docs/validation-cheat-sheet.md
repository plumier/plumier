# Validation Cheat Sheet
Plumier provided decorator based Validator powered by [ValidatorJS](https://github.com/chriso/validator.js) which has comprehensive list of validation logic. 

Validation handled internally by plumier (but possible to provided your own validation logic). By default if invalid value found Plumier will skip controller execution and throw `ValidationError`, if the `ValidationError` not handled it will automatically return http status 400 with an informative message.


## Validate Query

```typescript
export class AnimalController {
    @route.get()
    getAnimal(
        @val.required() 
        @val.mongoid()
        id:string){}
}
```

Above code will make sure the `id` parameter exists and a valid MongodDB id.

## Validate Request Body

```typescript
@model()
export class AnimalModel {
    constructor(
        @val.alpha()
        @val.required()
        public name:string

        //make sure birthday is not in the future
        //https://github.com/chriso/validator.js/blob/master/README.md
        @val.before()
        public birthday:Date
    ){}
}

export class AnimalController {
    @route.post()
    saveAnimal(model:AnimalModel){}
}
```

Above code will make sure:
* Animal name is exists and only contains alpha string
* Animal birthday is optional and should not in the future


## Custom Error Message
You can provide `message` parameter on each validator decorator like below:

```typescript
@val.after({message: "Specified date must be in the future"})
```

## Custom Http Status 
By default Plumier will return http status 400 for some invalid values. You can override this behavior by provide a middleware and catch the `ValidationError` thrown by Plumier

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

