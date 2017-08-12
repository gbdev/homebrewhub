// load the things we need
var mongoose = require('mongoose');

// define the schema for our user model
var gameSchema = mongoose.Schema({
    data             : {
        title        : String,
        permalink    : String,
        developer    : String, // Should point to user?
        typetag      : String,
        description  : String,
        platform     : String,
        repository   : String,
        license      : String,
        tags         : [String],
        files        : [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
        screenshots  : [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],

    }
});

// create the model for users and expose it to our app
module.exports = mongoose.model('Game', gameSchema);