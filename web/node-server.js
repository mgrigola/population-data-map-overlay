var connect = require('connect');
var d3Axis = require("d3-axis");

var serveStatic = require('serve-static');
connect().use(serveStatic(__dirname)).listen(8080, function() {
	console.log('port: 8080');
});

