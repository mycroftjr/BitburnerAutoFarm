
/** @param {NS} ns */
export async function main(ns) {
    const MILLIS_TO_WAIT_FOR_HACKING_LEVELS = 6e3;
    const SERVERS_OF_INTEREST = ["CSEC", "I.I.I.I", "avmnite-02h", "run4theh111z",
        "fulcrumassets",
        "rothman-uni", "summit-uni", "zb-institute",
        "iron-gym", "powerhouse-fitness", "crush-fitness", "millenium-fitness", "snap-fitness",
        // backdooring these reduce the company rep requirement to join the faction by 100e3 (https://github.com/danielyxie/bitburner/blob/dev/src/PersonObjects/Player/PlayerObjectGeneralMethods.ts#L862)
        "ecorp", "megacorp", "b-and-a", "blade", "nwo", "clarkinc", "omnitek", "4sigma", "kuai-gong", "fulcrumtech",
    ];
    
    const rootHost = ns.getHostname();
    
    /** A map of server name to the full path (as a list) to the server
     * @type {Map<string, string[]>} */
    let dir;
    
    function scanAll() {
        /** @type {[string, string[]][]} */
        const pendingScan = [[rootHost, [rootHost]]];
        dir = new Map(pendingScan);
        while (pendingScan.length) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const [hostname, path] = pendingScan.pop();
            dir.set(hostname, path);
            
            const servs = ns.scan(hostname);
            for (const serv of servs) {
                if (!dir.has(serv)) {
                    const copy = [...path];
                    copy.push(serv);
                    pendingScan.push([serv, copy]);
                }
            }
        }
        return dir;
    }
    dir = scanAll();
    
    let numUnbackdoored = SERVERS_OF_INTEREST.length;
    while (numUnbackdoored) {
        const hl = ns.getHackingLevel();
        for (const server of SERVERS_OF_INTEREST) {
            const s = ns.getServer(server);
            if (!s.backdoorInstalled && s.hasAdminRights && s.requiredHackingSkill < hl) {
                let steps = dir.get(server);
                if (!steps)
                    dir = scanAll();
                steps = dir.get(server);
                if (!steps)
                    continue;
                const old = ns.singularity.getCurrentServer();
                for (const step of steps) {
                    ns.singularity.connect(step);
                }
                await ns.singularity.installBackdoor();
                ns.singularity.connect(old);
                numUnbackdoored--;
            }
        }
        if (numUnbackdoored)
            await ns.sleep(MILLIS_TO_WAIT_FOR_HACKING_LEVELS);
    }
}
