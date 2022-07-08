const gulp = require("gulp");
const ts = require("gulp-typescript");
const preserveWhitespace = require("gulp-preserve-typescript-whitespace");
const replace = require("gulp-replace");
const filenames = require("gulp-filenames");

// TypeScript compiler must be run with "removeComments: false" option for preserveWhitespace to work
const tsProject = ts.createProject("tsconfig.json", { removeComments: false });

// TODO: https://stackoverflow.com/questions/49847926/how-can-i-run-gulp-with-a-typescript-file
gulp.task("compile-ts", function () {
    return tsProject.src()
        .pipe(preserveWhitespace.saveWhitespace())    // Encodes whitespaces/newlines so TypeScript compiler won't remove them 
        .pipe(tsProject())
        .js
        // .pipe(replace(/ns\.singularity\.(?!getFactionRep)(?!isBusy)(?!workFor)(?!upgrade)(?!destroy)(?!getAugmentationsFromFaction)(?!getFactionRep)\w+\(/g,
        // .pipe(replace(/ns\.singularity\.(quitJob|joinFaction|travelToCity|universityCourse|check\w+)\(/g,
        .pipe(replace(/no-op/,
        // @param {string} match
        function handleReplace(match) {
            return "eval(\"" + match.slice(0, match.length - 1) + "\")(";
        }))
        .pipe(preserveWhitespace.restoreWhitespace()) // Restores encoded whitespaces/newlines
        .pipe(filenames("js"))
        .pipe(gulp.dest("dist"))
        .on("end", function() {
            // Write a custom file called wgetAll.js that wgets all the other files for you
            var wgetAll = [
                "/** @param {NS} ns */",
                "export async function main(ns) {",
                `    const root = "https://raw.githubusercontent.com/mycroftjr/BitburnerAutoFarm/master/dist/";`,
                "    const files = [",
            ];
            let line = " ".repeat(8);
            for (const filename of filenames.get("js")) {
                const fname = filename.replace("\\", "/");
                if (line.length + fname.length > 120) {
                    wgetAll.push(line);
                    line = " ".repeat(8);
                }
                line += `"${fname}", `;
            }
            wgetAll.push(line);
            wgetAll.push(
                "    ];",
                "    for (const file of files) {",
                `        await ns.wget(root + file, file.includes("/") ? "/" + file : file);`,
                "    }",
                "}",
            );
            require("fs").writeFileSync("dist/wgetAll.js", wgetAll.join("\n"));
        });
});