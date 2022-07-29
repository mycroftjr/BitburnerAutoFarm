import type { NS } from "@ns";
import type { DeepReadonly } from "ts-essentials";

/** @param {NS} ns */
export async function parseConfig<K extends string, P, T = { [N in K]: P }>(ns: DeepReadonly<NS>, filename: string, struct: T): Promise<T> {
    let json = struct;
    if (ns.fileExists(filename)) {
		json = JSON.parse(ns.read(filename) as string, (k, value: unknown) => {
            if (k in struct) {
                const key = k as keyof T;
                if (typeof value !== typeof struct[key]) {
                    throw Error(`Type of Config value "${k}" should be "${typeof struct[key]}" (was "${typeof value}")!`);
                }
            }
            return value;
        }) as T;
        for (const k of Object.keys(struct)) {
            if (k in json) continue;
            const key = k as keyof T;
            json[key] = struct[key];
        }
	}
    await ns.write(filename, JSON.stringify(json, null, "\t"), "w");
    return json;
}