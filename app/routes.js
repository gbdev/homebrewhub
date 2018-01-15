var configEmail = require('../config/email'); // SMTP server variables

var randomstring = require("randomstring");
var fs = require('fs');
var multer = require('multer')
var bcrypt = require('bcrypt-nodejs')
var sha1 = require('sha1')
var moment = require('moment')
var mongoosePaginate = require('mongoose-paginate');

// Multer Upload configuration
var upload = multer({
    dest: 'uploads/'
})

var mulconf = upload.fields([{
    name: 'ssFiles',
    maxCount: 5
}, {
    name: 'gameFiles',
    maxCount: 5
}])


const nodemailer = require('nodemailer');
// Create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
    // ignoreTLS: true,
    host: configEmail.host,
    port: configEmail.port,
    secure: configEmail.secure, // secure:true for port 465, secure:false for port 587
    auth: {
        user: configEmail.user,
        pass: configEmail.pass
    }
});

module.exports = function(app, passport) {
    // Database models
    var User = require('../app/models/user');
    var Game = require('../app/models/game');
    var File = require('../app/models/file');

    function isInt(value) {
        return !isNaN(value) && (function(x) { return (x | 0) === x; })(parseFloat(value))
    }

    app.get('/', function(req, res) {
        res.render('landing.ejs', {
            req: req,
            message: req.flash('loginMessage'), // Show permission problems
            type: req.flash('type')
        })
    });

    app.get('/disclaimer', function(req, res) {
        res.render('disclaimer.ejs', {
            req: req
        })
    });

    app.get('/credits', function(req, res) {
        res.render('credits.ejs', {
            req: req
        })
    });


    app.get('/games', function(req, res) {
        p = 1
        
        // decent validation
        if (isInt(req.query.page)){
            if (req.query.page != 0) p = req.query.page
        } else {
            p = 1
        }

        console.log("requested page", p)
        Game.paginate({}, { page: p, limit: 9 }, function(err, games) {
            console.log(games.docs)
                res.render('index.ejs', {
                    req: req,
                    games: games.docs,
                    pages : games.pages
                })
            })
    });

    categoriesDict = new Object()
    categoriesDict = {
            'rpg' : 'RPG',
            'open-source' : 'Open Source',
            'puzzle' : 'Puzzle',
            'platform' : 'Platform',
            'action' : 'Action'
    }

    function getTag(permalink) {
        if (categoriesDict[permalink]) {
            return categoriesDict[permalink]
        }
        else {
            return "open-source"
        }

    }

    // General category matching
    app.get('/games/:permalink', function(req, res) {
         p = 1
        
        // decent validation
        if (isInt(req.query.page)){
            if (req.query.page != 0) p = req.query.page
        } else { 
            p = 1
        }
        Game.paginate({
                'data.tags': getTag(req.params.permalink)
            },
            { page: p, limit: 9 },
            function(err, games) {
                console.log(games)
                res.render('index.ejs', {
                    req: req,
                    games: games.docs,
                    pages : games.pages
                })
            })
        
    })


    // Profile, and some redirection
    app.get('/profile', function(req, res) {
        if (req.isAuthenticated()) {
            // Redirect based on the previous requested page
            if (!req.session.r || req.session.r == '') {
                res.redirect('/');
            } else if (!req.session.r || req.session.r == 'profile') {
                req.session.r = '';
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(req.user));
            } else {
                res.redirect('/' + req.session.r)
                req.session.r = '';
            }
        } else {
            req.flash('loginMessage', 'Login to use this page')
            req.flash('type', 1)
            res.redirect('/login?r=profile')
        }
    });

    app.get('/upload', function(req, res) {
        if (req.isAuthenticated()) {
            if (req.user.local.role == 1) {
                res.render('upload.ejs', {
                    req: req,
                    message: req.flash('loginMessage')
                })
            } else {
                req.flash('loginMessage', 'Not allowed to do that, sorry')
                req.flash('type', 1)
                res.redirect('/')
            }

        } else {
            req.flash('loginMessage', 'Login to use this page')
            req.flash('type', 1)
            res.redirect('/login?r=upload')
        }
    });

    app.post('/upload', mulconf, function(req, res, next) {
        console.log(req.body["title"])
        console.log(req.files.screenshots)
            // TODO: prevalidation
            //  Redirect back to upload with flashing errors
            //  if (!req.files.screenshots)

        // TODO: generate permalink from game title
        var gameFilesArray = new Array();
        var screenshotsFilesArray = new Array();

        for (var i = 0; i < req.files.ssFiles.length; i++) {
            fs.mkdir(req.files.ssFiles[i].destination + "/" + req.body["title"], function() {
                console.log("Game folder created")
            })
            fs.rename(req.files.ssFiles[i].destination + req.files.ssFiles[i].filename, req.files.ssFiles[i].destination + req.body["title"] + "/" + req.files.ssFiles[i].originalname)
            var screenshotFile = new File({
                data: {
                    fslocation: req.files.ssFiles[i].destination + req.body["title"] + "/" + req.files.ssFiles[i].originalname,
                    description: "Screenshot " + i,
                    game: req.body["title"]
                }
            })
            screenshotFile.save();
            screenshotsFilesArray.push(screenshotFile.id);
        };

        for (var i = 0; i < req.files.gameFiles.length; i++) {
            // Restore original name and move to game subfolder
            fs.mkdir(req.files.gameFiles[i].destination + "/" + req.body["title"], function() {})
            fs.rename(req.files.gameFiles[i].destination + req.files.gameFiles[i].filename, req.files.gameFiles[i].destination + req.body["title"] + "/" + req.files.gameFiles[i].originalname)

            var gameFile = new File({
                data: {
                    fslocation: req.files.gameFiles[i].destination + req.body["title"] + "/" + req.files.gameFiles[i].originalname,
                    description: req.body["description"],
                    game: req.body["title"]
                }
            })
            gameFile.save()
            gameFilesArray.push(gameFile.id)
        }

        var game = new Game({
            data: {
                title: req.body["title"],
                permalink: req.body["permalink"],
                description: req.body["description"],
                developer: req.body["developer"],
                repository: req.body["repository"],
                //tags: req.body["tags"].split(),
                files: gameFilesArray,
                screenshots: screenshotsFilesArray
            }
        })
        game.save();
        req.flash('loginMessage', 'Upload successful')
        req.flash('type', 2)
        res.redirect('/')

        //console.log(req.files.sampleFile.length)
        //console.log(req.body["title"])
        // req.file is the `avatar` file
        // req.body will hold the text fields, if there were any
    })

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });


    app.get('/game/:gameID', function(req, res) {

        console.log(req.params.gameID)
        Game.find({
                'data.permalink': req.params.gameID
            })
            .exec(function(err, game) {
                //console.log(game)
                if (game == null || game.length == 0) {
                    // TODO: Render error page with details and send 404
                    res.send("No game found")
                } else {
                	console.log(game[0].data.onlineplay)
                    res.render('game.ejs', {
                        req: req,
                        game: game,
                        message: req.flash('message'),
                        flashType: req.flash('type')
                    })
                }
            })
    })

    app.get('/game_mobile/:gameID', function(req, res) {

        console.log(req.params.gameID)
        Game.find({
                'data.permalink': req.params.gameID
            })
            .exec(function(err, game) {
                //console.log(game)
                if (game == null || game.length == 0) {
                    // TODO: Render error page with details and send 404
                    res.send("No game found")
                } else {
                    console.log(game[0].data.date)
                    res.render('game_min.ejs', {
                        req: req,
                        game: game,
                        message: req.flash('message'),
                        flashType: req.flash('type')
                    })
                }
            })
    })

    // Activation links
    app.get('/verify/:permalink/:token', function(req, res) {
        var permalink = req.params.permalink;
        var token = req.params.token;
        console.log(permalink)

        User.findOne({
            'local.permalink': permalink
        }, function(err, user) {
            if (user.local.verifyToken == token) {
                console.log('Token correty, verify the user');

                User.findOneAndUpdate({
                    'local.permalink': permalink
                }, {
                    'local.verified': true
                }, function(err, resp) {
                    console.log('The user has been verified!');
                });
                req.flash('loginMessage', 'Your account has been verified, you can now login')
                req.flash('type', 2)
                res.redirect('/login');
            } else {
                console.log('Activation rejected, token should be: ' + user.local.verifyToken);
                req.flash('loginMessage', 'Token incorrect, the account wasn\'t activated')
                req.flash('type', 1)
                res.redirect('/login');
            }
        });
    });

    app.post('/edit', isLoggedIn, function(req, res) {
        console.log(req.body.a)
        res.render('editDone.ejs');
        req.user.data.test = req.body.a
        req.user.save();
    });

    app.get('/login', function(req, res) {
        // Save the requested resource (if any) to allow redirection after the authentication
        req.session.r = req.query.r;
        res.render('login.ejs', {
            message: req.flash('loginMessage'),
            type: req.flash('type')
        });
    });

    // process the login form
    app.post('/login', passport.authenticate('local-login', {
        successRedirect: '/profile', // redirect to the secure profile section
        failureRedirect: '/login', // redirect back to the signup page if there is an error
        failureFlash: true // allow flash messages
    }));

    app.get('/signup', function(req, res) {
        res.render('signup.ejs', {
            message: req.flash('signupMessage')
        });
    });

    // Process the signup form
    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect: '/profile', // redirect to the secure profile section
        failureRedirect: '/signup', // redirect back to the signup page if there is an error
        failureFlash: true // allow flash messages
    }));

    // Password recovery
    app.get('/forgotPassword', function(req, res) {
        res.render('forgotPassword.ejs', {
            message: req.flash('message'),
            resetRequestStatus: null
        });
    });

    app.post('/resend', function(req, res) {
        var emailOrUsername = req.body.username
        if (!emailOrUsername) {
            // Check if we received a "valid" eMail or Username (also "checked" on frontend by required input attribute)
            req.flash('message', 'Sorry, you must give me either your eMail or your Username')
            res.redirect('/forgotPassword')
        } else {
            // Search db for a user with passed value either as eMail or permalink
            var query = User.findOne({
                $or: [{
                    'local.email': emailOrUsername
                }, {
                    'local.permalink': emailOrUsername
                }]
            }, function(err, user) {
                if (user) {
                    // Set up some values
                    if (user.local.verified) {
                        req.flash('message', 'The account is already activated, just login.')
                        res.render('forgotPassword.ejs', {
                            message: req.flash('message'),
                            resetRequestStatus: 'success'
                        })
                    }
                    var email = user.local.email
                    var permalink = user.local.permalink
                    var token = user.local.verifyToken
                    activationLink = configEmail.domain + "verify/" + permalink + "/" + token;
                    var htmlEmailBody = 'Click the following link to activate your account: <a href="' + activationLink + '">' + activationLink + "</a>";
                    // Send activation email
                    // setup email data with unicode symbols
                    let mailOptions = {
                        from: configEmail.sender, // sender address
                        to: email, // list of receivers
                        subject: 'Activate your account', // Subject line
                        text: 'Activate your account clicking here: ' + activationLink, // plain text body
                        html: htmlEmailBody
                    };

                    // send mail with defined transport object
                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            return console.log(error);
                        }
                        console.log('Message %s sent: %s', info.messageId, info.response);
                    });
                    req.flash('message', 'Another verification email was sent, check your Inbox.')
                    res.render('forgotPassword.ejs', {
                        message: req.flash('message'),
                        resetRequestStatus: 'success'
                    })
                }
            })
        }

    })

    app.post('/forgotPassword', function(req, res) {
        var emailOrUsername = req.body.username
        if (!emailOrUsername) {
            // Check if we received a "valid" eMail or Username (also "checked" on frontend by required input attribute)
            req.flash('message', 'Sorry, you must give me either your eMail or your Username')
            res.redirect('/forgotPassword')
        } else {
            // Search db for a user with passed value either as eMail or permalink
            var query = User.findOne({
                $or: [{
                    'local.email': emailOrUsername
                }, {
                    'local.permalink': emailOrUsername
                }]
            }, function(err, user) {
                if (user) {
                    // Set up some values
                    var email = user.local.email
                    var permalink = user.local.permalink
                    var verification_token = randomstring.generate({
                        length: 64
                    }); // Generate a new verification token
                    var resetLink = configEmail.domain + "resetPassword/" + permalink + "/" + verification_token; // Build password reset link

                    var htmlEmailBody = 'Click the following link to reset your password: <a href="' + resetLink + '">' + resetLink + "</a>"; // Build HTML email body
                    // Send activation email
                    // setup email data with unicode symbols
                    // Let the mailer 
                    let mailOptions = {
                        from: configEmail.sender, // sender address
                        to: email, // list of receivers
                        subject: 'HomebrewHub - Reset your password', // Subject line
                        text: 'Reset your password by clicking here: ' + resetLink, // plain text body
                        html: htmlEmailBody
                    };

                    // send mail with defined transport object
                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            return console.log(error);
                        }
                        console.log('Message %s sent: %s', info.messageId, info.response);
                    });
                    // Update verification token in db for current user
                    User.findOneAndUpdate({
                        'local.permalink': permalink
                    }, {
                        'local.verifyToken': verification_token
                    }, function(err, res) {
                        console.log('User:', permalink, '\nUpdated verification token for password reset')
                    })

                    // Notify the user: we've found his account and we've sent him a password reset eMail!
                    req.flash('message', 'Found you ' + emailOrUsername + '! I\'ve sent you an email with a password reset link!')
                    res.render('forgotPassword.ejs', {
                        message: req.flash('message'),
                        resetRequestStatus: 'success'
                    })

                } else {
                    // Couldn't find a user with passed valued as eMail or permalink, notify the user for a new try
                    req.flash('message', 'Username/email not found, please try again!')
                    res.redirect('/forgotPassword')
                }
            });
        }
    });


    app.get('/resetPassword/:permalink/:token', function(req, res) {
        var permalink = req.params.permalink
        var token = req.params.token

        // Search db for a user with requested permalink and verification token
        User.findOne({ 
            'local.permalink': permalink,
            'local.verifyToken': token
        }, function(err, user) {
            if (user) {
                // Render password reset form
                res.render('resetPassword.ejs', {
                    message: '',
                    resetStatus: null,
                    permalink: permalink,
                    token: token
                });
            } else {
                // TO DO: be more specific, differentiate user not found from token invalid cases?
                // Something is wrong, let's ask the user to request another verification token
                req.flash('message', 'Whoops, somenthin\'s wrong... Please go ahead and request another password reset link.')
                res.render('forgotPassword.ejs', {
                    message: req.flash('message'),
                    resetRequestStatus: null
                });
            }
        })
    });

    app.post('/resetPassword/:permalink/:token', function(req, res) {

        var newUser = new User();
        var newPassword = req.body.passwordOne
        var newConfirmPassword = req.body.passwordTwo
        var permalink = req.body.permalink
        var token = req.body.token

        //console.log('permalink: ', permalink)
        //console.log('token: ', token)

        if (newPassword == newConfirmPassword) {
            // If typed passwords match let's update db with new password and notify update success to the user
            var hashedPassword = newUser.generateHash(newPassword)
            User.findOneAndUpdate({
                'local.permalink': permalink,
                'local.verifyToken': token
            }, {
                'local.password': hashedPassword
            }, function(err, user) {
                if (err) {
                    console.log(err)
                } else {
                    req.flash('message', 'Yey! You\'re password has been changed, you can now enter with your new credentials!')
                    res.render('resetPassword', {
                        message: req.flash('message'),
                        resetStatus: 'success'
                    });
                }
            });
        } else {
            // Otherwise ask the user to try again
            req.flash('message', 'Sorry, typed passwords were different, please try again.')
            res.render('resetPassword.ejs', {
                message: req.flash('message'),
                resetStatus: null,
                permalink: permalink,
                token: token
            });
        }
    })
};

// TODO: adapt this to redirects?
// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    req.flash('loginMessage', 'Login to use this page')
    res.redirect('/login');
}