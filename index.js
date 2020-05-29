// Libraries
const inquirer = require("inquirer");
const util = require("util");
const fs = require("fs");
const path = require("path");
const Fuse = require("fuse.js");
const startCase = require("lodash.startcase");
const snakeCase = require("lodash.snakecase");
const reduce = require("lodash.reduce");
const cliProgress = require("cli-progress");
const rimraf = require("rimraf");
const copyFilePromise = util.promisify(fs.copyFile);
const _args = process.argv.slice(2);

// Data
const SCHOOLS = require("./data/schools.json");

// Constants
const ARG_TYPES = {
	CLEAN: "--clean",
};
const PATHS = {
	DIR: {
		LOGOS: "./logos",
		OUTPUT: "./output",
	},
	FILE: {
		PROMPTS: "./.prompts",
	},
};
const FUSE_OPTIONS = {
	keys: [
		{
			name: "NAME",
		},
		{
			name: "WEBSITE",
		},
		{
			name: "ALIAS",
		},
	],
	includeScore: true,
};
const CLI_PROGRESS_OPTIONS = {
	format: "Progress [{bar}] | {filename} | {percentage}%  | {value}/{total}",
};

const fuse = new Fuse(SCHOOLS, FUSE_OPTIONS);

const bar = new cliProgress.SingleBar(
	CLI_PROGRESS_OPTIONS,
	cliProgress.Presets.shades_classic
);

const arg = (a) => _args.includes(a);

const getMatchingSchools = (str) => {
	return fuse.search(str).map((o) => ({
		name: [
			startCase(o.item.NAME.toLowerCase()).trim(),
			`${startCase(o.item.CITY.toLowerCase())}, ${o.item.STATE}`.trim(),
			o.score.toFixed(4),
		].join(" | "),
		value: o.item.NAME,
	}));
};

const generatePrompts = (files) => {
	return new Promise((resolve) => {
		console.log(
			"Finding matching schools...(This should only happen the first time this is ran.)"
		);

		const prompts = [];

		bar.start(files.length, 0, {
			speed: "N/A",
		});

		files.forEach((file) => {
			const searchFile = file.replace(".png", "").toUpperCase();
			const choices = getMatchingSchools(searchFile);
			const prompt = {
				type: "checkbox",
				name: file,
				message: `Which school(s) match '${file}'? (${choices.length} matches)`,
				choices,
				pageSize: 10,
			};

			prompts.push(prompt);

			bar.increment({ filename: `'${file}'` });
		});

		bar.stop();

		console.log("Search done.");

		return resolve(prompts);
	});
};

const startQuestions = (prompts) => {
	inquirer
		.prompt(prompts)
		.then((answers) => {
			if (!fs.existsSync(PATHS.DIR.OUTPUT)) {
				fs.mkdirSync(PATHS.DIR.OUTPUT, () => {
					console.log("Output directory created.");
					generateOutputFiles(answers);
				});
			} else {
				console.log(
					"Output folder already exists, deleting contents..."
				);
				rimraf(`${PATHS.DIR.OUTPUT}/*`, () => {
					console.log("Output folder contents deleted.");
					generateOutputFiles(answers);
				});
			}
		})
		.catch((error) => {
			console.error(error);
		});
};

const generateOutputFiles = (answers) => {
	console.log("Generating output...");

	const operations = reduce(
		answers,
		(result = [], value, key) => [
			...result,
			...value.png.map((match) => ({
				from: `${key}.png`,
				to: `${snakeCase(match)}.png`,
			})),
		],
		[]
	);

	bar.start(operations.length, 0, {
		speed: "N/A",
	});

	Promise.all(
		operations.map(({ from, to }) => {
			bar.increment({ operation: `${from} -> ${to}` });
			return copyFilePromise(
				path.join(PATHS.DIR.LOGOS, from),
				path.join(PATHS.DIR.OUTPUT, to)
			);
		})
	)
		.then(() => {
			bar.stop();
			console.log("Finished.");
		})
		.catch((err) => {
			bar.stop();
			console.log(err);
		});
};

const getFiles = () => {
	return new Promise((resolve, reject) => {
		console.log("Getting files...");

		fs.readdir(PATHS.DIR.LOGOS, (error, files) => {
			error ? reject(error) : resolve(files);
		});

		console.log("Files done.");
	});
};

const cachePrompts = (prompts) => {
	fs.writeFileSync(PATHS.FILE.PROMPTS, JSON.stringify(prompts));
};

const getCachedPrompts = () => {
	return new Promise((resolve) => {
		console.log("Pulling from cache...");

		fs.readFile(PATHS.FILE.PROMPTS, (err, data) => {
			if (err) {
				throw err;
			}
			try {
				console.log("Cache retrieved.");
				const parsedData = JSON.parse(data);
				return resolve(parsedData);
			} catch (error) {
				throw error;
			}
		});
	});
};

const hasCachedPrompts = () => {
	return fs.existsSync(PATHS.FILE.PROMPTS);
};

const clearCachedPrompts = () => {
	return new Promise((resolve) => {
		try {
			fs.unlinkSync(PATHS.FILE.PROMPTS);
			resolve();
		} catch (err) {
			throw err;
		}
	});
};

const init = () => {
	let _hasCachedPrompts = hasCachedPrompts();

	if (_hasCachedPrompts) {
		if (arg(ARG_TYPES.CLEAN)) {
			clearCachedPrompts().then(() => (_hasCachedPrompts = false));
		}
	}

	getFiles().then((files) => {
		if (_hasCachedPrompts) {
			getCachedPrompts().then((prompts) => {
				startQuestions(prompts.slice(0, 5));
			});
		} else {
			generatePrompts(files).then((prompts) => {
				if (!_hasCachedPrompts && prompts && prompts.length) {
					cachePrompts(prompts);
				}

				startQuestions(prompts.slice(0, 5));
			});
		}
	});
};

init();
