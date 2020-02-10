import {
    ActionResult,
    bind,
    CustomMiddleware,
    DefaultFacility,
    HttpStatusError,
    Invocation,
    invoke,
    PlumierApplication,
    response,
    RouteInfo,
    HttpCookie,
} from "@plumier/core"
import Axios, { AxiosError } from "axios"
import Csrf from "csrf"
import debug from "debug"
import { Context } from "koa"
import qs from "querystring"
import { decorateMethod } from "tinspector"

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

export enum CookieName {
    csrfSecret = "plum-oauth:csrf-secret",
    provider = "plum-oauth:provider"
}

export type SocialProvider = "Facebook" | "GitHub" | "Google" | "GitLab"
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export interface EndPoint {
    endpoint: string
    params: {}
}

export interface OAuthOptions {
    provider: SocialProvider
    clientId: string
    clientSecret: string
    token: EndPoint
    profile: EndPoint & { transformer: (value: any) => Optional<OAuthUser, "provider"> }
    login: EndPoint
    oAuthVersion: "2.0"
}

export interface OAuthUser {
    provider: SocialProvider
    id: string,
    name: string,
    firstName: string,
    lastName: string,
    profilePicture: string,
    email?: string,
    gender?: string,
    dateOfBirth?: string
}

export interface OAuthProviderOption {
    clientId?: string,
    clientSecret?: string,
    loginEndPoint?: string,
    profileParams?: {}
}

// --------------------------------------------------------------------- //
// ------------------------------- HELPER ------------------------------ //
// --------------------------------------------------------------------- //

const log = {
    debug: debug("@plumier/social-login:debug"),
    error: debug("@plumier/social-login:error")
}

export function splitName(name: string) {
    const names = name.split(" ")
    const firstName = names[0]
    const lastName = names.length > 1 ? names.filter((x, i) => i > 0).join(" ") : ""
    return { firstName, lastName }
}

class OAuthCookies {
    static async oAuth2(provider: SocialProvider) {
        const csrf = new Csrf()
        const secret = await csrf.secret()
        return new OAuthCookies(secret, provider, "2.0")
    }

    static parse(ctx: Context) {
        const secret = ctx.cookies.get(CookieName.csrfSecret)
        const provider = ctx.cookies.get(CookieName.provider)
        return { secret, provider }
    }

    constructor(public secret: string, private provider: SocialProvider, private oAuthVersion: "2.0") { }

    toHttpCookies(): HttpCookie[] {
        return [
            { key: CookieName.csrfSecret, value: this.secret },
            { key: CookieName.provider, value: this.provider },
        ]
    }
}

// --------------------------------------------------------------------- //
// ----------------------------- DECORATORS ---------------------------- //
// --------------------------------------------------------------------- //

export interface OAuthRedirectUriDecorator { name: "OAuthRedirectUriDecorator", provider: SocialProvider }

export function redirectUri(provider: SocialProvider | "General" = "General") {
    return decorateMethod(<OAuthRedirectUriDecorator>{ name: "OAuthRedirectUriDecorator", provider })
}

declare module "@plumier/core" {
    namespace bind {
        export function oAuthUser(): (target: any, name: string, index: number) => void
        export function oAuthToken(): (target: any, name: string, index: number) => void
        export function oAuthProfile(): (target: any, name: string, index: number) => void
    }
}

bind.oAuthUser = () => bind.custom(x => x.state.oAuthUser)
bind.oAuthToken = () => bind.custom(x => x.state.oAuthToken)
bind.oAuthProfile = () => bind.custom(x => x.state.oAuthProfile)



// --------------------------------------------------------------------- //
// ------------------------------ RESPONSE ----------------------------- //
// --------------------------------------------------------------------- // 

declare module "@plumier/core" {
    namespace response {
        function postMessage(message: any, origin?: string): ActionResult;
    }
}

response.postMessage = (message: any, origin?: string) => {
    return new ActionResult(`
    <!DOCTYPE html>
    <html>
        <title></title>
        <body>
            <div class="container"></div>
            <script type="text/javascript">
                var message = '${JSON.stringify(message)}';
                var origin ${!!origin ? `= '${origin}'` : ""};
                (function(){
                    window.onbeforeunload = function () {
                        window.opener.postMessage({ status: "Close" }, origin || window.location.origin);
                    };
                    window.opener.postMessage(JSON.parse(message), origin || window.location.origin);
                })()
            </script>
        </body>
    </html>
    `).setHeader("Content-Type", "text/html")
}

function clientRedirect(url: string) {
    // redirect client using JS to possibly set cookie before redirection
    return new ActionResult(`
    <!DOCTYPE html>
    <html>
        <title></title>
        <body>
            <div class="container"></div>
            <script type="text/javascript">
                const REDIRECT = '${url}';
                (function(){
                    window.location.href = REDIRECT;
                })()
            </script>
        </body>
    </html>
    `).setHeader("Content-Type", "text/html")
}


// --------------------------------------------------------------------- //
// ---------------------------- MIDDLEWARES ---------------------------- //
// --------------------------------------------------------------------- //

class OAuthLoginEndPointMiddleware implements CustomMiddleware {
    constructor(private option: OAuthOptions, private loginPath: string, private redirectUri: string) { }

    async execute(invocation: Readonly<Invocation>): Promise<ActionResult> {
        if (invocation.ctx.path.toLowerCase() === this.loginPath.toLowerCase()) {
            const params: any = { ...this.option.login.params, ...invocation.ctx.query }
            params.redirect_uri = invocation.ctx.origin + this.redirectUri
            params.client_id = this.option.clientId
            const cookies = await OAuthCookies.oAuth2(this.option.provider)
            const csrf = new Csrf()
            params.state = csrf.create(cookies.secret)
            const redirect = this.option.login.endpoint + "?" + qs.stringify(params)
            return clientRedirect(redirect)
                .setCookie(cookies.toHttpCookies())
        }
        else return invocation.proceed()
    }
}

