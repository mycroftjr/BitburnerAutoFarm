
/** @param {NS} ns */
export async function main(ns) {
    const bn = ns.args[0];
    
    const MAX_SF_LEVEL = 3;
    /* eslint-disable no-magic-numbers */
    const SOURCE_FILE_PRIORITY = [[4, 1], [1, MAX_SF_LEVEL], [5, MAX_SF_LEVEL], [4, MAX_SF_LEVEL], [3, 1], [6, 1], [7, 1], [9, MAX_SF_LEVEL], [2, 1], [10, MAX_SF_LEVEL],
        [11, MAX_SF_LEVEL], [2, MAX_SF_LEVEL], [3, MAX_SF_LEVEL], [6, MAX_SF_LEVEL], [7, MAX_SF_LEVEL], [8, MAX_SF_LEVEL], [12, Infinity]];
    /* eslint-enable no-magic-numbers */
    
    const sFiles = ns.getOwnedSourceFiles();
    let nextBN = 0;
    for (const p of SOURCE_FILE_PRIORITY) {
        const file = sFiles.find((sFile) => sFile.n === p[0]);
        const lvl = (file?.lvl ?? 0) + (p[0] === bn ? 1 : 0);
        if (lvl < p[1]) {
            nextBN = p[0];
            break;
        }
    }
    if (nextBN) {
        ns.singularity.destroyW0r1dD43m0n(nextBN, "sing/sing.js");
    }
}
