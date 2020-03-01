
import { bind } from "@plumier/core"

const unparsed = Symbol.for('unparsedBody')

declare module "@plumier/core" {
    namespace bind {
        /**
         * Bind raw request body into parameter
         * example:
         * 
         *    method(@bind.rawBody() data:any){}
         * 
         * **NOTE**: To use this functionality, the `includeUnparsed` need to be enabled on the WebApiFacility 
         * 
         *    new WebApiFacility({ bodyParser: { includeUnparsed:true } })
         */
        function rawBody(): (target: any, name: string, index: number) => void
    }
}

bind.rawBody = () => {
    return bind.custom(x => x.request.body[unparsed])
}

