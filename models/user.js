const mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');
var File = require('./file');

var UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    public_key: String,
    files : [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: File
        }
    ]
    
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User",UserSchema);




