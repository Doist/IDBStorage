import IDBStorage from '../index'

const range = (n) =>
    Array.apply(null, Array(n)).map((_, i) => {
        return i
    })

describe('IDBStorage', () => {
    const dbname = 'IDBStorage.test.basic.' + Date.now()
    const db = new IDBStorage({ name: dbname })

    beforeAll(() => {
        const indexedDB = require('fake-indexeddb')
        window.indexedDB = indexedDB
    })

    afterAll(() => {
        return new Promise((resolve, reject) => {
            db.deleteDatabase().then(resolve).catch(reject)

            // in case the prev deleteDatabase() did't work
            const req = window.indexedDB.deleteDatabase(dbname)
            req.onerror = req.onblocked = req.onupgradeneeded = reject
            req.onsuccess = resolve

            window.indexedDB = undefined
        })
    })

    beforeEach(() => {
        return new Promise((resolve, reject) => {
            db.clear().then(resolve).catch(reject)
        })
    })

    test('getItem() should return undefined if no value was set before', async function (done) {
        try {
            const v = await db.getItem('not_exist')
            expect(v).toBeUndefined()
            done()
        } catch (e) {
            done.fail(e)
        }
    })

    test('basic setItem/getItem', async function () {
        expect.assertions(2)
        await expect(db.setItem('five', 5)).resolves.toEqual(5)
        await expect(db.getItem('five')).resolves.toEqual(5)
    })

    const testDatas = [
        [1, 'number'],
        ['foo', 'string'],
        [null, 'null'],
        [{}, 'object'],
        [{ a: 'a' }, 'object'],
        [[1, 2, 3], 'array'],
    ]

    for (const [value, type] of testDatas) {
        test(`setItem/getItem should work correctly with data type: ${type}`, async function () {
            expect.assertions(2)
            const key = `type.test.${type}`
            await expect(db.setItem(key, value)).resolves.toEqual(value)
            await expect(db.getItem(key)).resolves.toEqual(value)
        })
    }

    test('basic removeItem()', async function () {
        expect.assertions(3)

        const k = 'test.remove.basic'
        await expect(db.setItem(k, 5)).resolves.toEqual(5)
        await expect(db.removeItem(k)).resolves.toBeUndefined()
        await expect(db.getItem(k)).resolves.toBeUndefined()
    })

    test('removeItem() should work fine with non-exist key', async function () {
        expect.assertions(1)
        const k = 'test.remove.nonexist.' + Date.now()
        await expect(db.removeItem(k)).resolves.toBeUndefined()
    })

    test("setItem() should preserve the 'order of call' transaction property", async function () {
        expect.assertions(1)
        const values = range(100)
        const ps = values.map((v) => db.setItem('order.test', v))

        await Promise.all(ps)
        await expect(db.getItem('order.test')).resolves.toEqual(99)
    })

    test('clear()', async function () {
        expect.assertions(10)
        const db = new IDBStorage({ name: `clear.test.${Date.now()}` })
        const values = range(10)
        const sets = values.map((v) => db.setItem(`clear.test.${v}`, v))

        await Promise.all(sets)
        await db.clear()

        const gets = values.map((v) => db.getItem(`clear.test.${v}`))
        const nvalues = await Promise.all(gets)

        nvalues.forEach((v) => expect(v).toBeUndefined())
    })

    test('length()', async function () {
        expect.assertions(4)

        await expect(db.length()).resolves.toEqual(0)

        await db.setItem('one', 1)
        await expect(db.length()).resolves.toEqual(1)

        await db.setItem('two', 1)
        await expect(db.length()).resolves.toEqual(2)

        await db.setItem('three', 1)
        await expect(db.length()).resolves.toEqual(3)
    })

    test('deleteDatabase()', async function (done) {
        const db = new IDBStorage({ name: `deleteDatabase.test.${Date.now()}` })
        await expect(db.setItem('five', 5)).resolves.toEqual(5)

        db.deleteDatabase()
            .then(() => {
                done()
            })
            .catch((e) => {
                done.fail(e)
            })
    })

    it('should re-establish connection when connection is broken (i.e. when encounter InvalidStateError)', async function () {
        expect.assertions(4)

        const db = new IDBStorage({ name: `test.${Date.now()}` })
        await expect(db.setItem('five', 5)).resolves.toEqual(5)

        expect(db.db).toBeDefined()

        // we simulate broken connetion scenario by closing connection manually
        db.db.close()
        await expect(db.setItem('five', 5)).rejects.toBeDefined()

        await expect(db.setItem('five', 5)).resolves.toEqual(5)
    })
})
