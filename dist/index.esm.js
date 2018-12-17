"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var STORE_NAME = "keyvalue";

var IDBStorage = function () {
    function IDBStorage() {
        var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            _ref$name = _ref.name,
            name = _ref$name === undefined ? "IDBStorage" : _ref$name;

        _classCallCheck(this, IDBStorage);

        this.name = name;
        this.db = null;
        this.opening = null;
        this.pendingTX = [];
    }

    _createClass(IDBStorage, [{
        key: "transaction",
        value: function transaction(mode) {
            var _this = this;

            return new Promise(function (resolve, reject) {
                if (_this.db) {
                    try {
                        var tx = _this.db.transaction([STORE_NAME], mode);
                        resolve(tx);
                    } catch (e) {
                        reject(e);
                        _this.close();
                    }
                    return;
                }

                _this.pendingTX.push([mode, resolve, reject]);

                if (_this.opening) return;

                _this.opening = openIDBConnection(_this.name, STORE_NAME).then(function (db) {
                    _this.db = db;
                    _this.db.onversionchange = function () {
                        return _this.close();
                    };

                    var failed = void 0;
                    _this.pendingTX.forEach(function (_ref2) {
                        var _ref3 = _slicedToArray(_ref2, 3),
                            mode = _ref3[0],
                            resolve = _ref3[1],
                            reject = _ref3[2];

                        if (failed) return reject(failed);

                        try {
                            var _tx = _this.db.transaction([STORE_NAME], mode);
                            resolve(_tx);
                        } catch (e) {
                            failed = e;
                            reject(e);
                            _this.close();
                        }
                    });
                }).catch(function (e) {
                    _this.pendingTX.forEach(function (_ref4) {
                        var _ref5 = _slicedToArray(_ref4, 3),
                            reject = _ref5[2];

                        return reject(e);
                    });
                }).finally(function () {
                    _this.opening = null;
                    _this.pendingTX = [];
                });
            });
        }
    }, {
        key: "close",
        value: function close() {
            if (!this.db) return;

            this.db.close();
            this.db = null;
        }
    }, {
        key: "setItem",
        value: function setItem(key, value) {
            return this.transaction("readwrite").then(function (tx) {
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
            return this.transaction("readonly").then(function (tx) {
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
            return this.transaction("readwrite").then(function (tx) {
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
            return this.transaction("readwrite").then(function (tx) {
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
            return this.transaction("readonly").then(function (tx) {
                return new Promise(function (resolve, reject) {
                    try {
                        var req = tx.objectStore(STORE_NAME).count();
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
        key: "deleteDatabase",
        value: function deleteDatabase() {
            var _this2 = this;

            return new Promise(function (resolve, reject) {
                var req = window.indexedDB.deleteDatabase(_this2.name);
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
var openIDBConnection = function openIDBConnection(name, storeName) {
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
