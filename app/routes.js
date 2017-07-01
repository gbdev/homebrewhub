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
};

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.redirect('/');
}