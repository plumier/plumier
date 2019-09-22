---
id: file-upload
title: File Upload
---


Plumier added support for file upload using multi part form data using [busboy](https://github.com/mscdex/busboy), Saved file name randomly generated using [sortid](https://github.com/dylang/shortid).

Plumier file upload doesn't scan through all of incoming request instead it only parse request on controller code make request more efficient. File parser directly pipe request stream into file stream which is good memory usage and overall performance.

## Enable The Functionality
By default file upload is not enabled, you need to use `@plumier/multipart` package use `MultipartFacility` to enable it.

```typescript
import Plumier from "plumier"
import { join } from "path"
import { MultipartFacility } from "@plumier/multipart"

const plum = new Plumier()
plum.set(new MultipartFacility({ uploadPath: join(__dirname, "./upload") }))
```

## Bind File Parser
To be able to get the uploaded files you need to bind the file parser on the action parameter

```typescript

export class ImageController {
    @route.post()
    async upload(@bind.file() parser: FileParser) {
        const files = await parser.save()
        //files store information about uploaded files (single file or multiple files)
    }
}
```

## Save Files In Sub Directory
It is possible to save uploaded file to sub directory of defined `uploadPath` by providing sub directory in the `save()` method of `FileParser`

```typescript

export class ImageController {
    @route.post()
    async upload(@bind.file() parser: FileParser) {
        const files = await parser.save("sub/directory/of/files")
    }
}
```

## Restrict File Size
To restrict uploaded file size, you can provided `maxFileSize` on `MultipartFacility` constructor, default infinity.

```typescript
plum.set(new MultipartFacility({ 
    uploadPath: join(__dirname, "./upload"), 
    maxFileSize: 5 * 1024 * 1024 //5mb
}))
```

## Restrict Number of Files
You can restrict number of files uploaded at a time by specify `maxFiles` on `MultipartFacility` constructor, default infinity.

```typescript
plum.set(new MultipartFacility({ 
    uploadPath: join(__dirname, "./upload"), 
    maxFiles: 5 //5 files on each upload
}))
```