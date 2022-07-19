Began as an updated version of PG SDVX's https://steamcommunity.com/sharedfiles/filedetails/?id=2686833015 for https://github.com/danielyxie/bitburner/, which is still in `dist/autoFarm.js`. But the `sing` folder contains advanced automation scripts for after you "beat the game" once.

Click on Raw in the upper-right of a .js file you want to use, then copy that URL and type/paste `wget <url> <nameYouWantItAs>.js` into your in-game terminal.
For example, to download the script that will download all the other scripts:

``` console
wget https://raw.githubusercontent.com/mycroftjr/BitburnerAutoFarm/master/dist/wgetAll.js wgetAll.js
```
Then, simply `run wgetAll.js`, wait a bit, then `run autoFarm.js` and enjoy!

See the bottom of https://github.com/mycroftjr/BitburnerAutoFarm/tree/master/src (or [its README](https://github.com/mycroftjr/BitburnerAutoFarm/tree/master/src/README.md) directly) for a guide on script configuration.  
See the bottom of https://github.com/mycroftjr/BitburnerAutoFarm/tree/master/src/sing (or [its README](https://github.com/mycroftjr/BitburnerAutoFarm/tree/master/src/sing/README.md) directly) for exactly when/how the `sing` folder can be used.

# Some called scripts (not by me) not included
I recommend getting them, but nothing should crash without them!
* autoSolver.js automates coding contracts, and is automatically called by autoFarm.js. I use the script from https://gist.github.com/OrangeDrangon/8a08d2d7d425fddd2558e1c0c5fae78b#file-autosolver-js completed with mostly other people's code, so I can't easily share it.
* stockBot.js automates stock buying and selling, and is not (by default) automatically called until `sing`, since it runs continuously like autoFarm does. I use the script from https://steamcommunity.com/sharedfiles/filedetails/?id=2708673262.

# For contributors:
See https://github.com/bitburner-official/bitburner-vscode and https://github.com/bitburner-official/vscode-template for building help.  
The scripts are written in Typescript in the [src](https://github.com/mycroftjr/BitburnerAutoFarm/tree/master/src) folder, and transpiled to Javascript in the [dist](https://github.com/mycroftjr/BitburnerAutoFarm/tree/master/dist) folder.  
The transpilation is done in [gulpfile.js](https://github.com/mycroftjr/BitburnerAutoFarm/blob/master/gulpfile.js), preserving comments (and newlines via [gulp-preserve-typescript-whitespace](https://www.npmjs.com/package/gulp-preserve-typescript-whitespace?activeTab=readme)).  
It should be automatically run on Ctrl + Shift + B, at least in Visual Studio Code, due to [tasks.json](https://github.com/mycroftjr/BitburnerAutoFarm/blob/master/.vscode/tasks.json).  
Code style is enforced by [.eslintrc.js](https://github.com/mycroftjr/BitburnerAutoFarm/blob/master/.eslintrc.js) and, in some cases, auto-fixed by [package.json](https://github.com/mycroftjr/BitburnerAutoFarm/blob/master/package.json#L8).
