# Script details
autoFarm.js can be run with flags. If any valid flags are provided, the script will not prompt the user for which managers to run:
* "ps", if provided, will tell the script to run the Purchased Server manager.
* "hn", if provided, will tell the script to run the Hacknet Node manager.
* "no" is the valid flag to not run any managers or prompt for them.

Recommended: `run autoFarm.js ps`.

The script UI and behavior can also be customized, preferably in `nano autoFarmConfig.txt`, which should be kept in valid JSON format.  
On script update and run, any missing config options should be added to that file with their default values.  
Invalid JSON, however, will not be corrected, and will error to inform the user.  
You can use an online JSON validator, such as https://jsonformatter.curiousconcept.com, to find the error.  
For explanations of what each option does, see the corresponding comment in `DEFAULT_CONFIG` near the top of [`autoFarm.ts`](https://github.com/mycroftjr/BitburnerAutoFarm/blob/master/src/autoFarm.ts).

# Spoiler scripts
The [/sing](https://github.com/mycroftjr/BitburnerAutoFarm/tree/master/src/sing) folder contains advanced automation scripts for after you "beat the game" once. See the bottom of that page (or [its README](https://github.com/mycroftjr/BitburnerAutoFarm/tree/master/src/sing/README.md) directly) for exactly what that means.