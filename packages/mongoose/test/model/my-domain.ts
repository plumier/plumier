import { collection } from '@plumjs/mongoose';
import { reflect } from 'tinspector';
import { domain } from '@plumjs/core';

@collection()
export class DomainWithPrimitives {
    constructor(
        public name: string,
        public deceased: boolean,
        public age: number,
        public registerDate: Date
    ) { }
}

@collection()
export class DomainWithArrays {
    constructor(
        public name: string,
        @reflect.array(String)
        public children: string[]
    ) { }
}

@collection()
export class DomainWithDomain {
    constructor(
        public child: DomainWithPrimitives
    ) { }
}

@collection()
export class DomainWithArrayOfDomain {
    constructor(
        @reflect.array(DomainWithPrimitives)
        public children: DomainWithPrimitives[]
    ) { }
}

export class NonDecoratedDomain {
    constructor(
        public name: string
    ) { }
}
