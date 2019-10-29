---
id: social-login
title: Social Login
---

Plumier provided action specific middleware to easily create OAuth 2 callback url. Internally it uses [authorization code flow](https://developer.okta.com/blog/2018/04/10/oauth-authorization-code-grant-type). With supported provider Google, Facebook, Github, GitLab.

## OAuth Callback Middleware 
Every OAuth2 with authorization code flow require us to create a callback url to parse authorization `code` and further  we can exchange the authorization code into access token. 

Plumier OAuth callback middleware done all those process for you and automatically bind the login status into parameter marked with `@bind.loginStatus()`. 

```typescript 
import { FacebookProvider } from "@plumier/social-login"
import { sign } from "jsonwebtoken"
import { response, bind } from "plumier"

export class FacebookController {
    @oAuthCallback(new FacebookProvider(<client id>, <client secret>))
    callback(@bind.loginStatus() status: FacebookLoginStatus) {
        const token = sign({ <token claim> }, <token secret>)
        return response.callbackView({ accessToken: token })
    }
} 
```

Controller above will handle `GET /facebook/callback` which will be used as a OAuth callback url. `@oAuthCallback` is an action specific middleware that will be process the provided authorization code passed by the Facebook login screen. 

> Keep in mind that by default controller method translated into `GET` route, so on example above its not necessary to decorate the `callback` method with  `@route.get()`.

Internally `@oAuthCallback` will process the authorization code, exchange the code into access token and retrieve user profile from OAuth provider. `@oAuthCallback` automatically bind parameter decorated with `@bind.loginStatus()` and populate its value with data like below


```typescript
interface SocialLoginStatus<T = any> {
    status: "Success" | "Error",
    error?: any,
    data?: T
}
```

* `status`: status of the login the value can be `Success` or `Error`.
* `error`: error information of the current login
* `data`: contains current user profile information if `status` is `Success`.

## Provider
`@oAuthCallback` middleware receive single parameter named provider which will provide info about token url and profile url, you can create your own provider easily by using plain TypeScript class implements `SocialAuthProvider` the signature is like below

```typescript
export interface SocialAuthProvider {
    tokenEndPoint: string
    profileEndPoint: string
    clientId: string
    clientSecret: string
    profileParams: {}
}
```

Interface above is a contract for a provider required by `@oAuthCallback` middleware.

* `tokenEndPoint` token endpoint of the OAuth server 
* `profileEndPoint` profile endpoint to get current login user information.
* `clientId` OAuth 2 client id
* `clientSecret` OAuth 2 client secret 
* `profileParams` extra parameter used to query login user profile.


## Callback View 
Ideally OAuth login launched in a new browser window or popup, at the end of login process callback url need a way to pass a login token into the parent window. 

Plumier provided a simple html used to communicate to the parent window. From the previous example you can see that the `callback` method returned `response.callbackView()`, this function actually returned html that will be pass the token into the parent window, the html is like below:

```html
<!DOCTYPE html>
<html>
    <title></title>
    <body>
        <script type="text/javascript">
            var message = '<message passed from method, serialized into json>';
            (function(){
                window.onbeforeunload = function () {
                    window.opener.onCancelLogin(window)
                };
                window.opener.onLogin(window, JSON.parse(message))
            })()
        </script>
    </body>
</html>
```

Important part of above code is you need to provide 2 global functions that will be called by the popup: 

* `onLogin` function will be called when the login process ended (Fail or Success)
* `onCancelLogin` called when the popup closed.


## Example
The full implementation of social login can be found [here](https://github.com/plumier/tutorial-monorepo-social-login). Important parts of the example are: 

* OAuth callbacks implementations for each social medias can be found [AuthController](https://github.com/plumier/tutorial-monorepo-social-login/blob/eba5a1da0f14a452011673ec731a414392afae35/packages/server/src/controller/auth-controller.ts#L77)
* UI logic to compose auth url and show the social login popup [here](https://github.com/plumier/tutorial-monorepo-social-login/blob/eba5a1da0f14a452011673ec731a414392afae35/packages/ui/src/page/popup.ts#L1)
* UI logic to handle social login `onLogin` event [here](https://github.com/plumier/tutorial-monorepo-social-login/blob/3497b498857011ec794e761446c9ff73207d5683/packages/ui/src/App.tsx#L10)