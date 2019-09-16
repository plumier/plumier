import { middleware, ActionResult, response } from "@plumier/core"

import { SocialAuthMiddleware, SocialAuthProvider } from "./middleware"
import { CallbackView } from './callback-view'

export function oAuthCallback(option: SocialAuthProvider) {
    return middleware.use(new SocialAuthMiddleware(option))
}

export { GoogleProvider, GoogleLoginStatus, GoogleProfile } from "./provider/google"
export { FacebookProvider, FacebookLoginStatus, FacebookProfile } from "./provider/facebook"
export { GitHubProvider, GitHubLoginStatus, GitHubProfile } from "./provider/github"
export { GitLabProvider, GitLabLoginStatus, GitLabProfile } from "./provider/gitlab"
export { SocialAuthMiddleware, SocialLoginStatus, SocialAuthProvider } from "./middleware"


declare module "@plumier/core" {
    namespace response {
        function callbackView(message: any): ActionResult;
    }
}

response.callbackView = (message: any) => {
    return new CallbackView(message)
}