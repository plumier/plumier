---
id: query-parser
title: Query Parser
---

Plumier provided tools to parse query string for select, order and filter functionality and transform them into native TypeORM or Mongoose query. If you are using generic controller you may familiar with its query string below.

```
/users?select=name,dob&order=-dob,name&filter=(name='john'* and active = true)
```

Above features uses query parser to parse `select`, `order` and `filter` query string into native query. By using query parser all query translated and checked for validation and authorization. 

:::caution
Query parser (select parser, order parser, filter parser) will not able to evaluate auth policy created using [Entity Policy](Generic-Controller.md#entity-authorization-policy) since the authorization logic may calculated dynamically based on the data. 

By default query parser will forbid access to the property secured with entity policy. To fix this issue, add more `@authorize.read()` access that defined with `entityPolicy` to allow query access.

```typescript
@Entity()
class FilterModel {
    // this column will not accessible by filter/select/order
    @authorize.read("Owner")
    @Column()
    columnOne:string

    // this column allowed queried (filter/select/order) by Admin
    @authorize.read("Owner", "Admin")
    @Column()
    columnTwo:string
}

entityPolicy(FilterModel).register("Owner", ({user}, id) => { /** the logic **/ })
authPolicy().register("Admin", ({user}) => { /** the logic **/ })

```
:::

## Filter Parser

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

#### Usage 

Filter parser respects `@authorize.read()` and `@authorize.writeonly()`, its means you will need proper policy to query property secured with `@authorize.read()` and will not able to query property with `@authorize.writeonly()`. 

Filter parser required a model to define the data structure and data type of the query.

```typescript
@Entity()
class UserFilter {
    @Column()
    name:string

    // password will not filterable by anyone
    @authorize.readonly()
    @Column()
    password:string

    @Column()
    deleted:boolean

    // authorize email filter only accessible by Admin
    @authorize.read("Admin")
    @Column()
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

#### Language Specification

The language supports some simple logical expression with some native data type. The logic expression supported are: 

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

Example of valid filter 

```
deleted=false

name = "john"* and deleted = false

createdAt = '2020-1-1'...'2020-2-1' and (active = true or deleted = false)
```

## Select Parser 

Select parser used to parse select query string, it receives comma delimited string of list of columns to be selected. Relation columns automatically detected and returned separately. 

#### Usage

To use the select parser you need to use a model for the parser, for example for model below.

```typescript
@Entity()
class Log {
    @PrimaryGeneratedColumn()
    id:number

    @Column()
    message:string

    @ManyToOne(x => User)
    createdBy:User

    @CreateDateColumn()
    createdAt:Date
}
```

You can use above entity as the model of select parser like code below 

```typescript 
import { route, selectParser, SelectQuery } from "plumier"

class LogsController {
    @route.get("")
    list(@selectParser(x => Log) select: SelectQuery) {
        const repo = getRepository(Log)
        return repo.find({ relations: select.relations, select: select.columns })
        // when using mongoose 
        // return LogModel.find({}, select.columns).populate(select.relations)
    }
}
```

When provided select query like below

```
/logs?select=id,message,createdBy,createdAt
```

The `select` parameter of `list` action will populated with parsed select query that can be used directly with TypeORM or Mongoose. Note that the `createdBy` column will be returned in `relations` property since it is a relation property, while the other columns will be returned in `columns` property. 


## Order Parser

Order parser used to parse order query string, its mostly the same as select parser, receives comma delimited string to specify the order priority. By default order direction is `ASC`, for `DESC` direction can be specified by `-`.

#### Usage

To use the order parser you need to use a model for the parser like below

```typescript
@Entity()
class Log {
    @PrimaryGeneratedColumn()
    id:number

    @Column()
    message:string

    @ManyToOne(x => User)
    createdBy:User

    @CreateDateColumn()
    createdAt:Date
}
```

You can use above entity as the model of select parser like code below 

```typescript 
import { route, orderParser } from "plumier"

class LogsController {
    @route.get("")
    list(@orderParser(x => Log) order:any) {
        const repo = getRepository(Log)
        return repo.find({ order })
        // when using mongoose 
        // return LogModel.find({}).sort(order)
    }
}
```

Example valid order is like below

```
/logs?select=-createdAt,createdBy
```

Above query will order Log by createdAt desc and createdBy asc.