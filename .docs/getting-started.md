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
export class Pet {
    constructor(
        public name: string,
        public active: boolean,
        @val.before()
        public birthday: Date
    ) { }
}
//generate mongoose model
export const PetModel = model(Pet)

export class PetsController {
    
    @route.ignore()
    private async getPetById(id: string) {
        const pet = await PetModel.findById(id)
        if(!pet) throw new HttpStatusError(404, `Pet with id ${id} not found`)
        return pet
    }

    //GET /pets?offset=<number>&limit=<number>
    @route.get("")
    list(@val.optional() offset:number = 0, @val.optional() limit:number = 50) {
        return PetModel.find()
            .skip(offset)
            .limit(limit)
    }

    //GET /pets/<id>
    @route.get(":id")
    get(@val.mongoId() id: string) {
        return this.getPetById(id)
    }

    //POST /pets
    post("")
    save(data: Pet) {
        return new PetModel(data).save()
    }

    //PUT /pets/<id>
    @route.put(":id")
    //@val.partial(Pet) will make all Pet filed optional
    //so it possible to send { "name": "Mimi" }
    async modify(@val.mongoId() id: string, @val.partial(Pet) data: Partial<Pet>) {
        const pet = await this.getPetById(id)
        Object.assign(pet, data)
        await pet.save()
    }

    //DELETE /pets/<id>
    @route.delete(":id")
    async delete(@val.mongoId() id: string) {
        const pet = await this.getPetById(id)
        await pet.remove()
    }
}

new Plumier()
    /*
    when RestfulApiFacility provided with no parameter, it will 
    look into ./controller directory for controllers
    */
    .set(new RestfulApiFacility({controller: PetController}))
    /*
    Using mongoose facility is optional, you can use other ORM
    if the model parameter of MongooseFacility omitted then it will 
    look into ./model directory for models marked with @collection()
    */
    .set(new MongooseFacility({ model: Pet, uri: "mongodb://localhost:27017/my-app-data" }))
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
| get(id)           | GET         | /pets/:id |
| save(model)       | POST        | /pets     |
| modify(id, model) | PUT         | /pets/:id |
| delete(id)        | DELETE      | /pets     |


### Restful style status code

| Method/Issue     | Status |
| ---------------- | ------ |
| GET              | 200    |
| POST             | 201    |
| PUT              | 204    |
| DELETE           | 204    |
| Validation Error | 422    |
| Conversion Error | 400    |
| Internal Error   | 500    |

