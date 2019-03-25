import { ActionResult, RedirectActionResult } from './core';

export namespace response {
    export function json(body: any) {
        return new ActionResult(body)
    }
    export function redirect(path: string) {
        return new RedirectActionResult(path)
    }
}