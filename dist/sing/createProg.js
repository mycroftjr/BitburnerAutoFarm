/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("disableLog");
    ns.disableLog("sleep");
    const MILLIS_TO_WAIT = 5e3;
    /** @type {string} */
    const program = ns.args[0];
    const HOST = ns.getHostname();
    ns.scriptKill("/sing/workForFaction.js", HOST);
    ns.scriptKill("/sing/workForCompany.js", HOST);
    ns.scriptKill("/sing/doCrime.js", HOST);
    while (!ns.fileExists(program, "home")) {
        const focus = ns.singularity.isBusy() && ns.singularity.isFocused();
        ns.singularity.createProgram(program, focus);
        await ns.sleep(MILLIS_TO_WAIT);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlUHJvZy5qcyIsInNvdXJjZVJvb3QiOiJodHRwOi8vbG9jYWxob3N0OjgwMDAvc291cmNlcy8iLCJzb3VyY2VzIjpbInNpbmcvY3JlYXRlUHJvZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFHQSxxQkFBcUI7QUFDckIsTUFBTSxDQUFDLEtBQUssVUFBVSxJQUFJLENBQUMsRUFBb0I7SUFDM0MsRUFBRSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUM1QixFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZCLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQztJQUMzQixxQkFBcUI7SUFDckIsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQVcsQ0FBQztJQUNyQyxNQUFNLElBQUksR0FBRyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDOUIsRUFBRSxDQUFDLFVBQVUsQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMvQyxFQUFFLENBQUMsVUFBVSxDQUFDLHlCQUF5QixFQUFFLElBQUksQ0FBQyxDQUFDO0lBQy9DLEVBQUUsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDeEMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxFQUFFO1FBQ3BDLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNwRSxFQUFFLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDN0MsTUFBTSxFQUFFLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0tBQ2xDO0FBQ0wsQ0FBQyJ9