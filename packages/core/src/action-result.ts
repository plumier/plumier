import { Context } from 'koa';

// --------------------------------------------------------------------- //
// --------------------------- ACTION RESULT --------------------------- //
// --------------------------------------------------------------------- //

export class ActionResult {
    static fromContext(ctx: Context) {
        return new ActionResult(ctx.body, ctx.status)
    }
    private readonly headers: { [key: string]: string } = {}
    constructor(public body?: any, public status?: number) { }

    setHeader(key: string, value: string) {
        this.headers[key] = value;
        return this
    }

    setStatus(status: number) {
        this.status = status
        return this
    }

    async execute(ctx: Context): Promise<void> {
        Object.keys(this.headers).forEach(x => {
            ctx.set(x, this.headers[x])
        })
        if (this.body)
            ctx.body = this.body
        if (this.status)
            ctx.status = this.status
    }
}


export class RedirectActionResult extends ActionResult {
    constructor(public path: string) { super() }

    async execute(ctx: Context): Promise<void> {
        ctx.redirect(this.path)
    }
}

// --------------------------------------------------------------------- //
// ------------------------------ RESPONSE ----------------------------- //
// --------------------------------------------------------------------- //

export namespace response {
    export function json(body: any) {
        return new ActionResult(body)
    }
    export function redirect(path: string) {
        return new RedirectActionResult(path)
    }
}