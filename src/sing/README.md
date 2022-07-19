# This folder contains major spoilers!
<details>
  This folder contains scripts for use in (and after completion of) BN-4.

  * [sing.ts](https://github.com/mycroftjr/BitburnerAutoFarm/blob/master/src/sing/sing.ts) is the controller script.
  * [upgrades.ts](https://github.com/mycroftjr/BitburnerAutoFarm/blob/master/src/sing/upgrades.ts) handles the purchasing or creation of the port openers (exploit .exes), as well as the upgrading of Home RAM and Cores.
    * [createProg.ts](https://github.com/mycroftjr/BitburnerAutoFarm/blob/master/src/sing/createProg.ts) makes sure that the "manual" creation of a program is not interrupted by activities.
  * [keepRunning.ts](https://github.com/mycroftjr/BitburnerAutoFarm/blob/master/src/sing/keepRunning.ts) makes sure certain scripts are kept running (by re-starting them if they are not found):
    * [autoFarm.ts](https://github.com/mycroftjr/BitburnerAutoFarm/blob/master/src/autoFarm.ts)
    * [watcher.ts](https://github.com/mycroftjr/BitburnerAutoFarm/blob/master/src/watcher.ts)
    * [crawl.ts](https://github.com/mycroftjr/BitburnerAutoFarm/blob/master/src/sing/crawl.ts) crawls the entire server network and backdoors any servers for which it is useful to do so.
    * [stockBot.js](https://steamcommunity.com/sharedfiles/filedetails/?id=2708673262) if installed under that name in the root folder.
  * [activities.ts](https://github.com/mycroftjr/BitburnerAutoFarm/blob/master/src/sing/activities.ts) automates player activities, such as studying Computer Science, working for factions/companies, or purchasing/installing augments (when no other work would be productive, or the "queue 40 augments" achievement is in reach). It uses the below scripts mostly to "remember" what it's currently doing:
    * [workForCompany.ts](https://github.com/mycroftjr/BitburnerAutoFarm/blob/master/src/sing/workForCompany.ts) works for the provided company until the provided reputation level is reached and attempts to get promotions.
    * [workForFaction.ts](https://github.com/mycroftjr/BitburnerAutoFarm/blob/master/src/sing/workForFaction.ts) works for the provided faction until the provided reputation level is reached. May be interrupted by workForCompany, on the basis that company rep is "permanent" inside of the current Bitnode, and that making company factions available can provide for better factions to work for.
  * [ascend.ts](https://github.com/mycroftjr/BitburnerAutoFarm/blob/master/src/sing/ascend.ts) moves to the next configured Bitnode when possible.

  To use:
  
  ``` console
  run /sing/sing.js
  ```
  
  The scripts may wait longer than desired to purchase and install augments. To force the scripts to immediately sell all stocks and buy + install any available augments (most expensive first):
  
  ``` console
  killall; run /sing/activities.js FORCE_INSTALL
  ```
  
  Places of interest for behavior customization:
  1. `nano /sing/activitiesConfig.txt`: a json config for faction priorities (the order to work factions in)
  2. The top of `nano /sing/ascend.js`: the order and level of SourceFiles (i.e. Bitnodes) to complete
</details>