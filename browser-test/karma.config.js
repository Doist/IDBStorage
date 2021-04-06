module.exports = function (config) {
    config.set({
        frameworks: ['jasmine'],
        files: ['./IDBStorage.spec.dist.js'],
        colors: true,
        logLevel: config.LOG_INFO,
        browsers: ['ChromeHeadless', 'Safari'],
    })
}
