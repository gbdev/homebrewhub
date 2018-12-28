// Set up
var express  = require('express');
var app      = express();
var port     = process.env.PORT || 8080;
var mongoose = require('mongoose');
var passport = require('passport');
var flash    = require('connect-flash');

var morgan       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var session      = require('express-session');

var configDB = require('./config/database.js');

// Configuration
mongoose.connect(configDB.url, { useNewUrlParser : true });
require('./config/passport')(passport);

// Express application
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.json()); // get information from html forms
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs'); // set up ejs for templating
app.use('/', express.static('static'))
app.use('/database', express.static('database'))

//app.use('/uploads', express.static('uploads'))

app.use('/include', express.static('node_modules/countup.js/dist'));
app.use('/include', express.static('node_modules/boostrap/dist/js'));
app.use('/include', express.static('node_modules/boostrap/dist/css'));
app.use('/include', express.static('node_modules/moment/min'))

// Passport session
app.use(session({
    secret: 'ilovescotchscotchyscotchscotch', // session secret
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

// pass the page name
app.use(function(req, res, next){
	req.active = req.path.split('/')[1]
	next();
})

// Routes
require('./app/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport
require('./app/api.js')(app)
require('./app/comments.js')(app, passport);

// Launch
app.listen(port);
console.log('The magic happens on port ' + port);