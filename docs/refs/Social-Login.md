---
id: social-login
title: Social Media Login
---

Plumier provided functionalities to easily secure your API and application using social media login such as Facebook, Google, GitHub and GitLab (Other provider will be added in the future). It included some security best practices out of the box, so you don't need to understand the security practice technically to implement social media login in Plumier.

> This documentation assume that you have knowledge on how to setup social login application on [Facebook](https://developers.facebook.com/), [Google](https://console.developers.google.com/), [GitHub](https://github.com/settings/developers) and [GitLab](https://gitlab.com/profile/applications), and have basic knowledge on how to setup OAuth 2.0 login.

> **Source Code Example**: Complete example using social media login can be found in these GitHub repositories: [React](https://github.com/plumier/tutorial-monorepo-social-login) and [Vue.js](https://github.com/plumier/tutorial-social-login-vue)

## Enable Functionalities 
Plumier social media login is not enabled by default, to enable the functionalities use some provided Facility from `@plumier/social-login` package. 

| Facility                | Description                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `OAuthFacility`         | Provided general function to work with OAuth 2, such as the CSRF Secret endpoint etc |
| `FacebookOAuthFacility` | Provide Facebook specific social login functionalities                               |
| `GoogleOAuthFacility`   | Provide Google specific social login functionalities                                 |
| `GitHubOAuthFacility`   | Provide GitHub specific social login functionalities                                 |
| `GitLabOAuthFacility`   | Provide GitLab specific social login functionalities                                 |

`OAuthFacility` facility is mandatory because its provide the common functionalities required to perform OAuth process.

To enable the social login functionality, register above facility on the Plumier application like below: 

```typescript
const plumier = new Plumier()
    .set(new WebApiFacility())
    .set(new OAuthFacility())
    .set(new FacebookOAuthFacility({ 
        clientId: <FACEBOOK APP ID>, 
        clientSecret: <FACEBOOK APP SECRET> 
    }))
    .initialize()
```

All OAuth provider facility (`FacebookOAuthFacility`, `GoogleOAuthFacility`, `GitHubOAuthFacility`, `GitLabOAuthFacility`) receive option parameter which required a client id and client secret. This value can be found in the appropriate social login console application. 

## Environment Variable for Default Configuration
All OAuth provider facility can be instantiated without parameters, It will automatically check for the environment variable for each Client ID and Client Secret. For example if the registration is like below


```typescript
const plumier = new Plumier()
    .set(new WebApiFacility())
    .set(new OAuthFacility())
    .set(new FacebookOAuthFacility())
    .initialize()
```

`FacebookOAuthFacility` will search for environment variable `PLUM_FACEBOOK_CLIENT_ID` and `PLUM_FACEBOOK_CLIENT_SECRET`. If both not found an error will be thrown.


| Facility                | Client ID                 | Client Secret                 |
| ----------------------- | ------------------------- | ----------------------------- |
| `FacebookOAuthFacility` | `PLUM_FACEBOOK_CLIENT_ID` | `PLUM_FACEBOOK_CLIENT_SECRET` |
| `GoogleOAuthFacility`   | `PLUM_GOOGLE_CLIENT_ID`   | `PLUM_GOOGLE_CLIENT_SECRET`   |
| `GitHubOAuthFacility`   | `PLUM_GITHUB_CLIENT_ID`   | `PLUM_GITHUB_CLIENT_SECRET`   |
| `GitLabOAuthFacility`   | `PLUM_GITLAB_CLIENT_ID`   | `PLUM_GITLAB_CLIENT_SECRET`   |


## Showing The Login Page

Plumier provided endpoints that will be redirected to the social media login page. It generate the required parameter including the csrf token and then redirect the request to the generated url.

| Endpoint                   | Served By               | Description                     |
| -------------------------- | ----------------------- | ------------------------------- |
| `GET /auth/csrf-secret`    | `OAuthFacility`         | Retrieve csrf secret.           |
| `GET /auth/facebook/login` | `FacebookOAuthFacility` | Redirect to Facebook login page |
| `GET /auth/google/login`   | `GoogleOAuthFacility`   | Redirect to Google login page   |
| `GET /auth/github/login`   | `GitHubOAuthFacility`   | Redirect to GitHub login page   |
| `GET /auth/gitlab/login`   | `GitLabOAuthFacility`   | Redirect to GitLab login page   |

Above endpoint can be change accordingly see [customization](#customization) section for more detail.

Before showing the social media login page it is necessary to call the `/auth/csrf-secret` to attach the current session with the CSRF Secret. This process can be done by issuing an AJAX call to the endpoint using http client such as `fetch` or `axios`. 

```javascript
Axios.get("/auth/csrf-secret")
```

Serve the social media login page using the url provided, for example you can redirect the user to the Facebook login screen like below

```html
<a href="/auth/facebook/login">Login with Facebook</a>
```

Or you can show a popup dialog window like below:

```html
<script>
    function showFacebookDialog(){
        window.open("/auth/facebook/login", "Login using Facebook", "toolbar=no, width=500, height=500")
    }
</script>

<button onclick="showFacebookDialog()">Login with Facebook</button>
```

When user click the link or button above, user will redirected to the Facebook login page properly.

## Redirect URI Handler 
Plumier provided `@redirectUri()` decorator to easily mark controller as a social media redirect uri. To create a controller as a redirect uri handler simply mark the method with the decorator like below.

```typescript
class AuthController {

    @route.get()
    @redirectUri()
    callback(@bind.oAuthUser() user:OAuthUser) {

    }
}
```

Above is a common Plumier controller, no special configuration added except the `@redirectUri()`. Above controller is a general redirect uri handler, its mean that it will handle all provider's redirect uris registered in the Plumier application into single method's controller. 

Controller above handles `GET /auth/callback` route, you can change this easily to match your redirect uri registered in the OAuth application provider. 

## Separate Redirect Uris

If you have different redirect uri registered on your OAuth application, you can create separate redirect uri for specific provider, while keep using the general redirect uri: 

```typescript
class AuthController {

    @route.get()
    @redirectUri()
    callback(@bind.oAuthUser() user:OAuthUser) {
        // this will handle the rest provider registered except facebook
    }

    @route.get()
    @redirectUri("Facebook")
    facebook(@bind.oAuthUser() user:OAuthUser) {
        // this will only handle Facebook redirect uri
    }
}
```

If you provide a specific redirect uri handler, the general redirect uri will not be called.

## OAuth User 
OAuth user is the current social media user. If you notice all example above, all controller has parameter decorate with `@bind.oAuthUser()` decorator. 

```typescript
interface OAuthUser<T = {}> {
    provider: "Facebook" | "Google" | "GitHub" | "GitLab"
    id: string,
    name: string,
    firstName: string,
    lastName: string,
    profilePicture: string,
    email?: string,
    gender?: string,
    dateOfBirth?: string
    raw: T
}
```

* `provider` is the OAuth provider name calling the redirect uri 
* `id` is the user id on OAuth provider. Note that this field unique to `provider` field
* `name` is the complete name of the current social media login user
* `firstName` is the first name of the current social media login user
* `lastName` is the last name of the current social media login user
* `profilePicture` is the profile picture or avatar of the current social media login user
* `email`, `gender`, `dateOfBirth` is optional, its based on your OAuth application access
* `raw` is the raw value of the social media profile result.

## Sending Message Back To Main Window
When social medial login process done using a popup dialog window, it needs a way to signal the main window that the login process successful or not. 

Plumier provided an ActionResult returned html that will automatically post message to main window that open the login dialog. `response.postMessage()`.

```typescript
class AuthController {

    @route.get()
    @redirectUri()
    callback(@bind.oAuthUser() user:OAuthUser) {
        // other process... for example check if user is in database

        //create JWT TOKEN
        const token = sign(<claim>, <secret>)
        return response.postMessage({ status: "Success", token })
    }
}
```

> By default `response.postMessage` will send message only to the same origin, you can change this behavior by providing the origin on second parameter.

Redirect uri handler above will send the `{ status: "Success", token }` message to the main window using [post message](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage), main window need to listen to the `message` event like below: 

```javascript
window.addEventListener("message", ev => {
    // IMPORTANT!!
    // make sure the message comes from the same origin
    if(ev.origin === location.origin && ev.data.status === "Success"){
        // close the popup dialog
        if (ev.source && "close" in ev.source) ev.source.close()
        // retrieve the token 
        const token = ev.data.token;
        // add code, when the login successful
    }
})
```

> **Best Practice**: Its required to check the `ev.origin` of the message event because any window possible to send message to the main window. 

## Customization
Plumier social login functionalities can be customize to match your need. 

### Custom CSRF Token Secret Endpoint
CSRF Token Secret can be customize from the `OAuthFacility` like below 

```typescript
new Plumier()
    .set(new OAuthFacility({ csrfEndpoint: "/auth/identity" }))
```

### Custom Login Endpoint 
Login endpoint served by OAuth provider facility can be customized accordingly from the facility

```typescript 
new Plumier()
    .set(new FacebookOAuthFacility({ 
        loginEndPoint: "/auth/facebook/login-url"
    }))
```

### Add Extra Parameter To Login Endpoint 
Its possible to customize the generated login endpoint by providing the parameter. For example the default scope of google endpoint used is: `https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile`. You can override this by providing the scope on the login endpoint: 

```
GET /auth/google/login?scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email
```

### Add Extra Parameter on Profile Endpoint 
OAuth provider facility used minimum configuration parameter to access the user profile endpoint. For example for Facebook provider the field params use is `id,name,first_name,last_name,picture.type(large)`. You can override this by providing the parameters in the `FacebookOAuthFacility` (other provider also can be configured) like below: 

```typescript 
new Plumier()
    .set(new FacebookOAuthFacility({ 
        profileParams: { fields: "id,name,email,birthday,first_name,last_name,picture.type(large)" }
    }))
```