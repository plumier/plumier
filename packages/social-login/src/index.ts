import { middleware } from "@plumier/core"

import { SocialAuthMiddleware, SocialAuthProvider } from "./middleware"

export function oAuthCallback(option: SocialAuthProvider) {
    return middleware.use(new SocialAuthMiddleware(option))
}

export { GoogleProvider, GoogleLoginStatus, GoogleProfile } from "./provider/google"
export { FacebookProvider, FacebookLoginStatus, FacebookProfile } from "./provider/facebook"
export { GitHubProvider, GitHubLoginStatus, GitHubProfile } from "./provider/github"
export { GitLabProvider, GitLabLoginStatus, GitLabProfile } from "./provider/gitlab"
export { SocialAuthMiddleware, SocialLoginStatus, SocialAuthProvider } from "./middleware"