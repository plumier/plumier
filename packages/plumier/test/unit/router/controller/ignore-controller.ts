import { route } from '@plumjs/core';

export class IgnoreController {
    @route.ignore()
    getAnimal(id:number){}
    getAnimalList(){}
}