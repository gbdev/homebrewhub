// load the things we need
var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

// define the schema for our user model
var gameSchema = mongoose.Schema({
    data             : {
        title        : String,
        developer    : String,
        repository   : String,
        tags         : Array,
        files        : Array,
        permalink    : String
        screenshots  : Array
    }
});

// create the model for users and expose it to our app
module.exports = mongoose.model('Game', gameSchema);