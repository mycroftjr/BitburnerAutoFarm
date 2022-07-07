
/** @param {NS} ns */
export function main(ns) {
    /* eslint-disable no-magic-numbers */
    /** List of [Program Name, Hacking Level to Create, Money to Buy]
     * @type {[string, number, number][]} */
    const PROGRAMS = [
        ["BruteSSH.exe", 50, 500e3],
        ["FTPCrack.exe", 100, 1.5e6],
        ["relaySMTP.exe", 250, 5e6],
        ["HTTPWorm.exe", 500, 30e6],
        ["SQLInject.exe", 750, 250e6],
        ["AutoLink.exe", 25, 1e6],
        ["DeepscanV2.exe", 400, 25e6],
    ];
    /* eslint-enable no-magic-numbers */
    const TOR_COST = 200e3;
    
    const maxRam = ns.args[0];
    const maxCores = ns.args[1];
    for (const [program, hackingLevelNeeded, moneyNeeded] of PROGRAMS) {
        if (!ns.fileExists(program, "home")) {
            if (ns.getPlayer().money < moneyNeeded + TOR_COST || !ns.singularity.purchaseTor() || !ns.singularity.purchaseProgram(program)) {
                if (ns.getPlayer().hacking >= hackingLevelNeeded && !ns.isRunning("/sing/createProg", ns.getHostname(), program)) {
                    ns.run("/sing/createProg", 1, program);
                }
                break;
            }
        }
    }
    while (ns.getServer("home").maxRam < maxRam && ns.singularity.upgradeHomeRam())
        ;
    while (ns.getServer("home").cpuCores < maxCores && ns.singularity.upgradeHomeCores())
        ;
}
