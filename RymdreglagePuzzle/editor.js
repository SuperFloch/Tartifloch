const PLAYLIST_COUNT = 56;


window.onload = function() {
	var playlistSelect = document.getElementById("playlistSelect");
	
	for(var i=1; i<= PLAYLIST_COUNT; i++){
		var plOption = document.createElement("option");
		plOption.setAttribute("value", i);
		plOption.innerHTML = i;
		playlistSelect.appendChild(plOption);
	}
	
	buildGridCodeTable();
	
	playlistSelect.onchange = function(e){
		readFile(this.value,buildForm);
	};
	
	var saveButton = document.getElementById("saveButton");
	saveButton.onclick = function(){
		var playlistInfo = {};
		playlistInfo.id = document.getElementById("playlistSelect").value;
		playlistInfo.name = document.getElementById("name").value;
		playlistInfo.number = document.getElementById("number").value;
		playlistInfo.snakeCode = document.getElementById("snakeCode").value.toUpperCase();
		playlistInfo.numberUnderlined = document.getElementById("numberLined").checked;
		
		playlistInfo.picture = {};
		playlistInfo.picture.hat = document.getElementById("hatSelect").value;
		playlistInfo.picture.eye = document.getElementById("eyeSelect").value;
		playlistInfo.picture.human = document.getElementById("humanSelect").value;
		playlistInfo.picture.mouth = document.getElementById("mouthSelect").value;
		
		playlistInfo.gridCode = getGridCodeTableValue();
		playlistInfo.gridColor = document.getElementById("gridColorSelect").value;
		
		console.log(playlistInfo);
		sendInfo(playlistInfo);
	};
};


function buildForm(playlistInfo){
	var playlistSelect = document.getElementById("playlistSelect");
	
	var idString = playlistSelect.value +"";
	while(idString.length <4){
		idString = "0"+idString;
	}
	
	var miniature = document.getElementById("miniaturePlaylist");
	miniature.src = "./Miniatures/"+idString+".jpg";
	
	fillForm(playlistInfo);
	
	buildGridCodeTable(playlistInfo.gridCode);
	
	
	
}

function fillForm(playlistInfo){

	document.getElementById("name").value = playlistInfo.name;
	document.getElementById("number").value = playlistInfo.number;
	document.getElementById("snakeCode").value = playlistInfo.snakeCode;
	document.getElementById("numberLined").checked = playlistInfo.numberUnderlined == true;
	
	if(playlistInfo.picture!=null){
		document.getElementById("hatSelect").value = playlistInfo.picture.hat;
		document.getElementById("eyeSelect").value = playlistInfo.picture.eye;
		document.getElementById("humanSelect").value = playlistInfo.picture.human;
		document.getElementById("mouthSelect").value = playlistInfo.picture.mouth;
	}
	
	document.getElementById("gridColorSelect").value = playlistInfo.gridColor;
}

function buildGridCodeTable(gridInfo){
	var grid = document.getElementById("gridCode");
	grid.innerHTML = "";
	for(var y = 0; y < 4 ; y++){
		var row = document.createElement("tr");
		for(var x = 0; x < 4 ; x++){
			var cell = document.createElement("td");
			var checkBox = document.createElement("input");
			checkBox.setAttribute("type","checkbox");
			checkBox.setAttribute("id", y+":"+x);
			if(gridInfo != null){
				checkBox.checked = gridInfo[y][x];
			}
			cell.appendChild(checkBox);
			row.appendChild(cell);
		}
		grid.appendChild(row);
	}
}

function getGridCodeTableValue(){
	var value = [];
	for(var y=0; y<4;y++){
		var row = [];
		for(var x =0; x<4; x++){
			var isChecked = document.getElementById(y+":"+x).checked;
			row.push(isChecked);
		}
		value.push(row);
	}
	return value;
}


// CONNEXION AU JSON
function sendInfo(playlistInfo){
	var myRequest = new XMLHttpRequest();
	myRequest.open('POST', '/jsonUpdate/'+playlistInfo.id);
	myRequest.setRequestHeader("Content-Type", "application/json");
	myRequest.onreadystatechange = function () { 
		if (myRequest.readyState === 4) {
			var json = JSON.parse(myRequest.responseText);
			console.log(json);
		}
	};
	myRequest.send(JSON.stringify(playlistInfo));
}

// Lis un fichier local
function readFile(playListIndex,callback){
	var myRequest = new XMLHttpRequest();
	myRequest.open('GET', '/json/'+playListIndex);
	myRequest.onreadystatechange = function () { 
		if (myRequest.readyState === 4) {
			var json = JSON.parse(myRequest.responseText);
			callback(json);
		}
	};
	myRequest.send();
}