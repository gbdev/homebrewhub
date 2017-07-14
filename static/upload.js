var inputElement = document.getElementById("filePick2");
inputElement.addEventListener("change", handleFiles, false);
function handleFiles(obj) {
  var fdesc = document.getElementById("fdesc")
  for (var n = 0; n < obj.files.length  ; n++) {
    fdesc.innerHTML += '<h5> File ' + (n+1) + '</h5> <b> Name </b>' + obj.files[n].name + '<br> <b>Size</b> '+ (obj.files[n].size/1024).toFixed(1) + ' KB <br> Description: <input type="text" class="form-control" name="username">';
  }
}

function handleSS(obj) {
	console.log("Screenshots selected")
}

var tags = new Awesomplete('input[data-multiple]', {
	minChars: 0,
	filter: function(text, input) {
		return Awesomplete.FILTER_CONTAINS(text, input.match(/[^,]*$/)[0]);
	},

	item: function(text, input) {
		return Awesomplete.ITEM(text, input.match(/[^,]*$/)[0]);
	},

	replace: function(text) {
		var before = this.input.value.match(/^.+,\s*|/)[0];
		this.input.value = before + text + ", ";
	}
});

tags.open();