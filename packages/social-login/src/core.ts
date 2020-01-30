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
} from "@plumier/core"
import Axios from "axios"
import Csrf from "csrf"
import debug from "debug"
import { Context } from "koa"
import qs from "querystring"
import { decorateMethod } from "tinspector"

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

const csrfCookieName = "plum-social-login:csrf-secret"
type SocialProvider = "Facebook" | "GitHub" | "Google" | "GitLab"
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export interface EndPoint {
    endpoint: string
    params: {}
}

export interface OAuthOptions {
    provider: SocialProvider
    clientId: string
    clientSecret: string
    token: EndPoint
    profile: EndPoint & { transformer: (value: any) => OAuthUser }
    login: EndPoint
}

export interface OAuthUser<T = {}> {
    provider: SocialProvider
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

export interface OAuthProviderOption {
    clientId?: string,
    clientSecret?: string,
    loginEndPoint?: string,
    profileParams?: {}
}




// --------------------------------------------------------------------- //
// ------------------------------- HELPER ------------------------------ //
// --------------------------------------------------------------------- //

export function splitName(name: string) {
    const names = name.split(" ")
    const firstName = names[0]
    const lastName = names.length > 1 ? names.filter((x, i) => i > 0).join(" ") : ""
    return { firstName, lastName }
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
    }
}

bind.oAuthUser = () => bind.custom(x => x.state.oAuthUser)


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
                        window.opener.postMessage({ status: "Close" }, origin || window.location.origin)
                    };
                    window.opener.postMessage(JSON.parse(message), origin || window.location.origin)
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
            const url = this.option.login.endpoint
            params.redirect_uri = invocation.ctx.origin + this.redirectUri
            params.client_id = this.option.clientId
            const csrf = new Csrf()
            const csrfSecret = invocation.ctx.cookies.get(csrfCookieName)
            if (!csrfSecret) throw new HttpStatusError(400, "Request doesn't contains csrf secret")
            params.state = `${this.option.provider}.${csrf.create(csrfSecret)}`
            const redirect = url + "?" + qs.stringify(params)
            return response.redirect(redirect)
        }
        else return invocation.proceed()
    }
}

class OAuthRedirectUriMiddleware implements CustomMiddleware {
    private log = debug("@plumier/social-login")

    constructor(private option: OAuthOptions, private redirectUri: string) { }

    protected async exchange(code: string, redirectUri: string): Promise<string> {
        const response = await Axios.post<{ access_token: string }>(this.option.token.endpoint,
            {
                client_id: this.option.clientId, redirect_uri: redirectUri,
                client_secret: this.option.clientSecret,
                code, ...this.option.token.params
            },
            {
                headers: {
                    Accept: 'application/json',
                },
            })
        return response.data.access_token;
    }

    protected async getProfile(token: string): Promise<any> {
        const response = await Axios.get(this.option.profile.endpoint, {
            params: this.option.profile.params,
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        return response.data;
    }

    protected getSplitTokenAndProvider(state: string) {
        const [provider, ...states] = state.split(".")
        return { provider, state: states.join(".") }
    }

    async execute(inv: Readonly<Invocation>): Promise<ActionResult> {
        const req = inv.ctx.request;
        if (inv.ctx.state.caller === "invoke") return inv.proceed()
        if (inv.ctx.path.toLocaleLowerCase() !== this.redirectUri.toLowerCase()) return inv.proceed()
        if (!req.query.state) throw new HttpStatusError(400, "No state parameter provided")
        if (!req.query.code) throw new HttpStatusError(400, "No authorization code provided")
        const { provider, state } = this.getSplitTokenAndProvider(req.query.state)
        if (provider !== this.option.provider) return inv.proceed()
        const secret = inv.ctx.cookies.get(csrfCookieName)
        if (!secret) throw new HttpStatusError(400, "Request doesn't contains csrf secret")
        const csrf = new Csrf()
        if (!csrf.verify(secret, state)) throw new HttpStatusError(400, "Invalid csrf token")
        this.log("Exchange Code: %s", req.query.code)
        this.log("Redirect Uri: %s", req.origin + req.path)
        const token = await this.exchange(req.query.code, req.origin + req.path)
        this.log("Token: %s", token)
        const data = await this.getProfile(token)
        this.log("OAuth User: %o", data)
        inv.ctx.state.oAuthUser = this.option.profile.transformer(data)
        return invoke(inv.ctx, inv.ctx.route!)
    }
}

class CsrfGeneratorMiddleware implements CustomMiddleware {
    constructor(private path?: string) { }

    async execute(invocation: Readonly<Invocation<Context>>): Promise<ActionResult> {
        if (invocation.ctx.path.toLocaleLowerCase() === (this.path?.toLowerCase() || "/auth/csrf-secret")) {
            const csrf = new Csrf()
            const secret = await csrf.secret()
            return new ActionResult({}).setCookie(csrfCookieName, secret)
        }
        else
            return invocation.proceed()
    }
}

// --------------------------------------------------------------------- //
// ------------------------------ FACILITY ----------------------------- //
// --------------------------------------------------------------------- //

export class OAuthFacility extends DefaultFacility {
    constructor(private opt?: { csrfEndpoint?: string }) { super() }
    setup(app: Readonly<PlumierApplication>) {
        app.use(new CsrfGeneratorMiddleware(this.opt?.csrfEndpoint))
    }
}

export class OAuthProviderBaseFacility extends DefaultFacility {
    constructor(private option: Optional<OAuthOptions, "clientId" | "clientSecret">, private loginEndpoint: string) { super() }

    getRedirectUri(routes: RouteInfo[], provider: string) {
        return routes.find(x => x.action.decorators
            .some((y: OAuthRedirectUriDecorator) => y.name === "OAuthRedirectUriDecorator" && y.provider === provider))
    }

    async initialize(app: Readonly<PlumierApplication>, routes: RouteInfo[]) {
        const redirectUriRoute = this.getRedirectUri(routes, this.option.provider) ?? this.getRedirectUri(routes, "General")
        if (!redirectUriRoute) throw new Error(`No ${this.option.provider} redirect uri handler found`)
        if (redirectUriRoute.url.search(":") > -1) throw new Error(`Parameterized route is not supported on ${this.option.provider} callback uri`)
        const clientIdKey = `PLUM_${this.option.provider.toUpperCase()}_CLIENT_ID`
        const clientSecretKey = `PLUM_${this.option.provider.toUpperCase()}_CLIENT_SECRET`
        const clientId = this.option.clientId ?? process.env[clientIdKey]
        if (!clientId) throw new Error(`Client id for ${this.option.provider} not provided`)
        const clientSecret = this.option.clientSecret ?? process.env[clientSecretKey]
        if (!clientSecret) throw new Error(`Client secret for ${this.option.provider} not provided`)
        app.use(new OAuthLoginEndPointMiddleware({ ...this.option, clientId, clientSecret }, this.loginEndpoint, redirectUriRoute.url))
        app.use(new OAuthRedirectUriMiddleware({ ...this.option, clientId, clientSecret }, redirectUriRoute.url))
    }
}