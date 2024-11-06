/** @param {NS} ns */
export function main(ns) {
    const faction = ns.args[0];
    const repToGain = ns.args[1];
    // https://github.com/danielyxie/bitburner/blob/master/src/Corporation/data/Constants.ts, BribeToRepRatio
    const BRIBE_TO_REP_RATIO = 1e9; // Bribe Value divided by this = rep gain
    const MAX_SPEND_RATIO = 0.01;
    const donationAmount = Math.ceil(repToGain * BRIBE_TO_REP_RATIO);
    if (ns.corporation.getCorporation().funds * MAX_SPEND_RATIO > donationAmount) {
        if (ns.corporation.bribe(faction, donationAmount)) {
            ns.print(`Bribed ${faction} with $${ns.nFormat(donationAmount, "0a")} successfully!`);
        }
        else {
            ns.print("Bribe unsuccessful???");
        }
    }
    else {
        ns.print(`Not enough corp money to comfortably bribe ${faction} with $${ns.nFormat(donationAmount, "0a")}`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJpYmVXaXRoQ29ycEZ1bmRzLmpzIiwic291cmNlUm9vdCI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zb3VyY2VzLyIsInNvdXJjZXMiOlsic2luZy9icmliZVdpdGhDb3JwRnVuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR0EscUJBQXFCO0FBQ3JCLE1BQU0sVUFBVSxJQUFJLENBQUMsRUFBb0I7SUFDckMsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQVcsQ0FBQztJQUNyQyxNQUFNLFNBQVMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBVyxDQUFDO0lBQ3ZDLHlHQUF5RztJQUN6RyxNQUFNLGtCQUFrQixHQUFHLEdBQUcsQ0FBQyxDQUFFLHlDQUF5QztJQUMxRSxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUM7SUFDN0IsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsa0JBQWtCLENBQUMsQ0FBQztJQUNqRSxJQUFJLEVBQUUsQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFLENBQUMsS0FBSyxHQUFHLGVBQWUsR0FBRyxjQUFjLEVBQUU7UUFDMUUsSUFBSSxFQUFFLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLEVBQUU7WUFDL0MsRUFBRSxDQUFDLEtBQUssQ0FBQyxVQUFVLE9BQU8sVUFBVSxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztTQUN6RjthQUFNO1lBQ0gsRUFBRSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1NBQ3JDO0tBQ0o7U0FBTTtRQUNILEVBQUUsQ0FBQyxLQUFLLENBQUMsOENBQThDLE9BQU8sVUFBVSxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDL0c7QUFDTCxDQUFDIn0=