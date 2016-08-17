import css = require('css');

function wrapUrl(url: string) {
    return 'url("' + url.replace('"', '\"') + '")';
}

function cleanMatch(url: string): string {
    url = url.trim();
    let firstChar = url.substr(0, 1);
    if (firstChar === (url.substr(-1)) && (firstChar === '"' || firstChar === "'")) {
        url = url.substr(1, url.length - 2);
    }
    return url;
}

function extractDeclarationUrl(str: string, findFn: (url: string) => void | string) {
    const URL_REGEX = /url\s*\(\s*(?!["']?data:)([^\)]+)\)/g;
    return str.replace(URL_REGEX, function () {
        var url = findFn(cleanMatch(arguments[1]));
        if (typeof url !== 'string')
            return arguments[0];
        return wrapUrl(<string>url);
    });
}

function extractImportUrl(str: string, findFn: (url: string) => void | string) {
    const IMPORT_REGEX = /^(url\s*\(\s*(?!["']?data:)([^\)]+)\))|((["'])\s*([^'"]+)\4)/;
    return str.replace(IMPORT_REGEX, function () {
        var url = findFn(cleanMatch(arguments[2] || arguments[5]));
        if (typeof url !== 'string')
            return arguments[0];
        return wrapUrl(<string>url);
    });
}

export = function ExtractorUrlCss(data: string, findFn: (url: string, isImport: boolean) => void | string) {
    let cssDocument = css.parse(data);

    let processRules = function (rules: any) {
        rules.forEach(function (rule: any) {
            if (rule.declarations) {
                rule.declarations.forEach(function (declaration: any) {
                    if (declaration.type === 'declaration') {
                        declaration.value = extractDeclarationUrl(declaration.value, function (url) {
                            return findFn(url, false);
                        });
                    }
                });
            } else if (rule.type === 'import') {
                rule.import = extractImportUrl(rule.import, function (url) {
                    return findFn(url, true);
                });
            }
            if (rule.rules) {
                processRules(rule.rules);
            }
        });
    }

    processRules(cssDocument.stylesheet.rules);
    return css.stringify(cssDocument);
}