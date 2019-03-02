---
id: custom-converter
title: Custom Converter
---

Custom converter used when you want Plumier do some extra step (custom step) when transforming raw data or JSON object provided by Request that will be bound to the action parameters. 

To provide your own custom converter you need to register your own converter into plumier configuration:

```typescript
const app = new Plumier()
app.set({ converters: [{ type: Boolean, converter: yourConverter }] })
```

`type:Boolean` mean you will be override the behavior of `Boolean` converter. `yourConverter` is a function with signature:

```typescript
export type ConverterFunction = (value: any, path: string[], expectedType: Function | Function[], converters: Converters) => any
```

* `value` is the current value that will be converted
* `path` is path of current value on nested object
* `expectedType` expected type that the value will be converted into
* `converters` list of converters that will be used by main converter function. This parameter required if you convert nested object and call `convert` class manually.




