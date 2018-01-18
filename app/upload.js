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