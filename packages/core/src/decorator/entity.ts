import { decorateProperty } from "tinspector";

interface EntityIdDecorator { kind: "plumier-meta:entity-id" }
interface RelationDecorator { kind: "plumier-meta:relation", inverse?: true }

/**
 * Mark property as primary id
 */
function primaryId() {
    return decorateProperty(<EntityIdDecorator>{ kind: "plumier-meta:entity-id" })
}

/**
 * Mark entity property as relation
 */
function relation(opt?: { inverse: true }) {
    return decorateProperty(<RelationDecorator>{ kind: "plumier-meta:relation", inverse: opt?.inverse })
}

export { RelationDecorator, EntityIdDecorator, primaryId, relation }