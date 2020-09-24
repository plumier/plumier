import { decorateMethod, decorateProperty } from "tinspector";



interface RequestHookDecorator { kind: "plumier-meta:request-hook", type: "preSave" | "postSave", method: ("post" | "put" | "patch")[] }

function preSave(...method: ("post" | "put" | "patch")[]) {
    return decorateMethod(<RequestHookDecorator>{ kind: "plumier-meta:request-hook", type: "preSave", method })
}

function postSave(...method: ("post" | "put" | "patch")[]) {
    return decorateMethod(<RequestHookDecorator>{ kind: "plumier-meta:request-hook", type: "postSave", method })
}

export { preSave, postSave, RequestHookDecorator }