/// <reference path="../typings/index.d.ts" />

import File = require('./VinylHttp');
import urlCssExtractor = require('./ExtractorUrlCss');
import eachLimit = require('./tools/eachLimit');
import urlTransform = require('./tools/urlTransform');
import through2 = require('through2');
import cheerio = require('cheerio');
import request = require('request');
import url = require('url');
import crypto = require('crypto');

const SELECTOR = '[src]:not(script), [href]:not(a,link), link[href][rel!=canonical]';
const LIMIT_REQUEST = 30;

let PROCESSING_CACHE: { [propName: string]: boolean } = {};

function needAbortRequest(response: any) {
    return /(text\/html)|(text\/xml)|(application\/json)|(application\/javascript)/.test(response.headers['content-type']);
}

function pushToProcessingList(dest: File[], file: File) {
    if (typeof PROCESSING_CACHE[file.httpOriginUrlRequest] === 'undefined') {
        PROCESSING_CACHE[file.httpOriginUrlRequest] = true;
        dest.push(file);
    }
}

function pushToProcessingListCssResources(dest: File[], data: string, originUrl: string) {
    urlCssExtractor(data, function (url: string, isImport: boolean) {
        let normalizedUrl = urlTransform.normalize(url, originUrl);
        let file = new File({
            httpOriginUrlRequest: normalizedUrl
        });
        if (isImport) {
            file.setCssOriginImport();
        } else {
            file.setCssOriginResource();
        }
        pushToProcessingList(dest, file);
    });
}

function isHttpRequest(u: string) {
    return ['http:', 'https:'].indexOf(url.parse(u).protocol) !== -1;
}

function processingFile(file: File, callback: (error?: Error, abort?: boolean) => void) {
    let md5Hash = crypto.createHash('md5');
    let sha1Hash = crypto.createHash('sha1');
    let abort = false;

    if (!isHttpRequest(file.httpOriginUrlRequest)) {
        return callback(new Error('not http protocol'));
    }
    let req = request.get({
        url: file.httpOriginUrlRequest,
        encoding: null,
        timeout: 3000
    }, function (error, response, buffer) {
        if (abort) {
            return ;
        }
        if (error) {
            return callback(error);
        }
        file.contents = buffer;
        (<any>file).hashes = {
            md5: md5Hash.digest('hex'),
            sha1: sha1Hash.digest('hex')
        }
        callback();
    });
    req.on('abort', function () {
        abort = true;
        callback(undefined, true);
    });
    req.on('response', function (response) {
        if (needAbortRequest(response)) {
            return req.abort();
        }
        file.httpStatusCodeResponse = response.statusCode;
        file.httpHeaderResponse = response.headers;
        file.path = urlTransform.toPath(file.httpOriginUrlRequest, response.headers);
    });
    req.on('data', function (chunk) {
        md5Hash.update(chunk);
        sha1Hash.update(chunk);
    });
}

export = function vinylHtmlResources(opts: string | {
    url: string,
    dom: string
}) {
    let stream = through2.obj();
    let files: File[] = [];

    let url: string;
    let dom: string;

    if (typeof opts === 'string') {
        url = opts;
    } else {
        url = opts.url;
        dom = opts.dom;
    }

    if (dom) {
        run();
    } else {
        request.get(url, function (error, response, body) {
            if (error) {
                stream.emit('error', error);
                throw error;
            }
            dom = body;
            run();
        });
    }
    return stream;

    function run() {
        let $ = cheerio.load(dom);
        $(SELECTOR).each(function (index, element) {
            let link: string = (<any>element).attribs['src'] || (<any>element).attribs['href'];
            let normalizedUrl = urlTransform.normalize(link, url);
            let file = new File({
                httpOriginUrlRequest: normalizedUrl
            });
            file.setDomOriginRequest(element.tagName, <any>element.attribs);
            pushToProcessingList(files, file);
        });

        $('style').each(function (index, element) {
            pushToProcessingListCssResources(files, $(element).text(), url);
        });
        downloadResources();
    }

    function downloadResources() {
        eachLimit(files, LIMIT_REQUEST, function (file, next) {
            processingFile(file, function (error, abort) {
                if (error || abort) {
                    return next();
                }
                if (file.isCss()) {
                    pushToProcessingListCssResources(files, String(file.contents), file.httpOriginUrlRequest);
                }
                stream.write(<any>file);
                next();
            });
        }, function () {
            stream.end();
            console.log('terminate');
        });
    }
}