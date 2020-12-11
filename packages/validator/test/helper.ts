import { Class } from "../src/types";
import tslib from "tslib"
import reflect from "@plumier/reflect";


function decorate<T extends Class>(type:T, validator: (...args: any[]) => void, dataType:Function){
    (<any>type) = tslib.__decorate([
        reflect.parameterProperties(),
        tslib.__param(0, validator),
        tslib.__metadata("design:paramtypes", [type])
    ], type);
}