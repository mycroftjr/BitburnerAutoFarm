
/** @param {NS} ns */
export async function parseConfig(ns, filename, struct) {
    if (!ns.fileExists(filename)) {
        await ns.write(filename, JSON.stringify(struct), "w");
    }
    const json = JSON.parse(ns.read(filename), (k, value) => {
        if (k in struct) {
            const key = k;
            if (typeof value !== typeof struct[key]) {
                throw Error(`Type of Config value "${k}" should be "${typeof struct[key]}" (was "${typeof value}")!`);
            }
        }
        return value;
    });
    let anyChange = false;
    for (const k of Object.keys(struct)) {
        if (k in json)
            continue;
        const key = k;
        json[key] = struct[key];
        anyChange = true;
    }
    if (anyChange) {
        await ns.write(filename, JSON.stringify(json), "w");
    }
    return json;
}
