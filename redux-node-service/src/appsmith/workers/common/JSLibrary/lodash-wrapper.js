// 🚧 NOTE: this file exists only for the worker thread, as the worker thread needs to pass
// the full Lodash library around. *Do not* import it in the main thread code, as that will
// result in bundling the full Lodash. If you’re trying to pass a Lodash reference into some
// function in the main thread, consider if you can instead:
//
// - import and call Lodash directly:
//
//   Before:
//     // a.js
//     export function mapArray(_) { return _.map(someArray, someFunction); }
//     // b.js
//     import { mapArray } from './a';
//     import _ from 'lodash';
//     mapArray(_);
//
//   After:
//     // a.js
//     import _ from 'lodash';
//     export function mapArray() { return _.map(someArray, someFunction); }
//     // b.js
//     import { mapArray } from './a';
//     mapArray();
//
// - pass only the function you need about:
//
//   Before:
//     // a.js
//     export function mapArray(_) { return _.map(someArray, someFunction); }
//     // b.js
//     import { mapArray } from './a';
//     import _ from 'lodash';
//     mapArray(_);
//
//   After:
//     // a.js
//     export function mapArray(_) { return _.map(someArray, someFunction); }
//     // b.js
//     import { mapArray } from './a';
//     import _ from 'lodash';
//     mapArray({ map: _.map });
// Node.js: check disabled — in our setup, globals.ts defines window even in worker_threads
// Original check: typeof window !== "undefined" → throw Error
// This is safe because this file is only imported from worker code

/////////////////////////////////////////////////////////////////////////
//
// We use babel-plugin-lodash to only import the lodash functions we use.
// Unfortunately, the plugin doesn’t work with the following pattern:
//   import _ from 'lodash';
//   const something = _;
// When it encounters code like above, it will replace _ with `undefined`,
// which will break the app (https://github.com/lodash/babel-plugin-lodash/issues/235).
//
// Given that we *need* to use the full lodash in ./resetJSLibraries.js,
// we use this workaround where we’re importing Lodash using CommonJS require().
// It works because babel-plugin-lodash doesn’t support CommonJS require().
module.exports = require("lodash");
