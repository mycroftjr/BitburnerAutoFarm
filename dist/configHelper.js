/** @param {NS} ns */
export function parseConfig(ns, filename, struct) {
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
    ns.write(filename, JSON.stringify(json, null, "\t"), "w");
    return json;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnSGVscGVyLmpzIiwic291cmNlUm9vdCI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zb3VyY2VzLyIsInNvdXJjZXMiOlsiY29uZmlnSGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBLHFCQUFxQjtBQUNyQixNQUFNLFVBQVUsV0FBVyxDQUEyQyxFQUFvQixFQUFFLFFBQWdCLEVBQUUsTUFBUztJQUNuSCxJQUFJLElBQUksR0FBRyxNQUFNLENBQUM7SUFDbEIsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1FBQy9CLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBYyxFQUFFLEVBQUU7WUFDakQsSUFBSSxDQUFDLElBQUksTUFBTSxFQUFFO2dCQUNiLE1BQU0sR0FBRyxHQUFHLENBQVksQ0FBQztnQkFDekIsSUFBSSxPQUFPLEtBQUssS0FBSyxPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRTtvQkFDckMsTUFBTSxLQUFLLENBQUMseUJBQXlCLENBQUMsZ0JBQWdCLE9BQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQyxXQUFXLE9BQU8sS0FBSyxLQUFLLENBQUMsQ0FBQztpQkFDekc7YUFDSjtZQUNELE9BQU8sS0FBSyxDQUFDO1FBQ2pCLENBQUMsQ0FBTSxDQUFDO1FBQ1IsS0FBSyxNQUFNLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ2pDLElBQUksQ0FBQyxJQUFJLElBQUk7Z0JBQUUsU0FBUztZQUN4QixNQUFNLEdBQUcsR0FBRyxDQUFZLENBQUM7WUFDekIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUMzQjtLQUNQO0lBQ0UsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzFELE9BQU8sSUFBSSxDQUFDO0FBQ2hCLENBQUMifQ==