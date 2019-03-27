import { Context } from 'koa';
import { HttpStatusError } from './application';

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

export type ValidatorFunction = (value: string, ctx: Context) => Promise<string | undefined>
export type ValidatorStore = { [key: string]: ValidatorFunction }

export enum ValidatorId {
    optional = "internal:optional",
    skip = "internal:skip"
}

export interface ValidatorDecorator {
    type: "ValidatorDecorator",
    validator: ValidatorFunction | string,
}

export interface ValidationIssue {
    path: string[]
    messages: string[]
}

// --------------------------------------------------------------------- //
// ------------------------------- ERROR ------------------------------- //
// --------------------------------------------------------------------- //

export class ValidationError extends HttpStatusError {
    constructor(public issues: ValidationIssue[]) {
        super(422)
        Object.setPrototypeOf(this, ValidationError.prototype)
    }
}
