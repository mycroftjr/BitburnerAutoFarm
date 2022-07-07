import type { NS } from "@ns";
import type { DeepReadonly } from "ts-essentials";

/** @param {NS} ns */
export async function parseConfig<K extends string, P, T = { [N in K]: P }>(ns: DeepReadonly<NS>, filename: string, struct: T): Promise<T> {
    if (!ns.fileExists(filename)) {
		await ns.write(filename, JSON.stringify(struct), "w");
	}
    const json = JSON.parse(ns.read(filename) as string, (k, value: unknown) => {
		if (k in struct) {
            const key = k as keyof T;
            if (typeof value !== typeof struct[key]) {
                throw Error(`Type of Config value "${k}" should be "${typeof struct[key]}" (was "${typeof value}")!`);
            }
        }
        return value;
	}) as T;
    let anyChange = false;
    for (const k of Object.keys(struct)) {
        if (k in json) continue;
        const key = k as keyof T;
        json[key] = struct[key];
        anyChange = true;
    }
    if (anyChange) {
        await ns.write(filename, JSON.stringify(json), "w");
    }
    return json;
}