/** 
 *
 * Game View: Commenting System behavior
 *
 */

// SOME DECLARATIONS
var commentsInjectionPoint = document.querySelector('#comments-list')
var commentBasePosition = $('#leave-a-comment')
var commentForm = $('#comment-form-container')
var submitBtn = document.querySelector('#submitCommentBtn')
var parentField = $('#parent-id')
var deleteCommentModal = $('#delete-comment-modal')
var commentSuffix = 'cm-'
var gamePermalink

/************************/
/****** PAGE LOAD *******/
/************************/
document.addEventListener("DOMContentLoaded", function(){
    // Retrieve game permalink from current window URL
    gamePermalink = window.location.href.match(/\/game\/([-a-zA-Z0-9._~!$&'()*+,;=:@]+)\/?/)[1]
    // Load comments and populate specific template
    // Async call to get comments for current game
    var req = new XMLHttpRequest();
    req.open("GET", "/comment/view/" + gamePermalink + "/", true);
    req.onreadystatechange = function() {
        if (this.readyState == 4) {
        // If we get an "OK" status we should have the comments in form
        // of JSON data along with some useful info,
        // let's render and inject them in "comments section"
          if (req.status == 200) {
            var response = JSON.parse(req.response)
            var sessionUser = response.user ? response.user : null
            // For every received comment call the render function
            // to build and inject every comment
            response.comments.forEach(function(comment) {
                renderComment(comment, sessionUser)
                refreshCommentsCount()
            })
            // Call successful, let's hide loading message
            document.querySelector("#comments-loading").style.display = 'none'
            commentBasePosition = $('#leave-a-comment')
            commentForm = $('#comment-form-container')
            parentField = $('#parent-id')
            deleteCommentModal = $('#delete-comment-modal')
            submitBtn = document.querySelector('#submitCommentBtn')

            deleteCommentModal.on('hide.bs.modal', function(e) {
                clearDeleteModal()
            });
          }
        // Otherwise throw an error in console
          else {
            console.error("Something went wrong while loading comments!\n" + "Status: " + req.status + "\nResponse: " + req.responseText )
          }
        }
    };
    req.send(null);
});

/************************/
/**** EVENT CATCHING ****/
/************************/
// Here's a handler to control single comments actions 
$(document).on('click', '.comment-actions .action', function(e) {
    // Retrieve some basic info for current action
    // and comment
    var action = $(this).attr('data-action') // Selected action from "data-" attribute
    var comment = $(this).closest('.comment')
    var commentId = $(this).closest('.comment').attr('id') // Current comment from closest ".comment" parent id attribute
    var commentText = $(this).closest('.comment').find('> .comment-body > .message-container > .comment-text').text() // Current comment actual text message
    console.log('Commenting System action:', action)
    // Decide what to do based on current action
    switch (action) {
        // REPLY:
        case 'reply':
            // Bring the comment form from previous level
            // to current DOM position for the reply
            bringCommentFormIn(commentId)
            break;

        case 'edit':
            // Render comment Edit Form
            activateEditForm(commentId, commentText)    
            break;

        case 'delete':
            // Triggering modal to check if user is sure
            // to delete selected comment
            triggerDeleteModal(commentId, commentText)
            break;

        default:
            // Nothing to do if action is not recognized,
            // simply log a message explaining this
            console.log("Commenting system action with no behavior:", action)
    }
});

// Handler to abort reply, reset default status
// (comment form position e parent value)
$(document).on('click', '.close-reply', function(e) {
    abortReply()
});

// Handler to abort comment edit, reset default status
// (destroy edit form)
$(document).on('click', '.close-edit', function(e) {
    deactivateEditForm()
});

// Handler to delete selected comment through 
// async call to delete backend route
$(document).on('click', '#deleteCommentBtn', function(e) {
    $(this).removeData('delete') // Clear "cached" data value
    var commentSlug = $(this).data('delete') // Get comment slug
    var comment = $("#" + commentSuffix + commentSlug)
    deleteCommentModal.modal('hide') // Hide modal and proceed with serious stuff
    console.log('Trying to delete comment [' + commentSlug + '] "' + comment.find('> .comment-body > .message-container > .comment-text').text() + '"')

    // Async call to delete comment route
    var req = new XMLHttpRequest();
    req.open("GET", "/comment/delete/" + commentSlug, true);
    req.onreadystatechange = function() {
        if (this.readyState == 4) {
        // If we get an "OK" status the comment is deleted from database,
        // let's mirror it on frontend
          if (req.status == 200) {
            deleteComment(comment)
            console.log('Comment [' + commentSlug + '] succesfully deleted!')
          }
        // Otherwise throw an error in console
          else {
            console.error("Whooops, something went wrong while deleting comment!\n" + "Status: " + req.status + "\nResponse: " + req.responseText)
          }
        }
    };
    req.send(null);
});

// Handler to add a comment to current game through 
// async call, either as "root" or "reply" comment
$(document).on('submit', '#comment-form', function(e) {
    e.preventDefault();
    var parentComment = document.querySelector('#parent-id').value || '' // Get parent comment if we are replyng to another comment
    var commentText = document.querySelector('#comment-text').value // Comment actual text message 
    var URL = "/comment/add/" + gamePermalink + '/' + parentComment // Build the URL for Async POST Request
    var params = "message=" + commentText // Include comment text in request body...

    if (parentComment) params += "&parentComment=" + parentComment; //..and if we are replying, add the parent comment slug too

    // Async call to "/add/" comment route
    var req = new XMLHttpRequest();
    req.open("POST", URL, true);
    req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    req.onreadystatechange = function() {
        if (this.readyState == 4) {
        // If we get an "OK" status the comment is posted,
        // let's create it on the frontend too
          if (req.status == 200) {
            var response = JSON.parse(req.response)
            var comment = response.comment
            var user = response.user
            parentComment = comment.data.parent.length > 1 ? comment.data.parent[comment.data.parent.length - 2] : null

            console.log('Comment', comment.data.slug, 'succesfully posted!')
            abortReply() // Reset comment form status (empty it and move it out of the way)
            renderComment(comment, user, parentComment) // Render our new comment in DOM
            refreshCommentsCount() // Update total comments count
            // Scroll to new comment and visually highlight it
            window.location.href = '#' + commentSuffix + comment.data.slug
            $('#' + commentSuffix + comment.data.slug).hide()
            $('#' + commentSuffix + comment.data.slug).fadeIn()
        }
        // Otherwise throw an error in console
        else {
            console.error("Whooops, something went wrong while posting comment!\n" + "Status: " + req.status + "\nResponse: " + req.responseText)
          }
        }
    };
    req.send(params);

});

// Handler to update comment text through async call
$(document).on('submit', '.edit-form', function(e) {
    e.preventDefault();
    var commentSlug = document.querySelector('#comment-to-edit').value // Comment-to-edit slug
    var commentTextNode = document.querySelector('#' + commentSuffix + commentSlug + ' .comment-text') // Comment-to-edit DOM node
    var commentText = document.querySelector('#' + commentSuffix + commentSlug + ' .edit-field').value // Comment new text message 
    var URL = "/comment/edit/" + commentSlug // Build the URL for Async POST Request
    var params = "message=" + commentText // Include updated comment text in request body...

    // Async call to "/edit/" comment route
    var req = new XMLHttpRequest();
    req.open("POST", URL, true);
    req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    req.onreadystatechange = function() {
        if (this.readyState == 4) {
        // If we get an "OK" status the comment is updated,
        // let's update the frontend too
          if (req.status == 200) {
            var response = JSON.parse(req.response)
            var comment = response.comment

            console.log('Comment', comment.data.slug, 'succesfully updated!')
            deactivateEditForm() // Destroy Edit Form
            // Update frontend text message 
            // and highlight it for a moment
            commentTextNode.innerHTML = comment.data.text
            $('#' + commentSuffix + commentSlug + ' > .comment-body > .message-container > .comment-text').hide()
            $('#' + commentSuffix + commentSlug + ' > .comment-body > .message-container > .comment-text').fadeIn()
        }
        // Otherwise throw an error in console
        else {
            console.error("Whooops, something went wrong while updating comment!\n" + "Status: " + req.status + "\nResponse: " + req.response)
          }
        }
    };
    req.send(params);
});

/**************************/
/**** HELPER FUNCTIONS ****/
/**************************/

/**** COMMENTS COUNT REFRESH ****/
var refreshCommentsCount = function(count) {
    var DOMCommentsCountElement = document.querySelector('#comments-count')
    var comments = document.querySelectorAll('#comments-list .comment')
    var deletedComments = document.querySelectorAll('#comments-list .comment.deleted')
    var commentsCount = count || comments.length - deletedComments.length
    DOMCommentsCountElement.innerHTML = commentsCount
}

/**** "RENDER" COMMENT TEMPLATE ****/
var renderComment = function(comment, sessionUser, parentSlug) {
    // Comment post date and time 
    moment.locale(navigator.language) // Set correct locale based on browser language
    var commentDateTime = moment(comment.data.posted).format("MMMM DD YYYY, HH:mm:ss") // Format date as specified
    // Determine if comment is deleted, if so, add "deleted" class to our comment node
    var deleted = comment.data.deleted ? ' deleted' : ''
    // If user is logged in, check whether he is the owner of current comment or a "super-user" to activate
    // specific comment actions (e.g. "Delete" action)
    var actionsForOwnerOrSuperuser = ''
    if (sessionUser)
        if (sessionUser.local.username == comment.data.author.local.username || sessionUser.local.role > 0)
            var actionsForOwnerOrSuperuser = ' <span class=\"sep\"> - <span class=\"action edit\" data-action=\"edit\">Edit</span><span class=\"sep\"> - </span><span class=\"action delete text-danger\" data-action=\"delete\">Delete</span>'
    // If comment isn't deleted add basic "Reply" function to empty actions template
    // (further actions could be added in case of owner/admin user)
    var actions = ''
    if (!comment.data.deleted)
        actions = '<span class=\"action reply\" data-action=\"reply\">Reply</span>' + actionsForOwnerOrSuperuser
    // If user is logged in let's prepare an empty actions template
    var commentActionsOuterTemplate = ''
    if (sessionUser)
        commentActionsOuterTemplate = "<span class=\"comment-actions bg-light\">" + actions + "</span>"
    // If current comment has replies let's prepare an empty replies template
    var repliesOuterTemplate = ''
    if (comment.data.replies)
        repliesOuterTemplate = '<div class=\"replies\"></div>'
    // Let's "render" our comment with specified template:
    var renderedComment = "<div id=" + commentSuffix + comment.data.slug + " class=\"comment" + deleted + "\"><div class=\"comment-body\"><span class=\"comment-date\">" + commentDateTime + "</span><br><span class=\"comment-author\">" + comment.data.author.local.username + "</span><br><div class=\"message-container\"><span class=\"comment-text\">" + comment.data.text + "</span></div>" + commentActionsOuterTemplate + "</div>" + repliesOuterTemplate + "</div>"
    // If render function has not received any parent comment indication...
    if (!parentSlug)
        commentsInjectionPoint.innerHTML += renderedComment //...add the comment at the end of comments list (root comment)
    else {
        //...otherwise inject it in specified parent "replies template"
        var parentComment= document.querySelector("#" + commentSuffix + parentSlug)
        // If parent comment hasn't got a child ".replies" node, let's create it
        if (!parentComment.querySelector('.replies')) {
            parentComment.innerHTML += '<div class=\"replies\"></div>'
        }
        parentComment.querySelector(".replies").innerHTML += renderedComment
    }
    // Now that we have current comment rendered, let's recurively take care of any existing replies
    if (comment.data.replies) {
        comment.data.replies.forEach(function(reply) {
            renderComment(reply, sessionUser, comment.data.slug)
        })
    }
}

/**** REPLY ****/
// Move Comment Form from "root" level to current comment
// position in DOM given current comment id attribute.
// Useful for comment reply.
var bringCommentFormIn = function(commentId) {
    appendTarget = $('#' + commentId).find('> .comment-body') // Specific part of comment to place reply form in
    commentForm.appendTo(appendTarget) // Append comment form to current comment
    setCommentParent(commentId) // Set form parent field to current comment parent id
}
// Move comment form to default position
// and empty its parent field value
var abortReply = function() {
    commentForm.appendTo(commentBasePosition)
    document.getElementById("comment-text").value = ''
    setCommentParent()
}
// Given current comment id attribute (which contains comment unique slug)
// retrieve parent id and use it as value for form parent field
var setCommentParent = function(commentId) {
    var parentId = commentId ? getCommentParent(commentId) : '' // Retrieve parent id (or set an empty string)...
    parentField.attr('value', parentId); // ...and you use it as form parent field value 
}
// Retrieve parent comment and, if it exists,
// get its id (from id attribute), cut off comment suffix to get 
var getCommentParent = function(commentId) {
    var comment = $('#' + commentId) // Build jQuery selector
    var parentId = comment.closest('.comment').attr('id').replace(commentSuffix, '') // Extract parent id 
    return parentId || '' // Return parent id if existing
}

/**** EDIT ****/
// Activate Edit Form for chosen comment
var activateEditForm = function(commentId, commentText) {
    // Destroy any existing edit form
    deactivateEditForm()
    var commentToEdit = document.querySelector('#' + commentId)
    var editFormInjectionPoint = commentToEdit.querySelector('.message-container')
    var commentTextNode = editFormInjectionPoint.querySelector('.comment-text')
    var editFormTemplate = '<span class=\"edit-form-container\"><div class=\"close-edit text-center\"><span>Cancel Edit</span><button type=\"button\" class=\"close\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button></div><form class=\"edit-form text-center\" method=\"post\"><textarea class=\"form-control edit-field\">' + commentText + '</textarea><input id=\"comment-to-edit\" type=\"text\" value=\"' + commentId.replace(commentSuffix,'') + '\" hidden /><input type=\"submit\" value=\"Update Comment\" class=\"btn btn-info btn-sm text-center mt-2\"></form></span>'
    // Hide existing comment text node...
    commentTextNode.style.display = 'none'
    // ...and make space to edit form
    // thus allowing the user to update the message
    editFormInjectionPoint.innerHTML += editFormTemplate
}
// Destroy any existing comment edit form
// restoring corresponding text messages without any modification
var deactivateEditForm = function() {
    var editForms = document.querySelectorAll('.edit-form-container')
    // For any existing edit form...
    editForms.forEach(function(editForm) {
        var parent = editForm.parentNode
        var commentTextNode = parent.querySelector('.comment-text')
        // ...remove that form from DOM...
        parent.removeChild(editForm)
        // ...and restore corresponding, untouched, texs message
        commentTextNode.style.display = 'inline'
    }) 
}

/**** DELETE ****/
// Set up delete comment modal with comment to delete info
// (comment text and comment slug to pass to delete backend route)
var setUpDeleteModal = function(commentId, commentText) {
    deleteCommentModal.find('#deleteCommentBtn').attr('data-delete', commentId.replace(commentSuffix, ''));
    deleteCommentModal.find('#comment-to-delete-text').text('"' + commentText + '"')
}
// Reset delete comment modal to default
// (clear previous comment info from it)
var clearDeleteModal = function() {
    deleteCommentModal.find('#deleteCommentBtn').removeAttr('data-delete')
    deleteCommentModal.find('#comment-to-delete-text').text('')
}
// Prepare delete comment modal with comment info and
// show the it to the user
var triggerDeleteModal = function(commentId, commentText) {
    setUpDeleteModal(commentId, commentText)
    deleteCommentModal.modal('show')
}
// Disable the comment when it cannot be completely
// removed (probably it has still alive children)
var disableComment = function(comment) {
    var commentBody = comment.find('> .comment-body')
    var commentText = comment.find('> .comment-body .comment-text')
    var commentActions = comment.find('> .comment-body .comment-actions')
    commentBody.fadeOut('fast', function() {
        comment.addClass('deleted')
        commentText.html('<em>This comment has been deleted</em>')
        commentActions.html('')
        commentBody.fadeIn('fast')
        refreshCommentsCount()
    });
}
// Actually remove deleted comment
var destroyComment = function(comment) {
    comment.fadeOut('fast', function() {
        comment.remove()
        refreshCommentsCount()
    });
}
// Check whether the comment has alive children or not
var hasAliveChildren = function(comment) {
    var aliveChildren = comment.find('.comment').not('.deleted')
    if (aliveChildren.length)
        return aliveChildren.length
    else
        return false
}
// Check whether parent of selected comment has alive children or not
var hasAliveRelatives = function(comment) {
    var parent = comment.parent().closest('.comment')
    var aliveRelatives = parent.find('.comment').not('.deleted')
    if (aliveRelatives.length - 1) // Finding alive relatives other then self
        return true
    else
        return false
}
// Check if direct parent is alive
var isParentAlive = function(comment) {
    var parent = comment.parent().closest('.comment')
    if (parent.hasClass('deleted'))
        return false
    else
        return true
}
// Check if current comment is alive
var isAlive = function(comment) {
    return comment.hasClass('deleted') ? false : true
}
// Look out for the lineage point of comment tree
// from which all comments have been deleted so
// we can delete entire branches of deleted comments
// at once (avoiding entire branches of deleted comments)
var getPointOflineageDeath = function(comment) {
    if (!isParentAlive(comment) && !hasAliveRelatives(comment)) {
        comment = comment.parent().closest('.comment')
        return getPointOflineageDeath(comment)
    }
    else
        return comment
}
// Decide how to delete comment based on the presence
// of alive relatives: disable the comment and maintain
// it visible for the sake of not breaking the thread
// or completely destroy it if its deletion does no harm
// to the discussion
var deleteComment = function(comment) {
    // If the comment is the last of its lineage
    // simply kill it
    if (hasAliveChildren(comment))
        disableComment(comment)
    // Otherwise let's find out who is the ancestor after
    // which all children and grandchildren are dead and 
    // let's destroy that node (could simply be the comment itself)
    else {
        comment = getPointOflineageDeath(comment)
        destroyComment(comment)
    }
}