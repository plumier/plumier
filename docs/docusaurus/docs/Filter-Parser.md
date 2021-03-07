---
id: filter-parser
title: Filter Parser
---

Filter parser is a custom type converter specifically used to parse query syntax and transform it into native ORM query based on installed facility `MongooseFacility` or `TypeORMFacility`. This tools possible API client to use syntax expression on query string like below.

```
/users?filter=(name = "john"* and dateOfBirth = '1980-1-1'...'1999-1-1')
```

Above expression parsed into native MongoDB query when `MongooseFacility` installed like below.

```javascript
{ 
    $and: [
        { name: { $regex: "^john", $options: "i" }},
        {
            $and: [
                { dateOfBirth: { $gte: Date('1980-1-1') }},
                { dateOfBirth: { $lte: Date('1999-1-1') }},
            ]
        }
    ]
}
```

And if `TypeORMFacility` installed it will parsed into TypeORM find option like below.

```javascript
{
    name: Like("john%"), dateOfBirth: Between(Date('1980-1-1'), Date('1999-1-1'))
}
```

## Usage 

Filter parser provided a decorator that can be applied on action parameter used to receive the query. Filter parser required a model to define the data structure and data type of the query.

```typescript
class UserFilter {
    @authorize.filter()
    name:string

    @authorize.filter()
    deleted:boolean

    // authorize email filter only accessible by Admin
    @authorize.filter("Admin")
    email:string
}

class UsersController {
    @route.get("")
    list(@filterParser(x => User) filter:any) {
        // filter can be used directly on mongoose model
        UserModel.find(filter)
        // or typeorm find option 
        userRepo.find({ where: filter })
    }
}
```

Above code showing that we specify `@filterParser()` decorator on `filter` parameter which will receive the parsed query. Using above code its possible to perform query like below 

```
find user name starts with "john"
/users?filter=(name = "john"* and deleted = false)

find user email (only accessible by Admin)
/users?filter=(email = "john.doe@gmail.com")
```

## Query Language Specification

The query language supports some simple logical expression with some native data type. The logic expression supported are: 

| Operator       | Name              | Example                                                        |
| -------------- | ----------------- | -------------------------------------------------------------- |
| `=`            | Equals            | `name = "john"`                                                |
| `!=`           | Not Equals        | `name != "john"`                                               |
| `>`            | Greater           | `dateOfBirth > "1991-1-1"`                                     |
| `>=`           | Greater or Equals | `dateOfBirth >= "1991-1-1"`                                    |
| `<`            | Less              | `dateOfBirth < "1991-1-1"`                                     |
| `<=`           | Less or Equals    | `dateOfBirth <= "1991-1-1"`                                    |
| `!`            | Not               | `!(dateOfBirth > "1991-1-1")`                                  |
| `AND` or `and` | And               | `name = "john" and deleted = false`                            |
| `OR` or `or`   | Or                | `name = "john" or deleted = false`                             |
| `(` abd `)`    | Group             | `(name = "john" or deleted = true) and createdAt = "2020-1-1"` |

The query language also supports literals and identifier 

| Literal    | Description                           | Example                                                 |
| ---------- | ------------------------------------- | ------------------------------------------------------- |
| Property   | Identifier string ends with number    | `name`, `deleted`, `dateOfBirth123`                     |
| String     | String literal uses quotes `'` or `"` | `'john'`, `"john"`                                      |
| Number     |                                       | `12345`, `12345.456`                                    |
| Boolean    |                                       | `true`, `false`                                         |
| Date       | Date specified by string              | `2020-1-1`, `2020-01-01T00:00`                          |
| Null       | Specify null value                    | `NULL`, `null`                                          |
| Range      | Range of number or date               | `10...50`, `"2020-1-1"..."2021-1-1"`                    |
| Start With | Specify string start with string      | `"john"*`, `'john'*` note that `*` is outside the quote |
| End With   | Specify string ends with string       | `*"john"`, `*'john'`                                    |
| Contains   | Specify string contains string        | `*"john"*`, `*'john'*`                                  |
