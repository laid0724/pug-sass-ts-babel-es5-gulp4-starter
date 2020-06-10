import * as gulp from 'gulp';
import * as autoprefixer from 'autoprefixer';
import * as sass from 'gulp-sass';
import * as ts from 'gulp-typescript';
import * as babel from 'gulp-babel';
import * as clean from 'gulp-clean';
import * as imagemin from 'gulp-imagemin';
import * as csso from 'gulp-csso';
import * as pug from 'gulp-pug';
import * as plumber from 'gulp-plumber';
import * as sourcemaps from 'gulp-sourcemaps';
import * as imageminJpegRecompress from 'imagemin-jpeg-recompress';
import * as browserSync from 'browser-sync';
import * as gulpIf from 'gulp-if';
import * as concat from 'gulp-concat';
import * as postcss from 'gulp-postcss';
import * as postCssObjectFitImages from 'postcss-object-fit-images';
import * as postCssInlineSvg from 'postcss-inline-svg';

// import { Observable } from 'rxjs';

const { series, parallel, watch } = gulp;
const isDevelopment =
  !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

const transpileSass = () => {
  const processors = [
    autoprefixer({
      overrideBrowserslist: ['last 4 version', 'IE 11'],
      grid: 'autoplace',
    }),
    postCssObjectFitImages,
    postCssInlineSvg,
  ];

  return gulp
    .src('app/sass/**/*.{sass,scss}')
    .pipe(gulpIf(isDevelopment, sourcemaps.init()))
    .pipe(
      sass({
        outputStyle: 'expanded',
      }).on('error', sass.logError)
    )
    .pipe(postcss(processors))
    .pipe(gulpIf(isDevelopment, sourcemaps.write()))
    .pipe(
      gulpIf(
        !isDevelopment,
        csso({
          sourceMap: false,
        })
      )
    )
    .pipe(gulp.dest('dist'));
};

const transpileTsAndJsToEs5 = () => {
  const tsProject = ts.createProject('tsconfig.json');
  return gulp
    .src('app/ts/**/*.{ts,js}')
    .pipe(tsProject())
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(concat('main.js'))
    .pipe(sourcemaps.write('.', null))
    .pipe(gulp.dest('dist'));
};

const transpilePug = () => {
  return gulp
    .src('app/pug/**/*.pug')
    .pipe(plumber())
    .pipe(
      pug({
        pretty: true,
      })
    )
    .pipe(gulp.dest('dist'));
};

const copyImages = () => {
  return gulp
    .src('app/img/**/*')
    .pipe(plumber())
    .pipe(
      gulpIf(
        !isDevelopment,
        imagemin([
          imagemin.gifsicle(),
          imageminJpegRecompress({
            min: 60,
            max: 80,
          }),
          imagemin.optipng(),
          imagemin.svgo({
            plugins: [
              {
                cleanupIDs: false,
              },
            ],
          }),
        ])
      )
    )
    .pipe(gulp.dest('dist/static/'));
};

const cleanDistFolder = () =>
  gulp.src('dist/**', { read: false }).pipe(clean());

const watchFiles = () => {
  watch('app/sass/**/*.{sass,scss}', series(transpileSass, reload));
  watch('app/ts/**/*.{ts,js}', series(transpileTsAndJsToEs5, reload));
  watch('app/pug/**/*.pug', series(transpilePug, reload));
  watch('app/img/**/*', series(copyImages, reload));
};

// browser sync setup here:
// https://github.com/gulpjs/gulp/blob/master/docs/recipes/minimal-browsersync-setup-with-gulp4.md

const browserSyncServer = browserSync.create();

const reload = (done) => {
  browserSyncServer.reload();
  done();
};

const serve = (done) => {
  browserSyncServer.init({
    server: {
      baseDir: 'dist/',
    },
  });
  done();
};

//

exports.clean = cleanDistFolder;
exports.default = series(
  cleanDistFolder,
  parallel(transpileSass, transpileTsAndJsToEs5, transpilePug, copyImages),
  serve,
  watchFiles
);
