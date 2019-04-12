import Cors from "@koa/cors"
import Joi from "joi"
import Koa from "koa"
import bodyParser from "koa-body"
import Router from "koa-router"
import KoaJwt from "koa-jwt"
import { secret } from '../options';

const schema = Joi.object().keys({
    email: Joi.string().required(),
    displayName: Joi.string().required(),
    age: Joi.number().required(),
    role: Joi.string()
})

const routes = new Router()
    .post("/", (ctx) => {
        const fix = schema.validate(ctx.request.body)
        ctx.body = fix.value
    })

new Koa()
    .use(bodyParser())
    .use(Cors())
    .use(KoaJwt({ secret }))
    .use(routes.routes())
    .listen(5555)
