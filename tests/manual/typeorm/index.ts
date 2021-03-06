import { authorize, authPolicy, entityPolicy, NestedControllerGeneric, route } from "@plumier/core"
import { JwtAuthFacility } from "@plumier/jwt"
import { SwaggerFacility } from "@plumier/swagger"
import { TypeORMFacility } from "@plumier/typeorm"
import Plumier, { genericController, LoggerFacility, WebApiFacility } from "plumier"
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @OneToMany(x => Shop, x => x.createdBy)
    shops: Shop[]
}

@Entity()
export class Shop {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @genericController(c => {
        c.mutators().authorize("Admin", "SuperAdmin")
        c.accessors().authorize("ShopOwner", "Admin")
    })
    @OneToMany(x => Item, x => x.shop)
    items: Item[]

    @ManyToOne(x => User, x => x.shops)
    createdBy:User
}

@genericController()
@Entity()
export class Item {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @authorize.read()
    @Column()
    price: number

    @ManyToOne(x => Shop, x => x.items)
    shop: Shop

    @OneToMany(x => Variants, x => x.item)
    variants: Variants[]

    @ManyToOne(x => User)
    createdBy: User
}

@Entity()
export class Variants {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @ManyToOne(x => Item, x => x.variants)
    item: Item
}

@genericController()
@Entity()
export class Primitive {
    @authorize.read()
    @PrimaryGeneratedColumn()
    id: number

    @authorize.read()
    @Column()
    string: string

    @authorize.read()
    @Column()
    date: Date

    @authorize.read()
    @Column()
    number: number

    @authorize.read()
    @Column()
    boolean: boolean
}

authPolicy().register("Admin", ({ user }) => user?.role === "Admin")
authPolicy().register("SuperAdmin", ({ user }) => user?.role === "SuperAdmin")
entityPolicy(Shop).register("ShopOwner", () => true)
entityPolicy(Item).register("ShopOwner", () => true)

process.env.DEBUG = "@plumier/core:*"

new Plumier()
    .set(new WebApiFacility())
    .set(new LoggerFacility())
    .set(new JwtAuthFacility({ secret: "lorem" }))
    .set(new TypeORMFacility({
        connection: {
            type: "sqlite",
            database: ":memory:",
            entities: [__filename],
            synchronize: true,
            //logging: true
        }
    }))
    .set(new SwaggerFacility())
    .listen(8000)