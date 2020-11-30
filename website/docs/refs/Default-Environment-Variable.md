---
id: default-environment-variable
title: Default Environment Variable
---

Plumier facilities automatically check into some environment variable name during initialization, this process is optional because you still can configure the facility manually on your code.

For example, the `JwtAuthFacility` if registered without parameter it will check to the `PLUM_JWT_SECRET` environment variable.

```typescript
new Plumier()
    // automatically check for PLUM_JWT_SECRET for JWT secret
    .set(new JwtAuthFacility())
```

Or you can configure the facility manually from your code like below

```typescript 
new Plumier()
    .set(new JwtAuthFacility({ secret: process.env.YOUR_JWT_SECRET }))
```


| Env Variable                      | Facility              | Description                                                         |
| --------------------------------- | --------------------- | ------------------------------------------------------------------- |
| PLUM_FORCE_HTTPS                  | WebApiFacility        | Set force https, enable `trustProxyHeader` configuration separately |
| PLUM_JWT_SECRET                   | JwtAuthFacility       | Store JWT secret                                                    |
| PLUM_MONGODB_URI                  | MongooseFacility      | Store MongoDB uri                                                   |
| PLUM_FACEBOOK_CLIENT_ID           | FacebookOAuthFacility | Store Facebook OAuth 2.0 client id                                  |
| PLUM_FACEBOOK_CLIENT_SECRET       | FacebookOAuthFacility | Store Facebook OAuth 2.0 client secret                              |
| PLUM_GOOGLE_CLIENT_ID             | GoogleOAuthFacility   | Store Google OAuth 2.0 client id                                    |
| PLUM_GOOGLE_CLIENT_CLIENT_SECRET  | GoogleOAuthFacility   | Store Google OAuth 2.0 client secret                                |
| PLUM_GITHUB_CLIENT_ID             | GithubOAuthFacility   | Store Github OAuth 2.0 client id                                    |
| PLUM_GITHUB_CLIENT_CLIENT_SECRET  | GithubOAuthFacility   | Store Github OAuth 2.0 client secret                                |
| PLUM_GITLAB_CLIENT_ID             | GitLabOAuthFacility   | Store GitLab OAuth 2.0 client id                                    |
| PLUM_GITLAB_CLIENT_CLIENT_SECRET  | GitLabOAuthFacility   | Store GitLab OAuth 2.0 client secret                                |
| PLUM_TWITTER_CLIENT_ID            | TwitterOAuthFacility  | Store Twitter OAuth 1.0a client id                                  |
| PLUM_TWITTER_CLIENT_CLIENT_SECRET | TwitterOAuthFacility  | Store Twitter OAuth 1.0a client secret                              |

s