## Object Schema Override 
| Name                  | Description                                          |
| --------------------- | ---------------------------------------------------- |
| RelationAsId          | Change property types match ID type                  |
| Required              | Add required fields on properties                    |
| Filter                | Set readonly on property without @authorize.filter() |
| RemoveArrayRelation   | Remove array relations (one to many)                 |
| RemoveChildRelations  | Remove relation of the child property                |
| RemoveReverseRelation | Remove reverse relation                              |

decorators: 

@entity.filter() mark parameter as filter 
@api.noRelation() hide array relation and reverse relation & child relation (for response)

## Applied

| Location   | Override Applied                                                   |
| ---------- | ------------------------------------------------------------------ |
| POST Body  | RelationAsId, RemoveReverseRelation, Required, RemoveArrayRelation |
| PUT Body   | RelationAsId, RemoveReverseRelation, Required, RemoveArrayRelation |
| PATCH Body | RelationAsId, RemoveReverseRelation, RemoveArrayRelation           |
| Filter     | RelationAsId, Filter                                               |
| Response   | RemoveArrayRelation, RemoveChildRelations, RemoveReverseRelation   |
