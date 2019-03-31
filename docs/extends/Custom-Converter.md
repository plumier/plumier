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
(value: any, info: ObjectInfo<Function | Function[]>) => ConversionResult
```

`ObjectInfo<Function | Function[]>` is current conversion information. It has some properties:

* `path` is path of current value on nested object
* `expectedType` expected type that the value will be converted into
* `converters` list of converters that will be used by main converter function. This parameter required if you convert nested object and call `convert` class manually.

`ConversionResult` is a tuple types contains `[<result>, <error list>]`, result is conversion result can be any type, error list should be of type `ConversionIssue[]`

## Example Boolean Conversion
Example below will show how to create custom boolean converter. It will convert value from `YES` or `NO` to `true/false` value.

```typescript 
import { ObjectInfo, ConversionResult } from "typedconverter"

function booleanConverter(value: {}, info: ObjectInfo<Function | Function[]>): ConversionResult {
    switch(value.toString().toLowerCase()){
        case "yes" : return [true, undefined]
        case "no": return [false, undefined]
        default: return [undefined, [{path: info.path, messages: ["Unable to convert value into boolean"]}]]
    }
}
```

Above code will convert `YES/NO` value into `true/false` with appropriate error message. Above converter than can be registered like below 

```typescript
const app = new Plumier()
app.set({ converters: [{ type: Boolean, converter: booleanConverter }] })
```

Above function will replace the default `Boolean` converter. 

## Call Default Converter

You can call the default bolean converter from inside your convert using `DefaultConverters` namespace, or using `converters` property from `ObjectInfo` parameter.

```typescript
import { DefaultConverters, ObjectInfo, ConversionResult } from "typedconverter"

function booleanConverter(rawValue: {}, info: ObjectInfo<Function | Function[]>): ConversionResult {
    //can be using this
    const defaultResult = DefaultConverter.booleanConverter(rawValue)
    //or this
    const otherDefault = info.converters.get(Boolean)(rawValue)
    //further processing
}
```