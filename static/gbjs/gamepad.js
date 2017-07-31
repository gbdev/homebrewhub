"use strict";

class GamePad {
  get _dPadFrame() {
    const padding = 15;
    const size = this.size.height - padding * 2;
    
    return {
      "x" : padding,
      "y" : padding,
      "width" : size,
      "height" : size,
      "right" : padding + size,
      "bottom" : padding + size,
      "center" : {
        "x" : padding + size / 2,
        "y" : padding + size / 2
      }
    };
  }
  
  get _selectFrame() {
    const size = { "width" : 40, "height" : 20 };
    
    const frame = {
      "x" : (this.size.width / 2) - (size.width + 7),
      "y" : this.size.height - (size.height + 20),
      "width" : size.width,
      "height" : size.height,
    }
    
    frame.center = { "x" : frame.x + frame.width / 2, "y" : frame.y + frame.height / 2 };
    
    return frame;
  }
  
  get _startFrame() {
    const size = { "width" : 40, "height" : 20 };
    const frame = {
      "x" : (this.size.width / 2) + 7,
      "y" : this.size.height - (size.height + 20),
      "width" : size.width,
      "height" : size.height
    }
    
    frame.center = { "x" : frame.x + frame.width / 2, "y" : frame.y + frame.height / 2 };
    
    return frame;
  }
  
  get _bOrigin() {
    return {
      "x" : this.size.width * 0.75,
      "y" : this.size.height * 0.6
    };
  }
  
  get _aOrigin() {
    return {
      "x" : this.size.width * 0.9,
      "y" : this.size.height * 0.4
    };
  }
  
  constructor(canvas) {
    if(("ontouchstart" in document.documentElement) == false) {
      canvas.style.display = "none";
    }
    
    this.supportsDiagonal = true;
    
    this.state = {
      "up" : false,
      "right" : false,
      "down" : false,
      "left" : false,
      "select" : false,
      "start" : false,
      "b" : false,
      "a" : false
    }
    
    this._dPadTouchID = null;
    this._selectTouchID = null;
    this._startTouchID = null;
    this._baTouchID = null;
    
    this.size = { "width" : canvas.width, "height" : canvas.height };
    this.context = canvas.getContext("2d");
    
    this._draw();
    
    canvas.addEventListener("touchstart", (event) => {
      event.preventDefault();
      
      for(let index = 0; index < event.changedTouches.length; index++) {
        const touch = event.changedTouches[index];
        const target = touch.target;
        
        const control = this._controlAt(touch.pageX - target.offsetLeft, touch.pageY - target.offsetTop);
        if(control != null) {
          if(control == "dpad") {
            if(this._dPadTouchID == null) {
              this._dPadTouchID = touch.identifier;
              this._updateDPad(touch.pageX - target.offsetLeft, touch.pageY - target.offsetTop);
            }
          } else if(control == "select") {
            if(this._selectTouchID == null) {
              this._selectTouchID = touch.identifier;
              this._down("select");
            }
          } else if(control == "start") {
            if(this._startTouchID == null) {
              this._startTouchID = touch.identifier;
              this._down("start");
            }
          } else if(control == "b" || control == "a") {
            if(this._baTouchID == null) {
              this._baTouchID = touch.identifier;
              this._updateBA(touch.pageX - target.offsetLeft, touch.pageY - target.offsetTop);
            }
          }
        }
      }
    }, false);
    
    canvas.addEventListener("touchmove", (event) => {
      event.preventDefault();
      for(let index = 0; index < event.changedTouches.length; index++) {
        const touch = event.changedTouches[index];
        const target = touch.target;
        
        if(touch.identifier == this._dPadTouchID) {
          this._updateDPad(touch.pageX - target.offsetLeft, touch.pageY - target.offsetTop);
        } else if(touch.identifier == this._baTouchID) {
          this._updateBA(touch.pageX - target.offsetLeft, touch.pageY - target.offsetTop);
        }
      }
    }, false);
    
    canvas.addEventListener("touchend", (event) => {
      event.preventDefault();
      
      for(let index = 0; index < event.changedTouches.length; index++) {
        const touch = event.changedTouches[index];
        
        if(touch.identifier == this._dPadTouchID) {
          this._dPadTouchID = null;
          this._up("left");
          this._up("right");
          this._up("down");
          this._up("up");
        } else if(touch.identifier == this._selectTouchID) {
          this._selectTouchID = null;
          this._up("select");
        } else if(touch.identifier == this._startTouchID) {
          this._startTouchID = null;
          this._up("start");
        } else if(touch.identifier == this._baTouchID) {
          this._baTouchID = null;
          this._up("b");
          this._up("a");
        }
      }
    }, false);
    
    canvas.addEventListener("touchcancel", (event) => {
      event.preventDefault();
      
      for(let index = 0; index < event.changedTouches.length; index++) {
        const touch = event.changedTouches[index];
        
        if(touch.identifier == this._dPadTouchID) {
          this._dPadTouchID = null;
          this._up("left");
          this._up("right");
          this._up("down");
          this._up("up");
        } else if(touch.identifier == this._selectTouchID) {
          this._selectTouchID = null;
          this._up("select");
        } else if(touch.identifier == this._startTouchID) {
          this._startTouchID = null;
          this._up("start");
        } else if(touch.identifier == this._baTouchID) {
          this._baTouchID = null;
          this._up("b");
          this._up("a");
        }
      }
    }, false);
  }
  
