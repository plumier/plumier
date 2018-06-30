import { route } from '../../../src';

export class IgnoreController {
    @route.ignore()
    getAnimal(id:number){}
    getAnimalList(){}
}