const https = require('https');
const http = require('http');
const bodyParser = require('body-parser');
var cron = require('node-cron');

// INTERFACE WEB
var express = require('express');
var app = express(),

server = require('http').createServer(app);
app.use(express.static(__dirname));
app.use(bodyParser.json({limit: '50mb'}));
var fs = require('fs'); 

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html');
});

app.get('/analyzer', function (req, res) {
	res.sendFile(__dirname + '/analyzer.html');
});

app.post('/jsonUpdate/:playlist',function(req,res){
	if(req.params.playlist != "Kedall"){
		var url = './json/'+req.params.playlist+'.json';
		try {
			fs.writeFileSync(url,JSON.stringify(req.body, null, 4),"utf8");
			res.json({ success : true});
		} catch (err) {
			res.json({ success : false});
		}
	} else{
		res.json({ success : false});
	}
});


app.get('/json/:playlist',function(req,res){
	var url = './json/'+req.params.playlist+'.json';
	var fileContents = fs.readFileSync(url);
	var info = JSON.parse(fileContents);
	
	res.json(info);
});

server.listen(8080);