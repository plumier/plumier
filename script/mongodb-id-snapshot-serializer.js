const mongoose = require("mongoose")

const replacement = "MONGODB UNIQUE ID"

module.exports = {
    test(val) {
        return val && val.hasOwnProperty('_id') && mongoose.isValidObjectId(val._id) && val._id !== replacement
    },
    print(val, serializer) {
        return serializer({ ...val, _id: replacement })
    },
}