import dotEnv from "dotenv"

dotEnv.config()

export const fb = {
    appId: process.env.FACEBOOK_APP_ID!,
    appSecret: process.env.FACEBOOK_APP_SECRET!,
    redirectUri: process.env.FACEBOOK_REDIRECT_URI!,
    email: process.env.FACEBOOK_USER_EMAIL!,
    password: process.env.FACEBOOK_USER_PASSWORD!
}


export const google = {
    appId: process.env.GOOGLE_APP_ID!,
    appSecret: process.env.GOOGLE_APP_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
    email: process.env.GOOGLE_USER_EMAIL!,
    password: process.env.GOOGLE_USER_PASSWORD!
}

