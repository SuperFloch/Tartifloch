const PLAYLIST_COUNT = 1024;
var currentPlaylist = 0;

const GRID_CODE_NB_VALUES = 9;

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
		currentPlaylist = this.value;
		readFile(this.value,buildForm);
	};
	document.getElementById("nextButton").onclick = function(){
		currentPlaylist++;
		if(currentPlaylist>PLAYLIST_COUNT){
			currentPlaylist--;
		}
		readFile(currentPlaylist,buildForm);
		playlistSelect.value= currentPlaylist;
	};
	document.getElementById("previousButton").onclick = function(){
		currentPlaylist--;
		if(currentPlaylist<=0){
			currentPlaylist++;
		}
		readFile(currentPlaylist,buildForm);
		playlistSelect.value= currentPlaylist;
	};
	
	var saveButton = document.getElementById("saveButton");
	saveButton.onclick = function(){
		var playlistInfo = {};
		playlistInfo.id = document.getElementById("playlistSelect").value;
		playlistInfo.img = {};
		playlistInfo.name = document.getElementById("name").value;
		playlistInfo.img.number = document.getElementById("number").value;
		playlistInfo.img.snakeCode = document.getElementById("snakeCode").value.toUpperCase();
		playlistInfo.img.underlined = document.getElementById("numberLined").checked;
		
		playlistInfo.img.picture = {};
		playlistInfo.img.picture.hat = document.getElementById("hatSelect").value;
		playlistInfo.img.picture.eye = document.getElementById("eyeSelect").value;
		playlistInfo.img.picture.human = document.getElementById("humanSelect").value;
		playlistInfo.img.picture.mouth = document.getElementById("mouthSelect").value;
		
		playlistInfo.img.grid = {};
		playlistInfo.img.grid.code = getGridCodeTableValue();
		playlistInfo.img.grid.color = document.getElementById("gridColor").value;
		
		playlistInfo.img.colors = [];
		for(var i =1;i<8;i++){
			playlistInfo.img.colors.push(document.getElementById("color_"+i).value);
		}
		
		playlistInfo.img.backgroundColor = document.getElementById("backgroundColor").value;
		
		sendInfo(playlistInfo);
	};
};


