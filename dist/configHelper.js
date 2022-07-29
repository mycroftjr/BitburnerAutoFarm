
/** @param {NS} ns */
export async function parseConfig(ns, filename, struct) {
    let json = struct;
    if (ns.fileExists(filename)) {
        json = JSON.parse(ns.read(filename), (k, value) => {
            if (k in struct) {
                const key = k;
                if (typeof value !== typeof struct[key]) {
                    throw Error(`Type of Config value "${k}" should be "${typeof struct[key]}" (was "${typeof value}")!`);
                }
            }
            return value;
        });
        for (const k of Object.keys(struct)) {
            if (k in json)
                continue;
            const key = k;
            json[key] = struct[key];
        }
    }
    await ns.write(filename, JSON.stringify(json, null, "\t"), "w");
    return json;
}
