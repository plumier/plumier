import Cors from "cors"
import Joi from "joi"
import express from "express"
import bodyParser from "body-parser"

const schema = Joi.object().keys({
    email: Joi.string().required(),
    displayName: Joi.string().required(),
    age: Joi.number().required()
})

express()
    .use(bodyParser())
    .use(Cors())
    .get("/", (req, res) => {
        res.send({ message: "Hello world!" })
    })
    .post("/", (req, res) => {
        const fix = schema.validate(req.body)
        res.send(fix.value)
    })
    .listen(5555)
