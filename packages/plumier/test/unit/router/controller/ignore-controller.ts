import { route } from '@plumier/core';

export class IgnoreController {
    @route.ignore()
    getAnimal(id:number){}
    getAnimalList(){}
}