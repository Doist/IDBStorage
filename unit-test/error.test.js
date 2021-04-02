import IDBStorage from '../index'

describe('Error handling when openning a IndexedDB connection', () => {
    beforeEach(() => {
        window.indexedDB = jest.genMockFromModule('fake-indexeddb')
    })

    it('rejects calls when indexedDB.open() throw an error', () => {
        expect.assertions(1)

        const err = new Error('test')
        indexedDB.open.mockImplementation(() => {
            throw err
        })

        const db = new IDBStorage({ name: 'jest' })
        return expect(db.setItem('foo', 1)).rejects.toEqual(err)
    })

    it('rejects calls when the connection open request results in error', () => {
        expect.assertions(1)

        const req = {}
        indexedDB.open.mockReturnValue(req)

        const db = new IDBStorage({ name: 'jest' })
        const res = db.setItem('foo', 1)

        const error = new Error('test')
        req.error = error
        req.onerror(error)

        return expect(res).rejects.toEqual(error)
    })

    it('will try open connection again despite of previous failure', async () => {
        expect.assertions(2)

        const req = {}
        indexedDB.open.mockReturnValue(req)

        const db = new IDBStorage({ name: 'jest' })
        const res = db.setItem('foo', 1)

        const error = new Error('test')
        req.error = error
        req.onerror(error)

        await expect(res).rejects.toEqual(error)

        window.indexedDB = require('fake-indexeddb') // make indexedDB functioning again
        const res2 = db.setItem('foo', 1)
        await expect(res2).resolves.toEqual(1)
    })

    it('reject when createObjectStore() results in an error', async () => {
        expect.assertions(2)

        const conn = {
            createObjectStore: jest.fn().mockImplementation(() => {
                throw new Error('InvalidStateError')
            }),
        }
        const req = { result: conn }
        indexedDB.open.mockReturnValue(req)

        const db = new IDBStorage({ name: 'test_db' })
        const r1 = db.setItem('foo', 1)

        req.onupgradeneeded()
        expect(conn.createObjectStore).toHaveBeenCalled()

        await expect(r1).rejects.toEqual(new Error('InvalidStateError'))
    })
})
