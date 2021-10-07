const { join } = require('path');

const AsyncQueue = require("webpack/lib/util/AsyncQueue");

function notAvailable() {
	throw new Error(
		`Watcher polling or pausing is not available under bazel worker mode.`);
}

class WorkerWatchFileSystem {
	/** @type {Map<string, string} */
	digestMap = new Map();

	constructor(inputFileSystem, logger) {
		this.inputFileSystem = inputFileSystem;
		this.logger = logger;
	}

	watch(files, directories, missings, startTime, options, callback, callbackUndelayed) {
		if (!files || typeof files[Symbol.iterator] !== 'function') {
			throw new Error('Invalid arguments: \'files\'');
		}
		if (!directories || typeof directories[Symbol.iterator] !== 'function') {
			throw new Error('Invalid arguments: \'directories\'');
		}
		if (!missings || typeof missings[Symbol.iterator] !== 'function') {
			throw new Error('Invalid arguments: \'missings\'');
		}
		if (typeof callback !== 'function') {
			throw new Error('Invalid arguments: \'callback\'');
		}
		if (typeof options !== 'object') {
			throw new Error('Invalid arguments: \'options\'');
		}

		if (options.poll) {
			notAvailable();
		}

		const times = new Map();

		for (const file of files) {
			times.set(file, "ignore");
		}

		for (const directory of directories) {
			times.set(directory, {});
		}

		for (const missing of missings) {
			times.set(missing, "ignore");
		}



		const rootPath = process.cwd();


		/** @param inputs {{[input: string]: string}} */
		const gotInput = (inputs) => {
			/** @type {Set<string>} */
			const changes = new Set();
			/** @type {Set<string>} */
			const removals = new Set();


			// for (const input of this.digestMap.keys()) {
			// 	if (!inputs[input]) {
			// 		this.digestMap.delete(input);

			// 		const absolutePath = join(rootPath, input);
			// 		this.timeMap.delete(absolutePath);
			// 		removals.add(absolutePath);
			// 		this.inputFileSystem.purge(absolutePath);
			// 	}
			// }

			//console.log(Array.from(files));


			for (const [input, digest] of Object.entries(inputs)) {
				const absolutePath = join(rootPath, input).replace("external/npm/", "");
				times.set(absolutePath, {timestamp: absolutePath, safeTime: startTime});
				if (this.digestMap.get(input) != digest) {

					changes.add(absolutePath);
					this.inputFileSystem.purge(absolutePath);

					this.digestMap.set(input, digest);

					callbackUndelayed(absolutePath, Date.now());
				}
			}



			callback(null, new Map(), new Map(), changes, removals);
		}

		process.on('message', gotInput);

		return {
			close: () => process.off('message', gotInput),
			// Pause is called before every compilation to ensure
			// that it does not receive any changes while building
			pause: () => process.off('message', gotInput)
		};
	}
}

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');

const prod = true;

