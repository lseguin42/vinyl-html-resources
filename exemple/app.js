var vHtmlResources = require('../lib');
var path = require('path');
var fs = require('fs');
var vfs = require('vinyl-fs');
var debug = require('gulp-debug');

let PATH = path.join(__dirname, 'index.html');

// vHtmlResources('orUseUrl')
vHtmlResources({
    url: 'http://www.cdiscount.com/maison/v-117-0.html',
    dom: String(fs.readFileSync(PATH))
})
    .pipe(debug({title: 'resource'}))
    .pipe(vfs.dest('./dist'));