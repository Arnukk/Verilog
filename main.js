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
  //Elements sizing and canvas coordinates
  this.IOsize = 30;
  this.LogicElementSize = 60;
  this.canvas = document.getElementById("myDiagram").getElementsByTagName("Canvas")[0];
  this.CanvasWidth = this.canvas.width;
  this.CanvasHeight = this.canvas.height;
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
			this.WireElement.push.apply(this.WireElement, element.map( function(item) { return item.trim();} ));
		}else{
			var array = element.replace(/(\r\n|\n|\r)/gm,"").trim().split("(");
			var relations = array[1].replace(')','').trim().split(",").filter(function(el) {return el.length != 0;});
			var outputwires = relations.slice(-1)[0].trim();
			var inputwires = relations.slice(0, -1).map( function(item) { return item.trim();} ); 
			array = array[0].trim().split(" ").filter(function(el) {return el.length != 0;});
			var components = array[0].trim().split(/(\d)/g).filter(function(el) {return el.length != 0;}), component = components[0], portsQTY = (components[1] ? components[1]: 1);
			var name = array[1].trim();
			this.ElementsCollection.push(new this.LogicElement(component, name, (portsQTY == 2 || portsQTY == 1) ? component : component + portsQTY, portsQTY, inputwires, outputwires));
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


//Helper function for creating KLAY object childs
VerilogParser.prototype.KlayObjectCreator = function(element, index, array) {
	var KlayChildElement = new Object();
	KlayChildElement.id = element["name"];
	KlayChildElement.width = (element["category"] == "input" || element["category"] == "output")? this.IOsize : this.LogicElementSize ;
	KlayChildElement.height = KlayChildElement.width;
	KlayChildElement.spacing = (element["category"] == "input" || element["category"] == "output")? 10 : 70 ;
	return KlayChildElement;
};
//-------------------------------------------------


//Helper function for creating KLAY object edges  
VerilogParser.prototype.KlayConnectorCreator = function(element, index, array) {
	var KlayEdgeElement = new Object();
	KlayEdgeElement.id = element["from"] + element["to"]  + element["toPort"];
	KlayEdgeElement.source = element["from"];
	KlayEdgeElement.target = element["to"];
	return KlayEdgeElement;
};
//-------------------------------------------------


//Helper function for applying obtained locations to GOJS graph
VerilogParser.prototype.GOjsElementLocator = function(self, element, index, array) {
	var Xscaler = 0 - Math.round(self.CanvasWidth*0.9/2);
	var Yscaler = 0 - Math.round(self.CanvasHeight*0.9/2);
	self.GojsDiagramModel.nodeDataArray[index].loc = (element["x"] + Xscaler) + " " + (element["y"] + Yscaler);
};

//Init Klay algorithm class 
VerilogParser.prototype.klayinit = function(Klaygraph, self) {
	// execute the layout 
	$klay.layout({
		graph: Klaygraph,
		options: {
			spacing: 70,
			intCoordinates:false,
			direction: "RIGHT",
			edgeRouting: "ORTHOGONAL",
			nodeLabelPlacement:"V_TOP",
			portConstraints:"FIXED_POS",
			thoroughness:20,
			crossMin:"LAYER_SWEEP"
		},
		success: function(layouted) {
			console.log(layouted);
			layouted.children.forEach(self.GOjsElementLocator.bind(this, self));
		}
	});
};
//-------------------------------------------------

//Helper function for locating elements 
VerilogParser.prototype.locateElements = function() {
		var Klaygraph = new Object();
		Klaygraph.children = new Array();
		Klaygraph.children.push.apply(Klaygraph.children, this.GojsDiagramModel.nodeDataArray.map(this.KlayObjectCreator.bind(this)));
		Klaygraph.edges = new Array();
		Klaygraph.edges.push.apply(Klaygraph.edges, this.GojsDiagramModel.linkDataArray.map(this.KlayConnectorCreator.bind(this)));
		try{
			this.klayinit(Klaygraph, this);
		}catch(err) {
			this.RaiseError("Locating",2, "Something went wrong while locating the elements.");
		};
};
//-----------------------------------------


//Helper function for identifying elements that has connections with each other
VerilogParser.prototype.isConnectedToElement = function(thearray, element, index, array) {
	var tempindex  = (thearray.indexOf(element) != -1 ) ? thearray.indexOf(element) : thearray.indexOf(element.toUpperCase());
	return (tempindex != -1 ) ? [element,tempindex+1]: "";
};
//-----------------------------------------


//Helper function for creating GOjs Diagram main logic elements (i.e. not input and output elements)
VerilogParser.prototype.GojsDiagramModelHelper = function(element, index, array) {
	var LogicElement = new Object();
	for (var property in element) {
		switch(property) {
			case "Gojsname":
				LogicElement.category = element[property];
				break;
			case "Name":
				LogicElement.name = element[property];
				LogicElement.key = element[property];
				break;
		} 
	}
	return LogicElement;
};
//---------------------------


//Helper function for creating GOjs Diagram input/output elements
VerilogParser.prototype.GojsDiagramIOElementHelper = function(element, index, array) {

	if (JSON.stringify(array) == JSON.stringify(this.InputElement))
	{
		var InputElement = new Object();
		InputElement.category = "input";
		InputElement.key = element;
		InputElement.name = element;
		return InputElement;
	}else{
		var OutputElement = new Object();
		OutputElement.category = "output";
		OutputElement.key = element;
		OutputElement.name = element;
		return OutputElement;
	}

};
//--------------------------------


// Helper function for conencting to Input elements
VerilogParser.prototype.ConnectToInputElements = function(TheElement, element, index, array) {
	var Link = new Object();
	Link.from = element[0];
	Link.fromPort = "out";
	Link.to = TheElement["Name"];
	Link.toPort = (TheElement["portsQTY"] == 1)? "in": "in" + element[1];
	return Link;
};
//---------------------------------------------



//Helper function for identifying the Logic element that takes the wire as a function
VerilogParser.prototype.findtoLogicOutput = function(Wire, element, index, array) {
	var regSearch = new RegExp(Wire, 'gi');
	return (element["Outputwires"].match(regSearch)) ? element["Name"]: "";
};
//-----------------------------------------


//Helper function for connecting Logic elements
VerilogParser.prototype.ConnectLogicElements = function(TheElement, element, index, array) {
	var Link = new Object();
	var temp = this.ElementsCollection.filter(function(el,ind){ return TheElement["Name"] != el["Name"];}).map(this.findtoLogicOutput.bind(this, element[0]));
	Link.from = temp.filter(function(el){ return el.length != 0;})[0];
	Link.fromPort = "out";
	Link.to = TheElement["Name"];
	Link.toPort = (TheElement["portsQTY"] == 1)? "in": "in" + element[1];
	return Link;
};
//-----------------------------------------

// Helper function for conencting to Output elements
VerilogParser.prototype.ConnecttoOutputElements = function(TheElement, element, index, array) {
	var Link = new Object();
	Link.from = TheElement["Name"];
	Link.fromPort = "out";
	Link.to = element[0];
	Link.toPort = "in";
	return Link;
};
//---------------------------------------------

// Helper function for conencting elements
VerilogParser.prototype.GojsDiagramElementConnector = function(element, index, array) {
		//Check if should be connected to an input element
		var isConnected = this.InputElement.map(this.isConnectedToElement.bind(this, element["Inputwires"])).filter(function(el) {return el.length != 0; });
		this.GojsDiagramModel.linkDataArray.push.apply(this.GojsDiagramModel.linkDataArray, isConnected.map(this.ConnectToInputElements.bind(this, element)));
		// otherwise if connected to other element except output element
		var isLogicConnected = this.WireElement.map(this.isConnectedToElement.bind(this, element["Inputwires"])).filter(function(el) {return el.length != 0; });
		//look to which logic element output is goint the wire
		this.GojsDiagramModel.linkDataArray.push.apply(this.GojsDiagramModel.linkDataArray, isLogicConnected.map(this.ConnectLogicElements.bind(this, element)));
		//Otherwise the wire is an output
		var isOutputConnected = this.OutputElement.map(this.isConnectedToElement.bind(this, element["Inputwires"])).filter(function(el) {return el.length != 0; });
		this.GojsDiagramModel.linkDataArray.push.apply(this.GojsDiagramModel.linkDataArray, isOutputConnected.map(this.ConnectLogicElements.bind(this, element)));
		// Lastly, connect the logic elements to the output elements itself
		var isConnectedWithOutputElement = this.OutputElement.map(this.isConnectedToElement.bind(this, element["Outputwires"])).filter(function(el) {return el.length != 0; });
		this.GojsDiagramModel.linkDataArray.push.apply(this.GojsDiagramModel.linkDataArray, isConnectedWithOutputElement.map(this.ConnecttoOutputElements.bind(this, element)));
};
//-----------------------------------

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
	// From here we start connecting the elements
	this.GojsDiagramModel.linkDataArray = new Array();
	this.ElementsCollection.forEach(this.GojsDiagramElementConnector.bind(this));
	//From here goes the positioning algorithm
	this.locateElements();
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
			var JsonGojs = this.createGojsDiagramModel();
			//Write to textarea
			document.getElementById('mySavedModel').value = JsonGojs;
		}catch(err) {
		    this.RaiseError("Unexpected",911, "Something went wrong when connecting the elements. Please double-check the Verilog input file.");
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



// Exporting Diagram to a file, first clipping the watermark
function downloadDiagram(Format){
	var canvas = document.getElementById("myDiagram").getElementsByTagName("Canvas")[0];
	var context = canvas.getContext('2d');
	var w = canvas.width;
    var h = canvas.height;
	//get the current ImageData for the canvas.
	var data = context.getImageData(0, 0, w, h);
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
	var img = new Image();
	img.src = imgData;
	document.body.appendChild(img);
	var exportFormat = document.getElementById("exportFormat").value;
	switch(exportFormat) {
		case "jpg":
			var a = document.createElement('a');
			a.href = imgData;
			a.download = "output.jpg";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			break;
		case "pdf":
			var pdf = new jsPDF('landscape');
			pdf.addImage(img, 'JPEG', 0, 0);
			pdf.save("download.pdf");
			break;
	};
	document.body.removeChild(img);
};
//-----------------------



function ParsetoGojs() {
	// Trim the line breaks and white spaces and then split by a common delimiter for Verilog files 
	var VerilogInput = document.getElementById("verilogInputfile").value.replace(/(\r\n|\n|\r)|(\/\/(.*)$)/gm,"").trim().split(";");
	VerilogInput = cleanArray(VerilogInput);
	// Check if we are going to parse not an empty text
	if (typeof VerilogInput != "undefined" && VerilogInput != null && VerilogInput.length > 0){
		var Gojs = new VerilogParser(VerilogInput);
		Gojs.parse();
		//Once the parsing is done draw the model
		document.getElementById("loadModel").click();
	}
};
