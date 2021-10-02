import {
    ActionResult,
    bind,
    CustomMiddleware,
    DefaultFacility,
    HttpCookie,
    HttpStatusError,
    Invocation,
    invoke,
    PlumierApplication,
    response,
    RouteInfo,
    RouteMetadata,
    VirtualRoute,
    Class
} from "@plumier/core"
import Axios, { AxiosError } from "axios"
import crypto from "crypto"
import Csrf from "csrf"
import debug from "debug"
import { Context } from "koa"
import OAuth from "oauth-1.0a"
import qs from "querystring"
import { decorateMethod } from "@plumier/reflect"

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

export enum CookieName {
    csrfSecret = "plum-oauth:csrf-secret",
    provider = "plum-oauth:provider"
}

export type SocialProvider = "Facebook" | "GitHub" | "Google" | "GitLab" | "Twitter"
export type OAuthVersion = "1.0a" | "2.0"
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
    requestToken?: EndPoint
    profile: EndPoint & { transformer: (value: any) => Optional<OAuthUser, "provider"> }
    login: EndPoint
    oAuthVersion: OAuthVersion
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

interface ParserResult {
    user: Optional<OAuthUser, "provider">,
    profile: any,
    token: any
}

interface GeneratorResult {
    redirect: string,
    cookies: OAuthCookies
}

export type OAuth1Request = (opt: { url: string, method: "GET" | "POST", data: any }, token?: OAuth.Token) => Promise<any>

// --------------------------------------------------------------------- //
// ------------------------------- HELPER ------------------------------ //
// --------------------------------------------------------------------- //

const log = {
    debug: debug("@plumier/social-login:debug"),
    error: debug("@plumier/social-login:error")
}

export function splitName(name: string | undefined) {
    if (!name) return { firstName: "", lastName: "" }
    const idx = name.lastIndexOf(" ")
    if (idx === -1) return { firstName: name, lastName: "" }
    const lastName = name.substr(idx + 1)
    const firstName = name.substring(0, idx)
    return { firstName, lastName }
}

class OAuthCookies {
    static async oAuth2(provider: SocialProvider) {
        const csrf = new Csrf()
        const secret = await csrf.secret()
        return new OAuthCookies(secret, provider)
    }

    constructor(public secret: string, private provider: SocialProvider) { }

    toHttpCookies(): HttpCookie[] {
        return [
            { key: CookieName.csrfSecret, value: this.secret },
            { key: CookieName.provider, value: this.provider },
        ]
    }
}

