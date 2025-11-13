// DOM utility functions
export const $ = (selector, context) => (context || document).querySelector(selector);
export const $$ = (selector, context) => (context || document).querySelectorAll(selector);

export const Utils = {
    clamp: (v, min, max) => Math.max(min, Math.min(v, max)),
    lerp: (a, b, t) => a + (b - a) * t,
    generateId: (prefix = 'id') =>
        `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
    DEG2RAD: Math.PI / 180,
    isObject: item => item && typeof item === 'object' && !Array.isArray(item),
    mergeDeep: (target, ...sources) => {
        if (!sources.length) return target;
        const [source, ...rest] = sources;
        
        if (Utils.isObject(target) && Utils.isObject(source)) {
            for (const key in source) {
                const targetValue = target[key];
                const sourceValue = source[key];
                target[key] = Utils.isObject(targetValue) && Utils.isObject(sourceValue)
                    ? Utils.mergeDeep(targetValue, sourceValue)
                    : sourceValue;
            }
        }
        
        return Utils.mergeDeep(target, ...rest);
    },
    toHexColor: numColor => {
        if (typeof numColor === 'string' && numColor.startsWith('#')) return numColor;
        if (typeof numColor !== 'number' || isNaN(numColor)) return '#ffffff';
        return `#${Math.floor(numColor).toString(16).padStart(6, '0')}`;
    },
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    throttle: (func, limit) => {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    deepClone: obj => {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => Utils.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = Utils.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    },
    isEmpty: obj => {
        if (obj == null) return true;
        if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
        if (typeof obj === 'object') return Object.keys(obj).length === 0;
        return false;
    },
    unique: array => [...new Set(array)],
    chunk: (array, size) => {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    },
    randomBetween: (min, max) => Math.random() * (max - min) + min,
    formatBytes: bytes => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};
