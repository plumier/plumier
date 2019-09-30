

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
                    window.opener.onLogin(JSON.parse(message));
                })()
            </script>
        </body>
    </html>
    `
}