var gulp = require('gulp');
var del = require('del');
var ts = require("gulp-typescript");
var merge = require('merge2'); 
var jeditor = require("gulp-json-editor");

gulp.task('clean', function () {
  return del([
    'lib/**/*',
    'dist/**/*'
  ]);
});

gulp.task('pack:event-flux', function () {
  return gulp.src('./package.json')
    .pipe(jeditor({ main: "./index.js", scripts: undefined }))
    .pipe(gulp.dest("./lib/event-flux"));
});

gulp.task('pack:react-event-flux', function () {
  return gulp.src('./package.json')
    .pipe(jeditor({ name: 'react-event-flux', main: './react-event-flux.js', scripts: undefined }))
    .pipe(gulp.dest("./lib/react-event-flux"));
});

var tsProject = ts.createProject("tsconfig.json");
gulp.task('ts:event-flux', function () {
  var tsResult = gulp.src(['src/*.ts', '!src/react-event-flux.ts'])
    .pipe(tsProject());

  return merge([
    tsResult.dts.pipe(gulp.dest('lib/event-flux')),
    tsResult.js.pipe(gulp.dest('lib/event-flux'))
  ]);
});

gulp.task('ts:react-event-flux', function () {
  var tsResult = gulp.src(['src/react-event-flux.ts', 'src/*.tsx'])
    .pipe(tsProject());

  return merge([
    tsResult.dts.pipe(gulp.dest('lib/react-event-flux')),
    tsResult.js.pipe(gulp.dest('lib/react-event-flux'))
  ]);
});

gulp.task('default', gulp.series(
  'clean', 
  ['pack:event-flux', 'pack:react-event-flux', 'ts:event-flux', 'ts:react-event-flux'])
);
