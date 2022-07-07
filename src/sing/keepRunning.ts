import type { NS } from "@ns";
import type { DeepReadonly } from "ts-essentials";

/** @param {NS} ns */
export function main(ns: DeepReadonly<NS>) {
    type MappedExtract<T, U> = {
        [K in keyof T]: Extract<T[K], U>
    };
    /** @type {[string | number][]} */
    const KEEP_RUNNING: MappedExtract<Parameters<typeof ns.run>, number | string>[] = [
        ["watcher.js"],
        ["autoFarm.js", 1, "ps"],
        ["stockBot.js"],
        ["/sing/crawl.js"],
    ];

    /** @type {number[]} */
    const keepRunningPids = Array<number>(KEEP_RUNNING.length).fill(0);

    for (let i = 0; i < KEEP_RUNNING.length; i++) {
        const params = KEEP_RUNNING[i];
        if (keepRunningPids[i] === 0 || !ns.isRunning(keepRunningPids[i])) {
            const find = ns.getRunningScript(params[0], ns.getHostname(), ...params.slice(2));
            if (!find) {
                if (keepRunningPids[i] !== 0) {
                    ns.tail();
                    ns.print("unable to find running ", params[0], " starting it now!");
                }
                ns.scriptKill(params[0], ns.getHostname());
            }
            keepRunningPids[i] = find ? find.pid : ns.run(...params);
        }
    }
}