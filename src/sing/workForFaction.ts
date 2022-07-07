import type { NS } from "@ns";
import type { DeepReadonly } from "ts-essentials";

/** @param {NS} ns */
export async function main(ns: DeepReadonly<NS>): Promise<void> {
    ns.disableLog("ALL");
    const MILLIS_TO_WAIT = 5000;
    const JOB_PRIOS = ["hacking", "field", "security"];
    const faction = ns.args[0] as string;
    const repTarg = ns.args[1] as number;
    while (ns.singularity.getFactionRep(faction) < repTarg) {
        for (const job of JOB_PRIOS) {
            const focus = ns.singularity.isBusy() && ns.singularity.isFocused();
            if (ns.singularity.workForFaction(faction, job, focus)) break;
        }
        await ns.sleep(MILLIS_TO_WAIT);
    }
}