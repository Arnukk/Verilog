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
  this.ElementsCollection = new Array();
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
	if (element.match(/input/g)){
		element = element.replace(/input/g,"").replace(/(\r\n|\n|\r)/gm,"").trim().split(",");
		this.InputElement.push.apply(this.InputElement, element);
	}else if (element.match(/output/g)){
		element = element.replace(/output/g,"").replace(/(\r\n|\n|\r)/gm,"").trim().split(",");
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
		var components = array[0].trim().split(/(\d)/g).filter(function(el) {return el.length != 0;}), component = components[0], portsQTY = components[1];
		var name = array[1].trim();
		this.ElementsCollection.push(new this.LogicElement(component, name, (portsQTY == 2 ? component : component + portsQTY), portsQTY, inputwires, outputwires));
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



VerilogParser.prototype.parse = function() {
	//iterate through input content
	this.input.forEach(this.linewalker.bind(this));
	//check if the beginning and end of the verilog code is fine
	if (this.ContentBegin.match(/module/g) && this.ContentEnd.match(/endmodule/g)){
		try {
			//iterate through the input body
			this.ContentBody.forEach(this.elementfinder.bind(this));
			alert(JSON.stringify(this.ElementsCollection[0]));
		}catch(err) {
		    this.RaiseStatusMessage("b");
		}

	}else{
		this.RaiseError("Parsing",0, "Invalid Verilog input file. Missing beginning and/or ending statements.");
	}

};

//Cleans the array from "falsy" values
function cleanArray(actual){
  var newArray = new Array();
  for(var i = 0; i<actual.length; i++){
      if (actual[i]){
        newArray.push(actual[i]);
    }
  }
  return newArray;
}


function downloadDiagram(){
	var canvas = document.getElementById("myDiagram").getElementsByTagName("Canvas")[0];
	var context = canvas.getContext('2d');
	var w = canvas.width;
    var h = canvas.height;
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
	img = new Image();
	img.src = imgData;
	document.body.appendChild(img);
	canvas.width = w;
	canvas.height = h;
    context.drawImage(img, 0, h*0.2, w, 0.8*h, 0, 0, w, 0.8*h);
	data = context.getImageData(0, 0, w, h);
	//store the current globalCompositeOperation
	var compositeOperation = context.globalCompositeOperation;
	//set to draw behind current content
	context.globalCompositeOperation = "destination-over";
	//set background color
	context.fillStyle = "white";
	//draw background / rect on entire canvas
	context.fillRect(0,0,w,h);
	var newimgData = canvas.toDataURL("image/jpeg", 1.0);
	img = new Image();
	img.src = newimgData;
	document.body.appendChild(img);
	var pdf = new jsPDF('landscape');
	pdf.addImage(img, 'JPEG', 0, 0);
	pdf.save("download.pdf");

}
function ParsetoGojs() {
	// Trim the line breaks and white spaces and then split by a common delimiter for Verilog files 
	VerilogInput = document.getElementById("verilogInputfile").value.replace(/(\r\n|\n|\r)/gm,"").trim().split(";");
	VerilogInput = cleanArray(VerilogInput);
	// Check if we are going to parse not an empty text
	if (typeof VerilogInput != "undefined" && VerilogInput != null && VerilogInput.length > 0){
		var Gojs = new VerilogParser(VerilogInput);
		Gojs.parse();
	}
	

}
