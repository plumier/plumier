import Cors from "@koa/cors"
import Joi from "joi"
import Koa from "koa"
import bodyParser from "koa-body"
import Router from "koa-router"
import body from "koa-body"

const schema = Joi.object().keys({
    email: Joi.string().required(),
    displayName: Joi.string().required(),
    age: Joi.number().required()
})

const routes = new Router()
    .get("/", (ctx) => {
        ctx.body = { message: "Hello world!" }
    })
    .post("/", (ctx) => {
        const fix = schema.validate(ctx.request.body)
        ctx.body = fix.value
    })

new Koa()
    .use(bodyParser())
    .use(routes.routes())
    .listen(5555)
