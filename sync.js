var mongoose = require('mongoose');
var fs = require('fs');
var games = JSON.parse(fs.readFileSync('database/gamesList.json', 'utf8'));

dbURL = 'mongodb://localhost:27018/passport'
dbOptions = {
	useMongoClient : true
}
mongoose.connect(dbURL, dbOptions)

var Game = require('./app/models/game');

games.forEach(function(permalink, index) {
	var game = JSON.parse(fs.readFileSync('database/'+permalink+'/game.json', 'utf8'));
	Game.findOneAndUpdate({
			'data.permalink': permalink
		}, 
		// Find the matching entry and update it
		{
			'data.title' : game["title"],
			'data.permalink' : game["slug"],
			'data.developer' : game["developer"],
			'data.typetag' : game["typetag"],
			'data.description' : game["description"],
			'data.repository' : game["repository"],
			'data.license' : game["license"],
			'data.tags' : game["tags"],
			'data.screenshots' : game["screenshots"],
			'data.rom' : game["rom"]
		}, function(err, result) {
			if (err) {
				console.log("Error", err)
			}
			else if (!result) {
				// No game with that permalink, create a new entry
				var newGame = new Game({
					data: {
						title: game["title"],
						permalink: game["slug"],
						description: game["description"],
						developer: game["developer"],
						repository: game["repository"],
						license : game["license"],
						tags: game["tags"],
						typetag : game["typetag"],
						screenshots : game["screenshots"],
						rom : game["rom"]
					}
				})
				newGame.save();
				console.log("Added", game["title"])
			}
			else {
				console.log("Updated", game["title"])
			}
		})
})