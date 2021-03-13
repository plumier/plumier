## Object Schema Override 
| Name                  | Description                                          |
| --------------------- | ---------------------------------------------------- |
| RelationAsId          | Change property types match ID type                  |
| Required              | Add required fields on properties                    |
| RemoveArrayRelation   | Remove array relations (one to many)                 |
| RemoveChildRelations  | Remove relation of the child property                |
| RemoveInverseProperty | Remove reverse relation                              |

decorators: 

@entity.filter() mark parameter as filter 
@api.noRelation() hide array relation and reverse relation & child relation (for response)

## Applied

| Location   | Override Applied                                                   |
| ---------- | ------------------------------------------------------------------ |
| POST Body  | RelationAsId, RemoveInverseProperty, Required, RemoveArrayRelation |
| PUT Body   | RelationAsId, RemoveInverseProperty, Required, RemoveArrayRelation |
| PATCH Body | RelationAsId, RemoveInverseProperty, RemoveArrayRelation           |
| Filter     | RelationAsId, Filter                                               |
| Response   | RemoveArrayRelation, RemoveChildRelations, RemoveInverseProperty   |
