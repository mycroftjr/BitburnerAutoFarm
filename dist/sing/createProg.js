
/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("sleep");
    const MILLIS_TO_WAIT = 5e3;
    /** @type {string} */
    const program = ns.args[0];
    while (!ns.fileExists(program, "home")) {
        const focus = ns.singularity.isBusy() && ns.singularity.isFocused();
        ns.singularity.createProgram(program, focus);
        await ns.sleep(MILLIS_TO_WAIT);
    }
}
