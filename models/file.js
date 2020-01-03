var mongoose = require("mongoose");
 
var fileSchema = new mongoose.Schema({
    from : String,
    file : String,    
    secret_key: String
});
 
module.exports = mongoose.model("File", fileSchema);