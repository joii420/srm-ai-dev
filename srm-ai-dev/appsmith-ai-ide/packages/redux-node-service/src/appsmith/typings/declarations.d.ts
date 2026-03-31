/**
 * Type declarations for modules that are not available in the Node.js service.
 * These are browser-only modules referenced by copied source files.
 * Declaring them as `any` allows TypeScript compilation without the actual implementations.
 */

// UI Libraries
declare module 'design-system' {
  export const toast: { show: (...args: any[]) => void; dismiss: (...args: any[]) => void; update: (...args: any[]) => void };
  export const Icon: any;
  export const Text: any;
  export const Button: any;
  export const Tooltip: any;
  const _default: any;
  export default _default;
}

declare module 'design-system-old' {
  export type DropdownOption = any;
  export type TextType = any;
  export type IconName = any;
  export type IconNames = any;
  const _default: any;
  export default _default;
}

declare module 'react-redux' {
  export const useSelector: any;
  export const useDispatch: any;
  export const connect: any;
  export const Provider: any;
  export type ConnectedComponent<C, P> = any;
}

declare module 'react-toastify' {
  export type TypeOptions = string;
}

declare module 'react-router-dom' {
  export const Link: any;
  export const Route: any;
  export const Switch: any;
  export const useHistory: any;
  export const useParams: any;
  export const useLocation: any;
  export const matchPath: any;
  export const Redirect: any;
}

// Shared packages
declare module '@shared/dsl' {
  const _default: any;
  export default _default;
  export const nestDSL: any;
  export type DSLWidget = any;
}

declare module '@shared/ast' {
  const _default: any;
  export default _default;
  export const isJSAction: any;
  export const getAST: any;
  export const extractIdentifierInfoFromCode: any;
  export const getFunctionalParamsFromNode: any;
  export const isTypeOfFunction: any;
  export const MemberExpressionData: any;
  export const SourceType: any;
  export const NodeTypes: any;
  export const PropertyNode: any;
  export const wrapCode: any;
  export const getJSExpressionForEval: any;
}

declare module '@appsmith/configs' {
  const _default: any;
  export default _default;
  export const getAppsmithConfigs: any;
}

// Tern/CodeMirror
declare module 'tern' {
  const _default: any;
  export default _default;
  export const Server: any;
}

declare module 'codemirror' {
  const _default: any;
  export default _default;
}

// Widget types (referenced but not available in Node.js)
declare module 'widgets/BaseWidget' {
  export type WidgetProps = any;
  export type WidgetState = any;
  export type WidgetCardProps = any;
  export type WidgetOperation = any;
  const _default: any;
  export default _default;
}

declare module 'widgets/BaseWidgetHOC/withBaseWidgetHOC' {
  const _default: any;
  export default _default;
}

declare module 'widgets/WidgetUtils' {
  const _default: any;
  export default _default;
  export const getWidgetMinMaxDimensionsInPixel: any;
}

declare module 'widgets/anvil/constants' {
  const _default: any;
  export default _default;
}

declare module 'widgets/constants' {
  const _default: any;
  export default _default;
}

// Pages/Components referenced by sagas
declare module 'pages/Editor/APIEditor/helpers' {
  const _default: any;
  export default _default;
}

declare module 'pages/Editor/APIEditor/constants' {
  const _default: any;
  export default _default;
}

declare module 'pages/Editor/SaaSEditor/constants' {
  const _default: any;
  export default _default;
  export const SAAS_EDITOR_API_ID_PATH: string;
}

declare module 'pages/AppViewer/AppViewSocket/AppViewSocket' {
  export function sendSocketMessage(...args: any[]): any;
  export function getEvalMode(): any;
  export function getPageInfo(): any;
}

// Navigation
declare module 'navigation/FocusEntity' {
  const _default: any;
  export default _default;
  export const FocusEntity: any;
  export type FocusEntityInfo = any;
  export const identifyEntityFromPath: any;
}

// Reflow
declare module 'reflow/reflowTypes' {
  export type ReflowedSpaceMap = any;
  export type SpaceMap = any;
  const _default: any;
  export default _default;
}

// Components referenced by sagas/selectors
declare module 'components/formControls/utils' {
  const _default: any;
  export default _default;
}

declare module 'components/editorComponents/GlobalSearch/utils' {
  const _default: any;
  export default _default;
  export const algoliaHighlightTag: string;
  export type SearchCategory = any;
}

declare module 'components/editorComponents/Debugger/helpers' {
  const _default: any;
  export default _default;
}

declare module 'components/editorComponents/CodeEditor/EditorConfig' {
  const _default: any;
  export default _default;
  export type EditorConfig = any;
}

declare module 'components/editorComponents/emptyResponse' {
  export const EMPTY_RESPONSE: any;
}

// Store module (rootStore replaced by storeContext)
declare module 'store' {
  const _default: any;
  export default _default;
}

// Layout
declare module 'layoutSystems/anvil/layoutComponents/LayoutFactory' {
  const _default: any;
  export default _default;
}

declare module 'layoutSystems/anvil/layoutComponents/BaseLayoutComponent' {
  const _default: any;
  export default _default;
}

// WidgetQueryGenerators
declare module 'WidgetQueryGenerators/types' {
  const _default: any;
  export default _default;
}

// Smartlook
declare module 'smartlook-client' {
  const _default: any;
  export default _default;
}

// Autocomplete utils (removed in cleanup, declare as any)
declare module 'utils/autocomplete/CodemirrorTernService' {
  const _default: any;
  export default _default;
}

