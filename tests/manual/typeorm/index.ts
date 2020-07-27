import { domain, route, val, authorize, FormFile, api, relation } from "@plumier/core"
import { SwaggerFacility } from "@plumier/swagger"
import Plumier, { WebApiFacility } from "plumier"
import { JwtAuthFacility } from '@plumier/jwt'
import reflect from "tinspector"


import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToOne } from "typeorm"
import { TypeORMFacility, TypeORMGenericControllerFacility } from '@plumier/typeorm'


@Entity()
class User {
    @PrimaryGeneratedColumn()
    id: number
    @Column()
    name: string
    @OneToMany(x => Animal, x => x.user)
    animal: Animal[]
}

@Entity()
class Animal {
    @PrimaryGeneratedColumn()
    id: number
    @Column()
    name: string
    @Column()
    user: User
}

new Plumier()
    .set(new WebApiFacility({ controller: __dirname }))
    .set(new JwtAuthFacility({ secret: "lorem" }))
    .set(new TypeORMFacility({
        connection: {
            type: "sqlite",
            database: ":memory:",
            entities: [__filename],
            synchronize: true,
            logging: false
        }
    }))
    .set(new TypeORMGenericControllerFacility())
    .set(new SwaggerFacility())
    .listen(8000)