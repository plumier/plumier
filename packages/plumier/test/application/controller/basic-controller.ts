import { AnimalModel } from "../model/basic-model";
import { route, bind } from '../../../src';


export class AnimalController {
    @route.post("")
    add(animal:AnimalModel){      
    }

    @route.put(":id")
    modify(id:number, animal:AnimalModel){
    }

    @route.get(":id")
    get(id:number){
    }

    @route.delete(":id")
    delete(id:number){
    }
}
