import { authorize, NestedControllerGeneric, route } from "@plumier/core"
import { JwtAuthFacility } from "@plumier/jwt"
import { SwaggerFacility } from "@plumier/swagger"
import Plumier, { genericController, LoggerFacility, WebApiFacility } from "plumier"
import { collection, MongooseFacility } from "@plumier/mongoose"
import { noop, type } from "@plumier/reflect"

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

    //@genericController()
    @type(x => [Item])
    items: Item[]

    @type(x => User)
    createdBy: User
}

@genericController(c => {
    c.methods("Delete", "GetMany", "GetOne", "Patch", "Put").ignore()
})
@collection()
export class Item {
    @collection.id()
    id: number

    @noop()
    name: string

    @noop()
    price: number


    @collection.ref(x => Shop)
    shop: Shop

    @collection.ref(x => [Variants])
    variants: Variants[]

    @collection.ref(x => User)
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
    .set(new JwtAuthFacility({ secret: "lorem", globalAuthorize: "Public" }))
    .set(new MongooseFacility({ uri: "mongodb://localhost:27017/lorem" }))
    .set(new SwaggerFacility())
    .listen(8000)