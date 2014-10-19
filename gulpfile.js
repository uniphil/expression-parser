var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var mocha = require('gulp-mocha');


var fail = function(err) { throw err; };


gulp.task('mocha', function() {
  return gulp.src('test.js', {read: false})
    .pipe(mocha({reporter: 'dot'}))
      .on('error', fail);
});

gulp.task('jshint', function() {
  return gulp.src('*.js')
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'))
    .pipe($.jshint.reporter('fail'))
      .on('error', fail);
});

gulp.task('jscs', function() {
  return gulp.src('*.js')
    .pipe($.jscs())
      .on('error', fail);
});


gulp.task('test', ['mocha', 'jshint', 'jscs']);
