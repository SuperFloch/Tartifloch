const https = require('https');
const http = require('http');
const bodyParser = require('body-parser');
var cron = require('node-cron');
var getPixels = require("get-pixels");

// INTERFACE WEB
var express = require('express');
var app = express(),

server = require('http').createServer(app);
app.use(express.static(__dirname));
app.use(bodyParser.json({limit: '50mb'}));
var fs = require('fs');

// ECRITURE initiale
const FOLDER_COUNT = 1024;
//fillJSON(1);
//moveImages();

//generateBigJSFile();

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html');
});

app.get('/analyzer', function (req, res) {
	res.sendFile(__dirname + '/analyzer.html');
});

app.post('/jsonUpdate/:playlist',function(req,res){
	if(req.params.playlist != "Kedall"){
		console.log(fillWithZeros(req.params.playlist,4)+".json modifié !");
		var url = './data/'+fillWithZeros(req.params.playlist,4)+'.json';
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
	var url = './data/'+fillWithZeros(req.params.playlist,4)+'.json';
	var fileContents = fs.readFileSync(url);
	var info = JSON.parse(fileContents);
	
	res.json(info);
});

server.listen(8080);


/*
	TOOLS
*/
function generateBigJSFile(){
	var bigData = {playlists:[]};
	for(var i = 1; i<= FOLDER_COUNT;i++){
		var url = './data/'+fillWithZeros(i,4)+'.json';
		var fileContents = fs.readFileSync(url);
		var imgInfo = JSON.parse(fileContents);
		
		url = './filesRefs/'+fillWithZeros(i,4)+'.json';
		fileContents = fs.readFileSync(url);
		var filesInfo = JSON.parse(fileContents);
		imgInfo.songs = filesInfo.songs;
		bigData.playlists.push(imgInfo);
	}
	fs.writeFileSync("everything.js","var data = "+JSON.stringify(bigData, null, 4),"utf8");
}

function fillJSON(i){
	var playlistNumber = fillWithZeros(i,4);
	var path = './filesRefs/'+playlistNumber+'.json';
	var playlistName = "";
	
	var playlistSongs = [];
	var usbPath = "F:/"+playlistNumber+"/";
	fs.readdir(usbPath, (err, files) => {
		files = files.filter(f => f.includes(".mp3"));
		files.sort(function(a,b){
			return parseInt(a.substring(5,7),10) - parseInt(b.substring(5,7),10);
		});
		
		var playListName = files[11].substring(8,files[11].length-4).split(" - ")[1];
		
		files.forEach(function(file,index){
			var toRemove = (index+1)+" ";
			var fileFullName = "";
			if(file.includes(playListName)){
				fileFullName = file.substring(5+toRemove.length,file.length-(7+playListName.length));
			}else{
				fileFullName = file.substring(5+toRemove.length,file.length-4);
			}
			
			playlistSongs[index] = fileFullName;
			
		});
		
		
		var jsonData = {
			songs : playlistSongs,
			id : i-1,
			name : playListName
		};
		
		//console.log(jsonData);
		fs.writeFile(path, JSON.stringify(jsonData), { flag: 'wx' }, function (err) {
			if (err) {
				console.log(err);
			}
			if(i<FOLDER_COUNT){
				fillJSON(i+1);
			}
		});
		
	});
}

function moveImages(){
	for(var i=1;i<=FOLDER_COUNT;i++){
		var srcPath = "F:/"+fillWithZeros(i,4)+"/"+fillWithZeros(i,4)+".jpg";
		var destPath = "./Miniatures/"+fillWithZeros(i,4)+".jpg";
		fs.copyFile( srcPath, destPath, (err) => {
			if (err) {
				console.log("Error Found:", err);
			}
		});
	}
}

function fillWithZeros(inte,cCount){
	var str = ""+inte;
	while(str.length < cCount){
		str = "0"+str;
	}
	return str;
}