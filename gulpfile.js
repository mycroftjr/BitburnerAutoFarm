var gulp = require('gulp');
var ts = require('gulp-typescript');
var preserveWhitespace = require('gulp-preserve-typescript-whitespace');

// TypeScript compiler must be run with "removeComments: false" option
var tsProject = ts.createProject('tsconfig.json', { removeComments: false });

gulp.task("compile-ts", function () {
    return tsProject.src()
        .pipe(preserveWhitespace.saveWhitespace())    // Encodes whitespaces/newlines so TypeScript compiler won't remove them 
        .pipe(tsProject())
        .js
        .pipe(preserveWhitespace.restoreWhitespace()) // Restores encoded whitespaces/newlines
        .pipe(gulp.dest("dist"));
});