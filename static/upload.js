var inputElement = document.getElementById("filePick2");
inputElement.addEventListener("change", handleFiles, false);
function handleFiles(obj) {
  var fdesc = document.getElementById("fdesc")
  for (var n = 0; n < obj.files.length  ; n++) {
    fdesc.innerHTML += '<h5> File ' + (n+1) + '</h5> <b> Name </b>' + obj.files[n].name + '<br> <b>Size</b> '+ (obj.files[n].size/1024).toFixed(1) + ' KB <br> Description: <input type="text" class="form-control" name="username">';
  }
}

var osCategoryFlag = document.getElementById("oscategory");
var langdiv = document.getElementById('language');
inputElement.addEventListener("click", toggleLanguage, false);
function toggleLanguage(obj){
	if (osCategoryFlag.checked)
		langdiv.style.display = "block"
	else
		langdiv.style.display = "none"
}


function handleSS(obj) {
	console.log("Screenshots selected")
}