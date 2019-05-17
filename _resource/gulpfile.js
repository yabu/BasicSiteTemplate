// ---------- ---------- ---------- ---------- ----------
// Gulp設定ファイル
// ---------- ---------- ---------- ---------- ----------

// ディレクトリ設定
var path = {
	gulpSrc: '/_resource/'
	,devRoot: '../_bin/'
	,docRoot: '../_src/'
};

// パッケージをインポートする
var gulp = require('gulp');	// Gulp本体
var webserver  = require('gulp-webserver');	// ローカルサーバー
var connectSSI = require('connect-ssi'); // SSIを動かす
var connectPHP = require('gulp-connect-php'); // PHPを動かす
var browserSync  = require('browser-sync');
var sass = require('gulp-sass');	// Sassを扱う
var autoprefixer = require('gulp-autoprefixer');
var cssmin = require('gulp-cssmin');
var rename = require('gulp-rename');
var ejs = require('gulp-ejs');
var imagemin = require('gulp-imagemin');
var pngquant = require('imagemin-pngquant');
var fs = require('fs');
var myIP = require('my-ip'); //IPアドレスでアクセス可能にする
var plumber = require('gulp-plumber');// 処理エラー時にタスクを強制終了させない
var notify  = require('gulp-notify');// デスクトップ通知する
var data  = require('gulp-data');
var svgmin   = require('gulp-svgmin');
var replace  = require('gulp-replace');
var concat = require('gulp-concat');	// ファイルを結合する
var uglify = require('gulp-uglify');
var cheerio  = require('gulp-cheerio');
var runSequence = require('run-sequence');

// エラー表示
function plumberWithNotify() {
	return plumber({errorHandler: notify.onError('<%= error.message %>')});
}

//sass
gulp.task('sass', function() {
	return gulp.src(path.devRoot + 'scss/{,**/}*.scss')
		.pipe(plumberWithNotify())
		.pipe(sass({outputStyle: 'expanded'})) //sassをコンパイル
		.pipe(autoprefixer({
			browsers: ['last 2 versions','iOS >= 10', 'Android >= 6.0'],
			cascade: false
		}))
		.pipe(gulp.dest(path.docRoot + 'cmn/css/')) //cssを保存
		.pipe(cssmin())
		.pipe(rename({suffix: '.min'}))
		.pipe(gulp.dest(path.docRoot + 'cmn/css/')) //cssを保存
		;
});

//画像圧縮
gulp.task('images', function() {
	gulp.src(path.devRoot + 'images/{,**/}*.+(jpg|jpeg|png|gif)')
		.pipe(plumberWithNotify())
		.pipe(imagemin({
			progressive: true,
			svgoPlugins: [
				{ removeViewBox: false },
				{ cleanupIDs: false }
			],
			use: [pngquant()]
		}))
		.pipe(gulp.dest(path.docRoot + 'cmn/images/'))
	;
});
gulp.task('local_images', function() {
	gulp.src(path.devRoot + 'html/{,**/}*.+(jpg|jpeg|png|gif)')
		.pipe(plumberWithNotify())
		.pipe(imagemin({
			progressive: true,
			svgoPlugins: [
				{ removeViewBox: false },
				{ cleanupIDs: false }
			],
			use: [pngquant()]
		}))
		.pipe(gulp.dest(path.docRoot))
	;
});

// ejs
gulp.task('ejs', function() {
	return gulp.src( [path.devRoot + 'html/**/*.ejs', '!' + path.devRoot + 'html/**/_*.ejs' ])
		.pipe(plumberWithNotify())
		.pipe(data(function(file) {
			return {
				'filename': file.path
			}
		}))
		.pipe(ejs(
			{ site: JSON.parse(fs.readFileSync(path.devRoot + 'html/index.json')) },
			{ ext: ".html" }
		))
		.pipe(rename({extname: '.html'}))
		.pipe(gulp.dest(path.docRoot))
		;
});
// SVG
gulp.task('svg', function() {
	gulp.src(path.devRoot+'images/{,**/}*.svg')
		.pipe(svgmin())
		.pipe(cheerio({
			run: function($, file) {
				// 不要なタグを削除
				$('style,title,defs').remove();
				// symbolタグ以外のid属性を削除
				$('[id]:not(symbol)').removeAttr('id');
				// Illustratorで付与される「st」または「cls」ではじまるclass属性を削除
				$('[class^="st"],[class^="cls"]').removeAttr('class');
				// svgタグ以外のstyle属性を削除
				$('[style]:not(svg)').removeAttr('style');
				// data-name属性を削除
				$('[data-name]').removeAttr('data-name');
				// fill属性を削除
				$('[fill]').removeAttr('fill');
			},
			parserOptions: {
				xmlMode: true
			}
		}))
		.pipe(gulp.dest(path.docRoot+'/cmn/images/'));
});

//Script
gulp.task('js', function() {
	js_task();
	return runSequence(
		'js_through'
		,'js_uglify'
	)
});
function js_task() {
	var dest_plugin_file = 'plugins.js',dest_file = 'scripts.js';

	gulp.task('js_through', function() {//そのままコピー
		gulp.src([
			path.devRoot + 'js/' + dest_file
		], {
			base: path.devRoot
		})
		.pipe(gulp.dest(path.docRoot + '/cmn/'));
	});
	gulp.task('js_uglify', function() {//jsを結合して圧縮する
		return gulp.src([
			path.devRoot + 'js/libs/*.js'
		])
			.pipe(plumberWithNotify())
			.pipe(concat(dest_plugin_file))
			.pipe(uglify({ output: {comments: /^!/}}))
			.pipe(gulp.dest(path.docRoot + '/cmn/js/'));
	});
}

//ローカルサーバー
gulp.task('webserver', function() {
	gulp.src(path.docRoot)
		.pipe(webserver({
			host: 'localhost',
			port: 8000,
			liveReload: true,
			directoryListing: true,
			middleware: [
				connectSSI({
					ext: '.html', // file extension. Only urls ending in this will be evaluated.
					baseDir: path.docRoot // base path to look in for files
				})
			]
		}));
});
// gulp.task('webserver', function() {
// 	connectPHP.server({
// 		port: 8000,
// 		base: path.docRoot
// 	}, function (){
// 		browserSync({
// 			proxy: 'localhost:8000'
// 		});
// 	});
// });

// IPアドレスを出力
gulp.task('info', function() {
	console.log(myIP()); // IPアドレスをログ出力する
});

//ファイル更新監視
gulp.task('watch', function() {
	gulp.watch([
		path.devRoot + 'html/{,**/}*.ejs'
		,path.devRoot + '_include/{,**/}*.ejs'
		,path.devRoot + 'html/{,**/}*.json'
	], ['ejs']);
	gulp.watch([
		path.devRoot + 'scss/{,**/}*.scss'
	], ['sass']);
	gulp.watch([
		path.devRoot + 'js/{,**/}*.js'
	], ['js']);
	gulp.watch([
		path.devRoot + 'images/{,**/}*.+(jpg|jpeg|png|gif)'
	], ['images']);
	gulp.watch([
		path.devRoot + 'html/{,**/}*.+(jpg|jpeg|png|gif|svg)'
	], ['local_images']);
	gulp.watch([
		path.devRoot + 'images/{,**/}*.svg'
	], ['svg']);
	gulp.watch([
		path.devRoot + 'js/{,**/}*.js'
	], ['js']);
});

gulp.task('default', [
	'webserver'
	,'info'
	,'watch'
	,'sass'
	,'images'
	,'local_images'
	,'ejs'
	,'svg'
	,'js'
]);
