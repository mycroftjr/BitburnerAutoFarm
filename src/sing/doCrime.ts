import type { NS, CrimeType } from "@ns";
import type { DeepReadonly } from "ts-essentials";
import { lowestCombatStat } from "/sing/utils";

/** @param {NS} ns */
export async function main(ns: DeepReadonly<NS>): Promise<void> {
    ns.disableLog("ALL");
    const crime = ns.args[0] as CrimeType;
    const karmaTarg = ns.args[1] as number;
    const combatStatTarg = ns.args[2] as number;
    while (eval("ns.heart.break()") > karmaTarg || lowestCombatStat(ns) < combatStatTarg) {
        const focus = ns.singularity.isBusy() && ns.singularity.isFocused();
        ns.singularity.stopAction();
        const wait = ns.singularity.commitCrime(crime, focus);
        await ns.sleep(wait);
    }
}