const ejf = require("edit-json-file")
const path = require("path")

const file = ejf(path.join(process.cwd(), "./package.json"))
if (process.argv[2] == "production") {
    file.set("main", "lib/index.js")
    file.set("types", "lib/index.d.ts")
}
else {
    file.set("main", "index.ts")
    file.set("types", undefined)
}
file.save()
process.exit()