  _updateDPad(x, y) {
    const center = this._dPadFrame.center;
    const delta = {"x" : x - center.x, "y" : y - center.y};
    
    if(delta.x == 0 && delta.y == 0) {
      this._up("left");
      this._up("right");
      this._up("down");
      this._up("up");
      
      return;
    }
    
    // const magnitude = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
    // const normalized = {"x" : delta.x / magnitude, "y" : delta.y / magnitude};
    const angle = Math.atan2(delta.y, delta.x);
    const degrees = angle * 180 / Math.PI;
    
    if(this.supportsDiagonal) {
      if(Math.abs(degrees) <= 60) {
        this._down("right");
      } else {
        this._up("right");
      }
    
      if(degrees <= -30 && degrees >= -150) {
        this._down("up");
      } else {
        this._up("up");
      }
    
      if(Math.abs(degrees) >= 120) {
        this._down("left");
      } else {
        this._up("left");
      }
    
      if(degrees >= 30 && degrees <= 150) {
        this._down("down");
      } else {
        this._up("down");
      }
    } else {
      if(Math.abs(degrees) < 45) {
        this._down("right");
      } else {
        this._up("right");
      }
    
      if(degrees <= -45 && degrees >= -135) {
        this._down("up");
      } else {
        this._up("up");
      }
    
      if(Math.abs(degrees) > 135) {
        this._down("left");
      } else {
        this._up("left");
      }
    
      if(degrees >= 45 && degrees <= 135) {
        this._down("down");
      } else {
        this._up("down");
      }
    }
  }
  
  _updateBA(x, y) {
    const bOrigin = this._bOrigin;
    const aOrigin = this._aOrigin;
    const location = {"x":x, "y":y};
    
    if(this._distance(bOrigin, location) < 32) {
      this._down("b");
    } else {
      this._up("b");
    }
    
    if(this._distance(aOrigin, location) < 32) {
      this._down("a");
    } else {
      this._up("a");
    }
  }
  
  _down(name) {
    if(this.state[name] == false) {
      this.state[name] = true;
      GameBoyKeyDown(name);
      this._draw();
    }
  }
  
  _up(name) {
    if(this.state[name] == true) {
      this.state[name] = false;
      GameBoyKeyUp(name);
      this._draw();
    }
  }
  
  _distance(a, b) {
    return Math.sqrt((b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y));
  }
  
  _controlAt(x, y) {
    const location = {"x" : x, "y" : y};
    const dPadCenter = this._dPadFrame.center;
    const selectCenter = this._selectFrame.center;
    const startCenter = this._startFrame.center;
    const bCenter = this._bOrigin;
    const aCenter = this._aOrigin;
    
    const distanceToDPad = this._distance(location, dPadCenter);
    const distanceToSelect = this._distance(location, selectCenter);
    const distanceToStart = this._distance(location, startCenter);
    const distanceToB = this._distance(location, bCenter);
    const distanceToA = this._distance(location, aCenter);
    
    if(distanceToDPad <= 60) {
      return "dpad";
    } else if(distanceToB < 25) {
      return "b";
    } else if(distanceToA < 25) {
      return "a";
    } else if(distanceToSelect <= 30) {
      return "select";
    } else if(distanceToStart <= 30) {
      return "start";
    }
    
    return null;
  }
  
