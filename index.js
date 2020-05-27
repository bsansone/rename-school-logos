// Libraries
const inquirer = require("inquirer");
const fs = require("fs");
const Fuse = require("fuse.js");
const startCase = require("lodash.startcase");
const snakeCase = require("lodash.snakecase");
const cliProgress = require("cli-progress");

// Data
const schools = require("./data/schools.json");

// Logos
const logosFolder = "./logos/";

const fuse = new Fuse(schools, {
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
});

const bar = new cliProgress.SingleBar(
	{
		format:
			"Progress [{bar}] | {filename} | {percentage}%  | {value}/{total}",
	},
	cliProgress.Presets.shades_classic
);

const getMatchingSchools = (str) => {
	return fuse
		.search(str)
		.map((o) =>
			[
				startCase(o.item.NAME.toLowerCase()).trim(),
				`${startCase(o.item.CITY.toLowerCase())}, ${
					o.item.STATE
				}`.trim(),
				o.score.toFixed(4),
			].join(" | ")
		);
};

const generatePrompts = (files) => {
	return new Promise((resolve) => {
		console.log("Finding matching schools...");

		const prompts = [];

		bar.start(files.length, 0, {
			speed: "N/A",
		});

		files.forEach((file) => {
			const searchFile = file.replace(".png", "").toUpperCase();

			prompts.push({
				type: "checkbox",
				name: snakeCase(searchFile),
				message: `Which school(s) match '${file}'?`,
				choices: getMatchingSchools(searchFile),
			});

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
			console.log(JSON.stringify(answers, null, 2));
		})
		.catch((error) => {
			console.error(error);
		});
};

const getFiles = () => {
	return new Promise((resolve, reject) => {
		console.log("Getting files...");

		fs.readdir(logosFolder, (error, files) => {
			error ? reject(error) : resolve(files);
		});

		console.log("Files done.");
	});
};

const init = () => {
	getFiles().then((files) => {
		generatePrompts(files).then((prompts) => {
			startQuestions(prompts);
		});
	});
};

init();
