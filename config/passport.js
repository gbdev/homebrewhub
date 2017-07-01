// load all the things we need
var LocalStrategy    = require('passport-local').Strategy;

// load up the user model
var User       = require('../app/models/user');

var randomstring = require("randomstring");
const nodemailer = require('nodemailer');

// load the configuration
var configAuth = require('./auth'); // use this one for testing
var configEmail = require('./email'); // SMTP server variables

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

module.exports = function(passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    },
    function(req, email, username, password, done) {
        if (email)
            email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

        // asynchronous
        process.nextTick(function() {
            User.findOne({ 'local.email' :  email }, function(err, user) {
                // if there are any errors, return the error
                if (err)
                    return done(err);

                // if no user is found, return the message
                if (!user)
                    return done(null, false, req.flash('loginMessage', 'No user found.'));

                if (!user.validPassword(password))
                    return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'));
                if (!user.local.verified)
                    return done(null, false, req.flash('loginMessage', 'Check the email you provided to activate the account. The email may be in the Spam folder.'))
                // all is well, return user
                else
                    return done(null, user);
            });
        });

    }));

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    passport.use('local-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'username',
        passwordField : 'password',
        emailField : 'email',
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    },
    function(req, email, username, password, done) {
        if (email)
            email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

        //console.log("Received SIGNUP, EMAIL: "+email+"USERNAME: "+username+"PASSWORD: "+password)
        
        
        // asynchronous
        process.nextTick(function() {
            // if the user is not already logged in:
            if (!req.user) {
                User.findOne({ 'local.email' :  email }, function(err, user) {
                    // if there are any errors, return the error
                    if (err)
                        return done(err);

                    // check to see if theres already a user with that email
                    if (user) {
                        return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
                    } else {

                        // create the user
                        var newUser            = new User();

                        newUser.local.username = username;
                        newUser.local.email    = email;
                        newUser.local.password = newUser.generateHash(password);
                        newUser.local.verified = false;

                        // defaults
                        newUser.data.test = "default value";
                        var verification_token = randomstring.generate({
                                length: 64
                            });

                        newUser.local.verifyToken = verification_token;

                        var permalink = req.body.username.toLowerCase().replace(' ', '').replace(/[^\w\s]/gi, '').trim();
                        activationLink = configEmail.domain+"verify/"+permalink+"/"+verification_token;
                        newUser.local.permalink = permalink;

                        var htmlEmailBody = 'Click the following link to activate your account: <a href="'+activationLink+'">' + activationLink +"</a>";
                        // Send activation email
                        // setup email data with unicode symbols
                        let mailOptions = {
                            from: '"Bar Foo" <no-reply@PLACEHOLDER.com>', // sender address
                            to: email, // list of receivers
                            subject: 'Activate your account', // Subject line
                            text: 'Activate your account clicking here: ' + activationLink, // plain text body
                            html:  htmlEmailBody
                        };

                        // send mail with defined transport object
                        transporter.sendMail(mailOptions, (error, info) => {
                            if (error) {
                                return console.log(error);
                            }
                            console.log('Message %s sent: %s', info.messageId, info.response);
                        });

                        newUser.save(function(err) {
                            if (err)
                                return done(err);
                            return done(null, false, req.flash('signupMessage', 'Registration complete, check your email to activate your account.'));
                        });
                    }

                });
            } else {
                // user is logged in and already has a local account. Ignore signup. (You should log out before trying to create a new account, user!)
                return done(null, req.user);
            }

        });
        

    }));
};