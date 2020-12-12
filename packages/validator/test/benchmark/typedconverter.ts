import reflect from "@plumier/reflect";
import { val, createValidator } from '../../src';


@reflect.parameterProperties()
export class Address {
    constructor(public zip: string, public city: string, public number: number) { }
}

@reflect.parameterProperties()
export class MyData {
    constructor(
        public name: string,
        @val.email()
        public email:string,
        public date: Date,
        public address: Address
    ) { }
}

const validator = createValidator(MyData)

@reflect.parameterProperties()
export class MyTypes {
    constructor(
        public string:string,
        public boolean:boolean,
        public date:Date,
        public number: number,
    ){}
}

const converter = createValidator(MyTypes)

export default {
    converter,
    validator
}