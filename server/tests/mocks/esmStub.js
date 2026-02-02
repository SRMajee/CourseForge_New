// tests/mocks/esmStub.js

// A recursive proxy that handles all ESM usage patterns
const proxy = new Proxy(function () {}, {
  // 1. Handle property access (e.g., chalk.red, CodeInterpreter.default)
  get: function (target, prop) {
    if (prop === "__esModule") return true;
    if (prop === "default") return proxy; // Handle default imports
    return proxy; // Return self for chaining (e.g. chalk.bold.red)
  },
  // 2. Handle function calls (e.g., chalk('text'))
  apply: function (target, thisArg, args) {
    return args[0]; // Return the first argument (identity function)
  },
  // 3. Handle constructor calls (e.g., new CodeInterpreter())
  construct: function (target, args) {
    return proxy; // Return self as the instance
  },
});

module.exports = proxy;