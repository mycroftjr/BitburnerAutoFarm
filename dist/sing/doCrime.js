import { lowestCombatStat } from "/sing/utils";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    const crime = ns.args[0];
    const karmaTarg = ns.args[1];
    const combatStatTarg = ns.args[2];
    while (eval("ns.heart.break()") > karmaTarg || lowestCombatStat(ns) < combatStatTarg) {
        const focus = ns.singularity.isBusy() && ns.singularity.isFocused();
        ns.singularity.stopAction();
        const wait = ns.singularity.commitCrime(crime, focus);
        await ns.sleep(wait);
    }
}
