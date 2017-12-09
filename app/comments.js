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

	// COMMENT APIs
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
						published	:   true,
						deleted		:   false,
					}
				});

				comment.save();
				console.log("Comment saved")
				
				req.flash('message', 'Your comment has been saved!')
				req.flash('type', 2)
				res.redirect('/game/' + req.params.gameID);
			});
		});
	});

	// COMMENT APIs: DELETE METHOD
	app.get('/comment/delete/:commentSlug', function(req, res) {
		var slug = req.params.commentSlug;
		// Check for user authentication
		if (req.user) {
			// Ok we hava a user logged in,
			// let's search db for a comment with passed slug
			Comment.findOne({ 'data.slug' : slug })
					.populate('data.author')
					.exec(function(err,comment) {
						// If no comment with that slug can be found
						// respond with an error
						if (!comment)
							res.status(500).send('Cannot find any comment with that slug!')
						// If current user is not the owner of the comment
						// we want to delete, or it has no superpowers,
						// respond with an error
						else if (comment.data.author.local.username != req.user.local.username && req.user.local.role == 0)
							res.status(500).send('Sorry, you\'re not allowed to delete this comment')
						// If, instead, user is the owner of the comemnt or he has
						// some higher privileges let's go on and delete the comment
						else
							Comment.update({ 'data.slug' : slug }, { 'data.deleted' : true }, function(err, raw) {
								if (err)
									res.status(500).send('Whoopss, something went wrong, here\'s some info:\n' + err)
								else {
									console.log("Raw mongo response:", raw)
									res.status(200).send('OK')
								}
							})
					})
		}
		// If user is not authenticated we cannot proceed to comment deletion
		// Let's respond with an error explaining this
		else
			res.status(500).send('Error: Unauthenticated user, cannot delete comment')
		
	});
}