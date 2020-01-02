import Cors from "@koa/cors"
import Joi from "joi"
import Koa from "koa"
import bodyParser from "koa-body"
import Router from "koa-router"
import body from "koa-body"

const schema = Joi.object().keys({
    email: Joi.string(),
    displayName: Joi.string(),
    age: Joi.number()
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
