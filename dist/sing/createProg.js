
/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("sleep");
    const MILLIS_TO_WAIT = 6e3;
    /** @type {string} */
    const program = ns.args[0];
    const focus = ns.singularity.isBusy() && ns.singularity.isFocused();
    if (ns.singularity.createProgram(program, focus)) {
        while (ns.fileExists(program, "home")) {
            await ns.sleep(MILLIS_TO_WAIT);
        }
    }
}
