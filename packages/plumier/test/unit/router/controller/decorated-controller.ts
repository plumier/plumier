import { route } from '@plumjs/core';

export class DecoratedController {
    //without url override
    @route.post()
    saveAnimal(model:any){}

    //with url override
    @route.get("/decorated/:id")
    getAnimal(id:number){}

    //without route
    getAnimalList(){}
}

@route.root("/root")
export class DecoratedWithRootController {
    //without url override
    @route.post()
    saveAnimal(model:any){}

    //with absolute url override
    @route.delete("/decorated/:id")
    getAnimal(id:number){}

    //with relative url override
    @route.put("name/:name")
    getAnimalByName(name:number){}

    //without route
    getAnimalList(){}
}