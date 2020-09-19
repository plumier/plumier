import { decorateMethod, decorateProperty } from "tinspector/src/decorators";


interface RequestHookDecorator { kind: "plumier-meta:request-hook", method: ("post" | "put" | "patch")[] }

function requestHook(...method:("post"|"put"|"patch")[]) {
    return decorateMethod(<RequestHookDecorator>{ kind: "plumier-meta:request-hook", method })
}

export { requestHook, RequestHookDecorator }