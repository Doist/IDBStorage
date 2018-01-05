import IDBStorage from "../index"

const range = n =>
    Array.apply(null, Array(n)).map((_, i) => {
        return i
    })

describe("IDBStorage", () => {
    const dbname = "IDBStorage.test.basic." + Date.now()
    const db = new IDBStorage({ name: dbname })

    beforeAll(() => {
        const indexedDB = require("fake-indexeddb")
        window.indexedDB = indexedDB
    })

    afterAll(() => {
        return new Promise((resolve, reject) => {
            db
                .deleteDatabase()
                .then(resolve)
                .catch(reject)

            // in case the prev deleteDatabase() did't work
            const req = window.indexedDB.deleteDatabase(dbname)
            req.onerror = req.onblocked = req.onupgradeneeded = reject
            req.onsuccess = resolve

			window.indexedDB = undefined
        })
    })

    beforeEach(() => {
        return new Promise((resolve, reject) => {
            db
                .clear()
                .then(resolve)
                .catch(reject)
        })
    })

    it("getItem() should return undefined if no value was set before", async function(done) {
        try {
            const v = await db.getItem("not_exist")
            expect(v).toBeUndefined()
            done()
        } catch (e) {
            done.fail(e)
        }
    })

    it("basic setItem/getItem", async function(done) {
        try {
            await db.setItem("five", 5)
            const v = await db.getItem("five")

            expect(v).toEqual(5)
            done()
        } catch (e) {
            done.fail(e)
        }
    })

    const valuetests = [
        [1, "number"],
        ["foo", "string"],
        [null, "null"],
        [{}, "object"],
        [{ a: "a" }, "object"],
        [[1, 2, 3], "array"]
    ]

    for (const [value, type] of valuetests) {
        it(`setItem/getItem should work correctly with data type: ${type}`, async function(done) {
            try {
                const key = `type.test.${type}`
                await db.setItem(key, value)
                const actual = await db.getItem(key)

                expect(actual).toEqual(value)
                done()
            } catch (e) {
                done.fail(e)
            }
        })
    }

    it("basic removeItem()", async function(done) {
        try {
            const k = "test.remove.basic"
            await db.setItem(k, 5)
            let v = await db.getItem(k)
            expect(v).toEqual(5)

            await db.removeItem(k)
            v = await db.getItem(k)
            expect(v).toBeUndefined()

            done()
        } catch (e) {
            done.fail(e)
        }
    })

    it("removeItem() should work fine with non-exist key", async function(done) {
        try {
            const k = "test.remove.nonexist." + Date.now()
            await db.removeItem(k)

            expect(true).toEqual(true) // just to surpress warnning
            done()
        } catch (e) {
            done.fail(e)
        }
    })

    it("setItem() should preserve the 'order of call' transaction property", async function(done) {
        try {
            const values = range(100)
            const ps = values.map(v => db.setItem("order.test", v))

            await Promise.all(ps)

            const v = await db.getItem("order.test")
            expect(v).toEqual(99)

            done()
        } catch (e) {
            done.fail(e)
        }
    })

    it("clear()", async function(done) {
        try {
            const values = range(10)
            const sets = values.map(v => db.setItem(`clear.test.${v}`, v))

            await Promise.all(sets)
            await db.clear()

            const gets = values.map(v => db.getItem(`clear.test.${v}`))
            const nvalues = await Promise.all(gets)

            nvalues.forEach(v => expect(v).toBeUndefined())

            done()
        } catch (e) {
            done.fail(e)
        }
    })

    it("length()", async function(done) {
        try {
            let len = await db.length()
            expect(len).toEqual(0)

            await db.setItem("length.1", "foo")
            len = await db.length()
            expect(len).toEqual(1)

            await db.setItem("length.2", "foo")
            len = await db.length()
            expect(len).toEqual(2)

            await db.removeItem("length.2", "foo")
            len = await db.length()
            expect(len).toEqual(1)

            done()
        } catch (e) {
            done.fail(e)
        }
    })

    it("deleteDatabase()", async function(done) {
        const db = new IDBStorage({ name: `deleteDatabase.test.${Date.now()}` })

        await db.setItem("five", 5)
        const five = await db.getItem("five")
        expect(five).toEqual(5)

        db
            .deleteDatabase()
            .then(() => {
                done()
            })
            .catch(e => {
                done.fail(e)
            })
    })
})
