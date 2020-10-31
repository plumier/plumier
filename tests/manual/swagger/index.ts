import { entity, route } from "@plumier/core"
import { JwtAuthFacility } from "@plumier/jwt"
import { SwaggerFacility } from "@plumier/swagger"
import Plumier, { WebApiFacility } from "plumier"
import reflect, { noop, type } from "tinspector"


export class Shop {
    @entity.primaryId()
    id: number

    @noop()
    name: string

    @route.controller()
    @entity.relation()
    @type(x => [Item])
    items: Item[]
}

export class User {
    @entity.primaryId()
    id: number

    @noop()
    name: string

    @entity.relation()
    @type(x => [Shop])
    shops: Shop[]
}

export class Category {
    @entity.primaryId()
    id: number

    @noop()
    name: string
}

export class Item {
    @entity.primaryId()
    id: number

    @noop()
    name: string

    @noop()
    price: number

    @entity.relation()
    shop: Shop

    @entity.relation()
    @type(x => [Category])
    categories: Category[]

    @entity.relation()
    createdBy: User
}

export class ItemController {
    @route.post("")
    save(data: Item) { }
}



new Plumier()
    .set(new WebApiFacility({ controller: __dirname }))
    .set(new JwtAuthFacility({ secret: "lorem" }))
    .set(new SwaggerFacility())
    .listen(8000)