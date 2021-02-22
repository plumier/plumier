import { authorize, OneToManyControllerGeneric, route } from "@plumier/core"
import { JwtAuthFacility } from "@plumier/jwt"
import { SwaggerFacility } from "@plumier/swagger"
import Plumier, { LoggerFacility, WebApiFacility } from "plumier"
import {collection, MongooseFacility} from "@plumier/mongoose"
import {type} from "@plumier/reflect"

@collection()
export class User {
    @collection.id()
    id: number

    @collection.property()
    name: string

    @type(x => [Shop])
    shops: Shop[]
}

@collection()
export class Shop {
    @collection.id()
    id: number

    @collection.property()
    name: string

    @route.controller()
    @type(x => [Item])
    items: Item[]

    @type(x => User)
    createdBy:User
}

@route.controller()
@collection()
export class Item {
    @collection.id()
    id: number

    @collection.property()
    name: string

    @authorize.filter()
    @collection.property()
    price: number

    @type(x => Shop)
    shop: Shop

    @type(x => [Variants])
    variants: Variants[]

    @type(x => User)
    createdBy: User
}

@collection()
export class Variants {
    @collection.id()
    id: number

    @collection.property()
    name: string

    @type(x => Item)
    item: Item
}


new Plumier()
    .set(new WebApiFacility())
    .set(new LoggerFacility())
    .set(new JwtAuthFacility({ secret: "lorem", global: "Public" }))
    .set(new MongooseFacility({ uri: "mongodb://localhost:27017/lorem"}))
    .set(new SwaggerFacility())
    .listen(8000)