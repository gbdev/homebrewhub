// load the things we need
var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

// define the schema for our user model
var fileSchema = mongoose.Schema({
    data             : {
        fslocation   : String,
        description  : String
    }
});

// create the model for users and expose it to our app
module.exports = mongoose.model('File', gameSchema);