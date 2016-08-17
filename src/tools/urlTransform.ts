import url = require('url');
import path = require('path');

export function normalize(u: string, relativeTo: string) {
    if (/^\/\//.test(u)) {
        u = 'http:' + u;
    }
    var uParsed = url.parse(u);
    if (uParsed.protocol) {
        return u;
    }
    var rtParsed = url.parse(relativeTo);
    var host = rtParsed.protocol + '//' + rtParsed.host;
    if (/^\//.test(u)) {
        return host + u;
    }
    return host + path.join(path.dirname(rtParsed.pathname), u);
}

export function toPath(originUrl: string, headers: any) {
    let res = url.parse(originUrl);
    return path.join(res.host, res.path);
}