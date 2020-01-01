import Cors from "cors"
import Joi from "joi"
import express from "express"
import bodyParser from "body-parser"
import jwt from "express-jwt"
import { secret } from "../options"

const schema = Joi.object().keys({
    email: Joi.string().required(),
    displayName: Joi.string().required(),
    age: Joi.number().required()
})

express()
    .use(bodyParser())
    .use(jwt({ secret }))
    .post("/", (req, res) => {
        const fix = schema.validate(req.body)
        res.send(fix.value)
    })
    .listen(5555)
