
/** @param {NS} ns */
export async function main(ns) {
    // TODO: remove restriction after achievo
    const BITNODE_1_MAX_RAM = 128;
    const BITNODE_1_MAX_CORES = 1;
    
    ns.disableLog("sleep");
    /** async ns.run
     * @param {Parameters<typeof NS.run>} params */
    async function aRun(...params) {
        const pid = ns.run(...params);
        if (pid === 0)
            return;
        while (ns.isRunning(pid, ns.getHostname())) {
            await ns.sleep(1);
        }
    }
    
    const bn = ns.getPlayer().bitNodeN;
    
    while (true) {
        await aRun("/sing/upgrades.js", 1, bn === 1 ? BITNODE_1_MAX_RAM : Infinity, bn === 1 ? BITNODE_1_MAX_CORES : Infinity);
        if (!ns.scriptRunning("/sing/createProg.js", ns.getHostname())) {
            await aRun("/sing/activities.js");
        }
        await aRun("/sing/keepRunning.js");
        await aRun("/sing/ascend.js", 1, bn);
        
        const MILLIS_PER_SECOND = 3000;
        await ns.sleep(MILLIS_PER_SECOND);
    }
}
