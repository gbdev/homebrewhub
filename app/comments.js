var configEmail = require('../config/email'); // SMTP server variables

var randomstring = require("randomstring");
var fs = require('fs');
var multer = require('multer')
var bcrypt = require('bcrypt-nodejs')
var sha1 = require('sha1')
var moment = require('moment')

module.exports = function(app, passport) {
	// Database models
	var User = require('../app/models/user');
	var Game = require('../app/models/game');
	var File = require('../app/models/file');
	var Comment = require('../app/models/comment');

	app.post('/game/:gameID', function(req, res) {

		Game.findOne({ 'data.permalink' : req.params.gameID }, function(err,game){
			Comment.findOne({ 'data.slug': req.body['parent-comment']}, function(err,parentComment) {

				console.log("Game (ID)" + game._id, "(slug)" + game.data.permalink)
				console.log("Saving comment from", req.user.local.username + ":")
				console.log("\"" + req.body["comment-text"] + "\"")

				var parent;
				var user = req.user;
				var message = req.body["comment-text"];
				var posted = Date.now();
				var slug;
				var fullSlug;
				var commentDataToHash = posted.toString() + user._id.toString() + message.replace(/\W+/g,'');
				var hash = sha1(commentDataToHash)
				//console.log("Hashing string", commentDataToHash)
				//console.log("Full hash:", hash)
				slug = hash.slice(15,22);
				fullSlug = moment(posted).utc().format('YYYY.MM.DD.HH.mm.ss') + ':' + slug;
				//console.log("Generating comment unique slug:", slug)

				if (parentComment)
				{
					parentComment.data.parent.push(slug)
					parent = parentComment.data.parent
				}
				else
					parent = [slug]

				var comment = new Comment({
					data: {
						game 		: 	game._id,
						parent		: 	parent,
						author		: 	user._id,
						slug		: 	slug,
						fullSlug	:   fullSlug,
						text 		:  	message,
						posted		:   posted,
					}
				});

				comment.save();
				console.log("Comment saved")
				
				req.flash('loginMessage', 'Your comment has been saved!')
				req.flash('type', 2)
				res.redirect('/game/' + req.params.gameID);
			});
		});
	});
}