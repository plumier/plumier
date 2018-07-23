# Getting Started

In this example we will create a production ready restful api with ability to save data to MongoDB database, do some data sanitation, conversion and validation. Open terminal app and execute commands below:

```
$ mkdir plumier-pet-api
$ cd plumier-pet-api
$ npm init --yes
$ npm install --save @plumjs/plumier
$ npm install -g typescript
$ tsc --init
$ touch index.ts
```

Open the `plumier-pet-api` folder with Visual Studio Code, modify the `tsconfig.json` like below:

```json
//file: tsconfig.json
{
  "compilerOptions": {
    //required
    "target": "es2017",
    "module": "commonjs",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    //optional
    "strict": true,
    "importHelpers": true,
    "esModuleInterop": true,
  }
}
```

Point to `index.ts` and copy paste the content below:

```typescript
import { HttpStatusError, route } from "@plumjs/core";
import { collection, model, MongooseFacility } from "@plumjs/mongoose";
import Plumier, { RestfulApiFacility, val } from "@plumjs/plumier";

@collection()
export class PetDto {
    constructor(
        @val.required()
        public name: string,
        @val.required()
        public active: boolean,
        @val.before()
        public birthday: Date
    ) { }
}

export const PetModel = model(PetDto)

export class PetController {
    
    @route.ignore()
    private async getPetById(id: string) {
        const pet = await PetModel.findById(id)
        return pet
    }

    @route.get(":id")
    get(@val.mongoId() id: string) {
        return this.getPetById(id)
    }

    post("")
    save(data: PetDto) {
        return new PetModel(data).save()
    }

    @route.put(":id")
    async modify(@val.mongoId() id: string, @val.partial(PetDto) data: Partial<PetDto>) {
        const pet = await this.getPetById(id)
        Object.assign(pet, data)
        await pet.save()
    }

    @route.delete(":id")
    async delete(@val.mongoId() id: string) {
        const pet = await this.getPetById(id)
        await pet.remove()
    }
}

const plum = new Plumier()
plum.set(new RestfulApiFacility({controller: PetController}))
    .set(new MongooseFacility({ model: PetDto, uri: "mongodb://localhost:27017/my-app-data" }))
    .initialize()
    .then(x => x.listen(8000))
    .catch(e => console.error(e))
```

Thats enough to create restful api with validation, data conversion and saving the data to MongoDB database.
Go back to the terminal app and execute command below:

```
$ tsc
$ node index
```

Above API follow restful style api below:

### Restful style route

| Controller        | Http Method | Route    |
| ----------------- | ----------- | -------- |
| get(id)           | GET         | /pet/:id |
| save(model)       | POST        | /pet     |
| modify(id, model) | PUT         | /pet/:id |
| delete(id)        | DELETE      | /pet     |


### Restful style status code

| Method/Issue     | Status |
| ---------------- | ------ |
| GET              | 200    |
| POST             | 201    |
| PUT              | 204    |
| DELETE           | 204    |
| Validation Error | 400    |
| Conversion Error | 400    |
| Internal Error   | 500    |


