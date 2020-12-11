import { Result, ParentInfo } from "./visitor";
import { SuperNode } from './transformer';
import { Class } from './types';


type VisitorExtension = (next: VisitorInvocation) => Result


interface VisitorInvocation {
    value: {},
    type: Class,
    path: string,
    decorators: any[]
    parent?: ParentInfo
    proceed(): Result
}

class ExtensionInvocationImpl implements VisitorInvocation {
    value: {}
    type: Class
    path: string
    decorators: any[]
    parent?:ParentInfo

    constructor(public ext: VisitorExtension, private next: VisitorInvocation) {
        this.value = next.value
        this.type = next.type
        this.path = next.path
        this.decorators = next.decorators
        this.parent = next.parent
    }

    proceed() {
        return this.ext(this.next)
    }
}

class VisitorInvocationImpl implements VisitorInvocation {
    value: {}
    type: Class
    path: string
    decorators: any[]
    parent?:ParentInfo
    constructor(value: {}, path: string, private ast: SuperNode, decorators: any[], private visitor: () => Result, parent?:ParentInfo) {
        this.value = value
        this.type = ast.type
        this.path = path
        this.decorators = decorators
        this.parent = parent
    }

    proceed(): Result {
        return this.visitor()
    }
}

function pipe(value: {}, strPath: string, ast: SuperNode, decorators: any[], extensions: VisitorExtension[], visitor: () => Result, parent?:ParentInfo) {
    return extensions.reduce((prev, cur) => new ExtensionInvocationImpl(cur, prev),
        <VisitorInvocation>new VisitorInvocationImpl(value, strPath, ast, decorators, visitor, parent))
}

export { pipe, VisitorExtension, VisitorInvocation }