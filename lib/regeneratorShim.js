/**
 * The smallest stand-in for Babel's `regeneratorRuntime` global.
 *
 * @pdf-lib/fontkit ships one generator compiled by Babel (the state machine
 * its Indic and Universal shapers use to find syllables), and that compiled
 * code expects a global `regeneratorRuntime` that modern runtimes don't have.
 * Without it, drawing a Devanagari name throws "regeneratorRuntime is not
 * defined". The compiled generator only uses `mark`, `wrap`, `context.next`
 * and `context.stop()`, so that — and nothing more — is what this provides,
 * instead of adding the regenerator-runtime package for one function.
 *
 * Server-side only (imported by lib/certificatePdf.js).
 */

if (typeof globalThis.regeneratorRuntime === "undefined") {
  globalThis.regeneratorRuntime = {
    mark(fn) {
      return fn;
    },
    wrap(innerFn, _outerFn, self) {
      const context = {
        prev: 0,
        next: 0,
        done: false,
        rval: undefined,
        stop() {
          this.done = true;
          return this.rval;
        },
      };
      return {
        next() {
          if (context.done) return { value: undefined, done: true };
          const value = innerFn.call(self, context);
          return context.done ? { value: undefined, done: true } : { value, done: false };
        },
        [Symbol.iterator]() {
          return this;
        },
      };
    },
  };
}

export {};
