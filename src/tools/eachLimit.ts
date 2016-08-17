function once(callback: Function) {
    return function () {
        let args = arguments, fn = callback;
        if (callback) {
            callback = null;
            process.nextTick(() => fn.apply(this, args));
        } else {
            throw new Error('Can be called once');
        }
    }
}

export = function eachLimit<T>(stack: Array<T>, limit: number, iterator: (elem :T, next: Function, index: number) => void, terminate?: (err?: Error) => void) {
    var index = 0;
    var recovery = 0;
    var error: Error = null;

    var next = function (err?: Error) {
        if (err || error) {
            return err && (error = err) && terminate ? terminate(error) : undefined;
        }
        recovery++;
        if (stack.length === index) {
            return recovery === limit && terminate ? terminate() : undefined;
        }
        for (; index < stack.length && recovery > 0; index++, recovery--) {
            iterator(stack[index], once(next), index);
        }
    }
    for (let i = 0; i < limit; i++) {
        next();
    }
}