declare module 'utils/autocomplete/defCreatorUtils' {
  const _default: any;
  export default _default;
  export const generateTypeDef: any;
  export const dataTypesGen: any;
}

declare module 'utils/autocomplete/EntityDefinitions' {
  const _default: any;
  export default _default;
}

// Hooks (removed, declare as any)
declare module 'utils/hooks/useFeatureFlagOverride' {
  const _default: any;
  export default _default;
}

// Google APIs
declare module 'utils/loadGoogleMapsApi' {
  const _default: any;
  export default _default;
}

// ====== Wildcard declarations for browser-only modules ======
// These modules exist in project-web but are not relevant for the Node.js service.
// Declaring them as any prevents TS2307 errors without pulling in browser dependencies.

// Layout Systems (removed - heavy React dependency, types only)
declare module 'layoutSystems/*' { const _default: any; export default _default; export const __brand: any; }

// UITelemetry (removed - tracing stubs)
declare module 'UITelemetry/*' { const _default: any; export default _default; export const __brand: any; }

// Widgets
declare module 'widgets' { const _default: any; export default _default; export const __brand: any; }
declare module 'widgets/*' { const _default: any; export default _default; export const __brand: any; }

// Pages
declare module 'pages/*' { const _default: any; export default _default; export const __brand: any; }

// Components
declare module 'components/*' { const _default: any; export default _default; export const __brand: any; }

// Navigation
declare module 'navigation/*' { const _default: any; export default _default; export const __brand: any; }

// Reflow
declare module 'reflow' { const _default: any; export default _default; export const __brand: any; }
declare module 'reflow/*' { const _default: any; export default _default; export const __brand: any; }

// Plugins (Linting)
declare module 'plugins/*' { const _default: any; export default _default; export const __brand: any; }

// Templates
declare module 'templates/*' { const _default: any; export default _default; export const __brand: any; }

// Transformers
declare module 'transformers/*' { const _default: any; export default _default; export const __brand: any; }

// usagePulse
declare module 'usagePulse' { const _default: any; export default _default; export const __brand: any; }

// RouteChangeListener
declare module 'RouteChangeListener' { const _default: any; export default _default; }

// WidgetQueryGenerators
declare module 'WidgetQueryGenerators/*' { const _default: any; export default _default; export const __brand: any; }

// @appsmith/* catch-all for uncovered paths (pages, hooks, plugins, configs)
declare module '@appsmith/pages/*' { const _default: any; export default _default; export const __brand: any; }
declare module '@appsmith/hooks' { const _default: any; export default _default; export const __brand: any; }
declare module '@appsmith/plugins/*' { const _default: any; export default _default; export const __brand: any; }
declare module '@appsmith/navigation/*' { const _default: any; export default _default; export const __brand: any; }
declare module '@appsmith/configs/types' { const _default: any; export default _default; export const __brand: any; }
declare module '@appsmith/types/*' { const _default: any; export default _default; export const __brand: any; }

// Third-party browser-only libraries
declare module '@blueprintjs/core' { const _default: any; export default _default; export const __brand: any; }
declare module '@blueprintjs/icons' { const _default: any; export default _default; export const __brand: any; }
declare module '@design-system/theming' { const _default: any; export default _default; export const __brand: any; }
declare module '@design-system/widgets' { const _default: any; export default _default; export const __brand: any; }
declare module '@shared/dsl/src/migrate/types' { const _default: any; export default _default; }
declare module '@syncfusion/*' { const _default: any; export default _default; export const __brand: any; }
declare module '@uppy/*' { const _default: any; export default _default; export const __brand: any; }
declare module 'socket.io-client' { const _default: any; export default _default; export const __brand: any; }
declare module 'copy-to-clipboard' { const _default: any; export default _default; }
declare module 'downloadjs' { const _default: any; export default _default; }
declare module 'lottie-web' { const _default: any; export default _default; }
declare module 'tinycolor2' { const _default: any; export default _default; }
declare module 'react-device-detect' { const _default: any; export default _default; export const __brand: any; }
declare module 'react-dom' { const _default: any; export default _default; export const __brand: any; }
declare module 'react-modal' { const _default: any; export default _default; }
declare module 'scroll-into-view-if-needed' { const _default: any; export default _default; }
declare module 'resize-observer-polyfill' { const _default: any; export default _default; }
declare module 'validate-color' { const _default: any; export default _default; }
declare module 'node-forge' { const _default: any; export default _default; export const __brand: any; }
declare module 'yjs' { const _default: any; export default _default; export const __brand: any; }
declare module 'proxy-memoize' { const _default: any; export default _default; export const __brand: any; }
declare module 'fuse.js' { const _default: any; export default _default; }
declare module 'localforage' { const _default: any; export default _default; }
declare module 'smartlook-client' { const _default: any; export default _default; }
declare module 'unescape-js' { const _default: any; export default _default; }
declare module 'toposort' { const _default: any; export default _default; }
declare module 'js-sha256' { const _default: any; export default _default; export const __brand: any; }
declare module 'js-regex-pl' { const _default: any; export default _default; }
declare module 'nanoid/generate' { const _default: any; export default _default; }

// CSS/Assets
declare module '*.css' { const content: Record<string, string>; export default content; }
declare module '*.svg' { const content: string; export default content; }
declare module '*.png' { const content: string; export default content; }
declare module '*.gif' { const content: string; export default content; }
declare module '*.json.txt' { const content: any; export default content; }
