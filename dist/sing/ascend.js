/** @param {NS} ns */
export function main(ns) {
    const MAX_SF_LEVEL = 3;
    /* eslint-disable no-magic-numbers */
    const SOURCE_FILE_PRIORITY = [[4, 1], [1, MAX_SF_LEVEL], [5, MAX_SF_LEVEL], [4, MAX_SF_LEVEL], [3, 1], [7, 1], [2, 1], [9, MAX_SF_LEVEL], [10, MAX_SF_LEVEL],
        [11, MAX_SF_LEVEL], [3, MAX_SF_LEVEL], [2, MAX_SF_LEVEL], [6, MAX_SF_LEVEL], [7, MAX_SF_LEVEL], [8, MAX_SF_LEVEL], [12, Infinity]];
    /* eslint-enable no-magic-numbers */
    const bn = ns.args[0];
    const sFiles = ns.singularity.getOwnedSourceFiles();
    for (const p of SOURCE_FILE_PRIORITY) {
        const file = sFiles.find((sFile) => sFile.n === p[0]);
        const lvl = (file?.lvl ?? 0) + (p[0] === bn ? 1 : 0);
        if (lvl < p[1]) {
            if (ns.hasRootAccess("w0r1d_d43m0n")) {
                ns.singularity.destroyW0r1dD43m0n(p[0], "/sing/sing.js");
            }
            break;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNjZW5kLmpzIiwic291cmNlUm9vdCI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zb3VyY2VzLyIsInNvdXJjZXMiOlsic2luZy9hc2NlbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR0EscUJBQXFCO0FBQ3JCLE1BQU0sVUFBVSxJQUFJLENBQUMsRUFBb0I7SUFDckMsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZCLHFDQUFxQztJQUNyQyxNQUFNLG9CQUFvQixHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsWUFBWSxDQUFDO1FBQ3hKLENBQUMsRUFBRSxFQUFFLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDdkksb0NBQW9DO0lBRXBDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0lBQ3BELEtBQUssTUFBTSxDQUFDLElBQUksb0JBQW9CLEVBQUU7UUFDbEMsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RCxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JELElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNaLElBQUksRUFBRSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsRUFBRTtnQkFDbEMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUM7YUFDNUQ7WUFDRCxNQUFNO1NBQ1Q7S0FDSjtBQUNMLENBQUMifQ==