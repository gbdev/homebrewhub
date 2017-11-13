var mongoose = require('mongoose');
var fs = require('fs');
var games = JSON.parse(fs.readFileSync('db.json', 'utf8'));

dbURL = 'mongodb://localhost:27018/passport'
dbOptions = {
	useMongoClient : true
}
mongoose.connect(dbURL, dbOptions)

var Game = require('./app/models/game');
games.forEach(function(element)  {
	Game.findOne({
			'data.permalink': element["name"]
		}, function(err, result) {
			if (!result) {
				// Create the game
			}
			else {
				console.log(element["name"])
				//console.log(result)		
			}
		})
})

mongoose.disconnect()