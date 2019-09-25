import { ActionResult, response } from "@plumier/core"
import { Context } from 'koa';



function content(message: any) {
    return `
    <!DOCTYPE html>
    <html>
        <title></title>
        <body><div class="container"></div></body>
        <script type="text/javascript">
            var message = '${JSON.stringify(message)}';
            (function(){
                window.opener.onLogin(message)
            })()
        </script>
    </html>
    `
}

export class CallbackView extends ActionResult {
    constructor(private message: any) { super() }

    async execute(ctx: Context) {
        ctx.body = content(this.message)
    }
}