/**
 * Welcome to the Auto Farm part 2: Electric Boogaloo - Advanced Edition!
 * This script is a little more complicated to explain easily, it dedicates high RAM servers to attack high profit servers.
 * This is also set and forget, your EXEs and hacking level are reacquired each second, so new servers are added without needing to reboot it.
 * We hope this brings you ideas, knowledge, and/or profits :D
 * Originally by PG SDVX, https://steamcommunity.com/sharedfiles/filedetails/?id=2686833015
 * Edits by MycroftJr
 * @param {import("../.").NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');
    
    /** The minimal number of characters that make up the display */
    const MIN_OUTPUT_CHARS = 25;
    /** The maximum number of lines one log can hold before it starts dropping lines from the top */
    const MAX_LINES_IN_LOG = 51;
    
    /** ADJUSTABLE VALUES START */
    // UI parameters
    /** The maximum total number of lines to display */
    const NUM_LINES = Math.min(51, MAX_LINES_IN_LOG);
    /** The minimum number of characters to display for each server name */
    const MIN_SERVER_CHARACTERS = 15;
    /** The number of high-profit targets to display */
    const NUM_HIGH_PROFIT_TARGS = 12;
    /** The fixed width in characters of the UI */
    const OUTPUT_WIDTH = Math.max(43, MIN_SERVER_CHARACTERS + MIN_OUTPUT_CHARS);
    /** Whether to print lower-profit targets at the bottom of the UI */
    const PRINT_LOWER_PROFITS = false;
    
    // Logic parameters
    /** Servers names that won't be used as hosts or get deleted */
    const EXCLUDE = [''];
    /** The percent of maxmium money under which we'll `grow()` instead of `hack()`ing */
    const GROW_THRESHOLD = 0.8;
    /** The amount of security levels above the minimum after which we'll only `weaken()` */
    const MAX_SECURITY = 5.0;
    /** The maximum percent of money to `hack()` out of a server */
    const MAX_DRAIN = 0.7;
    /** ADJUSTABLE VALUES END */
    
    /** grow, weak, hack, share */
    const files = ['grow.js', 'weak.js', 'hack.js', 'share.js'];
    await ns.write(files[0], 'export async function main(ns) {\nawait ns.grow(ns.args[0])\n}', 'w');
    await ns.write(files[1], 'export async function main(ns) {\nawait ns.weaken(ns.args[0])\n}', 'w');
    await ns.write(files[2], 'export async function main(ns) {\nawait ns.hack(ns.args[0])\n}', 'w');
    await ns.write(files[3], 'export async function main(ns) {\nwhile(true) {\nawait ns.share()\n}\n}', 'w');
    
    const MAX_OUTPUT_CHARS = 28;
    if (OUTPUT_WIDTH - MIN_SERVER_CHARACTERS < MAX_OUTPUT_CHARS) {
        ns.tprint("funky UI stuff may occur unless you increase OUTPUT_WIDTH or decrease "
            + `MIN_SERVER_CHARACTERS by ${MAX_OUTPUT_CHARS + MIN_SERVER_CHARACTERS - OUTPUT_WIDTH}`);
    }
    
    /** Enum for the hack types.
     * @enum {string} */
    const HType = {
        Grow: "G",
        Weaken: "W",
        Hack: "H"
    };
    
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
    let netManager = false;
    let serverManager = false;
    /** @type {[number, ...string[]]} */
    // https://www.compart.com/en/unicode/block/U+2580
    // var cycle = [1, '▄', '▌', '▀', '▐'];
    // https://www.compart.com/en/unicode/block/U+2500
    const cycle = [1, '|', '/', '─', '\\'];
    
    /** @nosideeffects
     * @param {number} c
     * @param {number} d */
    const checkM = (c, d) => { return c < ns.getPlayer().money / d; };
    /** @param {[number,T][]} arr
     * @modifies {arr}
     * @template T */
    const arraySort = (arr) => arr.sort((a, b) => b[0] - a[0]);
    /** Truncates the given server name for display
     * @param {string} s */
    function str(s) {
        if (s.length <= MIN_SERVER_CHARACTERS + 1) {
            return s;
        }
        return s.substring(0, MIN_SERVER_CHARACTERS) + '…';
    }
    /** @param {string} t The type of info to get; an acronym of
     * MaxMoney, MoneyAvailable, MaxRam, UsedRam, NumPortsRequired,
     * RequiredHackingLevel, SecurityLevel, or MinSecurityLevel.
     * @param {string} s The server to get the info for */
    function info(t, s) {
        switch (t) {
            case 'MM': return ns.getServerMaxMoney(s);
            case 'MA': return ns.getServerMoneyAvailable(s);
            case 'MR': return ns.getServerMaxRam(s);
            case 'UR': return ns.getServerUsedRam(s);
            case 'NPR': return ns.getServerNumPortsRequired(s);
            case 'RHL': return ns.getServerRequiredHackingLevel(s);
            case 'SL': return ns.getServerSecurityLevel(s);
            case 'MSL': return ns.getServerMinSecurityLevel(s);
            default: throw Error(`Unknown info code ${t}`);
        }
    }
    
    /** @modifies {exes} */
    async function scanExes() {
        for (const hack of ['brutessh', 'ftpcrack', 'relaysmtp', 'sqlinject', 'httpworm']) {
            if (ns.fileExists(hack + '.exe')) {
                exes.push(hack);
            }
        }
    }
    
    function log() {
        if (++cycle[0] >= cycle.length) {
            cycle[0] = 1;
        }
        ns.clearLog();
        // https://www.compart.com/en/unicode/block/U+2500
        ns.print(`╔═══╦${"╗".padStart(OUTPUT_WIDTH - 5, "═")}`);
        const tmp = targets.slice(0, NUM_HIGH_PROFIT_TARGS);
        ns.print(`║ ${cycle[cycle[0]]} ║ HIGH PROFIT${"BALANCE     ║".padStart(OUTPUT_WIDTH - 17)}`);
        for (const t of tmp) {
            ns.print(`║ ${act[t[1]]} ║ ${str(t[1])}` + `${ns.nFormat(info('MA', t[1]), '0a')} / ${ns.nFormat(info('MM', t[1]), '0a')} : ${ns.nFormat(info('MA', t[1]) / info('MM', t[1]), '0%')} ║`.padStart(OUTPUT_WIDTH - 6 - str(t[1]).length));
        }
        ns.print(`╠═══╩${"╣".padStart(OUTPUT_WIDTH - 5, "═")}`);
        ns.print(`║ EXE ${exes.length}/5 ║ HOSTS ${hosts.length} ║ TARGETS ${targets.length}`.padEnd(OUTPUT_WIDTH - 1) + '║');
        let nonServerLinesPrinted = 4;
        
        if (netManager || serverManager) {
            ns.print(`╠${"╣".padStart(OUTPUT_WIDTH - 1, "═")}`);
            let tmp = '║ MANAGER';
            if (netManager) {
                tmp += ' ║ HN-Nodes ' + ns.hacknet.numNodes();
            }
            if (serverManager) {
                tmp += ' ║ P-Servers ' + ns.getPurchasedServers().length;
            }
            ns.print(tmp.padEnd(OUTPUT_WIDTH - 1) + '║');
            nonServerLinesPrinted += 2;
        }
        if (PRINT_LOWER_PROFITS) {
            ns.print(`╠═══╦${"╣".padStart(OUTPUT_WIDTH - 5, "═")}`);
            const tmp = targets.slice(NUM_HIGH_PROFIT_TARGS, NUM_LINES - nonServerLinesPrinted - 2);
            ns.print(`║ ${cycle[cycle[0]]} ║ LOWER PROFIT${"BALANCE     ║".padStart(OUTPUT_WIDTH - 18)}`);
            for (const t of tmp) {
                ns.print(`║ ${act[t[1]]} ║ ${str(t[1])}` + `${ns.nFormat(info('MA', t[1]), '0a')} / ${ns.nFormat(info('MM', t[1]), '0a')} : ${ns.nFormat(info('MA', t[1]) / info('MM', t[1]), '0%')} ║`.padStart(OUTPUT_WIDTH - 6 - str(t[1]).length));
            }
        } else {
            ns.print(`╚${"╝".padStart(OUTPUT_WIDTH - 1, "═")}`);
        }
    }
    
    /** Combined scan and preparation of all servers
     * @param {string} prev The server we scanned last
     * @param {string} current The server we're scanning
     * @modifies {hosts, targets} */
    async function scanServers(prev, current) {
        for (const server of ns.scan(current)) {
            if ((ns.getPurchasedServers().includes(server) || info('NPR', server) <= exes.length) && prev != server) {
                if (!ns.getPurchasedServers().includes(server)) {
                    for (const hack of exes) {
                        ns[hack](server);
                    }
                    ns.nuke(server);
                }
                if (info('MM', server) != 0 && info('RHL', server) <= ns.getHackingLevel() && info('MSL', server) < 100) {
                    targets.push([Math.floor(info('MM', server) / info('MSL', server)), server]);
                }
                if (info('MR', server) > 4 && !EXCLUDE.includes(server)) {
                    hosts.push([info('MR', server), server]);
                }
                servers.push(server);
                await ns.scp(files, HOME, server);
                await scanServers(current, server);
            }
        }
        if (!prev) {
            targets = arraySort(targets);
            hosts = arraySort(hosts);
        }
    }
    
    /** Organizes the hacking, dedicating high RAM servers to target high value ones
     * @modifies {act} */
    async function hackAll() {
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
            let sharedRAM = ns.getRunningScript(files[3], host[1])?.threads ?? 0 * 4.0;
            /** The amount of free RAM available for actions */
            function fRam() {
                // Don't count the RAM we're `share()`ing as "committed" - it's completely adjustable
                return host[0] - info('UR', host[1]) + sharedRAM;
            }
            /** Stop `share()`ing any RAM on this host */
            function resetShare() {
                ns.kill(files[3], host[1]);
                sharedRAM = 0;
            }
            /** The total amount of security levels that can be removed */
            const securityAmount = info('SL', target) - info('MSL', target);
            /** As in `growthAnalyze`, the optimal g such that MoneyAvailable * g = MoneyMax */
            const growthAmount = Math.min(info('MM', target) / info('MA', target), info('MM', target));
            const weakenEffect = ns.weakenAnalyze(1, ns.getServer(host[1]).cpuCores);
            /** The increase in security levels that any new `hack()` will create */
            let hackSecurity = 0;
            /** The main action we will perform on the target server
             * @type {HType} */
            let hType;
            if (1 / growthAmount < GROW_THRESHOLD) {
                hType = HType.Grow;
            } else if (securityAmount > MAX_SECURITY || loop) {
                hType = HType.Weaken;
                // We want at least 4 GB and 13% of our total RAM free before we commit to a `weaken()`?:
                if (fRam() / host[0] > .13 && fRam() > 4) {
                    /** The number of threads to `weaken()` with */
                    let tmp = Math.floor(fRam() / 1.75);
                    // No point `weaken()`ing more than securityAmount:
                    tmp = Math.ceil(Math.min(tmp, securityAmount / weakenEffect));
                    if (tmp > 0) {
                        resetShare();
                        ns.exec(files[1], host[1], tmp, target);
                    }
                }
            } else {
                hType = HType.Hack;
                for (const h of hosts) {
                    if (ns.isRunning(files[2], h[1], target) && h[1] != host[1]) {
                        // Some other host is already hacking this target. let's grow instead.
                        hType = HType.Grow;
                        break;
                    }
                }
                if (hType === HType.Hack && !ns.scriptRunning(files[2], host[1])) {
                    if (fRam() < 2 && host[1] != HOME) {
                        ns.killall(host[1]);
                    }
                    const maxThreads = Math.floor(fRam() / 1.7);
                    const threads = Math.min(Math.floor(MAX_DRAIN / ns.hackAnalyze(target)), maxThreads);
                    if (threads > 0) {
                        resetShare();
                        // `hack()` with `threads` number of threads
                        ns.exec(files[2], host[1], threads, target);
                        hackSecurity = 0.002 * threads;
                    }
                }
            }
            if (hType !== HType.Weaken && fRam() >= 1.75) {
                /**
                 * The hType is either grow, which hasn't been handled yet, or hack.
                 * In either case, we'll perform a `weaken()` and a `grow()` (if we can afford it)
                 * with thread counts balanced for the remaining RAM.
                 */
                /** The number of remaining threads available for `weaken()` or `grow()` */
                function remainingThreads() {
                    return Math.floor(fRam() / 1.75);
                }
                /** The optimal number of `grow()` threads to maximize money before any hacks complete */
                const growThreads = Math.ceil(ns.growthAnalyze(target, growthAmount, ns.getServer(host[1]).cpuCores));
                if (growThreads >= remainingThreads()) {
                    resetShare();
                    ns.exec(files[0], host[1], remainingThreads(), target);
                } else {
                    /** The optimal number of `weaken()` threads to minimize security after any other hacks complete */
                    const weakenThreads = Math.ceil((securityAmount + hackSecurity + growThreads * 0.004) / weakenEffect);
                    const bothThreads = growThreads + weakenThreads;
                    /** The (optimal) number of `grow()` threads we can actually afford */
                    const finalGrowThreads = Math.min(growThreads, remainingThreads(), Math.ceil(remainingThreads() * growThreads / bothThreads));
                    if (finalGrowThreads > 0) {
                        resetShare();
                        ns.exec(files[0], host[1], finalGrowThreads, target);
                        /** The (optimal) number of `weaken()` threads we can actually afford */
                        const finalWeakenThreads = Math.min(weakenThreads, remainingThreads(), Math.ceil(remainingThreads() * weakenThreads / bothThreads));
                        if (finalWeakenThreads > 0) {
                            ns.exec(files[1], host[1], finalWeakenThreads, target);
                        }
                    }
                }
            }
            if (!loop) {
                act[target] = hType;
            }
            if ((fRam() - sharedRAM) >= 4.0) {
                resetShare();
                ns.exec(files[3], host[1], fRam() / 4.0);
            }
            tarIndex++;
        }
    }
    // MODULES BELOW HERE
    netManager = await ns.prompt('Activate Hacknet Manager?');
    async function hnManager() {
        if (checkM(ns.hacknet.getPurchaseNodeCost(), 20)) {
            ns.hacknet.purchaseNode();
        }
        for (let i = 0; i < ns.hacknet.numNodes(); i++) {
            for (const part of ['Level', 'Ram', 'Core']) {
                if (checkM(ns.hacknet['get' + part + 'UpgradeCost'](i, 1), 20)) {
                    // const upgrade: keyof Hacknet = ;
                    ns.hacknet[('upgrade' + part)](i, 1);
                }
            }
        }
    }
    serverManager = await ns.prompt('Activate Player Server Manager?');
    async function pServerManager() {
        let ram = 0;
        const ramList = [8];
        for (const num of ramList) {
            if (num <= ns.getPurchasedServerMaxRam() && checkM(ns.getPurchasedServerCost(num), 20)) {
                ramList.push(num * 2);
                ram = num;
            } else {
                break;
            }
        }
        function buyServer(r) {
            ns.purchaseServer('SERVER-' + ns.nFormat(r * 1000000000, '0.0b'), r);
        }
        if (ns.getPurchasedServers().length < 25 && ram > 0) {
            buyServer(ram);
        }
        for (let i = ns.getPurchasedServers().length - 1; i >= 0; i--) {
            const tmp = ns.getPurchasedServers()[i];
            if (info('MR', tmp) < ram && checkM(ns.getPurchasedServerCost(ram), 20) && !EXCLUDE.includes(tmp)) {
                ns.killall(tmp);
                ns.deleteServer(tmp);
                buyServer(ram);
            }
        }
    }
    // MODULES ABOVE HERE
    ns.tail();
    let i = 0;
    while (true) { // Keeps everything running once per second
        servers = [];
        targets = [];
        hosts = [[Math.max(info('MR', HOME) - 50, 0), HOME]];
        exes = [];
        act = {};
        await scanExes();
        await scanServers('', HOME);
        await hackAll();
        if (netManager) {
            await hnManager();
        }
        if (serverManager) {
            await pServerManager();
        }
        if (i++ >= 60) {
            try {
                ns.run('autoSolver.js');
            }
            catch { }
            i = 0;
        }
        log();
        await ns.asleep(1000);
    }
}
