

export function content(message: any) {
    return `
    <!DOCTYPE html>
    <html>
        <title></title>
        <body>
            <div class="container"></div>
            <script type="text/javascript">
                var message = '${JSON.stringify(message)}';
                (function(){
                    window.onbeforeunload = function () {
                        window.opener.onCancelLogin(window)
                    };
                    window.opener.onLogin(window, JSON.parse(message));
                })()
            </script>
        </body>
    </html>
    `
}