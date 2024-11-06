import { parseConfig } from "configHelper.js";
/**
 * Welcome to the Auto Farm part 2: Electric Boogaloo - Advanced Edition!
 * This script is a little more complicated to explain easily, it dedicates high RAM servers to attack high profit servers.
 * This is also set and forget, your EXEs and hacking level are reacquired each second, so new servers are added without needing to reboot it.
 * We hope this brings you ideas, knowledge, and/or profits :D
 * Originally by PG SDVX, https://steamcommunity.com/sharedfiles/filedetails/?id=2686833015
 * Edits by MycroftJr
 * @param {NS} ns */
export async function main(ns) {
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
        KEEP_FREE: 75,
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
    const config = parseConfig(ns, CONFIG_FILE, DEFAULT_CONFIG);
    /** @param {string} msg The error message to show */
    function error(msg) {
        return ns.args.length ? void ns.tprint(msg) : void ns.toast(msg, "error", null);
    }
    /** @param {string} msg The warning message to show */
    function warn(msg) {
        return ns.args.length ? void ns.tprint(msg) : void ns.toast(msg, "warning", null);
    }
    /** CONFIG VALIDATION START */
    /** A number that displays in a small number of characters, such as 1m */
    const SHORT_NUMBER = 1000000;
    /** A number that displays in a large number of characters, such as 123m */
    const LONG_NUMBER = 123456789;
    function lengthOfLastLog() {
        const logs = ns.getScriptLogs();
        return logs[logs.length - 1].length;
    }
    // print the shortest server line that would ever be printed
    printServerLine("X", "".padEnd(config.MIN_SERVER_CHARACTERS), 0, SHORT_NUMBER);
    const MIN_OUTPUT_CHARS = Math.min(lengthOfLastLog(), "║ EXE 5/5 ║ HOSTS 69 ║ TARGETS 25 ║".length);
    if (config.OUTPUT_WIDTH < MIN_OUTPUT_CHARS) {
        error("You must increase OUTPUT_WIDTH and/or decrease MIN_SERVER_CHARACTERS by "
            + `${MIN_OUTPUT_CHARS - config.OUTPUT_WIDTH} to make lines fit!`);
    }
    else {
        // print the longest server line that could ever be printed
        printServerLine("X", "".padEnd(config.MIN_SERVER_CHARACTERS), LONG_NUMBER, LONG_NUMBER);
        const MAX_OUTPUT_CHARS = lengthOfLastLog();
        if (config.OUTPUT_WIDTH < MAX_OUTPUT_CHARS) {
            warn("funky UI stuff may occur unless you increase OUTPUT_WIDTH or decrease "
                + `MIN_SERVER_CHARACTERS by ${MAX_OUTPUT_CHARS - config.OUTPUT_WIDTH}`);
        }
    }
    ns.clearLog();
    for (let i = 0; i < config.MAX_LINES + 2; ++i) {
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
            ns.tprint("arguments: which managers you want enabled.", "\nSupply 'hn' for the hacknet manager, and/or 'ps' for the player server manager.", "\nFor neither, please supply 'no'.");
            ns.exit();
        }
        const unknownArgs = [];
        for (const arg of ns.args) {
            if (arg === "hn") {
                netManager = true;
            }
            else if (arg === "ps") {
                serverManager = true;
            }
            else if (arg !== "no") {
                unknownArgs.push(arg);
            }
        }
        if (unknownArgs.length) {
            error("Did not understand arguments [" + unknownArgs.join(", ") + "]!");
        }
    }
    else {
        netManager = await ns.prompt("Activate Hacknet Manager?");
        serverManager = await ns.prompt("Activate Player Server Manager?");
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
    const LETTERS = ["G", "W", "H"]; // the main action should never be Share
    /** The filenames for each hacking type. */
    const FILES = ["grow.js", "weak.js", "hack.js", "share.js"];
    ns.write(FILES[HType.Grow], "export async function main(ns) {\nawait ns.grow(ns.args[0])\n}", "w");
    ns.write(FILES[HType.Weaken], "export async function main(ns) {\nawait ns.weaken(ns.args[0])\n}", "w");
    ns.write(FILES[HType.Hack], "export async function main(ns) {\nawait ns.hack(ns.args[0])\n}", "w");
    ns.write(FILES[HType.Share], "export async function main(ns) {\nwhile(true) {\nawait ns.share()\n}\n}", "w");
    /** The RAM costs of each HType */
    const RAM_COSTS = FILES.map((file) => ns.getScriptRam(file));
    const WEAKEN_GROW_COST = Math.max(RAM_COSTS[HType.Grow], RAM_COSTS[HType.Weaken]);
    /** the largest cost in RAM of grow.js, weak.js, or hack.js */
    const ACT_COST = Math.max(WEAKEN_GROW_COST, RAM_COSTS[HType.Hack]);
    /** The server from which this script is being run */
    const HOME = ns.getHostname();
    /** A list of all server names. Currently unused.
     * @type {string[]} */
    let servers;
    /** A sorted array of [max RAM, server name] to run hacking scripts from
     * @type {[number, string][]} */
    let hosts;
    /** A sorted array of [approx. profitability, server name] to target for hacking
     * @type {[number, string][]} */
    let targets;
    /** The exploits/executables that are available to you
     * @type {string[]} */
    let exes;
    /** A dictionary from server name to the first letter of the
     * main action being done to it: H(ack), G(row), or W(eaken)
     * @dict
     * @type {Object.<string, string>} */
    let act;
    /** @type {[number, ...string[]]} */
    // https://www.compart.com/en/unicode/block/U+2580
    // const cycle = [1, "▄", "▌", "▀", "▐"];
    // https://www.compart.com/en/unicode/block/U+2500
    const cycle = [1, "|", "/", "─", "\\"];
    /** @nosideeffects
     * @param {number} c the cost being checked
     * @param {number} d the denominator/proportion of money considered available */
    const checkM = (c, d) => { return c < ns.getPlayer().money / d; };
    /** @param {[number,T][]} arr
     * @modifies {arr}
     * @template T */
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    const arraySort = (arr) => arr.sort((a, b) => b[0] - a[0]);
    /** @param {string} t The type of info to get; an acronym of
     * MaxMoney, MoneyAvailable, MaxRam, UsedRam, NumPortsRequired,
     * RequiredHackingLevel, SecurityLevel, or MinSecurityLevel.
     * @param {string} s The server to get the info for */
    function info(t, s) {
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
    function sname(s) {
        if (s.length <= config.MIN_SERVER_CHARACTERS + 1) {
            return s;
        }
        return s.substring(0, config.MIN_SERVER_CHARACTERS) + "…";
    }
    /** Does `ns.print` of the `prefix` then `str`, padded in the middle by `pad` such that the line length is `OUTPUT_WIDTH`.
     * @param {string} prefix
     * @param {string} str
     * @param {string} pad */
    function pprint(prefix, pad, str) {
        ns.print(prefix, str.padStart(config.OUTPUT_WIDTH - prefix.length, pad));
    }
    /** Prints a server status line.
     * @param {string} action The letter or symbol of the action being done to the server
     * @param {string} name The name of the server
     * @param {number} MA The amount of money available on the server
     * @param {number} MM The maximum amount of money the server can contain */
    function printServerLine(action, name, MA, MM) {
        pprint(`║ ${action} ║ ${name}`, " ", `${ns.formatNumber(MA, 0)} / ${ns.formatNumber(MM, 0)} : ${ns.formatPercent(MA / MM, 0)} ║`);
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
            printServerLine(act[t[1]], sname(t[1]), info("MA", t[1]), info("MM", t[1]));
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
                printServerLine(act[t[1]], sname(t[1]), info("MA", t[1]), info("MM", t[1]));
            }
        }
        else {
            pprint("╚", "═", "╝");
        }
    }
    /** Combined scan and preparation of all servers
     * @param {string} prev The server we scanned last
     * @param {string} current The server we're scanning
     * @modifies {hosts, targets} */
    async function scanServers(prev, current) {
        for (const server of ns.scan(current)) {
            if ((ns.getPurchasedServers().includes(server) || info("NPR", server) <= exes.length) && prev != server) {
                if (!ns.getPurchasedServers().includes(server)) {
                    for (const exe of exes) {
                        ns[exe](server);
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
                ns.scp(FILES, server);
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
            function fRam() {
                // Don't count the RAM we're `share()`ing as "committed" - it's completely adjustable
                return host[0] - info("UR", host[1]) + sharedRAM;
            }
            /** Stop `share()`ing any RAM on this host */
            function resetShare() {
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
            let hType;
            if (1 / growthAmount < config.GROW_THRESHOLD) {
                hType = HType.Grow;
            }
            else if (securityAmount > config.MAX_SECURITY || loop) {
                hType = HType.Weaken;
                const maxThreads = Math.floor(fRam() / RAM_COSTS[hType]);
                // No point `weaken()`ing more than securityAmount:
                const threads = Math.ceil(Math.min(maxThreads, securityAmount / weakenSLChange));
                if (threads > 0) {
                    resetShare();
                    ns.exec(FILES[hType], host[1], threads, target);
                }
            }
            else {
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
                function remainingThreads(h) {
                    const cost = h === undefined ? WEAKEN_GROW_COST : RAM_COSTS[h];
                    return Math.floor(fRam() / cost);
                }
                /** The optimal number of `grow()` threads to maximize money before any `hack()`s complete */
                const growThreads = Math.ceil(ns.growthAnalyze(target, growthAmount, cores));
                if (growThreads >= remainingThreads(HType.Grow)) {
                    resetShare();
                    ns.exec(FILES[HType.Grow], host[1], remainingThreads(HType.Grow), target);
                }
                else {
                    /** The optimal number of `weaken()` threads to minimize security after any other hacks complete */
                    const weakenThreads = Math.ceil((securityAmount + hackSecurity + growThreads * growSLChange) / weakenSLChange);
                    const bothThreads = growThreads + weakenThreads;
                    /** The (optimal) number of `grow()` threads we can actually afford */
                    const finalGrowThreads = Math.min(growThreads, remainingThreads(HType.Grow), Math.ceil(remainingThreads() * growThreads / bothThreads));
                    if (finalGrowThreads > 0) {
                        resetShare();
                        ns.exec(FILES[HType.Grow], host[1], finalGrowThreads, target);
                        /** The (optimal) number of `weaken()` threads we can actually afford */
                        const finalWeakenThreads = Math.min(weakenThreads, remainingThreads(HType.Weaken), Math.ceil(remainingThreads() * weakenThreads / bothThreads));
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
                ns.exec(FILES[HType.Share], host[1], Math.floor(fRam() / RAM_COSTS[HType.Share]));
            }
            tarIndex++;
        }
    }
    // MODULES BELOW HERE
    /** @param {number} d the maximum proportion (denominator) of money to spend */
    function hnManager(d) {
        if (checkM(ns.hacknet.getPurchaseNodeCost(), d)) {
            ns.hacknet.purchaseNode();
        }
        for (let i = 0; i < ns.hacknet.numNodes(); i++) {
            for (const part of ["Level", "Ram", "Core"]) {
                if (checkM(ns.hacknet["get" + part + "UpgradeCost"](i, 1), d)) {
                    ns.hacknet["upgrade" + part](i, 1);
                }
            }
        }
    }
    /** @param {number} d the maximum proportion (denominator) of money to spend */
    function pServerManager(d) {
        let ram = config.PSERV_MIN_RAM;
        if (!checkM(ns.getPurchasedServerCost(ram), d)) {
            // can't afford any worthwhile servers yet
            return;
        }
        while (ram < ns.getPurchasedServerMaxRam() && checkM(ns.getPurchasedServerCost(ram * 2), d)) {
            ram *= 2;
        }
        function buyServer(r) {
            ns.purchaseServer("SERVER-" + ns.formatRam(r, 1), r);
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
            }
            catch { }
            i = 0;
        }
        log();
        const MILLIS_PER_SECOND = 1000.0;
        await ns.sleep(config.PERIOD * MILLIS_PER_SECOND);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b0Zhcm0uanMiLCJzb3VyY2VSb290IjoiaHR0cDovL2xvY2FsaG9zdDo4MDAwL3NvdXJjZXMvIiwic291cmNlcyI6WyJhdXRvRmFybS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDOUM7Ozs7Ozs7b0JBT29CO0FBQ3BCLE1BQU0sQ0FBQyxLQUFLLFVBQVUsSUFBSSxDQUFDLEVBQW9CO0lBQzlDLEVBQUUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDckIsNkRBQTZEO0lBQzdELE1BQU0sV0FBVyxHQUFHLG9CQUFvQixDQUFDO0lBQ3pDLE1BQU0sY0FBYyxHQUFHO1FBQ3RCLGdCQUFnQjtRQUNoQixtREFBbUQ7UUFDbkQsU0FBUyxFQUFFLEVBQUU7UUFDYix1RUFBdUU7UUFDdkUscUJBQXFCLEVBQUUsRUFBRTtRQUN6QixtREFBbUQ7UUFDbkQscUJBQXFCLEVBQUUsRUFBRTtRQUN6Qiw4Q0FBOEM7UUFDOUMsWUFBWSxFQUFFLEVBQUU7UUFDaEIsdUdBQXVHO1FBQ3ZHLG1CQUFtQixFQUFFLEtBQUs7UUFDMUIsbUJBQW1CO1FBQ25CLCtEQUErRDtRQUMvRCxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUM7UUFDYixxRkFBcUY7UUFDckYsY0FBYyxFQUFFLElBQUk7UUFDcEIsd0ZBQXdGO1FBQ3hGLFlBQVksRUFBRSxHQUFHO1FBQ2pCLCtEQUErRDtRQUMvRCxTQUFTLEVBQUUsR0FBRztRQUNkLG1GQUFtRjtRQUNuRixPQUFPLEVBQUUsR0FBRztRQUNaLCtHQUErRztRQUMvRyxTQUFTLEVBQUUsRUFBRTtRQUNiLDZGQUE2RjtRQUM3RixtQkFBbUIsRUFBRSxJQUFJO1FBQ3pCLHFGQUFxRjtRQUNyRix3QkFBd0IsRUFBRSxFQUFFO1FBQzVCLGlGQUFpRjtRQUNqRixzQkFBc0IsRUFBRSxFQUFFO1FBQzFCLHVEQUF1RDtRQUN2RCxhQUFhLEVBQUUsQ0FBQztRQUNoQixtREFBbUQ7UUFDbkQsTUFBTSxFQUFFLEdBQUc7UUFDWCx5REFBeUQ7UUFDekQsa0JBQWtCLEVBQUUsQ0FBQyxlQUFlLENBQUM7UUFDckMsb0VBQW9FO1FBQ3BFLHlCQUF5QixFQUFFLElBQUk7S0FDL0IsQ0FBQztJQUNGLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxFQUFFLEVBQUUsV0FBVyxFQUFFLGNBQWMsQ0FBQyxDQUFDO0lBRTVELG9EQUFvRDtJQUNwRCxTQUFTLEtBQUssQ0FBQyxHQUFXO1FBQ3pCLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDakYsQ0FBQztJQUNELHNEQUFzRDtJQUN0RCxTQUFTLElBQUksQ0FBQyxHQUFXO1FBQ3hCLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDbkYsQ0FBQztJQUVELDhCQUE4QjtJQUM5Qix5RUFBeUU7SUFDekUsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDO0lBQzdCLDJFQUEyRTtJQUMzRSxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUM7SUFDOUIsU0FBUyxlQUFlO1FBQ3ZCLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNoQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUNuQyxDQUFDO0lBQ0QsNERBQTREO0lBQzVELGVBQWUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDL0UsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxFQUFFLHFDQUFxQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ25HLElBQUksTUFBTSxDQUFDLFlBQVksR0FBRyxnQkFBZ0IsRUFBRTtRQUMzQyxLQUFLLENBQUMsMEVBQTBFO2NBQzdFLEdBQUcsZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLFlBQVkscUJBQXFCLENBQUMsQ0FBQztLQUNuRTtTQUFNO1FBQ04sMkRBQTJEO1FBQzNELGVBQWUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsRUFBRSxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDeEYsTUFBTSxnQkFBZ0IsR0FBRyxlQUFlLEVBQUUsQ0FBQztRQUMzQyxJQUFJLE1BQU0sQ0FBQyxZQUFZLEdBQUcsZ0JBQWdCLEVBQUU7WUFDM0MsSUFBSSxDQUFDLHdFQUF3RTtrQkFDMUUsNEJBQTRCLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO1NBQ3pFO0tBQ0Q7SUFFRCxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDZCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUU7UUFDNUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUNiO0lBQ0QsSUFBSSxFQUFFLENBQUMsYUFBYSxFQUFFLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUU7UUFDakQsS0FBSyxDQUFDLG9HQUFvRyxDQUFDLENBQUM7S0FDNUc7SUFFRCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDOUMsTUFBTSxLQUFLLENBQUMsMENBQTBDLE1BQU0sQ0FBQyxhQUFhLElBQUksQ0FBQyxDQUFDO0tBQ2hGO0lBQ0QsNEJBQTRCO0lBRTVCLDhCQUE4QjtJQUM5QixJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUM7SUFDdkIsSUFBSSxhQUFhLEdBQUcsS0FBSyxDQUFDO0lBQzFCLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7UUFDbkIsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN0RCxFQUFFLENBQUMsTUFBTSxDQUFDLDZDQUE2QyxFQUN0RCxtRkFBbUYsRUFDbkYsb0NBQW9DLENBQUMsQ0FBQztZQUN2QyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7U0FDVjtRQUNELE1BQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQztRQUN2QixLQUFLLE1BQU0sR0FBRyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUU7WUFDMUIsSUFBSSxHQUFHLEtBQUssSUFBSSxFQUFFO2dCQUNqQixVQUFVLEdBQUcsSUFBSSxDQUFDO2FBQ2xCO2lCQUFNLElBQUksR0FBRyxLQUFLLElBQUksRUFBRTtnQkFDeEIsYUFBYSxHQUFHLElBQUksQ0FBQzthQUNyQjtpQkFBTSxJQUFJLEdBQUcsS0FBSyxJQUFJLEVBQUU7Z0JBQ3hCLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDdEI7U0FDRDtRQUNELElBQUksV0FBVyxDQUFDLE1BQU0sRUFBRTtZQUN2QixLQUFLLENBQUMsZ0NBQWdDLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztTQUN4RTtLQUNEO1NBQU07UUFDTixVQUFVLEdBQUcsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLDJCQUEyQixDQUFZLENBQUM7UUFDckUsYUFBYSxHQUFHLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxpQ0FBaUMsQ0FBWSxDQUFDO0tBQzlFO0lBRUQ7d0JBQ29CO0lBQ3BCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7UUFDM0IsSUFBSSxFQUFFLENBQUM7UUFDUCxNQUFNLEVBQUUsQ0FBQztRQUNULElBQUksRUFBRSxDQUFDO1FBQ1AsS0FBSyxFQUFFLENBQUM7S0FDUixDQUFDLENBQUM7SUFDSCw0RkFBNEY7SUFDNUYsTUFBTSxPQUFPLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUUsd0NBQXdDO0lBQzFFLDJDQUEyQztJQUMzQyxNQUFNLEtBQUssR0FBRyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQzVELEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxnRUFBZ0UsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNuRyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsa0VBQWtFLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDdkcsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLGdFQUFnRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ25HLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSx5RUFBeUUsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUU3RyxrQ0FBa0M7SUFDL0IsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzdELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNsRiw4REFBOEQ7SUFDOUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFFdEUscURBQXFEO0lBQ3JELE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUU5QjswQkFDc0I7SUFDdEIsSUFBSSxPQUFpQixDQUFDO0lBQ3RCO29DQUNnQztJQUNoQyxJQUFJLEtBQXlCLENBQUM7SUFDOUI7b0NBQ2dDO0lBQ2hDLElBQUksT0FBMkIsQ0FBQztJQUNoQzswQkFDc0I7SUFDdEIsSUFBSSxJQUFjLENBQUM7SUFDbkI7Ozt5Q0FHcUM7SUFDckMsSUFBSSxHQUEyQixDQUFDO0lBQ2hDLG9DQUFvQztJQUNwQyxrREFBa0Q7SUFDbEQseUNBQXlDO0lBQ3pDLGtEQUFrRDtJQUNsRCxNQUFNLEtBQUssR0FBMEIsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFOUQ7O29GQUVnRjtJQUNoRixNQUFNLE1BQU0sR0FBRyxDQUFDLENBQVMsRUFBRSxDQUFTLEVBQUUsRUFBRSxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFBLENBQUMsQ0FBQyxDQUFDO0lBQ2pGOztxQkFFaUI7SUFDakIsOEVBQThFO0lBQzlFLE1BQU0sU0FBUyxHQUFHLENBQUksR0FBa0IsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM3RTs7OzBEQUdzRDtJQUN0RCxTQUFTLElBQUksQ0FBQyxDQUFTLEVBQUUsQ0FBUztRQUNqQyxRQUFRLENBQUMsRUFBRTtZQUNWLEtBQUssSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNoRCxLQUFLLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4QyxLQUFLLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pDLEtBQUssS0FBSyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkQsS0FBSyxLQUFLLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN2RCxLQUFLLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9DLEtBQUssS0FBSyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkQsT0FBTyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDL0M7SUFDRixDQUFDO0lBRUQsdUJBQXVCO0lBQ3ZCLFNBQVMsUUFBUTtRQUNoQixLQUFLLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsVUFBVSxFQUFFLFdBQVcsQ0FBQyxFQUFFO1lBQ2pGLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLEVBQUU7Z0JBQ2hDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDZjtTQUNEO0lBQ0YsQ0FBQztJQUVEOzJCQUN1QjtJQUN2QixTQUFTLEtBQUssQ0FBQyxDQUFTO1FBQ3ZCLElBQUksQ0FBQyxDQUFDLE1BQU0sSUFBSSxNQUFNLENBQUMscUJBQXFCLEdBQUcsQ0FBQyxFQUFFO1lBQ2pELE9BQU8sQ0FBQyxDQUFDO1NBQ1Q7UUFDRCxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLEdBQUcsQ0FBQztJQUMzRCxDQUFDO0lBRUQ7Ozs2QkFHeUI7SUFDekIsU0FBUyxNQUFNLENBQUMsTUFBYyxFQUFFLEdBQVcsRUFBRSxHQUFXO1FBQ3ZELEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFlBQVksR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDMUUsQ0FBQztJQUVEOzs7OytFQUkyRTtJQUMzRSxTQUFTLGVBQWUsQ0FBQyxNQUFjLEVBQUUsSUFBWSxFQUFFLEVBQVUsRUFBRSxFQUFVO1FBQzVFLE1BQU0sQ0FBQyxLQUFLLE1BQU0sTUFBTSxJQUFJLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsWUFBWSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsYUFBYSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ25JLENBQUM7SUFFRCxTQUFTLEdBQUc7UUFDWCxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUU7WUFDL0IsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNiO1FBQ0QsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2Qsa0RBQWtEO1FBQ2xELE1BQU0sQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzFCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQzNELE1BQU0sQ0FBQyxLQUFLLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ25FLEtBQUssTUFBTSxDQUFDLElBQUksR0FBRyxFQUFFO1lBQ3BCLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzVFO1FBQ0QsTUFBTSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDMUIsTUFBTSxDQUFDLFNBQVMsSUFBSSxDQUFDLE1BQU0sY0FBYyxLQUFLLENBQUMsTUFBTSxjQUFjLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFFL0YsSUFBSSxVQUFVLElBQUksYUFBYSxFQUFFO1lBQ2hDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3RCLElBQUksR0FBRyxHQUFHLFlBQVksQ0FBQztZQUN2QixJQUFJLFVBQVUsRUFBRTtnQkFDZixHQUFHLElBQUksZUFBZSxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7YUFDOUM7WUFDRCxJQUFJLGFBQWEsRUFBRTtnQkFDbEIsR0FBRyxJQUFJLGdCQUFnQixFQUFFLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQzthQUN6RDtZQUNELE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQ3RCO1FBRUQsSUFBSSxNQUFNLENBQUMsbUJBQW1CLEVBQUU7WUFDL0IsTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDdEIsTUFBTSxDQUFDLGlCQUFpQixFQUFFLENBQUMsYUFBYSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDeEQ7UUFFRCxJQUFJLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRTtZQUMvQixNQUFNLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUMxQixNQUFNLENBQUMsS0FBSyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRSxlQUFlLENBQUMsQ0FBQztZQUNwRSxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsRUFBRSxNQUFNLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN0RyxLQUFLLE1BQU0sQ0FBQyxJQUFJLEdBQUcsRUFBRTtnQkFDcEIsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDNUU7U0FDRDthQUFNO1lBQ04sTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDdEI7SUFDRixDQUFDO0lBRUQ7OztvQ0FHZ0M7SUFDaEMsS0FBSyxVQUFVLFdBQVcsQ0FBQyxJQUFZLEVBQUUsT0FBZTtRQUN2RCxLQUFLLE1BQU0sTUFBTSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDdEMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLElBQUksTUFBTSxFQUFFO2dCQUN4RyxJQUFJLENBQUMsRUFBRSxDQUFDLG1CQUFtQixFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFO29CQUMvQyxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBRTt3QkFDdEIsRUFBRSxDQUFDLEdBQWUsQ0FBOEIsQ0FBQyxNQUFNLENBQUMsQ0FBQztxQkFDMUQ7b0JBQ0QsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztpQkFDaEI7Z0JBQ0QsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxlQUFlLEVBQUUsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxPQUFPLEVBQUU7b0JBQ2xILE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7aUJBQzdFO2dCQUNELElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsR0FBRyxRQUFRLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRTtvQkFDdEUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztpQkFDekM7Z0JBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDckIsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ3RCLE1BQU0sV0FBVyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQzthQUNuQztTQUNEO1FBQ0QsSUFBSSxDQUFDLElBQUksRUFBRTtZQUNWLHdEQUF3RDtZQUN4RCxPQUFPLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzdCLEtBQUssR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDekI7SUFDRixDQUFDO0lBRUQ7eUJBQ3FCO0lBQ3JCLFNBQVMsT0FBTztRQUNmLDhCQUE4QjtRQUM5QixJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUM7UUFDakIseURBQXlEO1FBQ3pELElBQUksSUFBSSxHQUFHLEtBQUssQ0FBQztRQUNqQixLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtZQUN6QixJQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDbEMsUUFBUSxHQUFHLENBQUMsQ0FBQztnQkFDYixJQUFJLEdBQUcsSUFBSSxDQUFDO2FBQ1o7WUFDRCxxQ0FBcUM7WUFDckMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BDO2dDQUNvQjtZQUNwQixJQUFJLFNBQVMsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDeEcsbURBQW1EO1lBQ25ELFNBQVMsSUFBSTtnQkFDWixxRkFBcUY7Z0JBQ3JGLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDO1lBQ2xELENBQUM7WUFDRCw2Q0FBNkM7WUFDN0MsU0FBUyxVQUFVO2dCQUNsQixFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JDLFNBQVMsR0FBRyxDQUFDLENBQUM7WUFDZixDQUFDO1lBQ0QsOERBQThEO1lBQzlELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztZQUNoRSxtRkFBbUY7WUFDbkYsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQzNGLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO1lBQzdDLE1BQU0sWUFBWSxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ25FLE1BQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ2xELE1BQU0sWUFBWSxHQUFHLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDdkQsd0VBQXdFO1lBQ3hFLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQztZQUNyQjsrQkFDbUI7WUFDbkIsSUFBSSxLQUF1QyxDQUFDO1lBQzVDLElBQUksQ0FBQyxHQUFHLFlBQVksR0FBRyxNQUFNLENBQUMsY0FBYyxFQUFFO2dCQUM3QyxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQzthQUNuQjtpQkFBTSxJQUFJLGNBQWMsR0FBRyxNQUFNLENBQUMsWUFBWSxJQUFJLElBQUksRUFBRTtnQkFDeEQsS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7Z0JBQ3JCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQ3pELG1EQUFtRDtnQkFDbkQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxjQUFjLEdBQUcsY0FBYyxDQUFDLENBQUMsQ0FBQztnQkFDakYsSUFBSSxPQUFPLEdBQUcsQ0FBQyxFQUFFO29CQUNoQixVQUFVLEVBQUUsQ0FBQztvQkFDYixFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2lCQUNoRDthQUNEO2lCQUFNO2dCQUNOLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO2dCQUNuQixLQUFLLE1BQU0sQ0FBQyxJQUFJLEtBQUssRUFBRTtvQkFDdEIsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7d0JBQ3JFLHNFQUFzRTt3QkFDdEUsS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7d0JBQ25CLE1BQU07cUJBQ047aUJBQ0Q7Z0JBQ0QsSUFBSSxLQUFLLEtBQUssS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO29CQUNyRSxJQUFJLElBQUksRUFBRSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxFQUFFO3dCQUNqRCxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO3FCQUNwQjtvQkFDRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO29CQUN6RCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUN2SCxJQUFJLE9BQU8sR0FBRyxDQUFDLEVBQUU7d0JBQ2hCLFVBQVUsRUFBRSxDQUFDO3dCQUNiLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7d0JBQ2hELFlBQVksR0FBRyxZQUFZLEdBQUcsT0FBTyxDQUFDO3FCQUN0QztpQkFDRDthQUNEO1lBQ0QsSUFBSSxLQUFLLEtBQUssS0FBSyxDQUFDLE1BQU0sSUFBSSxJQUFJLEVBQUUsSUFBSSxnQkFBZ0IsRUFBRTtnQkFDekQ7Ozs7bUJBSUc7Z0JBQ0g7O2lFQUVpRDtnQkFDakQsU0FBUyxnQkFBZ0IsQ0FBQyxDQUFnQjtvQkFDekMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDL0QsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO2dCQUNsQyxDQUFDO2dCQUNELDZGQUE2RjtnQkFDN0YsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDN0UsSUFBSSxXQUFXLElBQUksZ0JBQWdCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUNoRCxVQUFVLEVBQUUsQ0FBQztvQkFDYixFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztpQkFDMUU7cUJBQU07b0JBQ04sbUdBQW1HO29CQUNuRyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsY0FBYyxHQUFHLFlBQVksR0FBRyxXQUFXLEdBQUcsWUFBWSxDQUFDLEdBQUcsY0FBYyxDQUFDLENBQUM7b0JBQy9HLE1BQU0sV0FBVyxHQUFHLFdBQVcsR0FBRyxhQUFhLENBQUM7b0JBQ2hELHNFQUFzRTtvQkFDdEUsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQzFFLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxXQUFXLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQztvQkFDNUQsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLEVBQUU7d0JBQ3pCLFVBQVUsRUFBRSxDQUFDO3dCQUNiLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUM7d0JBQzlELHdFQUF3RTt3QkFDeEUsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQ2hGLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxhQUFhLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQzt3QkFDOUQsSUFBSSxrQkFBa0IsR0FBRyxDQUFDLEVBQUU7NEJBQzNCLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLENBQUM7eUJBQ2xFO3FCQUNEO2lCQUNEO2FBQ0Q7WUFDRCxJQUFJLENBQUMsSUFBSSxFQUFFO2dCQUNWLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDN0I7WUFDRCxJQUFJLE1BQU0sQ0FBQyxtQkFBbUIsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLFNBQVMsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ2pGLFVBQVUsRUFBRSxDQUFDO2dCQUNiLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNsRjtZQUNELFFBQVEsRUFBRSxDQUFDO1NBQ1g7SUFDRixDQUFDO0lBQ0QscUJBQXFCO0lBQ3JCLCtFQUErRTtJQUMvRSxTQUFTLFNBQVMsQ0FBQyxDQUFTO1FBQzNCLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRTtZQUNoRCxFQUFFLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDO1NBQzFCO1FBQ0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDL0MsS0FBSyxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLEVBQUU7Z0JBQzVDLElBQUksTUFBTSxDQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLElBQUksR0FBRyxhQUF3QyxDQUEwQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtvQkFDbEksRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsSUFBK0IsQ0FBMEMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7aUJBQ3hHO2FBQ0Q7U0FDRDtJQUNGLENBQUM7SUFDRCwrRUFBK0U7SUFDL0UsU0FBUyxjQUFjLENBQUMsQ0FBUztRQUNoQyxJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFDO1FBQy9CLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFO1lBQy9DLDBDQUEwQztZQUMxQyxPQUFPO1NBQ1A7UUFDRCxPQUFPLEdBQUcsR0FBRyxFQUFFLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxNQUFNLENBQUMsRUFBRSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtZQUM1RixHQUFHLElBQUksQ0FBQyxDQUFDO1NBQ1Q7UUFDRCxTQUFTLFNBQVMsQ0FBQyxDQUFTO1lBQzNCLEVBQUUsQ0FBQyxjQUFjLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RELENBQUM7UUFDRCxJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFO1lBQzlFLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNmO1FBQ0QsS0FBSyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDOUQsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEMsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxHQUFHLEdBQUcsSUFBSSxNQUFNLENBQUMsRUFBRSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ3hHLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2hCLEVBQUUsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3JCLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNmO1NBQ0Q7SUFDRixDQUFDO0lBQ0QscUJBQXFCO0lBQ3JCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNWLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNWLDJEQUEyRDtJQUMzRCxPQUFPLElBQUksRUFBRTtRQUNaLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDYixPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNWLEtBQUssR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNuRSxHQUFHLEdBQUcsRUFBRSxDQUFDO1FBQ1QsUUFBUSxFQUFFLENBQUM7UUFDWCxNQUFNLFdBQVcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDNUIsT0FBTyxFQUFFLENBQUM7UUFDVixJQUFJLFVBQVUsRUFBRTtZQUNmLFNBQVMsQ0FBQyxNQUFNLENBQUMsd0JBQXdCLENBQUMsQ0FBQztTQUMzQztRQUNELElBQUksYUFBYSxFQUFFO1lBQ2xCLGNBQWMsQ0FBQyxNQUFNLENBQUMsc0JBQXNCLENBQUMsQ0FBQztTQUM5QztRQUNELElBQUksTUFBTSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLE1BQU0sQ0FBQyx5QkFBeUIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDbEcsSUFBSTtnQkFDSCxNQUFNLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7YUFDMUQ7WUFBQyxNQUFNLEdBQUc7WUFDWCxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ047UUFDRCxHQUFHLEVBQUUsQ0FBQztRQUNOLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxDQUFDO1FBQ2pDLE1BQU0sRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLGlCQUFpQixDQUFDLENBQUM7S0FDbEQ7QUFDRixDQUFDIn0=