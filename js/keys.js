// The myKeys object will be in the global scope - it makes this script 
// really easy to reuse between projects

"use strict";
var app = app || {};

app.myKeys = (function () {
	var myKeys = {};

	myKeys.KEYBOARD = Object.freeze({
		"KEY_LEFT": 37,
		"KEY_UP": 38,
		"KEY_RIGHT": 39,
		"KEY_DOWN": 40,
		"KEY_SPACE": 32,
		"KEY_SHIFT": 16,
		"W": 87,
		"S": 83
	});

	// myKeys.keydown array to keep track of which keys are down
	// this is called a "key daemon"
	// main.js will "poll" this array every frame
	// this works because JS has "sparse arrays" - not every language does
	myKeys.keydown = [];


	// event listeners
	window.addEventListener("keydown", function (e) {
		//console.log("keydown=" + e.keyCode);
		myKeys.keydown[e.keyCode] = true;
	});

	window.addEventListener("keyup", function (e) {
		//console.log("keyup=" + e.keyCode);
		myKeys.keydown[e.keyCode] = false;

		// pausing and resuming
		var char = String.fromCharCode(e.keyCode);
		if (char == "p" || char == "P") {
			if (app.main.paused) {
				app.main.resumeGame();
			} else {
				app.main.pauseGame();
			}
		}
	});
	return myKeys;
})();