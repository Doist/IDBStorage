const STORE_NAME = "keyvalue"

export default class IDBStorage {
    constructor({ name = "IDBStorage" } = {}) {
        this.name = name
        this.db = null
        this.opening = false
        this.deferredTXs = []
    }

    _openIDBConn() {
        if (this.opening) return

        this.opening = true
        openIDBConn(this.name, STORE_NAME)
            .then(db => {
                this.db = db
                this.opening = false

                /*
                 * A version change event will be fired at an open connection if
                 * an attempt is made to upgrade or delete the database.
                 *
                 * Here we close the connection to allow upgrade/delete proceed
                 */
                this.db.onversionchange = () => this._close()

                // transactions must be created in order. if earlier transaction
                // req fails to create, the later transactoin req should be failed
                let failed = null
                this.deferredTXs.forEach(({ resolve, reject, mode }) => {
                    if (failed) {
                        reject(failed)
                        return
                    }

                    try {
                        const tx = this.db.transaction([STORE_NAME], mode)
                        resolve(tx)
                    } catch (e) {
                        failed = e
                        reject(e)
                    }
                })

                if (failed) {
                    this._close()
                }
            })
            .catch(e => {
                this.deferredTXs.forEach(({ reject }) => reject(e))
            })
            .finally(() => {
                this.deferredTXs = []
                this.opening = false
            })
    }

    /*
     * Create transaction
     *
     * It will establish a new IDB connection if no connection
     * has been establish yet.
     */
    _createTX(mode) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                this.deferredTXs.push({ resolve, reject, mode })
                if (this.opening) return

                this._openIDBConn()
                return
            }

            try {
                const tx = this.db.transaction([STORE_NAME], mode)
                resolve(tx)
            } catch (e) {
                // Sometime IDB connection could be in a broken state
                // (especially when connection has been opened for a
                // long period of time) and error will be thrown
                // in these cases, such as InvalidStateError.
                // Here, we will discard the broken connection objection
                // and create a new one here.
                this.deferredTXs.push({ resolve, reject, mode })
                this._close()
                this._openIDBConn()
            }
        })
    }

    _close() {
        if (!this.db) return

        this.db.close()
        this.db = null
    }

    setItem(key, value) {
        return this._createTX("readwrite").then(tx => {
            return new Promise((resolve, reject) => {
                try {
                    const req = tx.objectStore(STORE_NAME).put(value, key)
                    tx.oncomplete = () => resolve(value)
                    tx.onerror = tx.onabort = () =>
                        reject(req.error ? req.error : tx.error)
                } catch (e) {
                    reject(e)
                }
            })
        })
    }

    getItem(key) {
        return this._createTX("readonly").then(tx => {
            return new Promise((resolve, reject) => {
                try {
                    const req = tx.objectStore(STORE_NAME).get(key)
                    tx.oncomplete = () => resolve(req.result)
                    tx.onerror = tx.onabort = () =>
                        reject(req.error ? req.error : tx.error)
                } catch (e) {
                    reject(e)
                }
            })
        })
    }

    removeItem(key) {
        return this._createTX("readwrite").then(tx => {
            return new Promise((resolve, reject) => {
                try {
                    const req = tx.objectStore(STORE_NAME).delete(key)
                    tx.oncomplete = () => resolve()
                    tx.onerror = tx.onabort = () =>
                        reject(req.error ? req.error : tx.error)
                } catch (e) {
                    reject(e)
                }
            })
        })
    }

    clear() {
        return this._createTX("readwrite").then(tx => {
            return new Promise((resolve, reject) => {
                try {
                    const req = tx.objectStore(STORE_NAME).clear()
                    tx.oncomplete = () => resolve()
                    tx.onerror = tx.onabort = () =>
                        reject(req.error ? req.error : tx.error)
                } catch (e) {
                    reject(e)
                }
            })
        })
    }

    length() {
        return this._createTX("readonly").then(tx => {
            return new Promise((resolve, reject) => {
                try {
                    const req = tx.objectStore(STORE_NAME).count()
                    tx.oncomplete = () => resolve(req.result)
                    tx.onerror = tx.onabort = () =>
                        reject(req.error ? req.error : tx.error)
                } catch (e) {
                    reject(e)
                }
            })
        })
    }

    deleteDatabase() {
        return new Promise((resolve, reject) => {
            const req = window.indexedDB.deleteDatabase(this.name)
            req.onsuccess = () => resolve()
            req.onerror = ev => reject(ev)
        })
    }

    /*
     * Checked if indexedDB is supported
     */
    get supports() {
        return typeof indexedDB !== "undefined"
    }
}

/*
 * Open an IDB connection
 * @param {Promise} IDBDatabase
 */
const openIDBConn = (name, storeName) => {
    return new Promise((resolve, reject) => {
        try {
            const req = window.indexedDB.open(name, 1)
            req.onupgradeneeded = () => {
                const db = req.result
                db.onerror = ev => reject(ev)
                db.onabort = ev => reject(ev)

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
