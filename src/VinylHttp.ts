/// <reference path="../typings/index.d.ts" />

import Vinyl = require('vinyl');

class DOMHtmlElement {
    tagName: string;
    attributes: {
        [propName: string]: string;
    };

    constructor(tagName: string, attributes: { [propName: string]: string; }) {
        this.tagName = tagName;
        this.attributes = attributes;
    }

    attr(name: string) {
        return this.attributes[name];
    }

    attrContain(name: string, value: string) {
        var values = this.attributes[name];
        return !!values && values.split(' ').indexOf(value) !== -1;
    }
}

class VinylHttp extends Vinyl {
    httpHeaderResponse: { [propName: string]: string };
    httpOriginUrlRequest: string;
    httpStatusCodeResponse: number;
    private _typeOriginRequest: string;
    private _domOriginRequest: DOMHtmlElement;
    private _cssOriginRequest: string;
    [propName: string]: any;

    constructor(options?: {
            cwd?: string,
            base?: string,
            path?: string,
            history?: string[],
            contents?: Buffer | NodeJS.ReadWriteStream,
            httpHeaderResponse?: { [propName: string]: string },
            httpOriginUrlRequest?: string,
            httpStatusCodeResponse?: number,
            [propName: string]: any
        }) {
        super(options);
    }

    getTypeOriginRequest() {
        return this._typeOriginRequest;
    }

    setDomOriginRequest(tagName: string, attrs: { [propName: string]: string; }) {
        let element = new DOMHtmlElement(tagName, attrs);
        this._typeOriginRequest = element && 'DOMHtmlElement' || undefined;
        this._domOriginRequest = element;
    }

    getDomOriginRequestTagName() {
        return this._domOriginRequest.tagName;
    }

    getDomOriginRequestAttrs() {
        return this._domOriginRequest.attributes;
    }

    setCssOriginImport() {
        this._typeOriginRequest = 'CSS';
        this._cssOriginRequest = '@import';
    }

    setCssOriginResource() {
        this._typeOriginRequest = 'CSS';
        this._cssOriginRequest = 'resource';
    }

    contentTypeContain(type: string) {
        let contentType = this.httpHeaderResponse && this.httpHeaderResponse['content-type'];
        if (!contentType) {
            return false;
        }
        return !!contentType.match(type);
    }

    isCss(): boolean {
        return this.contentTypeContain('text/css')
                || this.extname === '.css'
                || (this._typeOriginRequest === 'DOMHtmlElement'
                    && this._domOriginRequest.tagName === 'link'
                    && this._domOriginRequest.attrContain('rel', 'stylesheet')
                || (this._typeOriginRequest === 'CSS'
                    && this._cssOriginRequest === '@import'))
    }
}

export = VinylHttp;