export type Class = new (...args: any[]) => any

declare global {
    interface String {
        format(...args: any[]): string
    }

    interface Array<T> {
        flatten(): T
    }
}

String.prototype.format = function (this: string, ...args: any[]) {
    return this.replace(/{(\d+)}/g, (m, i) => typeof args[i] != 'undefined' ? args[i] : m)
}

Array.prototype.flatten = function <T>(this: Array<T>) {
    return this.reduce((a, b) => a.concat(b), <T[]>[])
}

export function getChildValue(object: any, path: string, defaultValue?: any) {
    return path
        .split(/[\.\[\]\'\"]/)
        .filter(p => p)
        .reduce((o, p) => o ? o[p] : defaultValue, object)
}