  _draw() {
    const context = this.context;
    
    context.fillStyle = "white";
    context.fillRect(0, 0, this.size.width, this.size.height);
    
    this._drawDPad();
    this._drawButtons();
  }
  
  _drawDPad() {
    const context = this.context;
    
    const frame = this._dPadFrame;
    const center = frame.center;
    const thickness = 24;
    
    context.beginPath();
    context.moveTo(center.x - thickness / 2, frame.y);
    context.lineTo(center.x + thickness / 2, frame.y);
    context.lineTo(center.x + thickness / 2, center.y - thickness / 2);
    context.lineTo(frame.right, center.y - thickness / 2);
    context.lineTo(frame.right, center.y + thickness / 2);
    context.lineTo(center.x + thickness / 2, center.y + thickness / 2);
    context.lineTo(center.x + thickness / 2, frame.bottom);
    context.lineTo(center.x - thickness / 2, frame.bottom);
    context.lineTo(center.x - thickness / 2, center.y + thickness / 2);
    context.lineTo(frame.x, center.y + thickness / 2);
    context.lineTo(frame.x, center.y - thickness / 2);
    context.lineTo(center.x - thickness / 2, center.y - thickness / 2);
    context.closePath();
    
    context.fillStyle = "#EEE";
    context.fill();
    
    context.fillStyle = "#CCC";
    if(this.state["down"]) {
      context.fillRect(center.x - thickness / 2, center.y + thickness / 2, thickness, (frame.height - thickness) / 2);
    }
    
    if(this.state["up"]) {
      context.fillRect(center.x - thickness / 2, frame.y, thickness, (frame.height - thickness) / 2);
    }
    
    if(this.state["left"]) {
      context.fillRect(frame.x, center.y - thickness / 2, (frame.width - thickness) / 2, thickness);
    }
    
    if(this.state["right"]) {
      context.fillRect(center.x + thickness / 2, center.y - thickness / 2, (frame.width - thickness) / 2, thickness);
    }
    
    context.strokeStyle = "#999";
    context.lineWidth = 2;
    context.stroke();
  }
  
  _drawButtons() {
    const context = this.context;
    
    this._drawSelectStart(context, this._selectFrame, "SELECT", this.state["select"]);
    this._drawSelectStart(context, this._startFrame, "START", this.state["start"]);
    
    this._drawCircle(context, this._bOrigin, 22, "B", this.state["b"]);
    this._drawCircle(context, this._aOrigin, 22, "A", this.state["a"]);
  }
  
  _drawSelectStart(context, frame, text, isDown) {
    if(isDown) {
      context.fillStyle = "#CCC";
    } else {
      context.fillStyle = "#EEE";
    }
    context.strokeStyle = "#999";
    context.lineWidth = 2;
    
    context.fillRect(frame.x, frame.y, frame.width, frame.height);
    context.strokeRect(frame.x, frame.y, frame.width, frame.height);
    
    context.font = "11px sans-serif";
    context.fillStyle = "#999";
    const textWidth = context.measureText(text).width;
    context.fillText(text, frame.x + Math.floor((frame.width - textWidth) / 2), frame.y + frame.height + 16);
  }
  
  _drawCircle(context, origin, radius, text, isDown) {
    if(isDown) {
      context.fillStyle = "#CCC";
    } else {
      context.fillStyle = "#EEE";
    }
    context.strokeStyle = "#999";
    context.lineWidth = 2;
    
    context.beginPath();
    context.arc(origin.x, origin.y, radius, 0, Math.PI * 2, false);
    context.closePath();
    context.fill();
    context.stroke();
    
    context.font = "11px sans-serif";
    context.fillStyle = "#999";
    const textWidth = context.measureText(text).width;
    context.fillText(text, origin.x - Math.floor(textWidth / 2), origin.y + radius + 14);
  }
}
