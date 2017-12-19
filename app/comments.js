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
    app.get('/comment/view/:gameID/:options?', function(req, res) {
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
			            var hasToBeRendered = req.params.options == 'render' || false
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

		            	// Now decide how to handle response based on
		            	// request we received
		            	if (hasToBeRendered)
		            	{	// Render approriate template
		            		// ("internal usage")
		            		res.render('comments-template.ejs', {
			                    req: req,
			                    game: game,
			                    message: req.flash('message'),
			                    flashType: req.flash('type'),
			                    moment: moment,
			                    commentsCount: comments.length - disabledComments,
			                    rootComments: rootComments
	                		})
		            	}
		            	else 
		            	{	// Return retrieved comments data as JSON
		            		// ("API usage")
	                        res.json({
	                            commentsCount: comments.length - disabledComments,
	                            comments: rootComments,
	                            game: game
	                        })
		            	}

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

    app.post('/game/:gameID', function(req, res) {

        Game.findOne({  'data.permalink': req.params.gameID }, function(err, game) {
            Comment.findOne({ 'data.slug': req.body['parent-comment'] }, function(err, parentComment) {

                console.log("Game (ID)" + game._id, "(slug)" + game.data.permalink)
                console.log("Saving comment from", req.user.local.username + ":")
                console.log("\"" + req.body["comment-text"] + "\"")

                var parent;
                var user = req.user;
                var message = req.body["comment-text"];
                var posted = Date.now();
                var slug;
                var fullSlug;
                var commentDataToHash = posted.toString() + user._id.toString() + message.replace(/\W+/g, '');
                var hash = sha1(commentDataToHash)
                //console.log("Hashing string", commentDataToHash)
                //console.log("Full hash:", hash)
                slug = hash.slice(15, 22);
                fullSlug = moment(posted).utc().format('YYYY.MM.DD.HH.mm.ss') + ':' + slug;
                //console.log("Generating comment unique slug:", slug)

                if (parentComment) {
                    parentComment.data.parent.push(slug)
                    parent = parentComment.data.parent
                } else
                    parent = [slug]

                var comment = new Comment({
                    data: {
                        game: game._id,
                        parent: parent,
                        author: user._id,
                        slug: slug,
                        fullSlug: fullSlug,
                        text: message,
                        posted: posted,
                        published: true,
                        deleted: false,
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

    // COMMENT APIs - DELETE METHOD:
    // Delete specified comment
    app.get('/comment/delete/:commentSlug', function(req, res) {
        var slug = req.params.commentSlug;
        // Check for user authentication
        if (req.user) {
            // Ok we hava a user logged in,
            // let's search db for a comment with passed slug
            Comment.findOne({ 'data.slug': slug })
                .populate('data.author')
                .exec(function(err, comment) {
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
                        Comment.update({ 'data.slug': slug }, { 'data.deleted': true }, function(err, raw) {
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