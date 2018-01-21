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

    /**********************/
    /**** COMMENT APIs ****/
    /**********************/

    // COMMENT APIs - VIEW METHOD:
    // Retrieve comments thread for requested game
    app.get('/comment/view/:gameID/', function(req, res) {
        // Let's find game data in db based on 
        // specified game permalink
        Game.find({ 'data.permalink': req.params.gameID }, function(err, game) {
            // If no game was found...
            if (game == null || game.length == 0) {
            	// ...let's 404
            	res.status(404).send("Can't find any game with that permalink")
            } else {
                // Lookup db form comments bound to
                // requested game
                Comment.find({ 'data.game': game[0]._id })
                    .sort({ 'data.fullSlug': 1 }) // sort by chronological order
                    .populate('data.author') // fill up author data
                    .lean() // return plain JS objects (not Mongoose schemas)
                    .exec(function(err, comments) {

                    	/*--- ROUTE CORE ---*/
                    	/*------------------*/
                    	var rootComments
			            var disabledComments = 0
			            // Build a first raw version of comment tree
			            // populating for eanch retrieved comment a "replies"
			            // array with its children comments in it
			            buildTree(comments)
			            // Extract from the tree only the root level comments
		            	rootComments = comments.filter(comment => comment.data.parent.length == 1)
		            	// Starting from root level comments recursively check
		            	// for dead comments or branches and, if present, cut them off
		            	rootComments.forEach(function(comment) {
		            		removeDeletedComments(comment)
		            	})
		            	// Now have have a raw version of the tree which inclueds
		            	// some unwanted deleted comments survived in it as replies
		            	// Let's break down the tree so we can rebuild it
		            	breakDownTree(comments)
		            	// Rebuild the tree now that we have a starting comments array
		            	// filled with alive and disabled comments only
		            	buildTree(comments)
		            	// Reset root level and recollect root level comments
		            	// from freshly generated polished tree
		            	rootComments = []
		            	rootComments = comments.filter(comment => comment.data.parent.length == 1)

		            	// Return retrieved comments data as JSON
                        res.json({
                            commentsCount: comments.length - disabledComments,
                            comments: rootComments,
                            game: game,
                            user: req.user
                        })

		            	/*--- HELPER FUNCTIONS ---*/
                    	/*------------------------*/
						function breakDownTree(comments) {
							// For eanch comment of the tree...
						    comments.forEach(function(comment) {
						        if (comment.data.replies) // ...if it has a replies object property...
						            comment.data.replies = '' // ... let's empty it
						    })
						}

		               function buildTree(comments) {
		               		// For each comment in the array...
		                	comments.forEach(function(comment) {
		                		// ...get current comment "parent property" 
	                            // which contains any parents slug as well as
	                            // current comment slug
			            		var parents = comment.data.parent
			            		if (parents.length > 1) // If this is not a root comment (so exclude arrays of length 1 (current comment slug))
				            	{	// Get direct parent comment slug form array position "parents.length - 2"
	                                // and prepare to inject its own replies (building the tree from linear array)
			            			var parentComment = comments.filter(comment => comment.data.slug == parents[parents.length - 2])[0]
			            			if (parentComment)
			            			{ // If parent comment Object hasn't got a "replies" property yet...
			            				// ...let's create it...
			            				if (!parentComment.data.replies)
			            				{
			            					parentComment.data.replies = []; // ...as an empty array
			            				}
			            				// Push current comment replies in
			            				parentComment.data.replies.push(comment)
			            			}
			            		}
			            	})
		            	}

		            	function removeDeletedComments(comment){
		            		var isDeleted = comment.data.deleted
		            		var hasChildren = comment.data.replies
		            		// If current comment has been deleted and
		            		// has no children comments, let's kill it
		            		if (isDeleted && !hasChildren) {
		            			if (comments.indexOf(comment) >= 0)
		            				comments.splice(comments.indexOf(comment), 1)
		            		}
		            		// If, instead, it has been deleted but has children comment
		            		// we have some dance to do
		            		else if (isDeleted && hasChildren) {
		            			var nodelineage = []; // An array to contain current comment family
		            			var aliveLineage = []; // An array to contain any alive comment descendants
		            			// Let's check every comment...
		            			comments.forEach(function(chekcInLineageComment) {
		            				// ... and push any descendant into specifc array
		            				if (chekcInLineageComment.data.parent.includes(comment.data.slug)) {
		            					nodelineage.push(chekcInLineageComment)
		            				}
		            			})
		            			// Extract only alive descendants from comment family array
		            			aliveLineage = nodelineage.filter(toCheckAliveComment => toCheckAliveComment.data.deleted == false)
		            			// If we don't have any alive descendants
		            			// cut the whole family from original comments array
		            			if (aliveLineage.length == 0) {
		            				nodelineage.forEach(function(lineageComment) {
		            					if (comments.indexOf(lineageComment) >= 0) {
		            						comments.splice(comments.indexOf(lineageComment), 1)
		            					}

		            				})
		            				
		            			} // if we do have alive descendants...
		            			else {
		            				comment.data.text = "This comment has been deleted" //... disable this comment
		            				disabledComments += 1 //...update the count of disable comments (to later subtract to total comments count)
		            				comment.data.replies.forEach(function(reply) {
		            					// Recursively analyze every children comment
		            					removeDeletedComments(reply)
		            				})
		            			}
		            			
		            		} 
		            		// And finally, if current comment is alive
		            		// and has alive children, go on and recursively
		            		// analize every reply
		            		else if (!isDeleted && comment.data.replies) {
		            			comment.data.replies.forEach(function(reply) {
		            				removeDeletedComments(reply)
		            			})
		            		}
		            	}
                    })
            }
        })
    })

	// COMMENT APIs - ADD METHOD:
    // Save a comment to the specified game,
    // either as "root" comment or as a reply
    app.post('/comment/add/:gameID/:parentComment?', function(req, res) {
    	// Let's find game data in db based on 
        // specified game permalink
    	Game.findOne({  'data.permalink': req.params.gameID }, function(err, game) {
			// If no game was found...
	        if (game == null || game.length == 0) {
	        	// ...let's repond with an error
	        	res.status(500).send("Can't find any game with that permalink")
	        // (same if the message is empty)
	        } else if (req.body.message.trim() == '') {
	        	res.status(500).send("Message cannot be blank!")
	        } else {
       			// Let's search the db for parent comment from post request parent comment slug
       			// (no results in the case of posting a root comment)
	            Comment.findOne({ 'data.slug': req.body.parentComment }, function(err, parentComment) {
	            	// Some logs...
	                console.log("Game (ID)" + game._id, "(slug)" + game.data.permalink)
	                console.log("Saving comment from", req.user.local.username + ":")
	                console.log("\"" + req.body.message + "\"")

	                var parent;
	                var user = req.user; // Current session user, author of current comment
	                var message = req.body.message; // Actual comment text message
	                var posted = Date.now(); // Current date and time (UTC) - they will be comment date and time
	                var slug;
	                var fullSlug;
	                // Some combined data from which we will create a hash string
	                var commentDataToHash = posted.toString() + user._id.toString() + message.replace(/\W+/g, '');
	                var hash = sha1(commentDataToHash) // Generate a sha1 hash from previous string

	                // Generatig actual comment unique slug by slicing
	                // a 7-character-long portion of previous hash
	                slug = hash.slice(15, 22);
	                // Generating comment "Full slug" composed of date and time info and newly generated slug
	                fullSlug = moment(posted).utc().format('YYYY.MM.DD.HH.mm.ss') + ':' + slug;
	                // If we have a parent comment (this is a reply comment)...
	                if (parentComment) {
	                	//... push current comment slug in parent comment "parent" array
	                	// (which contains all of the comment slugs from the "older" ancestor to
	                	// the prent comment itself, and now also current comment slug at the end).
	                	// This is useful to build a comment "family tree"
	                    parentComment.data.parent.push(slug)
	                    // Now set current comment parent property to that array
	                    parent = parentComment.data.parent
	                } else {
	                	// Otherwise, if this is a root comment, let's set the parent property 
	                	// to an array containing only current comment slug
	                    parent = [slug]
	                }

	                // Creating a new Mongo "Commment" document
	                var comment = new Comment({
	                    data: {
	                        game: game._id, // Current Game ID
	                        parent: parent, // The parent array containing "commente genealogy"
	                        author: user._id, // Current User ID
	                        slug: slug, // Previously generetaed "slug"
	                        fullSlug: fullSlug, // Previously generated "Full slug"
	                        text: message, // Comment actual text message
	                        posted: posted, // Date and time comment was posted (UTC)
	                        published: true, // Default publishing state TRUE, useful for admin/moderators comment managing
	                        deleted: false // Default alive/deleted state FALSE
	                    }
	                });
	                // Saving Comment document in db
	                comment.save().then(function(comment) {
		                console.log("Comment saved")
		                // Now that we have our new comment stored in db
		                // let's retrieve its full data and return it 
		                // as JSON
		                Comment.findOne({ 'data.slug' : slug })
		                .populate('data.author')
		               	.exec(function(err,comment) {
			                res.status(200).send({ 
			                	comment: comment,
			                	user: req.user
			                })
		            	})
	                })
	            });
        	}
    	})
    });

    // COMMENT APIs - DELETE METHOD:
    // Delete specified comment
    app.get('/comment/delete/:commentSlug', function(req, res) {
        var slug = req.params.commentSlug;
        // Check for user authentication
        if (req.user) {
            // Ok we have a user logged in,
            // let's search db for a comment with passed slug
            Comment.findOne({ 'data.slug': slug })
                .populate('data.author')
                .exec(function(err, comment) {
                    // If no comment with that slug can be found
                    // respond with an error
                    if (!comment)
                        res.status(500).send('Cannot find any comment with that slug!')
                    // If current user is not the owner of the comment
                    // we want to delete, or he has no superpowers,
                    // respond with an error
                    else if (comment.data.author.local.username != req.user.local.username && req.user.local.role == 0)
                        res.status(500).send('Sorry, you\'re not allowed to delete this comment')
                    // If, instead, user is the owner of the comment or he has
                    // some higher privileges let's go on and delete the comment
                    else
                        Comment.update({ 'data.slug': slug }, { 'data.deleted': true }, function(err, raw) {
                            if (err)
                            	// If any error occur during "deletion"
                            	// let's respond with an error...
                                res.status(500).send('Whoopss, something went wrong:\n' + err)
                            else {
                            	// ...otherwise let's response with a status 200
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

    // COMMENT APIs - EDIT METHOD:
    // Edit specified comment with new text message
    app.post('/comment/edit/:commentID/', function(req, res) {
    	var slug = req.params.commentID
        // Check for user authentication
        if (req.user) {
            // Ok we have a user logged in,
            // let's search db for a comment with passed slug
            Comment.findOne({ 'data.slug': slug })
                .populate('data.author')
                .exec(function(err, comment) {
                    // If no comment with that slug can be found
                    // respond with an error
                    if (!comment)
                        res.status(500).send('Cannot find any comment with that slug!')
                    // If current user is not the owner of the comment
                    // we want to update, or he has no superpowers,
                    // respond with an error
                    else if (comment.data.author.local.username != req.user.local.username && req.user.local.role == 0)
                        res.status(500).send('Sorry, you\'re not allowed to edit this comment')
                    // If, instead, user is the owner of the comment or he has
                    // some higher privileges let's go on and update the comment
                    else
                        Comment.update({ 'data.slug': slug }, { 'data.text': req.body.message }, function(err, raw) {
                            if (err)
                            	// If any error occur during comment updating
                            	// let's respond with an error...
                                res.status(500).send('Whoopss, something went wrong:\n' + err)
                            else {
                                console.log("Raw mongo response:", raw)
                                console.log("Comment updted")
				                // ...otherwise retrieve updated comment from db
				                // and return its full data and return it as JSON
				                Comment.findOne({ 'data.slug' : slug })
				                .populate('data.author')
				               	.exec(function(err,comment) {
					                res.status(200).send({ 
					                	comment: comment
					                })
				            	})
                            }
                        })
                })
        }
        // If user is not authenticated we cannot proceed to update comment
        // Let's respond with an error
        else
            res.status(500).send('Error: Unauthenticated user, cannot delete comment')
    })
}