import type { NS } from "@ns";
import type { DeepReadonly } from "ts-essentials";

/** @param {NS} ns */
export async function main(ns: DeepReadonly<NS>): Promise<void> {
    ns.disableLog("ALL");
    const crime = ns.args[0] as string;
    const karmaTarg = ns.args[1] as number;
    while (eval("ns.heart.break()") > karmaTarg) {
        const focus = ns.singularity.isBusy() && ns.singularity.isFocused();
        ns.singularity.stopAction();
        const wait = ns.singularity.commitCrime(crime, focus);
        await ns.sleep(wait);
    }
}