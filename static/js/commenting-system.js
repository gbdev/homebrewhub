/** 
 *
 * Game View: Commenting System behavior
 *
 */

// SOME DECLARATIONS
var commentBasePosition = $('#leave-a-comment')
var commentForm = $('#comment-form-container')
var parentField = $('#parent-id')
var deleteCommentModal = $('#delete-comment-modal')
var commentSuffix = 'cm-'

/************************/
/**** EVENT CATCHING ****/
/************************/
// Here's a handler to control single comments actions 
$('.comment-actions .action').click(function(e) {
    // Retrieve some basic info for current action
    // and comment
    var action = $(this).attr('data-action') // Selected action from "data-" attribute
    var comment = $(this).closest('.comment')
    var commentId = $(this).closest('.comment').attr('id') // Current comment from closest ".comment" parent id attribute
    var commentText = $(this).closest('.comment').find('> .comment-body > .comment-text').text() // Current comment actual text message
    console.log('Commenting System action:', action)
    // Decide what to do based on current action
    switch (action) {
        // REPLY:
        case 'reply':
            // Bring the comment form from previous level
            // to current DOM position for the reply
            bringCommentFormIn(commentId);
            break;

        case 'delete':
            // Triggering modal to check if user is sure
            // to delete selected comment
            console.log("Prompting modal to check if user is sure to delete comment")
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
$('.close-reply').click(function(e) {
    abortReply()
});

// Handler to delete seletced comment through 
// async call to delete backend route
$('#deleteCommentBtn').click(function(e) {
    $(this).removeData('delete') // Clear "cached" data value
    var commentSlug = $(this).data('delete') // Get comment slug
    var comment = $("#" + commentSuffix + commentSlug)
    deleteCommentModal.modal('hide') // Hide modal and proceed with serious stuff
    console.log('Trying to delete comment "' + comment.find('> .comment-body > .comment-text').text() +  '" through async route')

    // Async call to delete comment route
    var req = new XMLHttpRequest();
    req.open("GET", "/comment/delete/" + commentSlug, true);
    req.onreadystatechange = function() {
        if (this.readyState == 4) {
        // If we get an "OK" status the comment is deleted from database,
        // let's mirror it on frontend
          if (req.status == 200) {
            deleteComment(comment)
          }
        // Otherwise alert with some error
          else {
            alert("Whooops, something went wrong!")
          }
        }
    };
    req.send(null);
});

deleteCommentModal.on('hide.bs.modal', function(e) {
    clearDeleteModal()
});

/**************************/
/**** HELPER FUNCTIONS ****/
/**************************/

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
    });
}
// Actually remove deleted comment
var destroyComment = function(comment) {
    comment.fadeOut('fast', function() {
        comment.remove()
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
// Look out for the ligneage point of comment tree
// from which all comments have been deleted so
// we can delete entire branches of deleted comments
// at once (avoiding entire branches of deleted comments)
var getPointOfLigneageDeath = function(comment) {
    if (!isParentAlive(comment) && !hasAliveRelatives(comment)) {
        comment = comment.parent().closest('.comment')
        return getPointOfLigneageDeath(comment)
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
        comment = getPointOfLigneageDeath(comment)
        destroyComment(comment)
    }
}