export function oAuth1ARequest(apiKey: string, apiKeySecret: string): OAuth1Request {
    var oauth = new OAuth({
        consumer: {
            key: apiKey,
            secret: apiKeySecret
        },
        signature_method: 'HMAC-SHA1',
        hash_function: function (base_string, key) {
            return crypto.createHmac('sha1', key).update(base_string).digest('base64');
        }
    });
    return async ({ url, method, data }: { url: string, method: "GET" | "POST", data: any }, token?: OAuth.Token) => {
        const headers:any = oauth.toHeader(oauth.authorize({ url, method, data }, token))
        const resp = await Axios({ url, method, headers, data: method === "GET" ? undefined : data })
        return resp.data
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
// ------------------------ LOGIN URL GENERATOR ------------------------ //
// --------------------------------------------------------------------- //

// oauth 2.0
async function oAuth20LoginGenerator(ctx: Context, option: OAuthOptions, redirect_uri: string): Promise<GeneratorResult> {
    const params: any = { ...option.login.params, ...ctx.query }
    params.redirect_uri = ctx.origin + redirect_uri
    params.client_id = option.clientId
    const cookies = await OAuthCookies.oAuth2(option.provider)
    const csrf = new Csrf()
    params.state = csrf.create(cookies.secret)
    const redirect = option.login.endpoint + "?" + qs.stringify(params)
    return { redirect, cookies }
}

// oauth 1.0a
async function oAuth10aLoginGenerator(ctx: Context, opt: OAuthOptions, redirectUri: string): Promise<GeneratorResult> {
    const request = oAuth1ARequest(opt.clientId, opt.clientSecret)
    const rawTokens = await request({
        url: opt.requestToken!.endpoint,
        method: "POST",
        data: { oauth_callback: ctx.origin + redirectUri }
    })
    const reqTokens: any = qs.parse(rawTokens)
    const params = { oauth_token: reqTokens.oauth_token, ...opt.login.params, ...ctx.query }
    const redirect = `${opt.login.endpoint}?${qs.stringify(params)}`
    const cookies = new OAuthCookies(reqTokens.oauth_token, opt.provider)
    return { redirect, cookies }
}


// --------------------------------------------------------------------- //
// --------------------------- PROFILE PARSER -------------------------- //
// --------------------------------------------------------------------- //

// oauth 2.0
async function oAuth20ProfileParser(ctx: Context, option: OAuthOptions, redirect_uri: string): Promise<ParserResult> {
    const req = ctx.request
    const secret = ctx.cookies.get(CookieName.csrfSecret)!
    if (!new Csrf().verify(secret, req.query.state as string)) {
        log.error("*** Invalid csrf token ***")
        log.error("CSRF Secret: %s", secret)
        log.error("CSRF Token: %s", req.query.state)
        throw new HttpStatusError(400)
    }
    const { clientId: client_id, clientSecret: client_secret } = option
    // request access token
    const { data: token } = await Axios.post(option.token.endpoint,
        { client_id, redirect_uri, client_secret, code: req.query.code, ...option.token.params },
        { headers: { Accept: 'application/json' } }) as any
    // request profile
    const { data: profile } = await Axios.get(option.profile.endpoint, {
        params: option.profile.params,
        headers: { Authorization: `Bearer ${token.access_token}` }
    })
    const user = option.profile.transformer(profile)
    return { user, profile, token }
}

// oauth 1.0
async function oAuth10aProfileParser(ctx: Context, option: OAuthOptions, redirect_uri: string): Promise<ParserResult> {
    const req = ctx.request
    const secret = ctx.cookies.get(CookieName.csrfSecret)!
    if (secret !== req.query.oauth_token) {
        log.error("*** Invalid oauth_token ***")
        log.error("Saved token: %s", secret)
        log.error("Request token: %s", req.query.oauth_token)
        throw new HttpStatusError(400)
    }
    const request = oAuth1ARequest(option.clientId, option.clientSecret)
    const rawTokens = await request({
        url: option.token.endpoint, method: "POST",
        data: {
            oauth_token: req.query.oauth_token,
            oauth_verifier: req.query.oauth_verifier
        }
    })
    const token: any = qs.parse(rawTokens)
    const profile = await request({
        url: option.profile.endpoint, method: "GET",
        data: {}
    }, { key: token.oauth_token, secret: token.oauth_token_secret })
    const user = option.profile.transformer(profile)
    return { user, profile, token }
}

// --------------------------------------------------------------------- //
// ---------------------------- MIDDLEWARES ---------------------------- //
// --------------------------------------------------------------------- //

class OAuthLoginEndPointMiddleware implements CustomMiddleware {
    readonly generator = {
        "1.0a": oAuth10aLoginGenerator,
        "2.0": oAuth20LoginGenerator
    }

    constructor(private option: OAuthOptions, private loginPath: string, private redirectUri: string) { }

    async execute(invocation: Readonly<Invocation>): Promise<ActionResult> {
        if (invocation.ctx.path.toLowerCase() !== this.loginPath.toLowerCase()) return invocation.proceed()
        const { redirect, cookies } = await this.generator[this.option.oAuthVersion](invocation.ctx,
            this.option, this.redirectUri)
        return clientRedirect(redirect)
            .setCookie(cookies.toHttpCookies())
    }
}

class OAuthRedirectUriMiddleware implements CustomMiddleware {
    readonly parser = {
        "1.0a": oAuth10aProfileParser,
        "2.0": oAuth20ProfileParser
    }

    constructor(private option: OAuthOptions, private redirectUri: string) { }

    async execute(inv: Readonly<Invocation>): Promise<ActionResult> {
        const req = inv.ctx.request;
        if (inv.ctx.state.caller === "invoke") return inv.proceed()
        if (inv.ctx.path.toLocaleLowerCase() !== this.redirectUri.toLowerCase()) return inv.proceed()
        const provider = inv.ctx.cookies.get(CookieName.provider)
        if (provider !== this.option.provider) return inv.proceed()
        log.debug("Provider: %s", this.option.provider)
        const redirectUri = req.origin + req.path
        try {
            const result = await this.parser[this.option.oAuthVersion](inv.ctx, this.option, redirectUri)
            log.debug("OAuth User: %O", result.user)
            const provider = this.option.provider
            inv.ctx.state.oAuthUser = { ...result.user, provider }
            inv.ctx.state.oAuthToken = { ...result.token, provider }
            inv.ctx.state.oAuthProfile = { ...result.profile, provider }
        }
        catch (e) {
            log.error("*** OAuth Error ***", this.option.provider)
            log.error("Auth Code: %s", req.query.code)
            log.error("Redirect Uri: %s", redirectUri)
            if (e.response) {
                const error = (e as AxiosError)
                const response = error.response!;
                log.error("Request URL: %s %s", error.config.method, error.config.url)
                log.error("Request Data: %o", error.config.data)
                log.error("Request Headers: %o", error.config.headers)
                log.error("Error: %o", { status: response.status, message: response.statusText, data: response.data })
                throw new HttpStatusError(response.status, response.statusText)
            }
            throw e
        }
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

    async generateRoutes(): Promise<VirtualRoute[]> {
        return [{
            kind: "VirtualRoute",
            method: "get",
            provider: this.constructor as Class,
            url: this.loginEndpoint,
            access: "Public",
            openApiOperation: {
                description: `Redirect request to ${this.option.provider} login page. This endpoint writes CSRF token on the client required to generate ${this.option.provider} login endpoint`,
                tags: ["Social Login"],
                parameters: [
                    {}
                ],
            }
        }]
    }

    getRedirectUri(routes: RouteMetadata[], provider: string) {
        return routes.find((x): x is RouteInfo => x.kind === "ActionRoute" && x.action.decorators
            .some((y: OAuthRedirectUriDecorator) => y.name === "OAuthRedirectUriDecorator" && y.provider === provider))
    }

    async initialize(app: Readonly<PlumierApplication>, routes: RouteMetadata[]) {
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
        const option = { ...this.option, clientId, clientSecret }
        app.use(new OAuthLoginEndPointMiddleware(option, this.loginEndpoint, redirectUriRoute.url))
        app.use(new OAuthRedirectUriMiddleware(option, redirectUriRoute.url))
    }
}