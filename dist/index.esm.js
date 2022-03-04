'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var IDBStorage = function () {
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
    function IDBStorage() {
        var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            _ref$name = _ref.name,
            name = _ref$name === undefined ? 'IDBStorage' : _ref$name,
            _ref$_storeName = _ref._storeName,
            _storeName = _ref$_storeName === undefined ? 'keyvalue' : _ref$_storeName,
            _ref$_version = _ref._version,
            _version = _ref$_version === undefined ? 1 : _ref$_version;

        _classCallCheck(this, IDBStorage);

        this.name = name;
        this.storeName = _storeName;
        this.version = _version;
        this.db = null;
        this.opening = null;
        this.pendingTX = [];
    }

    _createClass(IDBStorage, [{
        key: 'transaction',
        value: function transaction(_ref2) {
            var _this = this;

            var mode = _ref2.mode,
                success = _ref2.success,
                error = _ref2.error;

            if (this.db) {
                try {
                    var tx = this.db.transaction([this.storeName], mode);
                    success(tx);
                } catch (e) {
                    error(e);
                    this.close();
                }
                return;
            }

            this.pendingTX.push([mode, success, error]);

            if (this.opening) return;

            this.opening = openIDBConnection(this.name, this.storeName, this.version).then(function (db) {
                _this.opening = null;
                _this.db = db;
                _this.db.onversionchange = function () {
                    return _this.close();
                };
                _this.db.onclose = function () {
                    return _this.close();
                };

                var failed = void 0;
                _this.pendingTX.forEach(function (_ref3) {
                    var _ref4 = _slicedToArray(_ref3, 3),
                        mode = _ref4[0],
                        success = _ref4[1],
                        error = _ref4[2];

                    if (failed) return error(failed);

                    try {
                        var _tx = _this.db.transaction([_this.storeName], mode);
                        success(_tx);
                    } catch (e) {
                        failed = e;
                        error(e);
                        _this.close();
                    }
                });
                _this.pendingTX = [];
            }).catch(function (e) {
                _this.opening = null;
                _this.pendingTX.forEach(function (_ref5) {
                    var _ref6 = _slicedToArray(_ref5, 3),
                        error = _ref6[2];

                    return error(e);
                });
                _this.pendingTX = [];
            });
        }
    }, {
        key: 'close',
        value: function close() {
            if (!this.db) return;

            this.db.close();
            this.db = null;
        }
    }, {
        key: 'setItem',
        value: function setItem(key, value) {
            var _this2 = this;

            return new Promise(function (resolve, reject) {
                _this2.transaction({
                    mode: 'readwrite',
                    success: function success(tx) {
                        try {
                            var req = tx.objectStore(_this2.storeName).put(value, key);
                            tx.oncomplete = function () {
                                return resolve(value);
                            };
                            tx.onerror = tx.onabort = function () {
                                return reject(req.error ? req.error : tx.error);
                            };
                        } catch (e) {
                            reject(e);
                        }
                    },
                    error: function error(e) {
                        return reject(e);
                    }
                });
            });
        }
    }, {
        key: 'getItem',
        value: function getItem(key) {
            var _this3 = this;

            return new Promise(function (resolve, reject) {
                _this3.transaction({
                    mode: 'readonly',
                    success: function success(tx) {
                        try {
                            var req = tx.objectStore(_this3.storeName).get(key);
                            tx.oncomplete = function () {
                                return resolve(req.result);
                            };
                            tx.onerror = tx.onabort = function () {
                                return reject(req.error ? req.error : tx.error);
                            };
                        } catch (e) {
                            reject(e);
                        }
                    },
                    error: function error(e) {
                        return reject(e);
                    }
                });
            });
        }
    }, {
        key: 'removeItem',
        value: function removeItem(key) {
            var _this4 = this;

            return new Promise(function (resolve, reject) {
                _this4.transaction({
                    mode: 'readwrite',
                    success: function success(tx) {
                        try {
                            var req = tx.objectStore(_this4.storeName).delete(key);
                            tx.oncomplete = function () {
                                return resolve();
                            };
                            tx.onerror = tx.onabort = function () {
                                return reject(req.error ? req.error : tx.error);
                            };
                        } catch (e) {
                            reject(e);
                        }
                    },
                    error: function error(e) {
                        return reject(e);
                    }
                });
            });
        }
    }, {
        key: 'clear',
        value: function clear() {
            var _this5 = this;

            return new Promise(function (resolve, reject) {
                _this5.transaction({
                    mode: 'readwrite',
                    success: function success(tx) {
                        try {
                            var req = tx.objectStore(_this5.storeName).clear();
                            tx.oncomplete = function () {
                                return resolve();
                            };
                            tx.onerror = tx.onabort = function () {
                                return reject(req.error ? req.error : tx.error);
                            };
                        } catch (e) {
                            reject(e);
                        }
                    },
                    error: function error(e) {
                        return reject(e);
                    }
                });
            });
        }
    }, {
        key: 'length',
        value: function length() {
            var _this6 = this;

            return new Promise(function (resolve, reject) {
                _this6.transaction({
                    mode: 'readonly',
                    success: function success(tx) {
                        try {
                            var req = tx.objectStore(_this6.storeName).count();
                            tx.oncomplete = function () {
                                return resolve(req.result);
                            };
                            tx.onerror = tx.onabort = function () {
                                return reject(req.error ? req.error : tx.error);
                            };
                        } catch (e) {
                            reject(e);
                        }
                    },
                    error: function error(e) {
                        return reject(e);
                    }
                });
            });
        }
    }, {
        key: 'deleteDatabase',
        value: function deleteDatabase() {
            var _this7 = this;

            return new Promise(function (resolve, reject) {
                var req = window.indexedDB.deleteDatabase(_this7.name);
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
        key: 'supports',
        get: function get() {
            return typeof indexedDB !== 'undefined';
        }
    }]);

    return IDBStorage;
}();

/*
 * Open an IDB connection
 * @param {Promise} IDBDatabase
 */


exports.default = IDBStorage;
var openIDBConnection = function openIDBConnection(name, storeName, version) {
    return new Promise(function (resolve, reject) {
        try {
            var req = window.indexedDB.open(name, version);
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
