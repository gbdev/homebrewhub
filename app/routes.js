var randomstring = require("randomstring");
var configEmail = require('../config/email'); // SMTP server variables

const nodemailer = require('nodemailer'); 
// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
    //ignoreTLS: true,
    host: configEmail.host,
    port: 465,
    secure: true, // secure:true for port 465, secure:false for port 587
    auth: {
        user: configEmail.user,
        pass: configEmail.pass
    }
});

module.exports = function(app, passport) {
    var User = require('../app/models/user');
    // normal routes ===============================================================


    // show the home page (will also have our login links)
    app.get('/', function(req, res) {
        res.render('index.ejs')
    });

    // PROFILE SECTION =========================
    app.get('/profile', isLoggedIn, function(req, res) {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(req.user));
        /*res.render('profile.ejs', {
            user : req.user
        });*/
    });

    app.get('/upload', isLoggedIn, function(req, res) {
        res.render('upload.ejs', {
            user: req.user,
            message: req.flash('uploadMessage')
        });
    });

    app.post('/upload', function(req, res) {
        if (!req.files)
            return res.status(400).send('No files were uploaded.');

        // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file 
        let sampleFile = req.files.sampleFile;

        // Use the mv() method to place the file somewhere on your server 
        sampleFile.mv('files/name.file', function(err) {
            if (err)
                return res.status(500).send(err);

            res.send('File uploaded!');
        });
    });

    // LOGOUT ==============================
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

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
                res.redirect('/login');
            } else {
                console.log('Activation rejected, token should be: ' + user.local.verifyToken);
            }
        });
    });

    // EDIT THINGS =======================
    app.post('/edit', isLoggedIn, function(req, res) {
        console.log(req.body.a)
        res.render('editDone.ejs');
        req.user.data.test = req.body.a
        req.user.save();
    });

    // =============================================================================
    // AUTHENTICATE (FIRST LOGIN) ==================================================
    // =============================================================================

    // locally --------------------------------
    // LOGIN ===============================
    // show the login form
    app.get('/login', function(req, res) {
        res.render('login.ejs', {
            message: req.flash('loginMessage')
        });
    });

    // process the login form
    app.post('/login', passport.authenticate('local-login', {
        successRedirect: '/profile', // redirect to the secure profile section
        failureRedirect: '/login', // redirect back to the signup page if there is an error
        failureFlash: true // allow flash messages
    }));

    // SIGNUP =================================
    // show the signup form
    app.get('/signup', function(req, res) {
        res.render('signup.ejs', {
            message: req.flash('signupMessage')
        });
    });

    // process the signup form
    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect: '/profile', // redirect to the secure profile section
        failureRedirect: '/signup', // redirect back to the signup page if there is an error
        failureFlash: true // allow flash messages
    }));

    // FORGOT... =================================
    // Password recovery
    app.get('/forgotPassword', function(req, res) {
        res.render('forgotPassword.ejs', {
            message: req.flash('message'),
            resetRequestStatus: null
        });
    });

    app.post('/forgotPassword', function(req,res) {
        var emailOrUsername = req.body.username
        if (!emailOrUsername) {
            // Check if we received a "valid" eMail or Username (also "checked" on frontend by required input attribute)
            req.flash('message', 'Sorry, you must give me either your eMail or your Username')
            res.redirect('/forgotPassword')
        } else {
            // Search db for a user with passed value either as eMail or permalink
            var query = User.findOne({ $or:[{ 'local.email':emailOrUsername }, { 'local.permalink':emailOrUsername }] }, function(err,user) {
                if(user)
                {
                    // Set up some values
                    var email = user.local.email
                    var permalink = user.local.permalink
                    var verification_token = randomstring.generate({ length: 64 }); // Generate a new verification token
                    var resetLink = 'http://' + configEmail.domain + "resetPassword/" + permalink + "/" + verification_token; // Build password reset link

                    var htmlEmailBody = 'Click the following link to reset your password: <a href="' + resetLink + '">' + resetLink + "</a>"; // Build HTML email body
                    // Send activation email
                    // setup email data with unicode symbols
                    let mailOptions = {
                        from: '"Bar Foo" <no-reply@PLACEHOLDER.com>', // sender address
                        to: email, // list of receivers
                        subject: 'Reset your password', // Subject line
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
                    User.findOneAndUpdate({ 'local.permalink': permalink }, { 'local.verifyToken':verification_token }, function(err,res) {
                        console.log('User:', permalink,'\nUpdated verification token for password reset')
                    })

                    // Notify the user: we've found his account and we've sent him a password reset eMail!
                    req.flash('message', 'Found you ' + emailOrUsername + '! I\'ve sent you an email with a password reset link!')
                    res.render('forgotPassword.ejs',{
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


    app.get('/resetPassword/:permalink/:token', function(req,res) {
        var permalink = req.params.permalink
        var token = req.params.token

        // Search db for a user with requested permalink and verification token
        User.findOne({ 'local.permalink':permalink, 'local.verifyToken':token }, function(err,user){
            if (user) 
            {
                // Render password reset form
                res.render('resetPassword.ejs',{
                    message:'',
                    resetStatus: null,
                    permalink: permalink,
                    token: token 
                });
            } 
            else 
            {   
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

    app.post('/resetPassword/:permalink/:token', function(req,res) {

        var newUser = new User();
        var newPassword = req.body.passwordOne
        var newConfirmPassword = req.body.passwordTwo
        var permalink = req.body.permalink
        var token = req.body.token

        //console.log('permalink: ', permalink)
        //console.log('token: ', token)

        if (newPassword == newConfirmPassword)
        {
            // If typed passwords match let's update db with new password and notify update success to the user
            var hashedPassword = newUser.generateHash(newPassword)
            User.findOneAndUpdate(
                { 'local.permalink': permalink, 'local.verifyToken':token },
                { 'local.password': hashedPassword }, function(err,user) {
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
        }
        else 
        {
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

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    req.flash('loginMessage', 'Login to use this page')
    res.redirect('/login');
}