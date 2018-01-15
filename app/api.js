var request = require('request');

module.exports = function(app) {
  function countUsers(callback){
    var url = 'https://discordapp.com/api/guilds/303217943234215948/widget.json';
    var count = 0
    request.get({
      url: url,
      json: true,
      headers: {'User-Agent': 'request'}
    }, (err, res, data) => {
      if (err) {
        console.log('Error:', err);
        return(callback(null, err))
      } else if (res.statusCode !== 200) {
        console.log('Status:', res.statusCode);
        return(callback(null, res.statusCode));
      } else {
        data.members.forEach(function(e){
          count++
        })
        return(callback(count, false))
      }
    });
  }
  // TODO: just import dmg01/discordBadge as npm module and include its route
  app.get('/api/discord', function(req, res) {
    countUsers(function (data, err) {
      if (err) return res.send(err.toString())
      var result = new Object()
      result["count"] = data;
      res.json(result)
    })
  })
}