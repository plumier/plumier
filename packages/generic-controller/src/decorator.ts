import { Class, decorateProperty } from "tinspector"

import { IdentifierDecorator, InversePropertyDecorator, OneToManyDecorator } from "./types"


namespace crud {
    export function oneToMany(type: Class | Class[] | ((x: any) => Class | Class[])) {
        return decorateProperty((target: any) => <OneToManyDecorator>{ kind: "GenericDecoratorOneToMany", type, parentType: target })
    }

    export function inverseProperty() {
        return decorateProperty(<InversePropertyDecorator>{ kind: "GenericInverseProperty" })
    }

    export function id() {
        return decorateProperty(<IdentifierDecorator>{ kind: "GenericDecoratorId" })
    }
}

export { crud }