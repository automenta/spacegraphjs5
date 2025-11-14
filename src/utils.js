// DOM utility functions
/**
 * Query selector helper
 * @param {string} selector - CSS selector
 * @param {Element|Document} context - Context element
 * @returns {Element|null} Found element or null
 */
export const $ = (selector, context) => (context || document).querySelector(selector);

/**
 * Query selector all helper
 * @param {string} selector - CSS selector
 * @param {Element|Document} context - Context element
 * @returns {NodeList} Found elements
 */
export const $$ = (selector, context) => (context || document).querySelectorAll(selector);

/**
 * Utility functions collection
 */
export const Utils = {
    /**
     * Clamp a value between min and max
     * @param {number} v - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    clamp: (v, min, max) => Math.max(min, Math.min(v, max)),
    
    /**
     * Linear interpolation
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor
     * @returns {number} Interpolated value
     */
    lerp: (a, b, t) => a + (b - a) * t,
    
    /**
     * Generate a unique ID
     * @param {string} prefix - ID prefix
     * @returns {string} Generated ID
     */
    generateId: (prefix = 'id') =>
        `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
    
    /** @type {number} Degrees to radians conversion factor */
    DEG2RAD: Math.PI / 180,
    
    /**
     * Check if item is a plain object
     * @param {*} item - Item to check
     * @returns {boolean} True if plain object
     */
    isObject: item => item && typeof item === 'object' && !Array.isArray(item),
    
    /**
     * Deep merge objects
     * @param {Object} target - Target object
     * @param {...Object} sources - Source objects
     * @returns {Object} Merged object
     */
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
    
    /**
     * Convert numeric color to hex string
     * @param {number|string} numColor - Numeric color or hex string
     * @returns {string} Hex color string
     */
    toHexColor: numColor => {
        if (typeof numColor === 'string' && numColor.startsWith('#')) return numColor;
        if (typeof numColor !== 'number' || isNaN(numColor)) return '#ffffff';
        return `#${Math.floor(numColor).toString(16).padStart(6, '0')}`;
    },
    
    /**
     * Debounce a function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
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
    
    /**
     * Throttle a function
     * @param {Function} func - Function to throttle
     * @param {number} limit - Limit time in ms
     * @returns {Function} Throttled function
     */
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
    
    /**
     * Deep clone an object
     * @param {*} obj - Object to clone
     * @returns {*} Cloned object
     */
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
    
    /**
     * Check if object is empty
     * @param {*} obj - Object to check
     * @returns {boolean} True if empty
     */
    isEmpty: obj => {
        if (obj == null) return true;
        if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
        if (typeof obj === 'object') return Object.keys(obj).length === 0;
        return false;
    },
    
    /**
     * Get unique values from array
     * @param {Array} array - Input array
     * @returns {Array} Array with unique values
     */
    unique: array => [...new Set(array)],
    
    /**
     * Chunk array into smaller arrays
     * @param {Array} array - Input array
     * @param {number} size - Chunk size
     * @returns {Array} Array of chunks
     */
    chunk: (array, size) => {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    },
    
    /**
     * Generate random number between min and max
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random number
     */
    randomBetween: (min, max) => Math.random() * (max - min) + min,
    
    /**
     * Format bytes to human readable format
     * @param {number} bytes - Number of bytes
     * @returns {string} Formatted string
     */
    formatBytes: bytes => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};