```typescript
import { HttpStatusError, route } from "@plumjs/core";
import { collection, model, MongooseFacility } from "@plumjs/mongoose";
import Plumier, { RestfulApiFacility, val } from "@plumjs/plumier";

/*
DTOs marked with @collection mean it will automatically 
generated into mongoose schema.
Keep in mind that you should use parameter property 
(constructor parameter as property) in order 
to make the parameter binding work properly
*/
@collection()
export class PetDto {
    constructor(
        //name field is required
        @val.required()
        public name: string,
        //active field is required
        @val.required()
        public active: boolean,
        //birthday should before today
        //the naming follow the ValidatorJS api
        @val.before()
        public birthday: Date
    ) { }
}

/*
create mongoose model using DTO above
This process seems like calling mongoose.model("PetDto", <schema>).
The schema will automatically generated from PetDto
*/
export const PetModel = model(PetDto)


/*
This DTO used in PUT (modify) process, all field of DTO is optional
Only the birthday field is validated but it also optional (can be null).
Note that this DTO marked with @domain() decorator vs @collection() 
because we don't want this DTO generated into model. 
@domain() decorator actually did nothing, it just an empty decorator 
to make typescript write the design type information. So if DTO already 
decorated with other decorator the @domain() decorator can be skipped 
like the PetDto above only contains @collection() decorator.
*/
@domain()
export class PetPartialDto {
    constructor(
        public name?: string,
        public active?: boolean,
        @val.before()
        public birthday?: Date
    ) { }
}


export class PetController {
    /*
    helper method marked with @route.ignore() 
    so it will not generated into route
    */
    @route.ignore()
    private async getPetById(id: string) {
        const pet = await PetModel.findById(id)
        /*
        throwing HttpStatusError will send http status with message safely
        without any stack trace to the end user
        if (!pet) throw new HttpStatusError(400, `No pet found with id ${id}`)
        */
        return pet
    }

    /*
    this action will handle GET /pet/:id
    id parameter will be validated automatically
    if end user provided wrong mongodb id 
    plumier will return http 400 
    */
    @route.get(":id")
    get(@val.mongoId() id: string) {
        return this.getPetById(id)
    }

    /*
    this action will handle POST /pet
    Parameter binding will handle JSON service sent by end user
    convert the appropriate value into PetDto properties.
    for example if end user sent JSON below
    { "name": "Mimi", "active": "yes", "birthday": "2015-1-19" }
    the "data" parameter below will automatically populated with:
    { name: "Mimi", active: true, birthday: new Date("2015-1-9") }
    validation applied on the PetDto class will works automatically
    for example if end user provided JSON below: 
    { "active": "yes", "birthday": "2015-1-19" }
    it will automatically return http 400 saying that the name field
    is required.
    */
    @route.post("")
    save(data: PetDto) {
        return new PetModel(data).save()
    }

    /*
    this action will handle PUT /pet/:id
    Note that the data parameter uses PetPartialDto means that
    now end user can provided JSON body below
    { "active": "no" } 
    or
    { "active": "no", "birthday": "2015-2-19" }
    all of above json is valid. But below JSON body is invalid
    { "birthday": "2030-2-19" } 
    because the birthday field doesn't match the @val.before() rule
    */
    @route.put(":id")
    async modify(@val.mongoId() id: string, data: PetPartialDto) {
        const pet = await this.getPetById(id)
        Object.assign(pet, data)
        await pet.save()
    }

    /*
    this action will handle DELETE /pet/:id
    */
    @route.delete(":id")
    async delete(@val.mongoId() id: string) {
        const pet = await this.getPetById(id)
        await pet.remove()
    }
}

/*
This code is main entry point of the application.
*/
const plum = new Plumier()

/*
RestfulApiFacility provided restful functionalities to Plumier system
We provided the PetController manually to the facility so it will look 
for the controller class to generate into route.
You can left RestfulApiFacility parameter blank and it will look through 
the "./controller" directory for controllers.
*/
plum.set(new RestfulApiFacility({controller: PetController}))

    /*
    MongooseFacility provided mongoose functionalities into Plumier system.
    it will generated all DTO marked with @collection() decorator into 
    mongoose schema and doing some static analysis about missing type information
    ont the DTO.
    It also manage connection to the MongodDB database so the MongoDB database 
    guaranteed connected when Plumier system initialized.
    */
    .set(new MongooseFacility({ model: PetDto, uri: "mongodb://localhost:27017/my-app-data" }))

    /*
    Initialize the Plumier system, it will generate controllers into routes 
    and doing some static analysis about issue when generating route such as 
    missing type information, missing backing parameter, duplicate route etc.
    */
    .initialize()

    /*
    Wait the initialization process then listen to port 8000
    the parameter returned is Koa application
    */
    .then(x => x.listen(8000))
    .catch(e => console.error(e))
```