/** @param {NS} ns */
export function main(ns) {
    /* eslint-disable no-magic-numbers */
    /** List of [Program Name, Hacking Level to Create, Money to Buy]
     * @type {[string, number, number][]} */
    const PROGRAMS = [
        ["BruteSSH.exe", 50, 500e3],
        ["FTPCrack.exe", 100, 1.5e6],
        ["relaySMTP.exe", 250, 5e6],
        ["HTTPWorm.exe", 500, 30e6],
        ["SQLInject.exe", 750, 250e6],
        ["AutoLink.exe", 25, 1e6],
        ["DeepscanV2.exe", 400, 25e6],
    ];
    /* eslint-enable no-magic-numbers */
    const TOR_COST = 200e3;
    const HOST = ns.getHostname();
    const maxRam = ns.args[0];
    const maxCores = ns.args[1];
    for (const [program, hackingLevelNeeded, moneyNeeded] of PROGRAMS) {
        if (!ns.fileExists(program, "home")) {
            const player = ns.getPlayer();
            if (player.money < moneyNeeded + TOR_COST || !ns.singularity.purchaseTor() || !ns.singularity.purchaseProgram(program)) {
                // TODO: don't work for the program if will make enough money to buy it in the same amount of time?
                if (player.skills.hacking >= hackingLevelNeeded && !ns.isRunning("/sing/createProg.js", HOST, program)) {
                    ns.scriptKill("/sing/workForFaction.js", HOST);
                    ns.scriptKill("/sing/workForCompany.js", HOST);
                    ns.run("/sing/createProg.js", 1, program);
                }
                break;
            }
        }
    }
    while (ns.getServer("home").maxRam < maxRam && ns.singularity.upgradeHomeRam())
        ;
    while (ns.getServer("home").cpuCores < maxCores && ns.singularity.upgradeHomeCores())
        ;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBncmFkZXMuanMiLCJzb3VyY2VSb290IjoiaHR0cDovL2xvY2FsaG9zdDo4MDAwL3NvdXJjZXMvIiwic291cmNlcyI6WyJzaW5nL3VwZ3JhZGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBLHFCQUFxQjtBQUNyQixNQUFNLFVBQVUsSUFBSSxDQUFDLEVBQW9CO0lBQ3JDLHFDQUFxQztJQUNyQzs0Q0FDd0M7SUFDdkMsTUFBTSxRQUFRLEdBQStCO1FBQzFDLENBQUMsY0FBYyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUM7UUFDM0IsQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQztRQUM1QixDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDO1FBQzNCLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUM7UUFDM0IsQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQztRQUM3QixDQUFDLGNBQWMsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDO1FBQ3pCLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQztLQUNoQyxDQUFDO0lBQ0Ysb0NBQW9DO0lBQ3BDLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQztJQUN2QixNQUFNLElBQUksR0FBRyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7SUFFOUIsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxQixNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVCLEtBQUssTUFBTSxDQUFDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxXQUFXLENBQUMsSUFBSSxRQUFRLEVBQUU7UUFDL0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQ2pDLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUM5QixJQUFJLE1BQU0sQ0FBQyxLQUFLLEdBQUcsV0FBVyxHQUFHLFFBQVEsSUFBSSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDcEgsbUdBQW1HO2dCQUNuRyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxJQUFJLGtCQUFrQixJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUU7b0JBQ3BHLEVBQUUsQ0FBQyxVQUFVLENBQUMseUJBQXlCLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQy9DLEVBQUUsQ0FBQyxVQUFVLENBQUMseUJBQXlCLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQy9DLEVBQUUsQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2lCQUM3QztnQkFDRCxNQUFNO2FBQ1Q7U0FDSjtLQUNKO0lBQ0QsT0FBTyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sR0FBRyxNQUFNLElBQUksRUFBRSxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUU7UUFBQyxDQUFDO0lBQ2hGLE9BQU8sRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEdBQUcsUUFBUSxJQUFJLEVBQUUsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUU7UUFBQyxDQUFDO0FBQzFGLENBQUMifQ==