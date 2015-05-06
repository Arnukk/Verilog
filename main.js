// Declare button listeners
document.getElementById("ParseVerilog").addEventListener("click", ParsetoGojs);
document.getElementById("exportModel").addEventListener("click", downloadDiagram);


// Verilog parser class
var VerilogParser = function (input) {
  this.input = input;
  this.status;
  this.ContentBody = new Array();
  this.ContentBegin;
  this.ContentEnd;
  this.InputElement = new Array();
  this.OutputElement = new Array();
  this.WireElement = new Array();
  this.LogicElement = function(Type, Name, Gojsname, ports, Inputwires, Outputwires, Location) {
	  this.Type = Type;
	  this.Name = Name;
	  this.Gojsname = Gojsname;
	  this.portsQTY = ports;
	  this.Inputwires = Inputwires;
	  this.Outputwires = Outputwires;
	  this.Location = Location;
  };
  this.GojsDiagramModel = new Object();
  this.ElementsCollection = new Array();
  //Coordinates for the diagram
  this.Leftmost = -590;
  this.Rightmost = 280;
  this.Middle = 50;
  this.InputElementSize = 30;
  this.InputElementSizeBetween = 0.5 * this.InputElementSize + 8;
  this.LastInsertedElementPositionX;
  this.LastInsertedElementPositionY;
  this.ElementBetweenSize = 60;
};

//This loop goes through the input content and identifies beginning, end and body of the input
VerilogParser.prototype.linewalker = function(element, index, array) {
	switch(index) {
		case 0:
			this.ContentBegin = element;
			break;
		case array.length-1:
			this.ContentEnd = element;
			break;
		default:
			this.ContentBody.push(element);
	}
};
//---------------------------------------------------------

//This loop goes through the input body and identifies elements
VerilogParser.prototype.elementfinder = function(element, index, array) {
	try {
		if (element.match(/input/g)){
			element = element.replace(/input/g,"").replace(/(\r\n|\n|\r)/gm,"").trim().split(",");
			element = element.map(function(el) {return el.trim();});
			this.InputElement.push.apply(this.InputElement, element);
		}else if (element.match(/output/g)){
			element = element.replace(/output/g,"").replace(/(\r\n|\n|\r)/gm,"").trim().split(",");
			element = element.map(function(el) {return el.trim();});
			this.OutputElement.push.apply(this.OutputElement, element);
		}else if(element.match(/wire/g)){
			element = element.replace(/wire/g,"").replace(/(\r\n|\n|\r)/gm,"").trim().split(",");
			this.WireElement.push.apply(this.WireElement, element);
		}else{
			var array = element.replace(/(\r\n|\n|\r)/gm,"").trim().split("(");
			var relations = array[1].replace(')','').trim().split(",").filter(function(el) {return el.length != 0;});
			var outputwires = relations.slice(-1)[0].trim();
			var inputwires = relations.slice(0, -1).map( function(item) { return item.trim()} ); 
			array = array[0].trim().split(" ").filter(function(el) {return el.length != 0;});
			var components = array[0].trim().split(/(\d)/g).filter(function(el) {return el.length != 0;}), component = components[0], portsQTY = (components[1] ? components[1]: "") ;
			var name = array[1].trim();
			this.ElementsCollection.push(new this.LogicElement(component, name, (portsQTY == 2 ? component : component + portsQTY), portsQTY, inputwires, outputwires));
		}
	}catch(err) {
		this.RaiseError("Parsing",1, "Unable to identify one or more logic elements. Please double-check the Verilog input file. ");
	}
};
//------------------------

// Error console
VerilogParser.prototype.RaiseError = function(Type, code, message) {
	alert(Type + " Error (" + code + "): " + message);
	return false;
};
//--------------------------------------


// Status console
VerilogParser.prototype.RaiseStatusMessage = function(status, message) {
	alert(message);
	return false;
};
//---------------------------


//Helper function for identifying elements that has connections with input elements
VerilogParser.prototype.isConnectedToInputElement = function(thearray, element, index, array) {
	console.log(element);
	console.log(thearray);
	return (thearray.indexOf(element) != -1 || thearray.indexOf(element.toUpperCase()) != -1 ) ? element: "";
};
//-----------------------------------------


//Helper function for creating GOjs Diagram main logic elements
VerilogParser.prototype.GojsDiagramModelHelper = function(element, index, array) {
	var LogicElement = new Object();
	for (var property in element) {
		switch(property) {
			case "Gojsname":
				LogicElement.category = element[property];
				LogicElement.key = element[property];
				break;
			case "Name":
				LogicElement.name = element[property];
				break;
			case "Location":
				//Check if is the element that requires to be connected to the input element
				var isConnected = this.InputElement.map(this.isConnectedToInputElement.bind(this, element["Inputwires"]));
				console.log(isConnected.filter(function(el) {return el.length != 0;}).length);
				switch(isConnected.filter(function(el) {return el.length != 0;}).length){
					case 2:
						//If there are other input elements put them more down
						console.log(this.GojsDiagramModel);
						break;
					case 1:
						break;
					default:
						break;
				};
				
				var randnumber = Math.floor(Math.random() * 200) + 1;
				LogicElement.loc =  randnumber + " " + randnumber;
				break;
		} 
	}
	return LogicElement;
};
//---------------------------


