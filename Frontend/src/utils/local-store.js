class Storage {
    static store(key, data) {
        if (typeof window !== "undefined") {
            window.localStorage.setItem(key, JSON.stringify(data));
        }
    }

    static getJson(key) {
        if (typeof window !== "undefined") {
            const value = window.localStorage.getItem(key);
            return value ? JSON.parse(value) : null; // return null if no value
        }
        return null; // return null if window is undefined
    }

    static get(key) {
        if (typeof window !== "undefined") {
            return window.localStorage.getItem(key) || null; // return null if no value
        }
        return null; // return null if window is undefined
    }

    static remove(key) {
        if (typeof window !== "undefined") {
            window.localStorage.removeItem(key);
        }
    }

    static clearAll() {
        if (typeof window !== "undefined") {
            window.localStorage.clear();
        }
    }
}

export default Storage;
