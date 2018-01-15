// load the things we need
var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');

var gameSchema = mongoose.Schema({
    data             : {
        // Required Fields
        title        : String,
        permalink    : String, // A.K.A. slug
        developer    : String, // Should(can) point to user
        typetag      : String,
        platform     : String,
        rom          : String,
        screenshots  : [String],

        // Optional Fields
        license      : String,
        assetLicense : String,
        description  : String,
        video        : String,
        date         : Date,
        tags         : [String],
        alias        : [String],
        repository   : String,
        gameWebsite  : String,
        devWebsite   : String,
        onlineplay   : Boolean,
        wip          : Boolean

    }
});

gameSchema.plugin(mongoosePaginate)

// create the model for users and expose it to our app
module.exports = mongoose.model('Game', gameSchema);