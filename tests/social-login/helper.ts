import { FacebookProfile, GitHubProfile, GitLabProfile, GoogleProfile, TwitterProfile } from "@plumier/social-login"
import Koa from "koa"
import getPort from "get-port"
import qs from "querystring"

export const portRegex = /:[0-9]{4,5}/

export const error = async (callback: Promise<any>) => {
    const fn = jest.fn()
    try {
        await callback
    }
    catch (e) {
        fn(e.message)
    }
    return fn
}

export const getLoginUrl = (text:string) => /const REDIRECT = '(.*)'/.exec(text)![1]

export async function runServer(app:Koa) {
    const port = await getPort()
    const server = app.listen(port)
    return { server, origin: `http://localhost:${port}` }
}

export function params(url:string){
    return qs.parse(url.split("?")[1]) as any
}

export const fbProfile = <FacebookProfile>{
    email: "Josianne_Bosco@gmail.com",
    first_name: "Greta",
    id: "54f483f9-9b50-4c15-b53f-46ece9e3e5f8",
    last_name: "Erdman",
    name: "Manuel Auer",
    picture: {
        data: {
            url: "http://lorempixel.com/640/480",
        }
    }
}

export const googleProfile = <GoogleProfile>{
    email: "Josianne_Bosco@gmail.com",
    given_name: "Greta",
    id: "54f483f9-9b50-4c15-b53f-46ece9e3e5f8",
    family_name: "Erdman",
    name: "Manuel Auer",
    picture:  "http://lorempixel.com/640/480",
    locale: "en",
}

export const gitHubProfile = <GitHubProfile>{
    email: "Josianne_Bosco@gmail.com",
    id: 123456,
    name: "Manuel",
    avatar_url:  "http://lorempixel.com/640/480"
}

export const gitLabProfile = <GitLabProfile> {
    email: "Josianne_Bosco@gmail.com",
    id: 123456,
    name: "Manuel Auer",
    avatar_url:  "http://lorempixel.com/640/480"
}

export const twitterProfile = <TwitterProfile>{
    name: "Manuel Auer",
    screen_name: "manuel",
    id_str: "1234567",
    profile_image_url_https:  "http://lorempixel.com/640/480"
}