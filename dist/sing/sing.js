
/** @param {NS} ns */
export async function main(ns) {
    // TODO: remove restriction after achievo
    const BITNODE_1_MAX_RAM = 128;
    const BITNODE_1_MAX_CORES = 1;
    const HOST = ns.getHostname();
    
    ns.disableLog("disableLog");
    ns.disableLog("sleep");
    ns.disableLog("getServerMaxRam");
    ns.disableLog("getServerUsedRam");
    /** async ns.run
     * @param {Parameters<typeof NS.run>} params */
    async function aRun(...params) {
        if (ns.getScriptRam(params[0]) > ns.getServerMaxRam(HOST) - ns.getServerUsedRam(HOST)) {
            ns.scriptKill("share.js", HOST);
        }
        const pid = ns.run(...params);
        if (pid === 0)
            return;
        while (ns.isRunning(pid, HOST)) {
            await ns.sleep(1);
        }
    }
    
    const maxHackLevel = ns.getServerRequiredHackingLevel("w0r1d_d43m0n");
    let player = ns.getPlayer();
    const bn = player.bitNodeN;
    while (true) {
        player = ns.getPlayer();
        if (player.hacking >= maxHackLevel)
            await aRun("/sing/ascend.js", 1, bn);
        await aRun("/sing/upgrades.js", 1, bn === 1 ? BITNODE_1_MAX_RAM : Infinity, bn === 1 ? BITNODE_1_MAX_CORES : Infinity);
        if (!ns.scriptRunning("/sing/createProg.js", HOST)) {
            await aRun("/sing/activities.js", 1, maxHackLevel, bn);
        }
        await aRun("/sing/keepRunning.js");
        
        const PERIOD_IN_MILLIS = 3000;
        await ns.sleep(PERIOD_IN_MILLIS);
    }
}
