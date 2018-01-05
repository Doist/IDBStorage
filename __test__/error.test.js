import IDBStorage from "../index"

jest.mock("fake-indexeddb")

const indexedDB = require("fake-indexeddb")
window.indexedDB = indexedDB

describe("Error handling when openning a IndexedDB connection", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("rejects calls when indexedDB.open() throw an error", () => {
        expect.assertions(1)

        const err = new Error("test")
        indexedDB.open.mockImplementation(() => {
            throw err
        })

        const db = new IDBStorage({ name: "jest" })
        return expect(db.setItem("foo", 1)).rejects.toEqual(err)
    })

    it("rejects calls when the connection open request results in error", () => {
        expect.assertions(1)

        const req = {}
        indexedDB.open.mockReturnValue(req)

        const db = new IDBStorage({ name: "jest" })
        const res = db.setItem("foo", 1)

        const error = new Error("test")
        req.error = error
        req.onerror(error)

        return expect(res).rejects.toEqual(error)
    })
})