function buildForm(playlistInfo){
	var playlistSelect = document.getElementById("playlistSelect");
	
	var idString = fillWithZeros(playlistSelect.value,4);
	
	buildGridCodeTable(playlistInfo.img.grid);
	
	var black = "#000000";
	
	var miniature = document.getElementById("miniaturePlaylist");
	miniature.src = "./Miniatures/"+idString+".jpg";
	miniature.onload = function(){
		var canvas = document.getElementById("theCanvas");
		canvas.onclick = function(e){
			var pos = findPos(this);
			var x = e.pageX - pos.x;
			var y = e.pageY - pos.y;
			var coord = "x=" + x + ", y=" + y;
			console.log(coord);
		};
		var ctx = canvas.getContext("2d");
		ctx.drawImage(miniature, 0, 0, 400, 400);
		
		// Recuperation des couleurs
		var p = ctx.getImageData(0, 0, 1, 1).data; 
		var backColor = "#" + ("000000" + rgbToHex(p[0], p[1], p[2])).slice(-6);
		
		document.getElementById("backgroundColor").value = backColor;
		// Frise
		for(var i =1;i<8;i++){
			p = ctx.getImageData(50+i*35, 380, 1, 1).data; 
			var color = "#" + ("000000" + rgbToHex(p[0], p[1], p[2])).slice(-6);
		
			document.getElementById("color_"+i).value = color;
		}
		
		// Grille
		p = ctx.getImageData(340, 336, 1, 1).data;
		var gridColor = "#" + ("000000" + rgbToHex(p[0], p[1], p[2])).slice(-6);
		
		document.getElementById("gridColor").value = gridColor;
		
		var gridCornerX = 338;
		var gridCornerY = 335;
		var gridWidth = 50;
		var cellWidth = gridWidth/4;
		for(var y =0;y<4;y++){
			for(var x =0;x<4;x++){
				var cellCenterX = gridCornerX+cellWidth/2 + cellWidth * x+x;
				var cellCenterY = gridCornerY+cellWidth/2 + cellWidth * y+y;
				
				var theP = ctx.getImageData(cellCenterX,cellCenterY, 1, 1).data;
				var cellColor = "#" + ("000000" + rgbToHex(theP[0], theP[1], theP[2])).slice(-6);
				
				var isMiddleBlack = cellColor == black;
				
				
				ctx.fillStyle = "white";
				ctx.fillRect(cellCenterX,cellCenterY,1,1);
				
				//console.log(cellColor);
				if(isMiddleBlack){
					// North
					var northPoint = ctx.getImageData(cellCenterX, cellCenterY-cellWidth/2+2, 1, 1).data;
					var northColor = "#" + ("000000" + rgbToHex(northPoint[0], northPoint[1], northPoint[2])).slice(-6);
					
					//South
					var southPoint = ctx.getImageData(cellCenterX, cellCenterY+cellWidth/2-1, 1, 1).data;
					var southColor = "#" + ("000000" + rgbToHex(southPoint[0], southPoint[1], southPoint[2])).slice(-6);
					
					//East
					var eastPoint = ctx.getImageData(cellCenterX+cellWidth/2-2, cellCenterY, 1, 1).data;
					var eastColor = "#" + ("000000" + rgbToHex(eastPoint[0], eastPoint[1], eastPoint[2])).slice(-6);
					
					//West
					var westPoint = ctx.getImageData(cellCenterX-cellWidth/2+2, cellCenterY, 1, 1).data;
					var westColor = "#" + ("000000" + rgbToHex(westPoint[0], westPoint[1], westPoint[2])).slice(-6);
					
					
					ctx.fillRect(cellCenterX, cellCenterY-cellWidth/2+2,1,1);
					ctx.fillRect(cellCenterX, cellCenterY+cellWidth/2-1,1,1);
					ctx.fillRect(cellCenterX+cellWidth/2-2, cellCenterY,1,1);
					ctx.fillRect(cellCenterX-cellWidth/2+2, cellCenterY,1,1);
					
					if(northColor == black && eastColor == black && southColor == black && westColor == black){
						document.getElementById(y+":"+x).value = 8;
					}else if(northColor != black && eastColor != black && southColor != black && westColor != black){
						document.getElementById(y+":"+x).value = 1;
					}else{
						if(northColor == black && southColor == black){
							document.getElementById(y+":"+x).value = 2;
						}else if(eastColor == black && westColor == black){
							document.getElementById(y+":"+x).value = 3;
						}else if(westColor == black && northColor == black){
							document.getElementById(y+":"+x).value = 4;
						}else if(westColor == black && southColor == black){
							document.getElementById(y+":"+x).value = 5;
						}else if(southColor == black && eastColor == black){
							document.getElementById(y+":"+x).value = 6;
						}else if(eastColor == black && northColor == black){
							document.getElementById(y+":"+x).value = 7;
						}else{
							document.getElementById(y+":"+x).value = 1;
						}
					}
				}else{
					document.getElementById(y+":"+x).value = 0;
				}
				document.getElementById(y+":"+x).style.background="url('./res/grid_"+document.getElementById(y+":"+x).value+".png')";
			}
		}
		// Underlined
		var linePoint = ctx.getImageData(16,31, 1, 1).data;
		var isUnderlined = ("#" + ("000000" + rgbToHex(linePoint[0], linePoint[1], linePoint[2])).slice(-6) == black);
		document.getElementById("numberLined").checked = isUnderlined;
		
		// Snake Code
		var snakeCodeX = 3;
		var snakeCodeYtop = 328;
		var snakeCodeYbot = 338;
		var snakeCodeXEnd = 160;
		
		var snakeCode = [];
		var possibleValues = [" ",".","|","'",":"];
		
		var currentSnakeX = snakeCodeX;
		while(currentSnakeX < snakeCodeXEnd){
			
			var topPoint = ctx.getImageData(currentSnakeX,snakeCodeYtop, 1, 1).data;
			var midPoint = ctx.getImageData(currentSnakeX,snakeCodeYtop + 5, 1, 1).data;
			var botPoint = ctx.getImageData(currentSnakeX,snakeCodeYbot, 1, 1).data;
			
			ctx.fillRect(currentSnakeX, snakeCodeYtop,1,1);
			ctx.fillRect(currentSnakeX, snakeCodeYtop+5,1,1);
			ctx.fillRect(currentSnakeX, snakeCodeYbot,1,1);
			
			var topBlack = ("#" + ("000000" + rgbToHex(topPoint[0], topPoint[1], topPoint[2])).slice(-6) == black);
			var midBlack = ("#" + ("000000" + rgbToHex(midPoint[0], midPoint[1], midPoint[2])).slice(-6) == black);
			var botBlack = ("#" + ("000000" + rgbToHex(botPoint[0], botPoint[1], botPoint[2])).slice(-6) == black);
			
			if(!topBlack && !botBlack && !midBlack){
				snakeCode.push(" ");
			}else if(!topBlack && !midBlack && botBlack){
				snakeCode.push(".");
			}else if(topBlack && midBlack && botBlack){
				snakeCode.push("|");
			}else if(topBlack && !midBlack && !botBlack){
				snakeCode.push("'");
			}else if(topBlack && !midBlack && botBlack){
				snakeCode.push(":");
			}
			currentSnakeX++;
		}
		
		document.getElementById("snakeCode").value = removeCusecontiveDuplicates(snakeCode).join("");
		
		// Chiffres
		var chifferCanvas = document.getElementById("chifferCanvas");
		var chifferSubImg = ctx.getImageData(0, 0, 170, 30);
		
		var chifferCtx = chifferCanvas.getContext("2d");
		chifferCtx.putImageData(chifferSubImg, 0, 0);
		
		var chifferImg = new Image();
		chifferImg.id = "pic";
		chifferImg.src = chifferCanvas.toDataURL();
		document.getElementById("chifferImg").src = chifferImg.src;

		Tesseract.recognize(chifferImg.src, {
			lang: 'fra'
		})
		.then(function(result){
			var theNumber = result.text.split("\n")[0].split(" ").join("");
			console.log(theNumber);
			document.getElementById("number").value = theNumber;
		})
	};
	
	fillForm(playlistInfo);
}

