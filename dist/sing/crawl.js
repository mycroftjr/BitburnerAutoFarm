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
            if (!s.backdoorInstalled && s.hasAdminRights && (s.requiredHackingSkill ?? Infinity) < hl) {
                let steps = dir.get(server);
                if (!steps)
                    dir = scanAll();
                steps = dir.get(server);
                if (!steps)
                    continue;
                const old = ns.singularity.getCurrentServer();
                let allConnectsGood = true;
                for (const step of steps) {
                    if (!ns.singularity.connect(step)) {
                        allConnectsGood = false;
                        break;
                    }
                }
                if (allConnectsGood)
                    await ns.singularity.installBackdoor();
                ns.singularity.connect(old);
                numUnbackdoored--;
            }
        }
        if (numUnbackdoored)
            await ns.sleep(MILLIS_TO_WAIT_FOR_HACKING_LEVELS);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jhd2wuanMiLCJzb3VyY2VSb290IjoiaHR0cDovL2xvY2FsaG9zdDo4MDAwL3NvdXJjZXMvIiwic291cmNlcyI6WyJzaW5nL2NyYXdsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBLHFCQUFxQjtBQUNyQixNQUFNLENBQUMsS0FBSyxVQUFVLElBQUksQ0FBQyxFQUFvQjtJQUMzQyxNQUFNLGlDQUFpQyxHQUFHLEdBQUcsQ0FBQztJQUM5QyxNQUFNLG1CQUFtQixHQUFHLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsY0FBYztRQUN6RSxlQUFlO1FBQ2YsYUFBYSxFQUFFLFlBQVksRUFBRSxjQUFjO1FBQzNDLFVBQVUsRUFBRSxvQkFBb0IsRUFBRSxlQUFlLEVBQUUsbUJBQW1CLEVBQUUsY0FBYztRQUN0RixtTUFBbU07UUFDbk0sT0FBTyxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsYUFBYTtLQUM5RyxDQUFDO0lBRUYsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBRXJDO3VDQUNtQztJQUNuQyxJQUFJLEdBQTBCLENBQUM7SUFFNUIsU0FBUyxPQUFPO1FBQ1osbUNBQW1DO1FBQ25DLE1BQU0sV0FBVyxHQUF5QixDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25FLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBbUIsV0FBVyxDQUFDLENBQUM7UUFDN0MsT0FBTyxXQUFXLENBQUMsTUFBTSxFQUFFO1lBQ3ZCLG9FQUFvRTtZQUNwRSxNQUFNLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUcsQ0FBQztZQUM1QyxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUV4QixNQUFNLEtBQUssR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2hDLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO2dCQUN0QixJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDaEIsTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO29CQUN2QixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNoQixXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7aUJBQ2xDO2FBQ0o7U0FDSjtRQUNELE9BQU8sR0FBRyxDQUFDO0lBQ2YsQ0FBQztJQUNELEdBQUcsR0FBRyxPQUFPLEVBQUUsQ0FBQztJQUVoQixJQUFJLGVBQWUsR0FBRyxtQkFBbUIsQ0FBQyxNQUFNLENBQUM7SUFDakQsT0FBTyxlQUFlLEVBQUU7UUFDcEIsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ2hDLEtBQUssTUFBTSxNQUFNLElBQUksbUJBQW1CLEVBQUU7WUFDdEMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMvQixJQUFJLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixJQUFJLENBQUMsQ0FBQyxjQUFjLElBQUksQ0FBQyxDQUFDLENBQUMsb0JBQW9CLElBQUksUUFBUSxDQUFDLEdBQUcsRUFBRSxFQUFFO2dCQUN2RixJQUFJLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUM1QixJQUFJLENBQUMsS0FBSztvQkFBRSxHQUFHLEdBQUcsT0FBTyxFQUFFLENBQUM7Z0JBQzVCLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUN4QixJQUFJLENBQUMsS0FBSztvQkFBRSxTQUFTO2dCQUNyQixNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQzlDLElBQUksZUFBZSxHQUFHLElBQUksQ0FBQztnQkFDM0IsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7b0JBQ3RCLElBQUksQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTt3QkFDL0IsZUFBZSxHQUFHLEtBQUssQ0FBQzt3QkFDeEIsTUFBTTtxQkFDVDtpQkFDSjtnQkFDRCxJQUFJLGVBQWU7b0JBQ2YsTUFBTSxFQUFFLENBQUMsV0FBVyxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUMzQyxFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDNUIsZUFBZSxFQUFFLENBQUM7YUFDckI7U0FDSjtRQUNELElBQUksZUFBZTtZQUNmLE1BQU0sRUFBRSxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO0tBQ3pEO0FBQ0wsQ0FBQyJ9