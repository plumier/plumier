import { Result, ParentInfo } from "./visitor";
import { SuperNode } from './transformer';
import { Class } from './types';
import { type } from "reflect/src/decorators";


type VisitorExtension = (next: VisitorInvocation) => Result

interface VisitorInit {
    value: {}
    ast: SuperNode
    path: string
    decorators: any[]
    parent?: ParentInfo
}

interface VisitorInvocation extends VisitorInit {
    readonly type:Class
    proceed(): Result
}

class ExtensionInvocationImpl implements VisitorInvocation {
    value: {}
    ast:SuperNode
    path: string
    decorators: any[]
    parent?: ParentInfo

    get type(){ return this.ast.type }

    constructor(public ext: VisitorExtension, private next: VisitorInvocation) {
        this.value = next.value
        this.ast = next.ast
        this.path = next.path
        this.decorators = next.decorators
        this.parent = next.parent
    }

    proceed() {
        this.next.value = this.value
        this.next.ast = this.ast
        this.next.path = this.path
        this.next.decorators = this.decorators
        return this.ext(this.next)
    }
}

class VisitorInvocationImpl implements VisitorInvocation {
    value: {}
    ast: SuperNode
    path: string
    decorators: any[]
    parent?: ParentInfo

    get type(){ return this.ast.type }

    constructor(private visitor: (i: VisitorInvocation) => Result, init: VisitorInit) {
        this.value = init.value
        this.ast = init.ast
        this.path = init.path
        this.decorators = init.decorators
        this.parent = init.parent
    }

    proceed(): Result {
        return this.visitor(this)
    }
}

function pipe(extensions: VisitorExtension[], last:VisitorInvocation) {
    return extensions.reduce((prev, cur) => new ExtensionInvocationImpl(cur, prev), last)
}

export { pipe, VisitorExtension, VisitorInvocation, VisitorInvocationImpl }