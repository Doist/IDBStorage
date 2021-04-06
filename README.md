# IDBStorage

[![Build Status](https://travis-ci.org/stkao05/IDBStorage.svg?branch=master)](https://travis-ci.org/stkao05/IDBStorage)

IDBStorage is a key-value asynchronous storage that uses indexedDB as underlaying storage.

[Why another key-val IndexedDB library?](https://github.com/Doist/IDBStorage#motivations)

## Usage

```js
import IDBStorage from 'idbstorage'

const storage = new IDBStorage()

storage.setItem('foo', 1).then((value) => {
    console.log(value + ' has succesfully been stored')
})
```

## Installation

```
$ npm install --save idbstorage
```

## API

##### Constructor `new IDBStorage(config)`

Each `IDBStorage` instance represents an individual database connection to a database (`IDBDatabase`).
In most scenarios, your app should only need to create one instance of `IDBStorage` and use it across the app.

##### `setItem(key, value)`

-   key: A key has an associated type which is one of: number, date, string, binary, or array ([ref](https://www.w3.org/TR/IndexedDB/#key-construct)).
-   value: Any serializable object ([ref](https://www.w3.org/TR/2018/REC-IndexedDB-2-20180130/#value-construct)).

Return a Promise that resolves with `value` if data has successfully persisted; rejects with error otherwise.

##### `getItem(key)`

Return a Promise that resolves with value associated with the key. If no value has been set with the `key`, the resolving value will be `undefined`; the returned Promise will be rejected with error when in case of indexedDB failure.

##### `removeItem(key)`

Return a Promise that resolves (with nothing) when the item has been successfully removed; reject with error otherwise

##### `clear()`

Remove all key/value datas from the database.

Return a Promise that resolves (with no value) when operation succeeded and rejected with error otherwise.

##### `deleteDatabase()`

Delete the whole database; just like `clear()` but it would also remove the underlying indexedDB instance from the browser storage.
Return a Promise that resolves (with no value) when operation succeeded and rejected with error otherwise.

## Motivations

IDBStorage is created to address the following issues

### Preserve Transaction Ordering

IDBStorage makes sure the end result is consistent with the ordering of the operation calls.

For instance

```js
const db = new IDBStorage()
const r1 = db.setItem('foo', 1)
const r2 = db.setItem('foo', 2)
const r3 = db.setItem('foo', 3)

Promise.all([r1, r2, r3]).then(() => db.getItem('foo')) // should give you 3, always
```

Some libraries, such as [localForage](https://github.com/localForage/localForage), failed to provide such a guarantee due to the way it creates IndexedDB transaction. The library might give you correct result majority of the time, but there could be time where inconsistency could occur.

From [W3C spec](https://www.w3.org/TR/2018/REC-IndexedDB-2-20180130/#transaction-construct):

> If multiple read/write transactions are attempting to access the same object store (i.e. if they have overlapping scope), the transaction that was created first must be the transaction which gets access to the object store first.

One common mistakes with IndexedDB library implementation is forget to preserve the same transactions creation ordering as library function calls.

### Error Recovery

Unlike other browser storage such as localStorage, IndexedDB has been observed to be less stable and is more likely to have errors. While most client libraries do provide basic handling of error (which usually just return the error back to the caller), most of them fail to provide error recovery mechanism, which is crucial in production setting.

One error scenarios that have been commonly observed but not usually been dealt with properly is handing of broken IndexedDB connections. IndexedDB connections could sometime be in an abnormal state (which is expected for any database system), and any operations will result in failure.

IDBStorage provides a recovery mechanism that dealt with connection failure. When noticing an abnormality in the database connection, it will close the dysfunctional one and try to re-establish a new connection.