/** @type import("webpack").Configuration */
module.exports = {
	entry: {
		main: "./src/main.js"
	},
	infrastructureLogging: {
		debug: true
	},
	stats: {
		loggingDebug: true,
		logging: true,
	},
	// snapshot: {
	// 	// managedPaths: [],
	// 	// immutablePaths: [process.env.PWD + "/node_modules"],
	// 	buildDependencies: {hash: true},
	// 	module: {hash: true},
	// 	resolve: {hash: true},
	// 	resolveBuildDependencies: {hash: true},
	// },
	resolve: {
		alias: {
			svelte: path.dirname(require.resolve('svelte/package.json'))
		},
		extensions: ['.mjs', '.js', '.svelte'],
		mainFields: ['svelte', 'browser', 'module', 'main']
	},
	module: {
		rules: [
			{
				test: /\.svelte$/,
				use: {
					loader: 'svelte-loader',
					options: {
						compilerOptions: {
							dev: !prod
						},
						emitCss: prod,
						hotReload: !prod
					}
				}
			},
			{
				test: /\.css$/,
				use: [
					MiniCssExtractPlugin.loader,
					'css-loader'
				]
			},
			{
				// required to prevent errors from Svelte on Webpack 5+
				test: /node_modules\/svelte\/.*\.mjs$/,
				resolve: {
					fullySpecified: false
				}
			}
		]
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: '[name].css'
		}),
		// new class WorkerWatchPlugin {
		// 	/** @param compiler {import("webpack").Compiler} */
		// 	apply(compiler) {
		// 		// compiler.watchFileSystem = new WorkerWatchFileSystem(
		// 		// 	compiler.inputFileSystem,
		// 		// 	compiler.getInfrastructureLogger("bazel.WorkerWatchFileSystem")
		// 		// ); 
		// 		// const digestMap = new Map();
		// 		// process.on("message", inputs => {
		// 		// 	const rootPath = process.cwd();
		// 		// 	for (const [input, digest] of Object.entries(inputs)) {
		// 		// 		const absolutePath = join(rootPath, input).replace("external/npm/", "");
		// 		// 		digestMap.set(absolutePath, digest);
		// 		// 	}
		// 		// })
		// 		// let hit = 0;
		// 		// const lstat = compiler.inputFileSystem.lstat;
		// 		// compiler.inputFileSystem.lstat = (path, callback) => {
		// 		// 	console.log("did lstat");
		// 		// 	lstat(path,callback);
		// 		// }
		// 		// const stat = compiler.inputFileSystem.stat;
		// 		// compiler.inputFileSystem.stat = (path, callback) => {
		// 		// 	console.log("did stat", path);
				
		// 		// 	stat(path, callback);
		// 		// }
		// 		compiler.hooks.compilation.tap("t", compilation => {
		// 			console.log("hits", hit);
		// 			hit = 0;
		// 			// compilation.fileSystemInfo.fileTimestampQueue = new AsyncQueue({
		// 			// 	name: "file timestamp",
		// 			// 	parallelism: 30,
		// 			// 	processor: (path, callback) => {
		// 			// 		console.log(path);
		// 			// 	}
		// 			// });
		// 			// compilation.fileSystemInfo.fileHashQueue = new AsyncQueue({
		// 			// 	name: "file hash",
		// 			// 	parallelism: 100,
		// 			// 	processor: (path, callback) => {
					
		// 			// 		const digest = digestMap.get(path) || null;
		// 			// 		if (digest) {
		// 			// 			hit++;
		// 			// 		}
		// 			// 		if (!digest) {
		// 			// 			console.log("cache miss", path);
		// 			// 			digestMap.set(path, "missing")
		// 			// 		} 
		// 			// 		compilation.fileSystemInfo._fileHashes.set(path, digest);
		// 			// 		callback(null, digest);
		// 			// 	}
		// 			// });
		// 		})
		// 		// Do not install the bazel watcher if we are running under RBE or
		// 		// --strategy=webpack=local
		// 		if (process.send) {
		
	
					
		// 			// const stat = compiler.inputFileSystem.stat;
		// 			// const statCache = new Map();
		// 			// compiler.inputFileSystem.stat = (path, callback) => {
		// 			// 	// if (statCache.has(path)) {
		// 			// 	// 	console.log("from stat cache");
		// 			// 	// 	return callback(...statCache.get(path));
		// 			// 	// }
		// 			// 	return stat(path, (err, stat) => {
		// 			// 		// if (!err) {
		// 			// 		// 	compiler.watchFileSystem.timeMap.set(path, +stat.mtime);
		// 			// 		// } else {
		// 			// 		// 	compiler.watchFileSystem.timeMap.set(path, null);
		// 			// 		// }
		// 			// 		//statCache.set(path, [err, stat]);
		// 			// 		console.log("did stat", path);
		// 			// 		callback(err, stat);
		// 			// 	});
		// 			// }
		// 		}
		// 	}
		// }
	],
	devtool: prod ? false : 'source-map'
};