---
id: typeorm-helper
title: TypeORM Helper
---

TypeORM is an ORM that can run in NodeJS, Browser, Cordova, PhoneGap, Ionic, React Native, NativeScript, Expo, and Electron platforms and can be used with TypeScript and JavaScript (ES5, ES6, ES7, ES8. 

## TypeORM Facility

TypeORM uses different way on defining decorators, so without further step its impossible for Plumier to get type information of the entity decorated with TypeORM decorators, which will be problem if you want to use your entity as your DTO. 

Plumier provided Facility to automatically transform your TypeORM decorated entity so it can be used by Plumier.

```typescript
new Plumier()
    .set(new WebApiFacility())
    .set(new TypeORMFacility({ /* TypeORM configuration */ }))
    .initialize()
``` 

Using above configuration, its now possible to use entity as the DTO like below

```typescript
import { Entity, Column, PrimaryGeneratedColumn, getManager } from "typeorm"
import { TypeORMFacility } from "@plumier/typeorm"
import { WebApiFacility } from "plumier"

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number
    
    @Column()
    @val.email()
    email: string

    @Column()
    name: string

    @Column()
    password: string

    @Column()
    role: "User" | "Admin"
}

export class UsersController {
    private readonly repo: Repository<User>

    constructor() {
        this.repo = getManager().getRepository(User)
    }

    @route.post("")
    save(data: User) {
        return this.repo.save(data)
    }

    @route.get(":id")
    get(id: number) {
        return this.repo.findOne(id)
    }

    @route.put(":id")
    modify(id: number, data: User) {
        return this.repo.update(id, data)
    }

    @route.delete(":id")
    delete(id: number) {
        return this.repo.delete(id)
    }
}
```
