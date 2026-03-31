/**
 * Runtime module stubs for browser-only modules.
 * Register before any appsmith code is imported.
 * This handles modules that declarations.d.ts covers at type level
 * but don't exist at runtime.
 */

import Module from 'module';

const emptyModule = {};
const stubModulePrefixes = [
  'widgets/',
  'widgets',
  'pages/',
  'components/',
  'navigation/',
  'reflow',
  'plugins/',
  // templates/ removed — real implementations now exist in appsmith/templates/
  'transformers/',
  'usagePulse',
  'RouteChangeListener',
  'WidgetQueryGenerators/',
  // layoutSystems/ removed — real implementations now exist in appsmith/layoutSystems/
  // UITelemetry/ removed — proper stubs now exist in appsmith/UITelemetry/
  'design-system-old',
  'design-system',
  // npm packages that are browser-only and should be stubbed
  '@blueprintjs/',
  '@design-system/',
  '@syncfusion/',
  '@uppy/',
  'smartlook-client',
  'lottie-web',
  'socket.io-client',
  'copy-to-clipboard',
  'downloadjs',
  'react-modal',
  'react-device-detect',
  'scroll-into-view-if-needed',
  'resize-observer-polyfill',
  'validate-color',
  'fuse.js',
  // @shared/ removed — @shared/ast and @shared/dsl now resolve via tsconfig paths
  'node-forge',
  'yjs',
  'proxy-memoize',
  'js-sha256',
  'js-regex-pl',
  'unescape-js',
  // localforage removed — installed as real dependency for storage operations
  // Assets
  'assets/',
];

// Relative path patterns that should also be stubbed
// These are relative imports to browser-only directories
const stubRelativePatterns = [
  '/components/',
  '/pages/',
  '/widgets/',
  '/navigation/',
  // /layoutSystems/ removed — real implementations now exist
  // /UITelemetry/ removed — proper stubs now exist
  '/reflow/',
  '/plugins/',
  '/templates/',
];

const originalResolveFilename = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (
  request: string,
  parent: any,
  isMain: boolean,
  options: any,
) {
  // Check absolute-style prefix matches
  for (const prefix of stubModulePrefixes) {
    if (request === prefix || request.startsWith(prefix)) {
      return require.resolve('./empty-module');
    }
  }

  // Check relative path patterns (../../../components/... etc.)
  if (request.startsWith('.')) {
    for (const pattern of stubRelativePatterns) {
      if (request.includes(pattern)) {
        return require.resolve('./empty-module');
      }
    }
  }

  // Try normal resolution, fallback to empty module if not found
  try {
    return originalResolveFilename.call(this, request, parent, isMain, options);
  } catch (e: any) {
    if (e.code === 'MODULE_NOT_FOUND' || e.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
      // Fallback to empty module for any unresolvable module
      // This allows the service to start even with missing non-critical dependencies
      console.debug(`[module-stub] Stubbing unresolvable module: ${request}`);
      return require.resolve('./empty-module');
    }
    throw e;
  }
};
