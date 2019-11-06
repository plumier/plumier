import { ActionResult, middleware, response } from "@plumier/core"

import { content } from "./callback-view"
import { DialogProvider, SocialAuthProvider, OAuthCallbackMiddleware, OAuthDialogEndPointMiddleware } from "./middleware"

export function oAuthCallback(option: SocialAuthProvider) {
    return middleware.use(new OAuthCallbackMiddleware(option))
}

export function oAuthDialogEndPoint(option:DialogProvider){
    return middleware.use(new OAuthDialogEndPointMiddleware(option))
}

export { GoogleProvider, GoogleLoginStatus, GoogleProfile, GoogleDialogProvider } from "./provider/google"
export { FacebookProvider, FacebookLoginStatus, FacebookProfile, FacebookDialogProvider } from "./provider/facebook"
export { GitHubProvider, GitHubLoginStatus, GitHubProfile, GitHubDialogProvider } from "./provider/github"
export { GitLabProvider, GitLabLoginStatus, GitLabProfile, GitLabDialogProvider } from "./provider/gitlab"
export { OAuthCallbackMiddleware, OAuthDialogEndPointMiddleware, SocialLoginStatus, SocialAuthProvider, DialogProvider } from "./middleware"

declare module "@plumier/core" {
    namespace response {
        function callbackView(message: any): ActionResult;
    }
}

response.callbackView = (message: any) => {
    return new ActionResult(content(message))
        .setHeader("Content-Type", "text/html")
}