class OAuthRedirectUriMiddleware implements CustomMiddleware {

    constructor(private option: OAuthOptions, private redirectUri: string) { }

    protected async exchange(code: string, redirect_uri: string): Promise<string> {
        const { token: { endpoint, params }, clientId: client_id, clientSecret: client_secret } = this.option
        const data = { client_id, redirect_uri, client_secret, code, ...params }
        const headers = { Accept: 'application/json' }
        const response = await Axios.post<{ access_token: string }>(endpoint, data, { headers })
        return response.data.access_token;
    }

    protected async getProfile(token: string): Promise<any> {
        const { endpoint, params } = this.option.profile
        const response = await Axios.get(endpoint, {
            params, headers: { Authorization: `Bearer ${token}` }
        })
        return response.data;
    }

    // oauth 2.0
    protected async parse(ctx: Context) {
        try {
            const req = ctx.request
            const secretCookie = ctx.cookies.get(CookieName.csrfSecret)!
            const csrf = new Csrf()
            if (!csrf.verify(secretCookie, req.query.state)) {
                log.error("Invalid csrf token")
                throw new HttpStatusError(400)
            }
            log.debug("Auth Code: %s", req.query.code)
            log.debug("State: %s", req.query.state)
            log.debug("Redirect Uri: %s", req.origin + req.path)
            const token = await this.exchange(req.query.code, req.origin + req.path)
            log.debug("Token: %s", token)
            const profile = await this.getProfile(token)
            log.debug("OAuth Profile: %o", profile)
            const user = {...this.option.profile.transformer(profile), provider: this.option.provider }
            return { user, profile, token }
        }
        catch (e) {
            if (e.response) {
                const response = (e as AxiosError).response!
                log.error("Error: %o", { status: response.status, message: response.statusText, data: response.data })
                throw new HttpStatusError(response.status, response.statusText)
            }
            throw e
        }
    }

    async execute(inv: Readonly<Invocation>): Promise<ActionResult> {
        const req = inv.ctx.request;
        if (inv.ctx.state.caller === "invoke") return inv.proceed()
        if (inv.ctx.path.toLocaleLowerCase() !== this.redirectUri.toLowerCase()) return inv.proceed()
        const cookies = OAuthCookies.parse(inv.ctx)
        log.debug("CSRF Cookie: %o", cookies)
        if (cookies.provider !== this.option.provider) return inv.proceed()
        const result = await this.parse(inv.ctx)
        inv.ctx.state.oAuthUser = result.user
        inv.ctx.state.oAuthToken = result.token
        inv.ctx.state.oAuthProfile = result.profile
        return invoke(inv.ctx, inv.ctx.route!)
    }
}

// --------------------------------------------------------------------- //
// ------------------------------ FACILITY ----------------------------- //
// --------------------------------------------------------------------- //

export class OAuthProviderBaseFacility extends DefaultFacility {
    private option: Optional<OAuthOptions, "clientId" | "clientSecret">
    private loginEndpoint: string

    constructor(option: Optional<OAuthOptions, "clientId" | "clientSecret">, opt?: OAuthProviderOption) {
        super()
        this.option = {
            ...option,
            clientId: opt?.clientId,
            clientSecret: opt?.clientSecret,
        }
        if (opt && opt.profileParams)
            this.option.profile.params = { ...this.option.profile.params, ...opt.profileParams }
        this.loginEndpoint = opt?.loginEndPoint ?? `/auth/${this.option.provider.toLowerCase()}/login`
    }

    getRedirectUri(routes: RouteInfo[], provider: string) {
        return routes.find(x => x.action.decorators
            .some((y: OAuthRedirectUriDecorator) => y.name === "OAuthRedirectUriDecorator" && y.provider === provider))
    }

    async initialize(app: Readonly<PlumierApplication>, routes: RouteInfo[]) {
        const redirectUriRoute = this.getRedirectUri(routes, this.option.provider) ?? this.getRedirectUri(routes, "General")
        if (!redirectUriRoute) throw new Error(`OAuth: No ${this.option.provider} redirect uri handler found`)
        if (redirectUriRoute.url.search(":") > -1) throw new Error(`OAuth: Parameterized route is not supported on ${this.option.provider} callback uri`)
        if (redirectUriRoute.method !== "get") throw new Error(`OAuth: Redirect uri must have GET http method on ${redirectUriRoute.controller.name}.${redirectUriRoute.action.name}`)
        const clientIdKey = `PLUM_${this.option.provider.toUpperCase()}_CLIENT_ID`
        const clientSecretKey = `PLUM_${this.option.provider.toUpperCase()}_CLIENT_SECRET`
        const clientId = this.option.clientId ?? process.env[clientIdKey]
        if (!clientId) throw new Error(`OAuth: Client id for ${this.option.provider} not provided`)
        const clientSecret = this.option.clientSecret ?? process.env[clientSecretKey]
        if (!clientSecret) throw new Error(`OAuth: Client secret for ${this.option.provider} not provided`)
        app.use(new OAuthLoginEndPointMiddleware({ ...this.option, clientId, clientSecret }, this.loginEndpoint, redirectUriRoute.url))
        app.use(new OAuthRedirectUriMiddleware({ ...this.option, clientId, clientSecret }, redirectUriRoute.url))
    }
}