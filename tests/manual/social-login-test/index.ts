import { ServeStaticFacility } from "@plumier/serve-static"
import {
    FacebookOAuthFacility,
    GitHubOAuthFacility,
    GitLabOAuthFacility,
    GoogleOAuthFacility,
    OAuthUser,
    redirectUri,
    TwitterOAuthFacility,
} from "@plumier/social-login"
import dotenv from "dotenv"
import { join } from "path"
import Plumier, { bind, response, route, WebApiFacility, LoggerFacility } from "plumier"
import { SwaggerFacility } from '@plumier/swagger'

dotenv.config({ path: join(__dirname, "../../../.env")})

export class AuthController {
    @route.get("/")
    index() {
        return response.file(join(__dirname, "./www/index.html"))
    }

    @redirectUri()
    callback(@bind.oAuthUser() user: OAuthUser) {
        return response.postMessage({ status: "Success", user })
    }
}

new Plumier()
    .set(new WebApiFacility({ controller: __filename, bodyParser: { multipart: true } }))
    .set(new LoggerFacility())
    .set(new ServeStaticFacility())
    .set(new FacebookOAuthFacility())
    .set(new GoogleOAuthFacility())
    .set(new GitHubOAuthFacility())
    .set(new GitLabOAuthFacility())
    .set(new TwitterOAuthFacility())
    .set(new SwaggerFacility())
    .listen(3000)
    .catch(console.error)