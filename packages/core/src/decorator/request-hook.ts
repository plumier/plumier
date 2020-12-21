import { decorateMethod, decorateProperty } from "@plumier/reflect";



interface RequestHookDecorator { kind: "plumier-meta:request-hook", type: "preSave" | "postSave", method: ("post" | "put" | "patch")[] }

/**
 * Provide hook to be executed before entity being saved to database
 * @param method Http method on which the hook will be executed
 */
function preSave(...method: ("post" | "put" | "patch")[]) {
    return decorateMethod(<RequestHookDecorator>{ kind: "plumier-meta:request-hook", type: "preSave", method })
}

/**
 * Provide hook to be executed after entity being saved to database
 * @param method Http method on which the hook will be executed
 */
function postSave(...method: ("post" | "put" | "patch")[]) {
    return decorateMethod(<RequestHookDecorator>{ kind: "plumier-meta:request-hook", type: "postSave", method })
}

export { preSave, postSave, RequestHookDecorator }