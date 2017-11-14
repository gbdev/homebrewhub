var mongoose = require('mongoose');
var fs = require('fs');
var games = JSON.parse(fs.readFileSync('db.json', 'utf8'));

dbURL = 'mongodb://localhost:27018/passport'
dbOptions = {
	useMongoClient : true
}
mongoose.connect(dbURL, dbOptions)

var Game = require('./app/models/game');
games.forEach(function(element, index)  {
	Game.findOneAndUpdate({
			'data.permalink': element["permalink"]
		}, 
		// Find the matching entry and update it
		{
			'data.title' : element["title"],
			'data.permalink' : element["permalink"],
			'data.developer' : element["developer"],
			'data.typetag' : element["typetag"],
			'data.description' : element["description"],
			'data.repository' : element["repository"],
			'data.license' : element["license"],
			'data.tags' : element["tags"]
		}, function(err, result) {
			if (err) {
				console.log("Error", err)
			}
			else if (!result) {
				// No game with that permalink, create a new entry
				var game = new Game({
					data: {
						title: element["title"],
						permalink: element["permalink"],
						description: element["description"],
						developer: element["developer"],
						repository: element["repository"],
						license : element["license"],
						tags: element["tags"],
						typetag : element["typetag"]
					}
				})
				game.save();
				console.log("Added", element["title"])
			}
			else {
				console.log("Updated", element["title"])
			}
		})
})