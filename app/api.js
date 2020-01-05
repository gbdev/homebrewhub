var request = require('request');

module.exports = function(app) {
    var User = require('../app/models/user');
    var Game = require('../app/models/game');

    function isInt(value) {
        return !isNaN(value) && (function(x) { return (x | 0) === x; })(parseFloat(value))
    }

    app.use("/api", function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });

    app.get('/api/info', function(req, res) {
        Game.countDocuments({}, function(err, gamecount) {
            var data = new Object()
            data["games"] = gamecount
            res.json(data)
        })
    })
    // {'data.typetag' : 'homebrew'}
    app.get('/api/homebrews', function(req, res) {
        p = 1

        // decent validation
        if (isInt(req.query.page)) {
            if (req.query.page != 0) p = req.query.page
        } else {
            p = 1
        }

        if (req.query.type == undefined){
        	console.log("a")
        	const query = {}
        } else {
        	console.log("a")
        	const query = {'data.typetag' : req.query.type}
        }

        Game.paginate({}, { select: ['-_id', '-__v'], page: p, limit: 9 }, function(err, games) {
            games["docs"].forEach(function(game, i) {
                games["docs"][i] = game["data"]
            })
            res.json(games)
        })

    })

}
