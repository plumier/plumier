import { decorateProperty } from "tinspector";

interface EntityIdDecorator { kind: "plumier-meta:entity-id" }
interface RelationDecorator { kind: "plumier-meta:relation", inverse?: true }
interface DeleteColumnDecorator { kind: "plumier-meta:delete-column" }

namespace entity {
    /**
     * Mark property as primary id
     */
    export function primaryId() {
        return decorateProperty(<EntityIdDecorator>{ kind: "plumier-meta:entity-id" })
    }

    /**
     * Mark entity property as relation
     */
    export function relation(opt?: { inverse: true }) {
        return decorateProperty(<RelationDecorator>{ kind: "plumier-meta:relation", inverse: opt?.inverse })
    }

    /**
     * Mark entity property used as deleted flag
     */
    export function deleteColumn() {
        return decorateProperty(<DeleteColumnDecorator>{ kind: "plumier-meta:delete-column" })
    }
}

export { RelationDecorator, EntityIdDecorator, DeleteColumnDecorator, entity }