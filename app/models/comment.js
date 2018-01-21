// load the things we need
var mongoose = require('mongoose');

// define the schema for our comment model
var commentSchema = mongoose.Schema({
    data             : {
        game         : { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
        author       : { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
        parent       : [String],
        slug         : String,
        fullSlug     : String,
        text         : String,
        posted       : Date,
        published	 : Boolean,
        deleted		 : Boolean
    }
});

// create the model for comments and expose it to our app
module.exports = mongoose.model('Comment', commentSchema);