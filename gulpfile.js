const {
  src,
  dest,
  parallel,
  series,
  watch,
  task
} = require("gulp");
const browserSync = require("browser-sync").create();
const concat = require("gulp-concat");
const uglify = require("gulp-uglify-es").default;
const sass = require("gulp-sass");
const autoprefixer = require("gulp-autoprefixer");
const include = require("gulp-file-include");
const htmlmin = require("gulp-htmlmin");
const cleancss = require("gulp-clean-css");
const imagemin = require("gulp-imagemin");
const imgCompress = require("imagemin-jpeg-recompress");
const imageminPngquant = require("imagemin-pngquant");
const webp = require("gulp-webp");
const webphtml = require("gulp-webp-html");
const webpcss = require("gulp-webp-css");
const svgSprite = require("gulp-svg-sprite");
const newer = require("gulp-newer");
const ttf2woff = require("gulp-ttf2woff");
const ttf2woff2 = require("gulp-ttf2woff2");
const fonter = require("gulp-fonter");
const del = require("del");

let fs = require("fs");

function browsersync() {
  browserSync.init({
    // Инициализация Browsersync
    server: {
      baseDir: "src/",
    }, // Указываем папку сервера
    notify: false, // Отключаем уведомления
    online: true,
    port: 4002, // Режим работы: true или false
  });
}

function html() {
  // работа с html
  return src("src/**.html")
    .pipe(
      include({
        prefix: "@@", // для многостраничника (подключать модули в старницы типа @@include footer)
      })
    )

    .pipe(dest("dist"));
}

function scripts() {
  return src([
      // Берём файлы из источников
      "node_modules/jquery/dist/jquery.min.js", // Пример подключения библиотеки
      "src/js/main.js" // Пользовательские скрипты, использующие библиотеку, должны быть подключены в конце
    ])
    .pipe(concat("master.min.js")) // Конкатенируем в один файл
    .pipe(uglify()) // Сжимаем JavaScript
    .pipe(dest("src/js/")) // Выгружаем готовый файл в папку назначения
    .pipe(browserSync.stream()); // Триггерим Browsersync для обновления страницы
}

function styles() {
  return (
    src("src/scss/**.scss")
    .pipe(eval(sass)())
    .pipe(
      autoprefixer({
        overrideBrowserslist: ["last 10 versions"],
      })
    )
    // .pipe(webpcss())
    .pipe(
      cleancss({
        level: {
          1: {
            all: true,
            normalizeUrls: false,
            specialComments: 0,
          },
          2: {
            restructureRules: true,
          },
        } /* , format: 'beautify' */ ,
      })
    ) // Минифицируем стили
    .pipe(concat("light.min.css"))
    .pipe(dest("src/css"))
    .pipe(browserSync.stream())
  ); // Сделаем инъекцию в браузер
}

function images() {
  return (
    src("src/img/src/**/*") // Берём все изображения из папки источника
    .pipe(newer("src/img/dest/")) // Проверяем, было ли изменено (сжато) изображение ранее, чтобы покругу не сжимать

    .pipe(
      imagemin([
        imgCompress({
          loops: 4,
          min: 70,
          max: 80,
          quality: [0.7, 0.8],
        }),
        imagemin.gifsicle(),
        imagemin.optipng(),
        imageminPngquant({
          quality: [0.7, 0.8],
        }),
        imagemin.svgo({
          plugins: [{
            removeViewBox: true,
          }, ],
        }),
      ])
    )
    // Сжимаем и оптимизируем изображеня
    .pipe(dest("src/img/dest/"))
  );

  // Выгружаем оптимизированные изображения в папку назначения
}

function cleanimg() {
  return del("src/img/dest/**/*", {
    force: true,
  }); // Удаляем всё содержимое папки "src/img/dest/"
}

function buildcopy() {
  return src(
      [
        // Выбираем нужные файлы
        "src/fonts/**/**",
        "src/css/**/*.min.css",
        "src/js/**/*.min.js",
        "src/img/dest/**/*",
        "src/**/*.html",
        "src/mail.php",
        "src/phpmailer/**",
      ], {
        base: "src",
      }
    ) // Параметр "base" сохраняет структуру проекта при копировании
    .pipe(dest("./dist")); // Выгружаем в папку с финальной сборкой
}

function cleandist() {
  return del("./dist/**/*", {
    force: true,
  }); // Удаляем всё содержимое папки "dist/"
}

function startwatch() {
  watch(["src/**/*.js", "!src/**/*.min.js"], scripts);

  watch("src/scss/**.scss", styles);

  watch("src/**/**.html").on("change", browserSync.reload);

  watch("src/img/**/*", images);
}

//Работа со шрифтами
{
  // Fonts || Шрифты из ttf to woff, woff2
  function fonts() {
    src("src/fonts/").pipe(ttf2woff()).pipe(dest("src/fonts/"));
    return src("src/fonts/").pipe(ttf2woff2()).pipe(dest("src/fonts/"));
  }
  // Fonts || Шрифты из otf to ttf
  task("otf2ttf", function () {
    return src("src/fonts/*.otf") // откуда берем
      .pipe(
        fonter({
          formats: ["ttf"], // формат, который хотим получить
        })
      )
      .pipe(dest("src/fonts/"));
  });
}

//cпрайты || sprites
task("svgSprite", function () {
  return src("src/img/src/*.svg") // откуда берем
    .pipe(
      svgSprite({
        mode: {
          stack: {
            sprite: "../dest/icons.svg", // куда кладем
            example: true, // создает html с примерами иконок
          },
        },
      })
    )
    .pipe(dest("src/img"));
});

// Экспортируем функцию browsersync() как таск browsersync. Значение после знака = это имеющаяся функция.
exports.browsersync = browsersync;
exports.scripts = scripts;
exports.styles = styles;
exports.images = images;
exports.html = html;
exports.svgSprite = svgSprite;
exports.cleandist = cleandist;
exports.fonts = fonts;

exports.cleanimg = cleanimg;

// Собираем проект через 'gulp build'
exports.build = series(
  cleandist,
  parallel(styles, scripts, images, html, fonts, buildcopy)
);

// Режим разработчика через 'gulp'
exports.default = parallel(
  styles,
  scripts,
  html,
  fonts,
  svgSprite,
  startwatch,
  browsersync
);

// Запусти gulp svgIcons и все твои иконки *.svg из src/img/src/ сформируются в src/img/dest/icons.svg || cпрайты || sprites