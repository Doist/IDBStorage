import IDBStorage from "../index"

const generateIDBMock = () => {
    const FDBDatabase = jest.genMockFromModule("fake-indexeddb/lib/FDBDatabase")
    const FDBObjectStore = jest.genMockFromModule(
        "fake-indexeddb/lib/FDBObjectStore"
    )
    const FDBTransaction = jest.genMockFromModule(
        "fake-indexeddb/lib/FDBTransaction"
    )
    const FDBRequest = jest.genMockFromModule("fake-indexeddb/lib/FDBRequest")
    window.indexedDB = jest.genMockFromModule("fake-indexeddb")

    const database = new FDBDatabase()

    indexedDB.open.mockImplementation(() => {
        const openReq = { result: database }
        return openReq
    })

    const fulfillOpenReq = () => {
        for (const r of indexedDB.open.mock.results) {
            r.value.onsuccess()
        }
    }

    const transactionMockImpl = () => {
        const transaction = new FDBTransaction()

        const store = new FDBObjectStore()
        transaction.objectStore.mockReturnValue(store)
        transaction._store = store

        const req = new FDBRequest()
        store.put.mockImplementation(() => {
            return req
        })

        return transaction
    }

    database.transaction.mockImplementation(transactionMockImpl)

    return { database, transactionMockImpl, fulfillOpenReq }
}

const waitForNthCalls = (mockFn, n) => {
    return new Promise(resolve => {
        const check = () => {
            if (mockFn.mock.calls.length >= n) {
                return resolve()
            }

            setTimeout(check, 50)
        }
        setTimeout(check, 50)
    })
}

describe("Trasaction handling", () => {
    test("transaction must be create in the same order as the operation calls()", async () => {
        expect.assertions(4)
        const { database, fulfillOpenReq } = generateIDBMock()
        const idb = new IDBStorage({ name: "jest" })

        idb.setItem("a", 1)
        idb.setItem("a", 2)
        idb.setItem("a", 3)
        idb.setItem("a", 4)

        fulfillOpenReq()
        await waitForNthCalls(database.transaction, 4)

        const p1 = database.transaction.mock.results[0].value._store.put
        const p2 = database.transaction.mock.results[1].value._store.put
        const p3 = database.transaction.mock.results[2].value._store.put
        const p4 = database.transaction.mock.results[3].value._store.put

        await waitForNthCalls(p1, 1)
        await waitForNthCalls(p2, 1)
        await waitForNthCalls(p3, 1)
        await waitForNthCalls(p4, 1)

        expect(p1.mock.calls).toEqual([[1, "a"]])
        expect(p2.mock.calls).toEqual([[2, "a"]])
        expect(p3.mock.calls).toEqual([[3, "a"]])
        expect(p4.mock.calls).toEqual([[4, "a"]])
    })

    test("calls should be reject when abort event occurs", async () => {
        expect.assertions(1)
        const { database, fulfillOpenReq } = generateIDBMock()

        const idb = new IDBStorage({ name: "jest" })

        const r = idb.setItem("a", 1)
        fulfillOpenReq()
        await waitForNthCalls(database.transaction, 1)

        const t = database.transaction.mock.results[0].value
        await waitForNthCalls(t._store.put, 1)
        t.error = new Error("test")
        t.onabort()

        await expect(r).rejects.toEqual(new Error("test"))
    })

    test("When IDBDatabase.trasaction() call results in error, it should close the previous connection and re-establish a new connection.", async () => {
        expect.assertions(3)
        const {
            database,
            transactionMockImpl,
            fulfillOpenReq
        } = generateIDBMock()

        const idb = new IDBStorage({ name: "jest" })

        database.transaction.mockReset()
        database.transaction.mockImplementation(() => {
            throw new Error("InvalidStateError")
        })

        const r1 = idb.setItem("a", 1)

        await waitForNthCalls(window.indexedDB.open, 1)
        fulfillOpenReq()
        await expect(r1).rejects.toEqual(new Error("InvalidStateError"))

        // Make transaction() function back to normal
        database.transaction.mockImplementation(transactionMockImpl)

        const r2 = idb.setItem("a", 2).then(x => {
            expect(x).toEqual(2)
        })

        const r3 = idb.setItem("a", 3).then(x => {
            expect(x).toEqual(3)
        })

        fulfillOpenReq()
        await waitForNthCalls(database.transaction, 3)

        const t2 = database.transaction.mock.results[1].value
        const t3 = database.transaction.mock.results[2].value

        await waitForNthCalls(t2._store.put, 1)
        await waitForNthCalls(t3._store.put, 1)

        t2.oncomplete()
        t3.oncomplete()

        await Promise.all([r2, r3])

        return true
    })

    test("When first transaction() call fails, the subsequent pending call should failed as well", async () => {
        expect.assertions(3)
        const {
            database,
            transactionMockImpl,
            fulfillOpenReq
        } = generateIDBMock()

        const idb = new IDBStorage({ name: "jest" })

        database.transaction.mockReset()
        database.transaction
            .mockImplementationOnce(() => {
                throw new Error("InvalidStateError")
            })
            .mockImplementationOnce(transactionMockImpl)
            .mockImplementationOnce(transactionMockImpl)

        const r1 = idb.setItem("a", 1)
        const r2 = idb.setItem("a", 2)
        const r3 = idb.setItem("a", 3)

        await waitForNthCalls(window.indexedDB.open, 1)
        fulfillOpenReq()

        await expect(r1).rejects.toEqual(new Error("InvalidStateError"))
        await expect(r2).rejects.toEqual(new Error("InvalidStateError"))
        await expect(r3).rejects.toEqual(new Error("InvalidStateError"))
    })
})

describe("IDBStorage: Misc", () => {
    it("should close connection onversionchange event", async () => {
        expect.assertions(2)
        const { database, fulfillOpenReq } = generateIDBMock()

        const idb = new IDBStorage({ name: "jest" })
        idb.setItem("a", 3)
        await waitForNthCalls(window.indexedDB.open, 1)
        fulfillOpenReq()

        await waitForNthCalls(database.transaction, 1)
        expect(database.onversionchange).toBeDefined()

        const closeCall = waitForNthCalls(database.close, 1)
        database.onversionchange()
        await closeCall

        expect(database.close).toHaveBeenCalledTimes(1)
    })
})
