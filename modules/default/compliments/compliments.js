/* Magic Mirror
 * Module: Compliments
 *
 * By Michael Teeuw https://michaelteeuw.nl
 * MIT Licensed.
 */
Module.register("compliments", {
	// Module config defaults.
	defaults: {
		compliments: {
			anytime: ["Hey there sexy!"],
			morning: ["Good morning, handsome!", "Enjoy your day!", "How was your sleep?"],
			afternoon: ["Hello, beauty!", "You look sexy!", "Looking good today!"],
			evening: ["Wow, you look hot!", "You look nice!", "Hi, sexy!"],
			"....-01-01": ["Happy new year!"]
		},
		updateInterval: 15000,
		remoteFile: null,
		fadeSpeed: 4000,
		morningStartTime: 3,
		morningEndTime: 12,
		afternoonStartTime: 12,
		afternoonEndTime: 17,
		random: true,
		mockDate: null
	},
	lastIndexUsed: -1,
	// Set currentweather from module
	currentWeatherType: "",

	// Define required scripts.
	getScripts: function () {
		return ["moment.js"];
	},

	// Define start sequence.
	start: function () {
		Log.info("Starting module: " + this.name);

		this.lastComplimentIndex = -1;

		var self = this;
		if (this.config.remoteFile !== null) {
			this.complimentFile(function (response) {
				self.config.compliments = JSON.parse(response);
				self.updateDom();
			});
		}

		// Schedule update timer.
		setInterval(function () {
			self.updateDom(self.config.fadeSpeed);
		}, this.config.updateInterval);
	},

	/* randomIndex(compliments)
	 * Generate a random index for a list of compliments.
	 *
	 * argument compliments Array<String> - Array with compliments.
	 *
	 * return Number - Random index.
	 */
	randomIndex: function (compliments) {
		if (compliments.length === 1) {
			return 0;
		}

		var generate = function () {
			return Math.floor(Math.random() * compliments.length);
		};

		var complimentIndex = generate();

		while (complimentIndex === this.lastComplimentIndex) {
			complimentIndex = generate();
		}

		this.lastComplimentIndex = complimentIndex;

		return complimentIndex;
	},

	/* complimentArray()
	 * Retrieve an array of compliments for the time of the day.
	 *
	 * return compliments Array<String> - Array with compliments for the time of the day.
	 */
	complimentArray: function () {
		const date = this.getCurrentDate();
		const hour = moment().hour();
		var compliments;

		if (hour >= this.config.morningStartTime && hour < this.config.morningEndTime && this.config.compliments.hasOwnProperty("morning")) {
			compliments = this.config.compliments.morning.slice(0);
		} else if (hour >= this.config.afternoonStartTime && hour < this.config.afternoonEndTime && this.config.compliments.hasOwnProperty("afternoon")) {
			compliments = this.config.compliments.afternoon.slice(0);
		} else if (this.config.compliments.hasOwnProperty("evening")) {
			compliments = this.config.compliments.evening.slice(0);
		}

		if (typeof compliments === "undefined") {
			compliments = new Array();
		}

		if (this.currentWeatherType in this.config.compliments) {
			compliments.push.apply(compliments, this.config.compliments[this.currentWeatherType]);
		}

		compliments.push.apply(compliments, this.config.compliments.anytime);

		return compliments;
	},

	getCurrentDate: function () {
		const date = this.config.mockDate ? this.config.mockDate : moment().format("YYYY-MM-DD");
		return date;
	},

	complimentsByDate: function () {
		const date = this.getCurrentDate();
		const complimentsByDate = [];
		for (var entry in this.config.compliments) {
			if (new RegExp(entry).test(date)) {
				// Compliment matching the current date
				complimentsByDate.push(...this.config.compliments[entry]);
			}
		}
		return complimentsByDate;
	},

	/* complimentFile(callback)
	 * Retrieve a file from the local filesystem
	 */
	complimentFile: function (callback) {
		var xobj = new XMLHttpRequest(),
			isRemote = this.config.remoteFile.indexOf("http://") === 0 || this.config.remoteFile.indexOf("https://") === 0,
			path = isRemote ? this.config.remoteFile : this.file(this.config.remoteFile);
		xobj.overrideMimeType("application/json");
		xobj.open("GET", path, true);
		xobj.onreadystatechange = function () {
			if (xobj.readyState === 4 && xobj.status === 200) {
				callback(xobj.responseText);
			}
		};
		xobj.send(null);
	},

	/* complimentArray()
	 * Retrieve a random compliment.
	 *
	 * return compliment string - A compliment.
	 */
	randomCompliment: function () {
		const compliments = this.complimentArray();
		const complimentsByDate = this.complimentsByDate();
		let complimentText = "";
		// are we randomizing
		if (this.config.random) {
			if (complimentsByDate.length > 0) {
				// 50% chance to pick a compliment by date, if any
				const idx = Math.floor(Math.random() * 2);
				complimentText = idx === 0 ? complimentsByDate[this.randomIndex(complimentsByDate)] : compliments[this.randomIndex(compliments)];
			} else {
				complimentText = compliments[this.randomIndex(compliments)];
			}
		} else {
			// no, sequential
			// if doing sequential, don't fall off the end
			const index = this.lastIndexUsed >= compliments.length - 1 ? 0 : ++this.lastIndexUsed;
			complimentText = compliments[index];
		}
		return complimentText || "";
	},

	// Override dom generator.
	getDom: function () {
		var complimentText;
		if (this.forceCompliment) {
			complimentText = this.complimentText;
		} else {
			complimentText = this.randomCompliment();
		}
		var wrapper = document.createElement("div");
		wrapper.className = this.config.classes ? this.config.classes : "thin xlarge bright pre-line";
		// split it into parts on newline text
		var parts = complimentText.split("\n");
		// create a span to hold it all
		var compliment = document.createElement("span");
		// process all the parts of the compliment text
		for (var part of parts) {
			// create a text element for each part
			compliment.appendChild(document.createTextNode(part));
			// add a break `
			compliment.appendChild(document.createElement("BR"));
		}
		// remove the last break
		compliment.lastElementChild.remove();
		wrapper.appendChild(compliment);

		return wrapper;
	},

	// From data currentweather set weather type
	setCurrentWeatherType: function (data) {
		var weatherIconTable = {
			"01d": "day_sunny",
			"02d": "day_cloudy",
			"03d": "cloudy",
			"04d": "cloudy_windy",
			"09d": "showers",
			"10d": "rain",
			"11d": "thunderstorm",
			"13d": "snow",
			"50d": "fog",
			"01n": "night_clear",
			"02n": "night_cloudy",
			"03n": "night_cloudy",
			"04n": "night_cloudy",
			"09n": "night_showers",
			"10n": "night_rain",
			"11n": "night_thunderstorm",
			"13n": "night_snow",
			"50n": "night_alt_cloudy_windy"
		};
		this.currentWeatherType = weatherIconTable[data.weather[0].icon];
	},

	pickRandomGreeting: function () {
		var greetings = ["Bonjour", "Salut", "Hello", "Coucou", "Salutations", "Hey", "Yop"];
		var idx = Math.floor(Math.random() * greetings.length);
		return greetings[idx];
	},

	complimentBasedOnNames: function (names) {
		if (names.length > 1) {
			return "Ohla ! Que de monde !";
		}
		if (names[0] === "unknown") {
			return "Oh mais je ne te connais pas ! Bonjour !";
		}
		if (names[0] === "pauline") {
			return "Oh ! Mais c'est la jolie " + names[0];
		}
		return this.pickRandomGreeting() + " " + names[0] + " !";
	},

	setFaceCompliment: function (faceNames) {
		if (faceNames.length === 0) {
			return;
		}
		var complimentText = this.complimentBasedOnNames(faceNames);
		this.forceCompliment = true;
		this.complimentText = complimentText;
		this.updateDom(self.config.fadeSpeed);
		this.forceCompliment = false;
	},

	// Override notification handler.
	notificationReceived: function (notification, payload, sender) {
		if (notification === "CURRENTWEATHER_DATA") {
			this.setCurrentWeatherType(payload.data);
		} else if (notification === "USERS_LOGIN") {
			this.setFaceCompliment(payload);
		}
	}
});
