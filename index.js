const STORE_NAME = "keyvalue"

export default class IDBStorage {
    constructor({ name = "IDBStorage" } = {}) {
        this.name = name
        this.db = null
        this.opening = null
        this.pendingTX = []
    }

    transaction(mode) {
        return new Promise((resolve, reject) => {
            if (this.db) {
                try {
                    const tx = this.db.transaction([STORE_NAME], mode)
                    resolve(tx)
                } catch (e) {
                    reject(e)
                    this.close()
                }
                return
            }

            this.pendingTX.push([mode, resolve, reject])

            if (this.opening) return

            this.opening = openIDBConnection(this.name, STORE_NAME)
                .then(db => {
                    this.db = db
                    this.db.onversionchange = () => this.close()

                    let failed
                    this.pendingTX.forEach(([mode, resolve, reject]) => {
                        if (failed) return reject(failed)

                        try {
                            const tx = this.db.transaction([STORE_NAME], mode)
                            resolve(tx)
                        } catch (e) {
                            failed = e
                            reject(e)
                            this.close()
                        }
                    })
                })
                .catch(e => {
                    this.pendingTX.forEach(([, , reject]) => reject(e))
                })
                .finally(() => {
                    this.opening = null
                    this.pendingTX = []
                })
        })
    }

    close() {
        if (!this.db) return

        this.db.close()
        this.db = null
    }

    setItem(key, value) {
        return this.transaction("readwrite").then(tx => {
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
        return this.transaction("readonly").then(tx => {
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
        return this.transaction("readwrite").then(tx => {
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
        return this.transaction("readwrite").then(tx => {
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
        return this.transaction("readonly").then(tx => {
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
const openIDBConnection = (name, storeName) => {
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
