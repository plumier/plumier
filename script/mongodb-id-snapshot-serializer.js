const mongoose = require("mongoose")

module.exports = {
    test(val) {
        return typeof val === "string" && mongoose.isValidObjectId(val);
    },
    print(val) {
        return "MONGODB UNIQUE ID";
    },
}