function removeCusecontiveDuplicates(array){
	var ret = [array[0]];
	for(var i=0;i<array.length;i++){
		if(ret[ret.length-1] != array[i]){
			ret.push(array[i]);
		}
	}
	return ret;
}

function fillForm(playlistInfo){
	document.getElementById("name").value = playlistInfo.name;
	document.getElementById("number").value = playlistInfo.img.number;
	document.getElementById("snakeCode").value = playlistInfo.img.snakeCode;
	document.getElementById("numberLined").checked = playlistInfo.img.underlined == true;
	
	if(playlistInfo.img.picture!=null){
		document.getElementById("hatSelect").value = playlistInfo.img.picture.hat;
		document.getElementById("eyeSelect").value = playlistInfo.img.picture.eye;
		document.getElementById("humanSelect").value = playlistInfo.img.picture.human;
		document.getElementById("mouthSelect").value = playlistInfo.img.picture.mouth;
	}
	
	//document.getElementById("gridColorSelect").value = playlistInfo.img.grid.color;
}

function buildGridCodeTable(gridInfo){
	var grid = document.getElementById("gridCode");
	grid.innerHTML = "";
	for(var y = 0; y < 4 ; y++){
		var row = document.createElement("tr");
		for(var x = 0; x < 4 ; x++){
			var cell = document.createElement("td");
			var piece = document.createElement("input");
			piece.setAttribute("type","button");
			if(gridInfo && gridInfo.code){
				piece.value = gridInfo.code[y][x];
			}
			
			piece.style.background="url('./res/grid_"+piece.value+".png')";
			piece.style.width = "55px";
			piece.style.height = piece.style.width;
			piece.setAttribute("id", y+":"+x);
			
			piece.onclick = function(){
				this.value++;
				if(this.value >= GRID_CODE_NB_VALUES){
					this.value = 0;
				}
				this.style.background="url('./res/grid_"+this.value+".png')";
			};
			
			cell.appendChild(piece);
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
			var buttVal = document.getElementById(y+":"+x).value;
			row.push(buttVal);
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

function fillWithZeros(inte,cCount){
	var str = ""+inte;
	while(str.length < cCount){
		str = "0"+str;
	}
	return str;
}
function rgbToHex(r, g, b) {
    if (r > 255 || g > 255 || b > 255)
        throw "Invalid color component";
    return ((r << 16) | (g << 8) | b).toString(16);
}
function findPos(obj) {
    var curleft = 0, curtop = 0;
    if (obj.offsetParent) {
        do {
            curleft += obj.offsetLeft;
            curtop += obj.offsetTop;
        } while (obj = obj.offsetParent);
        return { x: curleft, y: curtop };
    }
    return undefined;
}