//Helper function for creating GOjs Diagram input/output elements and positioning
VerilogParser.prototype.GojsDiagramIOElementHelper = function(element, index, array) {

	if (JSON.stringify(array) == JSON.stringify(this.InputElement))
	{
		var InputElement = new Object();
		InputElement.category = "input";
		InputElement.key = "input";
		InputElement.name = element;
		var LocY = (index == 0? this.Middle: this.LastInsertedElementPositionY + this.InputElementSizeBetween);
		InputElement.loc = this.Leftmost + " " + LocY;
		this.LastInsertedElementPositionX = this.Leftmost;
		this.LastInsertedElementPositionY = LocY;
		return InputElement;
	}else{
		var OutputElement = new Object();
		OutputElement.category = "output";
		OutputElement.key = "output";
		OutputElement.name = element;
		var LocX = (typeof  this.LastInsertedElementPositionX === "undefined" ? this.Rightmost: this.LastInsertedElementPositionX + this.ElementBetweenSize);
		var LocY = (index == 0? this.Middle: this.Middle + (index+0.5)*this.InputElementSize);
		OutputElement.loc = LocX + " " + LocY;
		return OutputElement;
	}

};
//--------------------------------

// Translates the object with verilog elements to Gojs model
VerilogParser.prototype.createGojsDiagramModel = function() {
	
	this.GojsDiagramModel.class = "go.GraphLinksModel";
	this.GojsDiagramModel.linkFromPortIdProperty = "fromPort";
	this.GojsDiagramModel.linkToPortIdProperty = "toPort";
	this.GojsDiagramModel.nodeDataArray = new Array();
	//Firstly lets draw and position Input elements
	this.GojsDiagramModel.nodeDataArray.push.apply(this.GojsDiagramModel.nodeDataArray, this.InputElement.map(this.GojsDiagramIOElementHelper.bind(this)));
	// Secondly lets draw and position logic elements
	this.GojsDiagramModel.nodeDataArray.push.apply(this.GojsDiagramModel.nodeDataArray, this.ElementsCollection.map(this.GojsDiagramModelHelper.bind(this)));
	//Add lastly the output elements
	this.GojsDiagramModel.nodeDataArray.push.apply(this.GojsDiagramModel.nodeDataArray, this.OutputElement.map(this.GojsDiagramIOElementHelper.bind(this)));
	
	return JSON.stringify(this.GojsDiagramModel, null, 4);
	
};
//---------------------------------


// The main parser function
VerilogParser.prototype.parse = function() {
	//iterate through input content
	this.input.forEach(this.linewalker.bind(this));
	//check if the beginning and end of the verilog code is fine
	if (this.ContentBegin.match(/module/g) && this.ContentEnd.match(/endmodule/g)){
		try {
			//iterate through the input body
			this.ContentBody.forEach(this.elementfinder.bind(this));
			//creates Gojs object which we will translate to JSON later on
			JsonGojs = this.createGojsDiagramModel();
			//alert(JsonGojs);
			//Write to textarea
			document.getElementById('mySavedModel').value = JsonGojs;
		}catch(err) {
		    this.RaiseStatusMessage("b");
		}

	}else{
		this.RaiseError("Parsing",0, "Invalid Verilog input file. Missing beginning and/or ending statements.");
	}

};
//---------------------------

//Cleans the array from "falsy" values
function cleanArray(actual){
  var newArray = new Array();
  for(var i = 0; i<actual.length; i++){
      if (actual[i]){
        newArray.push(actual[i]);
    }
  }
  return newArray;
};


// Download helper function
function downloadHelper(context, canvas, w, h){
	//get the current ImageData for the canvas.
	data = context.getImageData(0, 0, w, h);
	//store the current globalCompositeOperation
	var compositeOperation = context.globalCompositeOperation;
	//set to draw behind current content
	context.globalCompositeOperation = "destination-over";
	//set background color
	context.fillStyle = "white";
	//draw background / rect on entire canvas
	context.fillRect(0,0,w,h);
	// only jpeg is supported by jsPDF
	var imgData = canvas.toDataURL("image/jpeg", 1.0);
	return imgData;
};
//-------------------------


// Exporting Diagram to a file, first clipping the watermark
function downloadDiagram(Format){
	var canvas = document.getElementById("myDiagram").getElementsByTagName("Canvas")[0];
	var context = canvas.getContext('2d');
	var w = canvas.width;
    var h = canvas.height;
	imgData = downloadHelper(context, canvas, w, h);
	img = new Image();
	img.src = imgData;
	img.width  = w *4;
	img.height = h*4;
	document.body.appendChild(img);
	canvas.width = w;
	canvas.height = h;
    context.drawImage(img, 0, h*0.2, w, 0.8*h, 0, 0, w, 0.8*h);
	document.body.removeChild(img);
	newimgData = downloadHelper(context, canvas, w, h);
	img = new Image();
	img.src = newimgData;
	document.body.appendChild(img);
	var exportFormat = document.getElementById("exportFormat").value;
	switch(exportFormat) {
		case "jpg":
			var a = document.createElement('a');
			a.href = newimgData;
			a.download = "output.jpg";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			break;
		case "pdf":
			var pdf = new jsPDF('landscape');
			pdf.addImage(img, 'JPEG', 0, 0);
			document.body.removeChild(img);
			pdf.save("download.pdf");
			break;
	}
	

};
//-----------------------



function ParsetoGojs() {
	// Trim the line breaks and white spaces and then split by a common delimiter for Verilog files 
	VerilogInput = document.getElementById("verilogInputfile").value.replace(/(\r\n|\n|\r)/gm,"").trim().split(";");
	VerilogInput = cleanArray(VerilogInput);
	// Check if we are going to parse not an empty text
	if (typeof VerilogInput != "undefined" && VerilogInput != null && VerilogInput.length > 0){
		var Gojs = new VerilogParser(VerilogInput);
		Gojs.parse();
		//Once the parsing is done draw the model
		document.getElementById("loadModel").click();
	}
	

};
