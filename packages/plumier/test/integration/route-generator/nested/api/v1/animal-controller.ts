import { route } from '@plumier/core';


export class AnimalController {
    get(){}
}

//relative root
@route.root("kitty")
export class CatController {
    get(){}
}

//absolute
@route.root("/quack")
export class DuckController {
    get(){}
}

//absolute method decorator
export class ChickenController {
    @route.get("/chicken")
    get(){}
}