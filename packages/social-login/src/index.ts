import { middleware } from "@plumier/core"

import { SocialAuthMiddleware, SocialAuthProvider } from "./middleware"

export function oAuthCallback(option: SocialAuthProvider) {
    return middleware.use(new SocialAuthMiddleware(option))
}

export { GoogleProvider, GoogleProfile } from "./provider/google"
export { FacebookProvider, FacebookProfile } from "./provider/facebook"
export { GithubProvider, GithubProfile } from "./provider/github"
export { GitLabProvider, GitLabProfile } from "./provider/gitlab"
export { SocialAuthMiddleware, SocialAuthProvider } from "./middleware"

