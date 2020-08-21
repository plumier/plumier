import { domain, route, val, authorize, FormFile, api, relation } from "@plumier/core"
import { SwaggerFacility } from "@plumier/swagger"
import Plumier, { WebApiFacility, LoggerFacility } from "plumier"
import { JwtAuthFacility } from '@plumier/jwt'
import reflect from "tinspector"


import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToOne } from "typeorm"
import { TypeORMFacility } from '@plumier/typeorm'


@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number
    @Column()
    name: string
    @OneToMany(x => Animal, x => x.user)
    animal: Animal[]
}

@Entity()
export class Animal {
    @PrimaryGeneratedColumn()
    id: number
    @Column()
    name: string
    @ManyToOne(x => User, x => x.animal)
    user: User
}

new Plumier()
    .set(new WebApiFacility({ controller: __dirname }))
    .set(new LoggerFacility())
    .set(new JwtAuthFacility({ secret: "lorem", global: authorize.public() }))
    .set(new TypeORMFacility({
        connection: {
            type: "sqlite",
            database: ":memory:",
            entities: [__filename],
            synchronize: true,
            logging: false
        }
    }))
    .set(new SwaggerFacility())
    .listen(8000)