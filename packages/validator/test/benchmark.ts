import reflect from "@plumier/reflect";
import joi from "@hapi/joi"
import {createValidator, val} from "../src"

@reflect.parameterProperties()
class Address {
    constructor(public zip: string, public city: string, public number: number) { }
}

@reflect.parameterProperties()
class MyData {
    constructor(
        public name: string,
        @val.email()
        public email:string,
        public date: Date,
        public address: Address
    ) { }
}

const schema = joi.object({
    name: joi.string(),
    email: joi.string().email(),
    date: joi.date(),
    address: joi.object({
        zip: joi.string(),
        city: joi.string(),
        number: joi.number()
    })
});

const convert = createValidator({ type: MyData });

const value = { name: "Lorem ipsum", email: "john.doe@gmail.com", date: "2018-2-2", address: { zip: "123", city: "CA", number: "123" } };

(async () => {
    console.log(convert(value))
    console.log(schema.validate(value))

    const iteration = 4000000;

    console.time("@plumier/validator")
    for (let i = 0; i < iteration; i++) {
        const result = convert(value)
    }
    console.timeEnd("@plumier/validator")

    console.time("Joi")
    for (let i = 0; i < iteration; i++) {
        const result = await schema.validate(value)
    }
    console.timeEnd("Joi")
})()
