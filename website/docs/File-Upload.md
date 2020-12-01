---
id: file-upload
title: File Upload
---

Plumier added support for file upload using multi part form data, by default this feature is not enabled, you can enable the `multipart` feature from the `WebApiFacility` like below: 

```typescript
import Plumier, { WebApiFacility } from "plumier"

const plum = new Plumier()
plum.set(new WebApiFacility({ bodyParser: { multipart: true }}))
```

## Parameter Binding 
Plumier provided a parameter binding to automatically bound the `FormFile` into action parameter. Its possible to bound it using name binding or decorator binding using `@bind.formFile()`. 

For example you have a simple form with a file input named `file` like below 

```html
<form method="POST" enctype="multipart/form-data" action="/animal/save">
    <input type="file" name="file"/>
    <input type="submit" value="Upload"/>
</form>
```

Note that the action of the form pointed to `/animal/save`. The name of the file input is `file`. Using that information you can create the controller like below

```typescript
import { FormFile, route } from "plumier"
import { readFile } from "fs"
import { promisify } from "util"

const readFileAsync = promisify(readFile)

export class AnimalController {
    @route.post()
    async save(file: FormFile) {
        // process the file 
        // crop or create thumbnail 
        // re-upload to cloud storage
        const buf = await readFileAsync(file.path)
    }
}
```

Controller above will be generated into route `POST /animal/save`, it uses name binding to bind the file input into the action parameter. Note that the name of the action parameter `file` is the same as the file input name in the html form `file`. 

Its also possible to bind the file using decorator like below

```typescript
export class AnimalController {
    @route.post()
    save(@bind.formFile("file") data: FormFile) {
    }
}
```

Note that when using decorator parameter binding, the parameter name is not necessary to be the same as the file input. 

## Multiple Files
For file input with `multiple` property enabled, you need to specify the type of the action parameter as array of `FormFile` like below

```html
<form method="POST" enctype="multipart/form-data" action="/animal/save">
    <input type="file" name="file" multiple/>
    <input type="submit" value="Upload"/>
</form>
```

Above code showing file input has the `multiple` property enabled, controller can be changed into below

```typescript
import tsp from "tinspector" 

export class AnimalController {
    @route.post()
    save(@tsp.type([FormFile]) file: FormFile[]) {

    }
}
```

Note that you need to provided type information using `@tsp.type([FormFile])` to prevent route analysis warning. 

## FormFile 
`FormFile` is a specialized class contains information about uploaded file input. Its has properties like below: 

* `size`: Size of the file (bytes)
* `path`: Temporary path of the uploaded file
* `name`: File name provided by client
* `type`: Mime type of the file 
* `mtime`: The file timestamp

## File Validation 
Plumier provided file validation using decorator for convenient, it can be applied on the `FormFile` parameter like other validator.

```typescript
export class AnimalController {
    @route.post()
    save(@val.file("3MB") file: FormFile) {
    }
}
```

Above code will restrict the size of uploaded file only 3MB allowed. The `@val.file()` validator receive string/number as default to limit the file size. Internally the bytes string notation uses [bytes](https://www.npmjs.com/package/bytes) to parse the string. 

File validation also receive object parameter for more options. 

```typescript
export class AnimalController {
    @route.post()
    save(@val.file({ mime: /^image\/(jpg|jpeg)$/i }) file: FormFile) {
    }
}
```

Above code will restrict only file with mime type `image/jpg` and `image/jpeg` allowed. 

## Image Validation 
Plumier provided a short hand for image validation, to restrict the uploaded file only with mime type `image/*`. 

```typescript
export class AnimalController {
    @route.post()
    save(@val.image("3MB") file: FormFile) {
    }
}
```

Above code will restrict uploaded file only of type image with maximum file size 3MB.