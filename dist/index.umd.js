"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var STORE_NAME = "keyvalue";

/*
 * Each instance of IDBStorage holds a IDB connection.
 */

var IDBStorage = function () {
    function IDBStorage() {
        var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            _ref$name = _ref.name,
            name = _ref$name === undefined ? "IDBStorage" : _ref$name;

        _classCallCheck(this, IDBStorage);

        this.name = name;
        this.db = null;
        this.opening = false;
        this.deferredTXs = [];
    }

    _createClass(IDBStorage, [{
        key: "_openIDBConn",
        value: function _openIDBConn() {
            var _this = this;

            if (this.opening) return;

            this.opening = true;
            openIDBConn(this.name, STORE_NAME).then(function (db) {
                _this.db = db;
                _this.opening = false;

                /*
                 * A version change event will be fired at an open connection if
                 * an attempt is made to upgrade or delete the database.
                 *
                 * Here we close the connection to allow upgrade/delete proceed
                 */
                _this.db.onversionchange = function () {
                    return _this._close();
                };

                // transactions must be created in order. if earlier transaction
                // req fails to create, the later transactoin req should be failed
                var failed = null;
                deferredTXs.forEach(function (_ref2) {
                    var resolve = _ref2.resolve,
                        reject = _ref2.reject,
                        mode = _ref2.mode;

                    if (failed) {
                        reject(new Error("Transction aborted due to earlier transaction failure", failed));
                        return;
                    }

                    try {
                        var tx = _this.db.transaction([STORE_NAME], mode);
                        resolve(tx);
                    } catch (e) {
                        failed = e;
                        reject(e);
                    }
                });

                _this.deferredTXs = [];
            }).catch(function (e) {
                _this.deferredTXs.forEach(function (_ref3) {
                    var reject = _ref3.reject;
                    return reject(e);
                });
                _this.deferredTXs = [];
            }).finally(function () {
                _this.opening = false;
            });
        }

        /*
         * Create transaction
         *
         * It will establish a new IDB connection if no connection
         * has been establish yet.
         */

    }, {
        key: "_createTX",
        value: function _createTX(mode) {
            var _this2 = this;

            return new Promise(function (resolve, reject) {
                if (!_this2.db) {
                    _this2.deferredTXs.push({ resolve: resolve, reject: reject, mode: mode });
                    if (_this2.opening) return;

                    _this2._openIDBConn();
                    return;
                }

                try {
                    var tx = _this2.db.transaction([STORE_NAME], mode);
                    resolve(tx);
                } catch (e) {
                    // InvalidStateError could be thrown when db connection is
                    // broken (i.e. it has been observed that such scenario could
                    // occurred in a long web session where a connection has been
                    // open for a long time)
                    // Therefore, we will discard the broken connection objection
                    // and create a new one here.
                    if (e.name === "InvalidStateError" || e.name === "UnknownError") {
                        _this2.deferredTXs.push({ resolve: resolve, reject: reject, mode: mode });
                        _this2._close();
                        _this2._openIDBConn();
                    } else {
                        reject(e);
                    }
                }
            });
        }
    }, {
        key: "_close",
        value: function _close() {
            if (!this.db) return;

            this.db.close();
            this.db = null;
        }
    }, {
        key: "setItem",
        value: function setItem(key, value) {
            return this._createTX("readwrite").then(function (tx) {
                return new Promise(function (resolve, reject) {
                    try {
                        var req = tx.objectStore(STORE_NAME).put(value, key);
                        tx.oncomplete = function () {
                            return resolve(value);
                        };
                        tx.onerror = tx.onabort = function () {
                            return reject(req.error ? req.error : tx.error);
                        };
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        }
    }, {
        key: "getItem",
        value: function getItem(key) {
            return this._createTX("readonly").then(function (tx) {
                return new Promise(function (resolve, reject) {
                    try {
                        var req = tx.objectStore(STORE_NAME).get(key);
                        tx.oncomplete = function () {
                            return resolve(req.result);
                        };
                        tx.onerror = tx.onabort = function () {
                            return reject(req.error ? req.error : tx.error);
                        };
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        }
    }, {
        key: "removeItem",
        value: function removeItem(key) {
            return this._createTX("readwrite").then(function (tx) {
                return new Promise(function (resolve, reject) {
                    try {
                        var req = tx.objectStore(STORE_NAME).delete(key);
                        tx.oncomplete = function () {
                            return resolve();
                        };
                        tx.onerror = tx.onabort = function () {
                            return reject(req.error ? req.error : tx.error);
                        };
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        }
    }, {
        key: "clear",
        value: function clear() {
            return this._createTX("readwrite").then(function (tx) {
                return new Promise(function (resolve, reject) {
                    try {
                        var req = tx.objectStore(STORE_NAME).clear();
                        tx.oncomplete = function () {
                            return resolve();
                        };
                        tx.onerror = tx.onabort = function () {
                            return reject(req.error ? req.error : tx.error);
                        };
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        }
    }, {
        key: "length",
        value: function length() {
            return this._createTX("readonly").then(function (tx) {
                return new Promise(function (resolve, reject) {
                    try {
                        var req = tx.objectStore(STORE_NAME).count();
                        tx.oncomplete = function () {
                            return resolve();
                        };
                        tx.onerror = tx.onabort = function () {
                            return reject(req.error ? req.error : tx.error);
                        };
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        }
    }, {
        key: "deleteDatabase",
        value: function deleteDatabase() {
            var _this3 = this;

            return new Promise(function (resolve, reject) {
                var req = window.indexedDB.deleteDatabase(_this3.name);
                req.onsuccess = function () {
                    return resolve();
                };
                req.onerror = function (ev) {
                    return reject(ev);
                };
            });
        }

        /*
         * Checked if indexedDB is supported
         */

    }, {
        key: "supports",
        get: function get() {
            return typeof indexedDB !== "undefined";
        }
    }]);

    return IDBStorage;
}();

/*
 * Open an IDB connection
 * @param {Promise} IDBDatabase
 */


exports.default = IDBStorage;
var openIDBConn = function openIDBConn(name, storeName) {
    return new Promise(function (resolve, reject) {
        try {
            var req = window.indexedDB.open(name, 1);
            req.onupgradeneeded = function () {
                var db = req.result;
                db.onerror = function (ev) {
                    return reject(ev);
                };
                db.onabort = function (ev) {
                    return reject(ev);
                };

                try {
                    db.createObjectStore(storeName);
                } catch (e) {
                    reject(e);
                }
            };
            req.onsuccess = function () {
                return resolve(req.result);
            };
            req.onerror = function () {
                return reject(req.error);
            };
        } catch (e) {
            reject(e);
        }
    });
};
