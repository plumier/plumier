import { sign } from "jsonwebtoken"
import { join } from "path"

import { BenchmarkOption } from "./lib"

export const secret = "lorem ipsum dolor sit amet"
export const simplePostBody = { email: "ketut.s@gmail.com", displayName: "Ketut Susrama", age: "41" }
export const adminToken = sign({ name: "Ketut Susrama", role: "Admin" }, secret)
const defaultOption = {
    url: "http://localhost:5555",
    pipelining: 10,
    silent: true,
    env: { NODE_ENV: "production" }
}
const getOption = <BenchmarkOption>{ ...defaultOption, method: "GET" }
const postOption = <BenchmarkOption>{
    ...defaultOption, method: "POST",
    body: JSON.stringify(simplePostBody),
    headers: {
        "Content-Type": "application/json",
    }
}
const jwtOption = <BenchmarkOption>{
    ...defaultOption, method: "POST",
    body: JSON.stringify({ ...simplePostBody, role: "Admin" }),
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
    }
}

const servers = [
    // "express",
    // "koa",
    "plumier",
]

export const options = [
    ...servers.map(x => ({...getOption, path: join(__dirname, "server", x)})),
    // ...servers.map(x => ({...postOption, path: join(__dirname, "server", x)})),
    // ...servers.map(x => ({...jwtOption, path: join(__dirname, "server", `${x}-jwt`)})),
]
