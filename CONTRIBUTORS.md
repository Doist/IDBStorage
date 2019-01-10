# Contributors notes

## Testing
Two sets of the test have been set up, in-browser tests, and unit tests.

In-browser tests allow testing of the library in a real-life setting, but the scope of scenarios is quite limited. It can only test a few basic successful operations, and it is hard, if not possible, to test different failure conditions because it has no access to the browser's indexedDB internal.

Unit tests allow a more thorough coverage of failure tests, as it could mock the indexedDB API and mimic different failure scenarios.


### Browser test
We use Jasmine as our browser test framework. You can run tests by either with

__Jasmine test runner__

Open `browser-test/jasmine-runner.html` in your browser, and the page will execute the tests directly

__Karma__

You can also use Karma to run the test.

```
npm run test
```


### Unit tests

We use Jest as our unit test framework. To run jest

```
npm run jest
```

__Run debugger__

- Place the breakpoint in codes with
```
debugger;
```
- Open up Chrome and type in the address bar: `chrome://inspect` and click on "Open dedicated DevTools for Node"
- `npm run jest:debug`


__Test caveat__

caveat: Promise rejection must be handled, otherwise the test will be marked as failed.
