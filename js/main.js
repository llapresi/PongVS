// main.js
// Dependencies: 
// Description: singleton object
// This object will be our main "controller" class and will contain references
// to most of the other objects in the game.

"use strict";

// if app exists use the existing copy
// else create a new object literal
var app = app || {};

/*
 .main is an object literal that is a property of the app global
 This object literal has its own properties and methods (functions)
 
 */
app.main = {
	//  properties
	WIDTH: 1280,
	HEIGHT: 720,
	canvas: undefined,
	ctx: undefined,
	lastTime: 0, // used by calculateDeltaTime() 
	debug: true,
	GAME_STATE: Object.freeze({
		BEGIN: 0,
		PLAY: 1,
		LEFT_WIN: 2,
		RIGHT_WIN: 3
	}),
	circles: [],
	numCircles: this.NUM_CIRCLES_START,
	paused: false,
	animationID: 0,
	gameState: undefined,
	roundScore: 0,
	totalScore: 0,
	colors: ["#FD5B78", "#FF6037", "#FF9966", "#FFFF66", "#66FF66", "#50BFE6", "#FF6EFF", "#EE34D2"],
	sound: undefined,
	myKeys: undefined,
	Emitter: undefined,
	pulsar: undefined,
	exhaust: undefined,
	// Create new object literals for both paddles. Setup as AI or player based on choices
	leftPaddle: {},
	rightPaddle: {},
	// Object literal for the ball
	ball: {},
	// Object literal used for the ghost ball (used by AI to predict movement)
	ghostBall: {},
	// GAME MODE SETTINGS: EASY, MEDIUM AND HARD change AI setings, MP is 2 player mode
	GAME_MODE: Object.freeze({
		EASY: 0,
		MEDIUM: 1,
		HARD: 2,
		MP: 3
	}),
	gameMode: 0,
	leftScore: 0,
	rightScore: 0,
	// DEFAULT EASY PROPS
	AI_PROPS: {
		// Maximum speed of enemy paddle
		paddleSpeed: 100,
		// Speed of ghost ball in comparison to real ball
		ghostBallSpeed: 1.15,
		ballStartSpeed: 200
	},
	IMAGES: {
		paddleImage: undefined
	},
	showGhostBall: false,

	// Create player object
	Player: function (p_width, p_height, p_speed, rightSide) {
		// Setup up common properties
		this.y = (app.main.HEIGHT / 2) - (p_height / 2);
		this.width = p_width;
		this.height = p_height;
		this.moveSpeed = p_speed;

		// Set X based on rightSide bool
		if (!rightSide) {
			this.x = 0;
		}
		else {
			this.x = app.main.WIDTH - this.width;
		}

		// Move function
		this.move = function (p_speed, dt) {
			//this.y -= p_speed * dt;
			// Limit moveSpeed so that max speed will not exceed this.moveSpeed in either direction
			this.y -= Math.min(Math.max(p_speed, -this.moveSpeed), this.moveSpeed) * dt;

			// Limit position
			if (this.y < 0) {
				this.y = 0;
			}
			if (this.y > app.main.HEIGHT - this.height) {
				this.y = app.main.HEIGHT - this.height;
			}
		}

		// DO NOT SEAL  Player so that AI player can replace this.moveUp
		// Object.seal(this);
	},

	// Ball object constructor
	Ball: function (p_width, p_height, p_xSpeed, p_ySpeed, p_maxSpeed) {
		// Set up stuff
		this.width = p_width;
		this.height = p_height;
		this.xSpeed = p_xSpeed;
		this.ySpeed = p_ySpeed;
		// Max speed applies on BOTH AXIS. SO the atual max speed is sqrt((maxSpeed^2) * 2)
		this.maxSpeed = p_maxSpeed;

		// Create particles for ball
		var pfx = new app.Emitter();
		pfx.red = 255;
		pfx.green = 255;
		pfx.blue = 255;
		pfx.minXspeed = pfx.minYspeed = -0.25;
		pfx.maxXspeed = pfx.maxYspeed = 0.25;
		pfx.lifetime = 200;
		pfx.expansionRate = 0.2;
		pfx.numParticles = 30; // you could make this smaller!
		pfx.xRange = 1;
		pfx.yRange = 1;
		pfx.useCircles = false;
		pfx.useSquares = true;
		pfx.createParticles({ x: 0, y: 0 });

		this.pfx = pfx;

		this.x = (app.main.WIDTH / 2) - (p_width / 2);
		this.y = (app.main.HEIGHT / 2) - (p_height / 2);

		this.xReflect = function () {
			this.xSpeed *= -1;
			app.sound.playEffect(0);
		}

		this.yReflect = function () {
			this.ySpeed *= -1;
			app.sound.playEffect(0);
		}

		this.move = function (dt) {
			// Move ball based on speedvalues
			this.x += Math.min(Math.max(this.xSpeed, -this.maxSpeed), this.maxSpeed) * dt;
			this.y += Math.min(Math.max(this.ySpeed, -this.maxSpeed), this.maxSpeed) * dt;

			// Reflect off arena walls
			if (this.x < 0) {
				this.xReflect();
				this.x = 0;
			}

			if (this.x > app.main.WIDTH - this.width) {
				this.xReflect();
				this.x = app.main.WIDTH - this.width;
			}

			if (this.y < 0) {
				this.yReflect();
				this.y = 0;
			}
			if (this.y > app.main.HEIGHT - this.height) {
				this.yReflect();
				this.y = app.main.HEIGHT - this.height;
			}
		}
	},

	makeGhostBall: function (ball, lookahead) {
		this.ghostBall = new this.Ball(ball.width, ball.height, ball.xSpeed * lookahead, ball.ySpeed * lookahead, ball.maxSpeed * lookahead);
		this.ghostBall.x = this.ball.x;
		this.ghostBall.y = this.ball.y;
		// Override xReflect
		this.ghostBall.xReflect = function () {
			this.xSpeed = 0;
			this.ySpeed = 0;
		}

		this.ghostBall.yReflect = function () {
			this.ySpeed *= -1;
			// Redefined here to stop ghostball from making sounds
		}
	},

	doMousedown: function (e) {
		var mouse = getMouse(e);

		if (this.paused) {
			this.resumeGame();
			return;
		}

		if (this.gameState === this.GAME_STATE.BEGIN) {
			this.sound.playBGAudio();
			this.gameState = this.GAME_STATE.PLAY;
		}

		if(this.gameState === this.GAME_STATE.RIGHT_WIN || this.gameState === this.GAME_STATE.LEFT_WIN) {
			this.gameState = this.GAME_STATE.PLAY;
			this.init();
		}
	},

	// methods
	init: function () {
		cancelAnimationFrame(this.animationID);
		//console.log("app.main.init() called");
		// initialize properties
		this.canvas = document.querySelector('canvas');
		this.ctx = this.canvas.getContext('2d');

		this.gameState = this.GAME_STATE.BEGIN;

		// hook pevents
		this.canvas.onmousedown = this.doMousedown.bind(this);

		// Load Images
		this.loadImages();

		// reset scores
		this.leftScore = this.rightScore = 0;

		// SET DIFFICULTY SETTINGS
		// DEFAULT settings in AI_PROPS are for easy mode
		// Set multiplayer paddle to same speed as left side player
		if (this.gameMode === this.GAME_MODE.EASY) {
			this.AI_PROPS.paddleSpeed = 100;
			// Speed of ghost ball in comparison to real ball
			this.AI_PROPS.ghostBallSpeed = 1.15;
			// Starting speed of ball
			this.AI_PROPS.ballStartSpeed = 200;
		}
		if (this.gameMode === this.GAME_MODE.MEDIUM) {
			this.AI_PROPS.paddleSpeed = 200;
			// Speed of ghost ball in comparison to real ball
			this.AI_PROPS.ghostBallSpeed = 1.15;
			// Starting speed of ball
			this.AI_PROPS.ballStartSpeed = 250;
		}
		if (this.gameMode === this.GAME_MODE.HARD) {
			this.AI_PROPS.paddleSpeed = 400;
			// Speed of ghost ball in comparison to real ball
			this.AI_PROPS.ghostBallSpeed = 1.3;
			// Starting speed of ball
			this.AI_PROPS.ballStartSpeed = 300;
		}
		if (this.gameMode === this.GAME_MODE.MP) {
			this.AI_PROPS.paddleSpeed = 600;
			// Speed of ghost ball in comparison to real ball
			this.AI_PROPS.ghostBallSpeed = 1.15;
			// Starting speed of ball
			this.AI_PROPS.ballStartSpeed = 250;
		}

		this.bgAudio = document.querySelector("#bgAudio");
		this.bgAudio.volume = 0.25;
		this.effectAudio = document.querySelector("#effectAudio");
		this.effectAudio.volume = 0.3;

		/*this.exhaust = new this.Emitter();
		this.exhaust.numParticles = 100;
		this.exhaust.red = 255;
		this.exhaust.green = 150;
		this.exhaust.createParticles({ x: 100, y: 100 }); */

		this.leftPaddle = new this.Player(30, 200, 600, false);
		this.rightPaddle = new this.Player(30, 200, this.AI_PROPS.paddleSpeed, true);

		this.ball = new this.Ball(20, 20, this.AI_PROPS.ballStartSpeed, 0, this.AI_PROPS.ballStartSpeed);
		this.makeGhostBall(this.ball, this.AI_PROPS.ghostBallSpeed);

		//console.log("Game Mode: " + this.gameMode);

		// Set up menu event handlers
		document.querySelector("#mode_select").onchange = function (e) {
			app.main.gameMode = parseInt(e.target.value);
			app.main.init();

			// refocus on canvas so up and down arrows dont change modes after selection
			document.querySelector("#mode_select").blur();
		}

		document.querySelector("#ghostball_check").onclick = function (e) {
			app.main.showGhostBall = document.querySelector("#ghostball_check").checked;
		}

		this.sound.stopBGAudio();

		// start the game loop
		this.update();
	},

	loadImages: function () {
		this.IMAGES.paddleImage = new Image();
		this.IMAGES.paddleImage.src = 'media/paddle.png';
	},

	pauseGame: function () {
		this.paused = true;
		cancelAnimationFrame(this.animationID);
		this.update();
		this.sound.stopBGAudio();
	},

	drawPauseScreen: function (ctx) {
		ctx.save();
		ctx.fillStyle = 'black';
		ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		this.fillText(this.ctx, "... PAUSED ...", this.WIDTH / 2, this.HEIGHT / 2, "40pt courier", "white");
		ctx.restore;
	},

	resumeGame: function () {
		this.paused = false;
		cancelAnimationFrame(this.animationID);
		this.update();
		if(this.gameState == this.GAME_STATE.PLAY)
			this.sound.playBGAudio();
	},

	drawHUD: function (ctx) {
		ctx.save();
		ctx.textAlign = "left";
		if (this.gameState === this.GAME_STATE.PLAY) {
			this.fillText(this.ctx, this.leftScore, 60, 60, "64pt deltaray", "#FFF");
			this.fillText(this.ctx, this.rightScore, this.WIDTH - 130, 60, "64pt deltaray", "#FFF");
		}

		// Draw instructions at game beginning
		if (this.gameState === this.GAME_STATE.BEGIN) {
			var yOffset = 30;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			this.fillText(this.ctx, "Instructions:", this.WIDTH / 2, 70 + yOffset, "48pt deltaray", "white");
			this.fillText(this.ctx, "Bounce the ball into the opposing players side (right side) to score points.", this.WIDTH / 2, 130 + yOffset, "24pt helvetica", "white");
			this.fillText(this.ctx, "First to score 3 goals wins", this.WIDTH / 2, 170 + yOffset, "24pt helvetica", "white");

			this.fillText(this.ctx, "Controls:", this.WIDTH / 2, 300 + yOffset, "48pt deltaray", "white");
			this.fillText(this.ctx, "W: Move Left Paddle Up", this.WIDTH / 2, 360 + yOffset, "24pt helvetica", "white");
			this.fillText(this.ctx, "S: Move Left Paddle Down", this.WIDTH / 2, 395 + yOffset, "24pt helvetica", "white");

			if (this.gameMode === this.GAME_MODE.MP) {
				this.fillText(this.ctx, "Up Arrow: Move Right Paddle Up", this.WIDTH / 2, 427 + yOffset, "24pt helvetica", "white");
				this.fillText(this.ctx, "Down Arrow: Move Right Paddle Down", this.WIDTH / 2, 460 + yOffset, "24pt helvetica", "white");
			}

			this.fillText(this.ctx, "Click to Start", this.WIDTH / 2, 535 + yOffset, "64pt deltaray", "yellow");
		}

		// if left player wins
		if(this.gameState === this.GAME_STATE.LEFT_WIN) {
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			this.fillText(this.ctx, "LEFT PLAYER WINS", this.WIDTH / 2,  this.HEIGHT / 2, "64pt deltaray", "white");
			this.fillText(this.ctx, "Click to restart", this.WIDTH / 2, (this.HEIGHT / 2) + 64, "24pt helvetica", "white");
		}
		if(this.gameState === this.GAME_STATE.RIGHT_WIN) {
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			this.fillText(this.ctx, "RIGHT PLAYER WINS", this.WIDTH / 2,  this.HEIGHT / 2, "64pt deltaray", "white");
			this.fillText(this.ctx, "Click to restart", this.WIDTH / 2, (this.HEIGHT / 2) + 64, "24pt helvetica", "white");
		}
	},

	// Checks for all collision stuff
	checkCollision: function () {
		// ball collision | REFACTOR THIS ONCE ALL CIRLCES STUFF IS REMOVED
		if (rectIntersect(this.leftPaddle, this.ball)) {
			this.ball.x = this.leftPaddle.width;
			this.ball.xReflect();

			// Get distance
			var pointDist = (this.ball.y + (this.ball.height / 2)) - (this.leftPaddle.y + (this.leftPaddle.height / 2));
			this.ball.ySpeed = (this.ball.maxSpeed * pointDist) * 0.01;

			this.ball.maxSpeed += 10;
			this.ball.xSpeed *= 1.3;
			this.makeGhostBall(this.ball, this.AI_PROPS.ghostBallSpeed);
		}

		if (rectIntersect(this.rightPaddle, this.ball)) {
			this.ball.x = this.WIDTH - this.rightPaddle.width - this.ball.width;
			this.ball.xReflect();

			// Get distance
			var pointDist = (this.ball.y + (this.ball.height / 2)) - (this.rightPaddle.y + (this.rightPaddle.height / 2));
			this.ball.ySpeed = (this.ball.maxSpeed * pointDist) * 0.01;

			this.ball.maxSpeed += 10;
			this.ball.xSpeed *= 1.3;
			this.makeGhostBall(this.ball, this.AI_PROPS.ghostBallSpeed);
		}
	},

	update: function () {
		// 1) LOOP
		// schedule a call to update()
		this.animationID = requestAnimationFrame(this.update.bind(this));

		// 2) PAUSED?
		// if so, bail out of loop
		if (this.paused) {
			this.drawPauseScreen(this.ctx);
			return;
		}

		// 3) HOW MUCH TIME HAS GONE BY?
		var dt = this.calculateDeltaTime();
		if (this.gameState === this.GAME_STATE.PLAY) {
			// Move ball
			this.ball.move(dt);
			if (this.ghostBall.move !== undefined) {
				this.ghostBall.move(dt);
			}
			// Move left paddle
			if (this.myKeys.keydown[this.myKeys.KEYBOARD.W]) {
				this.leftPaddle.move(this.leftPaddle.moveSpeed, dt);
			}
			if (this.myKeys.keydown[this.myKeys.KEYBOARD.S]) {
				this.leftPaddle.move(-this.leftPaddle.moveSpeed, dt);
			}

			// Move right paddle by AI if this is an AI mode
			if (this.gameMode !== this.GAME_MODE.MP) {
				var yDist = (this.rightPaddle.y + (this.rightPaddle.height / 2)) - (this.ghostBall.y + (this.ghostBall.height / 2));
				this.rightPaddle.move(yDist, dt);
			} else {
				// Right paddle use up arrow and down arrow for movement
				if (this.myKeys.keydown[this.myKeys.KEYBOARD.KEY_UP]) {
					this.rightPaddle.move(this.rightPaddle.moveSpeed, dt);
				}
				if (this.myKeys.keydown[this.myKeys.KEYBOARD.KEY_DOWN]) {
					this.rightPaddle.move(-this.rightPaddle.moveSpeed, dt);
				}
			}

			this.checkCollision();

			// CHECK FOR BALL GOALS
			if (this.ball.x == 0) {
				this.resetBalls();
				this.rightScore += 1;

				// Play goal sound
				this.sound.playEffect(1);
			}

			if (this.ball.x == app.main.WIDTH - this.ball.width) {
				this.resetBalls();
				this.leftScore += 1;

				// Play goal sound
				this.sound.playEffect(1);
			}

			// Check for victory
			if(this.leftScore >= 3) {
				this.gameState = this.GAME_STATE.LEFT_WIN;
				this.sound.stopBGAudio();
			}

			if(this.rightScore >= 3) {
				this.gameState = this.GAME_STATE.RIGHT_WIN;
				this.sound.stopBGAudio();
			}
		}

		this.draw();

		/* if(this.circleHitLeftRight(this.x, this.y, this.radius)) {
			this.xSpeed *= -1;
		}

		if(this.circleHitTopBottom(this.x, this.y, this.radius)) {
			this.ySpeed *= -1;
		} */

		// iii) draw HUD
		this.drawHUD(this.ctx);

		// iv) draw debug info
		if (this.debug) {
			// draw dt in bottom right corner
			this.ctx.textAlign = "left";
			this.fillText(this.ctx, "dt: " + dt.toFixed(3), this.WIDTH - 150, this.HEIGHT - 10, "18pt courier", "white");
		}
	},

	draw: function () {
		// 5) DRAW	
		// i) draw background
		this.ctx.fillStyle = "black";
		this.ctx.shadowBlur = 0;
		this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

		this.ctx.save();

		// Draw background gridlines
		this.ctx.fillStyle = "#339";

		// Draw horizontal gridlies
		for (var i = 0; i < 60; i++) {
			this.ctx.fillRect(0, i * 12, this.WIDTH, 1);
		}

		// Draw vertical gridlies
		for (var i = 0; i < 110; i++) {
			this.ctx.fillRect(i * 12, 0, 1, this.HEIGHT);
		}

		this.ctx.restore();

		// Only draw entites if game is in play gameState
		if (this.gameState === this.GAME_STATE.PLAY) {

			// Use ctx shadowBlur to do glow
			this.ctx.shadowColor = "white";

			// Draw paddles
			this.ctx.fillStyle = "white";

			this.ctx.drawImage(this.IMAGES.paddleImage, this.leftPaddle.x, this.leftPaddle.y);
			this.ctx.drawImage(this.IMAGES.paddleImage, this.rightPaddle.x, this.rightPaddle.y);


			// Draw ball
			this.ctx.shadowBlur = 20;
			this.ctx.fillRect(this.ball.x, this.ball.y, this.ball.width, this.ball.height);

			this.ball.pfx.updateAndDraw(this.ctx, { x: this.ball.x + (this.ball.width / 2), y: this.ball.y + (this.ball.height / 2) });

			this.ctx.save();
			this.ctx.fillStyle = "rgba(255, 100, 100, 0.7)";

			// Draw ghostball if checked
			if (this.showGhostBall === true) {
				this.ctx.shadowBlur = 40;
				this.ctx.fillRect(this.ghostBall.x, this.ghostBall.y, this.ghostBall.width, this.ghostBall.height);
			}

			this.ctx.shadowBlur = 0;
		}
	},

	resetBalls: function () {
		this.ball = new this.Ball(20, 20, this.AI_PROPS.ballStartSpeed, 0, this.AI_PROPS.ballStartSpeed);
		this.makeGhostBall(this.ball, this.AI_PROPS.ghostBallSpeed);
	},

	fillText: function (ctx, string, x, y, css, color) {
		ctx.save();
		// https://developer.mozilla.org/en-US/docs/Web/CSS/font
		ctx.font = css;
		ctx.fillStyle = color;
		ctx.fillText(string, x, y);
		ctx.restore();
	},

	calculateDeltaTime: function () {
		var now, fps;
		now = performance.now();
		fps = 1000 / (now - this.lastTime);
		fps = clamp(fps, 12, 60);
		this.lastTime = now;
		return 1 / fps;
	},

}; // end app.main