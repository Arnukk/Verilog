document.getElementById("ParseVerilog").addEventListener("click", ParsetoGojs);

// Verilog parser class
var VerilogParser = function (input) {
  this.input = input;
  this.status;
  this.elements = new Array();
  this.ContentBegin = "";
  this.ContentEnd = "";
};

VerilogParser.prototype.linewalker = function(element, index, array) {
	switch(index) {
		case 0:
			this.ContentBegin = element;
			break;
		case array.length-1:
			this.ContentEnd = element;
			break;
		default:
			this.elements.push(element);
	}
}

VerilogParser.prototype.RaiseError = function(type, code, message) {
	alert(type + " Error (" + code + "): " + message);
	return false;
}

VerilogParser.prototype.parse = function() {
	//iterate through input array
	this.input.forEach(this.linewalker.bind(this));
	//check if the beginning and end of the verilog code is fine
	if (this.ContentBegin.match(/module/g) && this.ContentEnd.match(/endmodule/g)){
		alert("ok");
	}else{
		this.RaiseError("Parsing",0, "Invalid Verilog input file. Missing beginning and/or ending statements.");
	}

}

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
