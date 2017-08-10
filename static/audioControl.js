var muted = 1;
var old_vol = 0.5;

function toggleAudio() {
    var p = document.getElementById("audioRange")
    if (muted) {
        document.getElementById("audiostatus").innerHTML = '<i class="fa fa-2x fa-volume-up" aria-hidden="true"></i>'
        if (old_vol == 0)
            old_vol = 0.1
        XAudioJSVolume = old_vol;
        p.value = XAudioJSVolume;
        muted = 0;


    } else {
        document.getElementById("audiostatus").innerHTML = '<i class="fa fa-2x fa-volume-off" aria-hidden="true"></i>'
        old_vol = XAudioJSVolume;
        XAudioJSVolume = 0;
        p.value = 0;
        muted = 1;
    }

}

function audioRangeHandler() {
    var p = document.getElementById("audioRange")
    p.addEventListener("input", function() {
        XAudioJSVolume = p.value;
        muted = 0;
        document.getElementById("audiostatus").innerHTML = '<i class="fa fa-2x fa-volume-up" aria-hidden="true"></i>'
        if (p.value == 0) {
            document.getElementById("audiostatus").innerHTML = '<i class="fa fa-2x fa-volume-off" aria-hidden="true"></i>'
        }
    }, false);
}