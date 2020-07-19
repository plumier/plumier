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

## Decorators 
Plumier provided decorator wrapper to all the Validator.js validations.


| Decorator               | Description                                                                                                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@val.after()`          | check if the string is a date that's after the specified date (defaults to now).                                                                                                                   |
| `@val.alpha()`          | check if the string contains only letters (a-zA-Z).                                                                                                                                                |
| `@val.alphanumeric()`   | check if the string contains only letters and numbers.                                                                                                                                             |
| `@val.ascii()`          | check if the string contains ASCII chars only.                                                                                                                                                     |
| `@val.base64()`         | check if a string is base64 encoded.                                                                                                                                                               |
| `@val.before()`         | check if the string is a date that's before the specified date.                                                                                                                                    |
| `@val.byteLength()`     | check if the string's length (in UTF-8 bytes) falls in a range.                                                                                                                                    |
| `@val.creditCard()`     | check if the string is a credit card.                                                                                                                                                              |
| `@val.currency()`       | check if the string is a valid currency amount.                                                                                                                                                    |
| `@val.dataURI()`        | check if the string is a data uri format.                                                                                                                                                          |
| `@val.decimal()`        | check if the string represents a decimal number, such as 0.1, .3, 1.1, 1.00003, 4.0, etc.                                                                                                          |
| `@val.divisibleBy()`    | check if the string is a number that's divisible by another.                                                                                                                                       |
| `@val.email()`          | check if the string is an email.                                                                                                                                                                   |
| `@val.enums()`          | check if the string is one of the provided enums value.                                                                                                                                            |
| `@val.fqdn()`           | check if the string is a fully qualified domain name (e.g. domain.com).                                                                                                                            |
| `@val.float()`          | check if the string is a float.                                                                                                                                                                    |
| `@val.fullWidth()`      | check if the string contains any full-width chars.                                                                                                                                                 |
| `@val.halfWidth()`      | check if the string contains any half-width chars.                                                                                                                                                 |
| `@val.hash()`           | check if the string is a hash of type algorithm.                                                                                                                                                   |
| `@val.hexColor()`       | check if the string is a hexadecimal color.                                                                                                                                                        |
| `@val.hexadecimal()`    | check if the string is a hexadecimal number.                                                                                                                                                       |
| `@val.ip()`             | check if the string is an IP (version 4 or 6).                                                                                                                                                     |
| `@val.isbn()`           | check if the string is an ISBN (version 10 or 13).                                                                                                                                                 |
| `@val.isin()`           | check if the string is an ISIN (stock/security identifier).                                                                                                                                        |
| `@val.iso31661Alpha2()` | check if the string is a valid ISO 3166-1 alpha-2 officially assigned country code.                                                                                                                |
| `@val.iso8601()`        | check if the string is a valid ISO 8601 date; for additional checks for valid dates, e.g. invalidates dates like 2009-02-29, pass options object as a second parameter with options.strict = true. |
| `@val.isrc()`           | check if the string is a [ISRC](https://en.wikipedia.org/wiki/International_Standard_Recording_Code).                                                                                              |
| `@val.issn()`           | check if the string is an [ISSN](https://en.wikipedia.org/wiki/International_Standard_Serial_Number).                                                                                              |
| `@val.int()`            | check if the string is an integer.                                                                                                                                                                 |
| `@val.json()`           | check if the string is valid JSON (note: uses JSON.parse).                                                                                                                                         |
| `@val.latLong()`        | check if the string is a valid latitude-longitude coordinate in the format lat,long or lat, long.                                                                                                  |
| `@val.length()`         | check if the string's length falls in a range.                                                                                                                                                     |
| `@val.lowerCase()`      | check if the string is lowercase.                                                                                                                                                                  |
| `@val.macAddress()`     | check if the string is a MAC address.                                                                                                                                                              |
| `@val.matches()`        | check if string matches the pattern.                                                                                                                                                               |
| `@val.md5()`            | check if the string is a MD5 hash.                                                                                                                                                                 |
| `@val.mimeType()`       | check if the string matches to a valid MIME type format                                                                                                                                            |
| `@val.mobilePhone()`    | check if the string is a mobile phone number,                                                                                                                                                      |
| `@val.mongoId()`        | check if the string is a valid hex-encoded representation of a MongoDB ObjectId.                                                                                                                   |
| `@val.multibyte()`      | check if the string contains one or more multibyte chars.                                                                                                                                          |
| `@val.numeric()`        | check if the string contains only numbers.                                                                                                                                                         |
| `@val.port()`           | check if the string is a valid port number.                                                                                                                                                        |
| `@val.postalCode()`     | check if the string is a postal code                                                                                                                                                               |
| `@val.surrogatePair()`  | check if the string contains any surrogate pairs chars.                                                                                                                                            |
| `@val.url()`            | check if the string is an URL.                                                                                                                                                                     |
| `@val.UUID()`           | check if the string is a UUID (version 3, 4 or 5).                                                                                                                                                 |
| `@val.uppercase()`      | check if the string is uppercase.                                                                                                                                                                  |
| `@val.variableWidth()`  | check if the string contains a mixture of full and half-width chars.                                                                                                                               |
| `@val.whiteListed()`    | checks characters if they appear in the whitelist.                                                                                                                                                 |
| `@val.required()`       | mark parameter/property as required                                                                                                                                                                |
| `@val.partial()`        | skip all required validation, useful on PATCH method                                                                                                                                               |
