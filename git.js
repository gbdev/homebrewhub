const exec = require('child_process').exec
const testscript = exec('sh database/pull.sh');

testscript.stdout.on('data', function(data){
    console.log("Finished")
    console.log(data); 
    // sendBackInfo();
});

testscript.stderr.on('data', function(data){
    console.log("Error")
    console.log(data);
    
});