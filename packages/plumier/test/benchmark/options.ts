import { join } from "path"

import { benchmark, BenchmarkOption } from "./lib"
import { sign } from 'jsonwebtoken';

export const secret = "lorem ipsum dolor sit amet"
export const simplePostBody = { email: "ketut.s@gmail.com", displayName: "Ketut Susrama", age: "41" }
export const adminToken = sign({ name: "Ketut Susrama", role: "Admin" }, secret)
const defaultOption = {
    url: "http://localhost:5555",
    pipelining: 10,
    silent: true,
    env: { NODE_ENV: "production" }
}
const koa: BenchmarkOption = { ...defaultOption, path: join(__dirname, "server/koa") }
const koaJwt: BenchmarkOption = { ...defaultOption, path: join(__dirname, "server/koa-jwt") }
const plumier: BenchmarkOption = { ...defaultOption, path: join(__dirname, "server/plumier") }
const plumierJwt: BenchmarkOption = { ...defaultOption, path: join(__dirname, "server/plumier-jwt") }
const express: BenchmarkOption = { ...defaultOption, path: join(__dirname, "server/express") }
const expressJwt: BenchmarkOption = { ...defaultOption, path: join(__dirname, "server/express-jwt") }
export const options: BenchmarkOption[] = [
    // {
    //     ...koa,
    //     method: "GET",
    //     title: "Simple GET",
    // },
    // {
    //     ...plumier,
    //     method: "GET",
    //     title: "Simple GET",
    // },
    // {
    //     ...express,
    //     method: "GET",
    //     title: "Simple GET",
    // },
    {
        ...koa,
        title: "Joi Validation",
        method: "POST",
        body: JSON.stringify(simplePostBody),
        headers: {
            "Content-Type": "application/json",
        }
    },
    {
        ...plumier,
        title: "Built-in Validation",
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(simplePostBody)
    },
    // {
    //     ...express,
    //     title: "Joi Validation",
    //     method: "POST",
    //     headers: {
    //         "Content-Type": "application/json"
    //     },
    //     body: JSON.stringify(simplePostBody)
    // },
    // {
    //     ...koaJwt,
    //     title: "JWT Authorization",
    //     method: "POST",
    //     body: JSON.stringify({ ...simplePostBody, role: "Admin" }),
    //     headers: {
    //         "Content-Type": "application/json",
    //         Authorization: `Bearer ${adminToken}`
    //     }
    // },
    // {
    //     ...plumierJwt,
    //     title: "JWT Parameter Authorization",
    //     method: "POST",
    //     body: JSON.stringify({ ...simplePostBody, role: "Admin" }),
    //     headers: {
    //         "Content-Type": "application/json",
    //         Authorization: `Bearer ${adminToken}`
    //     }
    // },
    // {
    //     ...expressJwt,
    //     title: "JWT Authorization",
    //     method: "POST",
    //     body: JSON.stringify({ ...simplePostBody, role: "Admin" }),
    //     headers: {
    //         "Content-Type": "application/json",
    //         Authorization: `Bearer ${adminToken}`
    //     }
    // }
];
