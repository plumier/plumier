import joi from "@hapi/joi"

const validator = joi.object({
    name: joi.string(),
    email: joi.string().email(),
    date: joi.date(),
    address: joi.object({
        zip: joi.string(),
        city: joi.string(),
        number: joi.number()
    })
});


const converter = joi.object({
    string: joi.string(),
    boolean: joi.boolean(),
    date: joi.date(),
    number: joi.number(),
})

export default {
    converter: (val:any) => converter.validate(val),
    validator: (val:any) => validator.validate(val)
}