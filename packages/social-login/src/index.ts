import { ActionResult, middleware, response } from "@plumier/core"

import { content } from "./old/callback-view"
import { DialogProvider, SocialAuthProvider, OAuthCallbackMiddleware, OAuthDialogEndPointMiddleware } from "./old/middleware"

export function oAuthCallback(option: SocialAuthProvider) {
    return middleware.use(new OAuthCallbackMiddleware(option))
}

export function oAuthDialogEndPoint(option: DialogProvider) {
    return middleware.use(new OAuthDialogEndPointMiddleware(option))
}

export { GoogleProvider, GoogleLoginStatus, GoogleDialogProvider } from "./old/provider/google"
export { FacebookProvider, FacebookLoginStatus, FacebookDialogProvider } from "./old/provider/facebook"
export { GitHubProvider, GitHubLoginStatus, GitHubDialogProvider } from "./old/provider/github"
export { GitLabProvider, GitLabLoginStatus, GitLabDialogProvider } from "./old/provider/gitlab"
export { OAuthCallbackMiddleware, OAuthDialogEndPointMiddleware, SocialLoginStatus, SocialAuthProvider, DialogProvider } from "./old/middleware"

declare module "@plumier/core" {
    namespace response {
        function callbackView(message: any): ActionResult;
    }
}

response.callbackView = (message: any) => {
    return new ActionResult(content(message))
        .setHeader("Content-Type", "text/html")
}

export { OAuthUser, redirectUri, CookieName, SocialProvider, OAuthProviderBaseFacility, OAuthProviderOption, OAuthOptions, splitName } from "./core"
export { FacebookOAuthFacility, FacebookProfile } from "./facebook"
export { GoogleOAuthFacility, GoogleProfile } from "./google"
export { GitHubOAuthFacility, GitHubProfile } from "./github"
export { GitLabOAuthFacility, GitLabProfile } from "./gitlab"