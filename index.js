export default class IDBStorage {
    /*
     *  In the usual usage of IDBStorage, store name and version
     *  nubmer should not be configurable, or otherwise it could
     *  easily result in DB version error. It is exposed as a hidden
     *  setting for dev who are familier with indexedDB and have
     *  special need for a different value
     *
     * @param {string} name
     * @param {string} _storeName
     * @param {string} _version
     */
    constructor({ name = 'IDBStorage', _storeName = 'keyvalue', _version = 1 } = {}) {
        this.name = name
        this.storeName = _storeName
        this.version = _version
        this.db = null
        this.opening = null
        this.pendingTX = []
    }

    transaction({ mode, success, error }) {
        if (this.db) {
            try {
                const tx = this.db.transaction([this.storeName], mode)
                success(tx)
            } catch (e) {
                error(e)
                this.close()
            }
            return
        }

        this.pendingTX.push([mode, success, error])

        if (this.opening) return

        this.opening = openIDBConnection(this.name, this.storeName, this.version)
            .then((db) => {
                this.opening = null
                this.db = db
                this.db.onversionchange = () => this.close()
                this.db.onclose = () => this.close()

                let failed
                this.pendingTX.forEach(([mode, success, error]) => {
                    if (failed) return error(failed)

                    try {
                        const tx = this.db.transaction([this.storeName], mode)
                        success(tx)
                    } catch (e) {
                        failed = e
                        error(e)
                        this.close()
                    }
                })
                this.pendingTX = []
            })
            .catch((e) => {
                this.opening = null
                this.pendingTX.forEach(([, , error]) => error(e))
                this.pendingTX = []
            })
    }

    close() {
        if (!this.db) return

        this.db.close()
        this.db = null
    }

    setItem(key, value) {
        return new Promise((resolve, reject) => {
            this.transaction({
                mode: 'readwrite',
                success: (tx) => {
                    try {
                        const req = tx.objectStore(this.storeName).put(value, key)
                        tx.oncomplete = () => resolve(value)
                        tx.onerror = tx.onabort = () => reject(req.error ? req.error : tx.error)
                    } catch (e) {
                        reject(e)
                    }
                },
                error: (e) => reject(e),
            })
        })
    }

    getItem(key) {
        return new Promise((resolve, reject) => {
            this.transaction({
                mode: 'readonly',
                success: (tx) => {
                    try {
                        const req = tx.objectStore(this.storeName).get(key)
                        tx.oncomplete = () => resolve(req.result)
                        tx.onerror = tx.onabort = () => reject(req.error ? req.error : tx.error)
                    } catch (e) {
                        reject(e)
                    }
                },
                error: (e) => reject(e),
            })
        })
    }

    removeItem(key) {
        return new Promise((resolve, reject) => {
            this.transaction({
                mode: 'readwrite',
                success: (tx) => {
                    try {
                        const req = tx.objectStore(this.storeName).delete(key)
                        tx.oncomplete = () => resolve()
                        tx.onerror = tx.onabort = () => reject(req.error ? req.error : tx.error)
                    } catch (e) {
                        reject(e)
                    }
                },
                error: (e) => reject(e),
            })
        })
    }

    clear() {
        return new Promise((resolve, reject) => {
            this.transaction({
                mode: 'readwrite',
                success: (tx) => {
                    try {
                        const req = tx.objectStore(this.storeName).clear()
                        tx.oncomplete = () => resolve()
                        tx.onerror = tx.onabort = () => reject(req.error ? req.error : tx.error)
                    } catch (e) {
                        reject(e)
                    }
                },
                error: (e) => reject(e),
            })
        })
    }

    length() {
        return new Promise((resolve, reject) => {
            this.transaction({
                mode: 'readonly',
                success: (tx) => {
                    try {
                        const req = tx.objectStore(this.storeName).count()
                        tx.oncomplete = () => resolve(req.result)
                        tx.onerror = tx.onabort = () => reject(req.error ? req.error : tx.error)
                    } catch (e) {
                        reject(e)
                    }
                },
                error: (e) => reject(e),
            })
        })
    }

    deleteDatabase() {
        return new Promise((resolve, reject) => {
            const req = window.indexedDB.deleteDatabase(this.name)
            req.onsuccess = () => resolve()
            req.onerror = (ev) => reject(ev)
        })
    }

    /*
     * Checked if indexedDB is supported
     */
    get supports() {
        return typeof indexedDB !== 'undefined'
    }
}

/*
 * Open an IDB connection
 * @param {Promise} IDBDatabase
 */
const openIDBConnection = (name, storeName, version) => {
    return new Promise((resolve, reject) => {
        try {
            const req = window.indexedDB.open(name, version)
            req.onupgradeneeded = () => {
                const db = req.result
                db.onerror = (ev) => reject(ev)
                db.onabort = (ev) => reject(ev)

                try {
                    db.createObjectStore(storeName)
                } catch (e) {
                    reject(e)
                }
            }
            req.onsuccess = () => resolve(req.result)
            req.onerror = () => reject(req.error)
        } catch (e) {
            reject(e)
        }
    })
}
