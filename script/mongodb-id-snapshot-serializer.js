const mongoose = require("mongoose")

const replacement = "MONGODB UNIQUE ID"

function hasId(val, prop) {
    return val && val.hasOwnProperty && val.hasOwnProperty(prop) && !!val[prop] &&
        mongoose.isValidObjectId(val[prop]) && val[prop] !== replacement
}

module.exports = {
    test(val) {
        return hasId(val, "id") || hasId(val, "_id")
    },
    print(val, serializer) {
        let result = { ...val }
        if (hasId(val, "id"))
            result = { ...result, id: replacement }
        if (hasId(val, "_id"))
            result = { ...result, _id: replacement }
        return serializer(result)
    },
}