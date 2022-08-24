import type { DeepReadonly } from "ts-essentials";
import { parseConfig } from "configHelper.js";
/** 
 * Welcome to the Auto Farm part 2: Electric Boogaloo - Advanced Edition!
 * This script is a little more complicated to explain easily, it dedicates high RAM servers to attack high profit servers.
 * This is also set and forget, your EXEs and hacking level are reacquired each second, so new servers are added without needing to reboot it.
 * We hope this brings you ideas, knowledge, and/or profits :D
 * Originally by PG SDVX, https://steamcommunity.com/sharedfiles/filedetails/?id=2686833015
 * Edits by MycroftJr
 * @param {NS} ns */
export async function main(ns: DeepReadonly<NS>): Promise<void> {
	ns.disableLog("ALL");
	// The location of the config file that the user should edit.
	const CONFIG_FILE = "autoFarmConfig.txt";
	const DEFAULT_CONFIG = {
		// UI parameters
		/** The maximum total number of lines to display */
		MAX_LINES: 51,
		/** The minimum number of characters to display for each server name */
		MIN_SERVER_CHARACTERS: 15,
		/** The number of high-profit targets to display */
		NUM_HIGH_PROFIT_TARGS: 12,
		/** The fixed width in characters of the UI */
		OUTPUT_WIDTH: 43,
		/** Whether to print lower-profit targets (using the remaining output lines) at the bottom of the UI */
		PRINT_LOWER_PROFITS: false,
		// Logic parameters
		/** Servers names that won't be used as hosts or get deleted */
		EXCLUDE: [""],
		/** The percent of maxmium money under which we'll `grow()` instead of `hack()`ing */
		GROW_THRESHOLD: 0.99,
		/** The amount of security levels above the minimum after which we'll only `weaken()` */
		MAX_SECURITY: 5.0,
		/** The maximum percent of money to `hack()` out of a server */
		MAX_DRAIN: 0.7,
		/** The maximum 'minimum security level' of a server to even consider targetting */
		MAX_MSL: 100,
		/** The amount of RAM to keep free on the host running this script, not including this script's direct usage */
		KEEP_FREE: 50,
		/** Whether to `share()` your remaining RAM with your factions, boosting hacking contracts */
		SHARE_REMAINING_RAM: true,
		/** The max proportion (denominator) of money to spend on any Hacknet node/upgrade */
		HACKNET_MONEY_PROPORTION: 20,
		/** The max proportion (denominator) of money to spend on any Purchased Server */
		PSERV_MONEY_PROPORTION: 20,
		/** The minimum amount of RAM to automate purchasing */
		PSERV_MIN_RAM: 8,
		/** How often, in seconds, to check/run anything */
		PERIOD: 1.0,
		/** A list of additional scripts to try to run, if any */
		ADDITIONAL_SCRIPTS: ["autoSolver.js"],
		/** How often, in seconds, to try to run the `ADDITIONAL_SCRIPTS` */
		ADDITIONAL_SCRIPTS_PERIOD: 60.0,
	};
	const config = await parseConfig(ns, CONFIG_FILE, DEFAULT_CONFIG);

	/** @param {string} msg The error message to show */
	function error(msg: string) {
		return ns.args.length ? void ns.tprint(msg) : void ns.toast(msg, "error", null);
	}
	/** @param {string} msg The warning message to show */
	function warn(msg: string) {
		return ns.args.length ? void ns.tprint(msg) : void ns.toast(msg, "warning", null);
	}

	/** CONFIG VALIDATION START */
	/** A number that displays in a small number of characters, such as 1m */
	const SHORT_NUMBER = 1000000;
	/** A number that displays in a large number of characters, such as 123m */
	const LONG_NUMBER = 123456789;
	function lengthOfLastLog() {
		const logs = ns.getScriptLogs();
		return logs[logs.length-1].length;
	}
	// print the shortest server line that would ever be printed
	printServerLine("X", "".padEnd(config.MIN_SERVER_CHARACTERS), 0, SHORT_NUMBER);
	const MIN_OUTPUT_CHARS = Math.min(lengthOfLastLog(), "║ EXE 5/5 ║ HOSTS 69 ║ TARGETS 25 ║".length);
	if (config.OUTPUT_WIDTH < MIN_OUTPUT_CHARS) {
		error("You must increase OUTPUT_WIDTH and/or decrease MIN_SERVER_CHARACTERS by "
			+ `${MIN_OUTPUT_CHARS - config.OUTPUT_WIDTH} to make lines fit!`);
	} else {
		// print the longest server line that could ever be printed
		printServerLine("X", "".padEnd(config.MIN_SERVER_CHARACTERS), LONG_NUMBER, LONG_NUMBER);
		const MAX_OUTPUT_CHARS = lengthOfLastLog();
		if (config.OUTPUT_WIDTH < MAX_OUTPUT_CHARS) {
			warn("funky UI stuff may occur unless you increase OUTPUT_WIDTH or decrease "
				+ `MIN_SERVER_CHARACTERS by ${MAX_OUTPUT_CHARS - config.OUTPUT_WIDTH}`);
		}
	}

	ns.clearLog();
	for (let i = 0; i < config.MAX_LINES+2; ++i) {
		ns.print("");
	}
	if (ns.getScriptLogs().length < config.MAX_LINES) {
		error("MAX_LINES is set higher than the number of log lines configured in your global Bitburner settings!");
	}

	if (Math.log2(config.PSERV_MIN_RAM) % 1 !== 0) {
		throw Error(`PSERV_MIN_RAM must be a power of 2 (is ${config.PSERV_MIN_RAM})!`);
	}
	/** CONFIG VALIDATION END */

	/** COMMAND LINE PROCESSING */
	let netManager = false;
	let serverManager = false;
	if (ns.args.length) {
		if (ns.args.includes("help") || ns.args.includes("?")) {
			ns.tprint("arguments: which managers you want enabled.",
				"\nSupply 'hn' for the hacknet manager, and/or 'ps' for the player server manager.",
				"\nFor neither, please supply 'no'.");
			ns.exit();
		}
		const unknownArgs = [];
		for (const arg of ns.args) {
			if (arg === "hn") {
				netManager = true;
			} else if (arg === "ps") {
				serverManager = true;
			} else if (arg !== "no") {
				unknownArgs.push(arg);
			}
		}
		if (unknownArgs.length) {
			error("Did not understand arguments [" + unknownArgs.join(", ") + "]!");
		}
	} else {
		netManager = await ns.prompt("Activate Hacknet Manager?") as boolean;
		serverManager = await ns.prompt("Activate Player Server Manager?") as boolean;
	}

	/** Enum for the hack types.
	 * @enum {number} */
	const HType = Object.freeze({
		Grow: 0,
		Weaken: 1,
		Hack: 2,
		Share: 3,
	});
	/** The letters to use to display the hacking type currently being done to a given server */
	const LETTERS = ["G", "W", "H"];  // the main action should never be Share
	/** The filenames for each hacking type. */
	const FILES = ["grow.js", "weak.js", "hack.js", "share.js"];
	await ns.write(FILES[HType.Grow], "export async function main(ns) {\nawait ns.grow(ns.args[0])\n}", "w");
	await ns.write(FILES[HType.Weaken], "export async function main(ns) {\nawait ns.weaken(ns.args[0])\n}", "w");
	await ns.write(FILES[HType.Hack], "export async function main(ns) {\nawait ns.hack(ns.args[0])\n}", "w");
	await ns.write(FILES[HType.Share], "export async function main(ns) {\nwhile(true) {\nawait ns.share()\n}\n}", "w");

	/** The RAM costs of each HType */
    const RAM_COSTS = FILES.map((file) => ns.getScriptRam(file));
    const WEAKEN_GROW_COST = Math.max(RAM_COSTS[HType.Grow], RAM_COSTS[HType.Weaken]);
    /** the largest cost in RAM of grow.js, weak.js, or hack.js */
    const ACT_COST = Math.max(WEAKEN_GROW_COST, RAM_COSTS[HType.Hack]);

	/** The server from which this script is being run */
	const HOME = ns.getHostname();

	/** A list of all server names. Currently unused.
	 * @type {string[]} */
	let servers: string[];
	/** A sorted array of [max RAM, server name] to run hacking scripts from
	 * @type {[number, string][]} */
	let hosts: [number, string][];
	/** A sorted array of [approx. profitability, server name] to target for hacking
	 * @type {[number, string][]} */
	let targets: [number, string][];
	/** The exploits/executables that are available to you
	 * @type {string[]} */
	let exes: string[];
	/** A dictionary from server name to the first letter of the
	 * main action being done to it: H(ack), G(row), or W(eaken)
	 * @dict
	 * @type {Object.<string, string>} */
	let act: Record<string, string>;
	/** @type {[number, ...string[]]} */
	// https://www.compart.com/en/unicode/block/U+2580
	// const cycle = [1, "▄", "▌", "▀", "▐"];
	// https://www.compart.com/en/unicode/block/U+2500
	const cycle: [number, ...string[]] = [1, "|", "/", "─", "\\"];

	/** @nosideeffects
	 * @param {number} c the cost being checked
	 * @param {number} d the denominator/proportion of money considered available */
	const checkM = (c: number, d: number) => { return c < ns.getPlayer().money / d };
	/** @param {[number,T][]} arr
	 * @modifies {arr}
	 * @template T */
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	const arraySort = <T>(arr: [number, T][]) => arr.sort((a, b) => b[0] - a[0]);
	/** @param {string} t The type of info to get; an acronym of
	 * MaxMoney, MoneyAvailable, MaxRam, UsedRam, NumPortsRequired,
	 * RequiredHackingLevel, SecurityLevel, or MinSecurityLevel.
	 * @param {string} s The server to get the info for */
	function info(t: string, s: string) {
		switch (t) {
			case "MM": return ns.getServerMaxMoney(s);
			case "MA": return ns.getServerMoneyAvailable(s);
			case "MR": return ns.getServerMaxRam(s);
			case "UR": return ns.getServerUsedRam(s);
			case "NPR": return ns.getServerNumPortsRequired(s);
			case "RHL": return ns.getServerRequiredHackingLevel(s);
			case "SL": return ns.getServerSecurityLevel(s);
			case "MSL": return ns.getServerMinSecurityLevel(s);
			default: throw Error(`Unknown info code ${t}`);
		}
	}

	/** @modifies {exes} */
	function scanExes() {
		for (const exe of ["brutessh", "ftpcrack", "relaysmtp", "httpworm", "sqlinject"]) {
			if (ns.fileExists(exe + ".exe")) {
				exes.push(exe);
			}
		}
	}

	/** Truncates the given server name for display 
	 * @param {string} s */
	function str(s: string) {
		if (s.length <= config.MIN_SERVER_CHARACTERS + 1) {
			return s;
		}
		return s.substring(0, config.MIN_SERVER_CHARACTERS) + "…";
	}

	/** Prints a server status line.
	 * @param {string} action The letter or symbol of the action being done to the server
	 * @param {string} name The name of the server
	 * @param {number} MA The amount of money available on the server
	 * @param {number} MM The maximum amount of money the server can contain */
	function printServerLine(action: string, name: string, MA: number, MM: number) {
		pprint(`║ ${action} ║ ${name}`, " ", `${ns.nFormat(MA, "0a")} / ${ns.nFormat(MM, "0a")} : ${ns.nFormat(MA / MM, "0%")} ║`);
	}

	/** Does `ns.print` of the `prefix` then `str`, padded in the middle by `pad` such that the line length is `OUTPUT_WIDTH`.
	 * @param {string} prefix
	 * @param {string} str 
	 * @param {string} pad */
	function pprint(prefix: string, pad: string, str: string) {
		ns.print(prefix, str.padStart(config.OUTPUT_WIDTH - prefix.length, pad));
	}

	function log() {
		if (++cycle[0] >= cycle.length) {
			cycle[0] = 1;
		}
		ns.clearLog();
		// https://www.compart.com/en/unicode/block/U+2500
		pprint("╔═══╦", "═", "╗");
		const tmp = targets.slice(0, config.NUM_HIGH_PROFIT_TARGS);
		pprint(`║ ${cycle[cycle[0]]} ║ HIGH PROFIT`, " ", "BALANCE     ║");
		for (const t of tmp) {
			printServerLine(act[t[1]], str(t[1]), info("MA", t[1]), info("MM", t[1]));
		}
		pprint("╠═══╩", "═", "╣");
		pprint(`║ EXE ${exes.length}/5 ║ HOSTS ${hosts.length} ║ TARGETS ${targets.length}`, " ", "║");

		if (netManager || serverManager) {
			pprint("╠", "═", "╣");
			let tmp = "║ MANAGERS";
			if (netManager) {
				tmp += ` ║ HN-Nodes ${ns.hacknet.numNodes()}`;
			}
			if (serverManager) {
				tmp += ` ║ P-Servers ${ns.getPurchasedServers().length}`;
			}
			pprint(tmp, " ", "║");
		}

		if (config.SHARE_REMAINING_RAM) {
			pprint("╠", "═", "╣");
			pprint(`║ SHARE POWER ${ns.getSharePower()}`, " ", "║");
		}

		if (config.PRINT_LOWER_PROFITS) {
			pprint("╠═══╦", "═", "╣");
			pprint(`║ ${cycle[cycle[0]]} ║ LOWER PROFIT`, " ", "BALANCE     ║");
			const tmp = targets.slice(config.NUM_HIGH_PROFIT_TARGS, config.MAX_LINES - ns.getScriptLogs().length);
			for (const t of tmp) {
				printServerLine(act[t[1]], str(t[1]), info("MA", t[1]), info("MM", t[1]));
			}
		} else {
			pprint("╚", "═", "╝");
		}
	}

	/** Combined scan and preparation of all servers
	 * @param {string} prev The server we scanned last
	 * @param {string} current The server we're scanning
	 * @modifies {hosts, targets} */
	async function scanServers(prev: string, current: string) { // Combined scan and check
		for (const server of ns.scan(current)) {
			if ((ns.getPurchasedServers().includes(server) || info("NPR", server) <= exes.length) && prev != server) {
				if (!ns.getPurchasedServers().includes(server)) {
					for (const exe of exes) {
						(ns[exe as keyof NS] as (server: string) => void)(server);
					}
					ns.nuke(server);
				}
				if (info("MM", server) > 0 && info("RHL", server) <= ns.getHackingLevel() && info("MSL", server) < config.MAX_MSL) {
					targets.push([Math.floor(info("MM", server) / info("MSL", server)), server]);
				}
				if (info("MR", server) > ACT_COST && !config.EXCLUDE.includes(server)) {
					hosts.push([info("MR", server), server]);
				}
				servers.push(server);
				await ns.scp(FILES, server);
				await scanServers(current, server);
			}
		}
		if (!prev) {
			// only need to sort right before we leave the recursion
			targets = arraySort(targets);
			hosts = arraySort(hosts);
		}
	}

	/** Organizes the hacking, dedicating high RAM servers to target high value ones
	 * @modifies {act} */
	function hackAll() {
		/** An index into `targets` */
		let tarIndex = 0;
		/** `false` iff this is our first go through `targets` */
		let loop = false;
		for (const host of hosts) {
			if (tarIndex > targets.length - 1) {
				tarIndex = 0;
				loop = true;
			}
			/** The target server name to hack */
			const target = targets[tarIndex][1];
			/** The amount of RAM current being `share()`d
			 * @type {number} */
			let sharedRAM = ns.getRunningScript(FILES[HType.Share], host[1])?.threads ?? 0 * RAM_COSTS[HType.Share];
			/** The amount of free RAM available for actions */
			function fRam(): number {
				// Don't count the RAM we're `share()`ing as "committed" - it's completely adjustable
				return host[0] - info("UR", host[1]) + sharedRAM;
			}
			/** Stop `share()`ing any RAM on this host */
			function resetShare(): void {
				ns.kill(FILES[HType.Share], host[1]);
				sharedRAM = 0;
			}
			/** The total amount of security levels that can be removed */
			const securityAmount = info("SL", target) - info("MSL", target);
			/** As in `growthAnalyze`, the optimal g such that MoneyAvailable * g = MoneyMax */
			const growthAmount = Math.min(info("MM", target) / info("MA", target), info("MM", target));
			const cores = ns.getServer(host[1]).cpuCores;
			const growSLChange = ns.growthAnalyzeSecurity(1, undefined, cores);
			const weakenSLChange = ns.weakenAnalyze(1, cores);
			const hackSLChange = ns.hackAnalyzeSecurity(1, target);
			/** The increase in security levels that any new `hack()` will create */
			let hackSecurity = 0;
			/** The main action we will perform on the target server
			 * @type {HType} */
			let hType: typeof HType[keyof typeof HType];
			if (1 / growthAmount < config.GROW_THRESHOLD) {
				hType = HType.Grow;
			} else if (securityAmount > config.MAX_SECURITY || loop) {
				hType = HType.Weaken;
				const maxThreads = Math.floor(fRam() / RAM_COSTS[hType]);
				// No point `weaken()`ing more than securityAmount:
				const threads = Math.ceil(Math.min(maxThreads, securityAmount / weakenSLChange));
				if (threads > 0) {
					resetShare();
					ns.exec(FILES[hType], host[1], threads, target);
				}
			} else {
				hType = HType.Hack;
				for (const h of hosts) {
					if (ns.isRunning(FILES[HType.Hack], h[1], target) && h[1] != host[1]) {
						// Some other host is already hacking this target. let's grow instead.
						hType = HType.Grow;
						break;
					}
				}
				if (hType === HType.Hack && !ns.scriptRunning(FILES[hType], host[1])) {
					if (fRam() < RAM_COSTS[hType] && host[1] != HOME) {
						ns.killall(host[1]);
					}
					const maxThreads = Math.floor(fRam() / RAM_COSTS[hType]);
					const threads = Math.min(maxThreads, Math.floor(ns.hackAnalyzeThreads(target, config.MAX_DRAIN * info("MM", target))));
					if (threads > 0) {
						resetShare();
						ns.exec(FILES[hType], host[1], threads, target);
						hackSecurity = hackSLChange * threads;
					}
				}
			}
			if (hType !== HType.Weaken && fRam() >= WEAKEN_GROW_COST) {
				/** 
				 * The hType is either grow, which hasn't been handled yet, or hack.
				 * In either case, we'll perform a `weaken()` and a `grow()` (if we can afford it)
				 * with thread counts balanced for the remaining RAM.
				 */
				/** The number of remaining threads available for `weaken()` or `grow()`
				 * @param {HType=} h the action you're getting threads for; if not supplied,
				 * will return the minimum for grow or weaken. */
				function remainingThreads(h?: typeof hType) {
					const cost = h === undefined ? WEAKEN_GROW_COST : RAM_COSTS[h];
					return Math.floor(fRam() / cost);
				}
				/** The optimal number of `grow()` threads to maximize money before any `hack()`s complete */
				const growThreads = Math.ceil(ns.growthAnalyze(target, growthAmount, cores));
				if (growThreads >= remainingThreads(HType.Grow)) {
					resetShare();
					ns.exec(FILES[HType.Grow], host[1], remainingThreads(HType.Grow), target);
				} else {
					/** The optimal number of `weaken()` threads to minimize security after any other hacks complete */
					const weakenThreads = Math.ceil((securityAmount + hackSecurity + growThreads * growSLChange) / weakenSLChange);
					const bothThreads = growThreads + weakenThreads;
					/** The (optimal) number of `grow()` threads we can actually afford */
					const finalGrowThreads = Math.min(growThreads, remainingThreads(HType.Grow),
						Math.ceil(remainingThreads() * growThreads / bothThreads));
					if (finalGrowThreads > 0) {
						resetShare();
						ns.exec(FILES[HType.Grow], host[1], finalGrowThreads, target);
						/** The (optimal) number of `weaken()` threads we can actually afford */
						const finalWeakenThreads = Math.min(weakenThreads, remainingThreads(HType.Weaken),
							Math.ceil(remainingThreads() * weakenThreads / bothThreads));
						if (finalWeakenThreads > 0) {
							ns.exec(FILES[HType.Weaken], host[1], finalWeakenThreads, target);
						}
					}
				}
			}
			if (!loop) {
				act[target] = LETTERS[hType];
			}
			if (config.SHARE_REMAINING_RAM && (fRam() - sharedRAM) >= RAM_COSTS[HType.Share]) {
				resetShare();
				ns.exec(FILES[HType.Share], host[1], fRam() / RAM_COSTS[HType.Share]);
			}
			tarIndex++;
		}
	}
	// MODULES BELOW HERE
	/** @param {number} d the maximum proportion (denominator) of money to spend */
	function hnManager(d: number) {
		if (checkM(ns.hacknet.getPurchaseNodeCost(), d)) {
			ns.hacknet.purchaseNode();
		}
		for (let i = 0; i < ns.hacknet.numNodes(); i++) {
			for (const part of ["Level", "Ram", "Core"]) {
				if (checkM((ns.hacknet["get" + part + "UpgradeCost" as keyof typeof ns.hacknet] as (index: number, n: number) => number)(i, 1), d)) {
					(ns.hacknet["upgrade" + part as keyof typeof ns.hacknet] as (index: number, n: number) => number)(i, 1);
				}
			}
		}
	}
	/** @param {number} d the maximum proportion (denominator) of money to spend */
	function pServerManager(d: number) {
		let ram = config.PSERV_MIN_RAM;
		if (!checkM(ns.getPurchasedServerCost(ram), d)) {
			// can't afford any worthwhile servers yet
			return;
		}
		while (ram < ns.getPurchasedServerMaxRam() && checkM(ns.getPurchasedServerCost(ram * 2), d)) {
			ram *= 2;
		}
		function buyServer(r: number) {
			const GIGA = 1000000000;
			ns.purchaseServer("SERVER-" + ns.nFormat(r * GIGA, "0.0b"), r);
		}
		if (ns.getPurchasedServers().length < ns.getPurchasedServerLimit() && ram > 0) {
			buyServer(ram);
		}
		for (let i = ns.getPurchasedServers().length - 1; i >= 0; i--) {
			const tmp = ns.getPurchasedServers()[i];
			if (info("MR", tmp) < ram && checkM(ns.getPurchasedServerCost(ram), d) && !config.EXCLUDE.includes(tmp)) {
				ns.killall(tmp);
				ns.deleteServer(tmp);
				buyServer(ram);
			}
		}
	}
	// MODULES ABOVE HERE
	ns.tail();
	let i = 0;
	/** Keeps everything running once per `PERIOD` second(s) */
	while (true) {
		servers = [];
		targets = [];
		exes = [];
		hosts = [[Math.max(info("MR", HOME) - config.KEEP_FREE, 0), HOME]];
		act = {};
		scanExes();
		await scanServers("", HOME);
		hackAll();
		if (netManager) {
			hnManager(config.HACKNET_MONEY_PROPORTION);
		}
		if (serverManager) {
			pServerManager(config.PSERV_MONEY_PROPORTION);
		}
		if (config.ADDITIONAL_SCRIPTS.length && (i++ >= config.ADDITIONAL_SCRIPTS_PERIOD / config.PERIOD)) {
			try {
				config.ADDITIONAL_SCRIPTS.map((script) => ns.run(script));
			} catch { }
			i = 0;
		}
		log();
		const MILLIS_PER_SECOND = 1000.0;
		await ns.sleep(config.PERIOD * MILLIS_PER_SECOND);
	}
}