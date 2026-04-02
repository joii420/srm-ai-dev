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
  export const flattenDSL: any;
  export const migrateDSL: any;
  export const LATEST_DSL_VERSION: any;
  export const ROOT_CONTAINER_WIDGET_ID: any;
  export type DSLWidget = any;
  export type FlattenedDSL = any;
  export type NestedDSL = any;
  export type NestedDSLWidget = any;
  export type FlattenedDSLWidget = any;
  export type FlattenedDSLEntities = any;
}

declare module '@shared/dsl/*' {
  const _default: any;
  export default _default;
  export type DSLWidget = any;
  export type WidgetProps = any;
}

declare module '@shared/ast' {
  const _default: any;
  export default _default;
  export const isJSAction: any;
  export const getAST: any;
  export const extractIdentifierInfoFromCode: any;
  export const getFunctionalParamsFromNode: any;
  export const isTypeOfFunction: any;
  export const isPropertyAFunctionNode: any;
  export const isLiteralNode: any;
  export const isFunctionPresent: any;
  export const parseJSObject: any;
  export const isJSFunctionProperty: any;
  export const getMemberExpressionObjectFromProperty: any;
  export const SourceType: any;
  export const NodeTypes: any;
  export const ECMA_VERSION: any;
  export type MemberExpressionData = any;
  export type PropertyNode = any;
  export type IdentifierInfo = any;
  export type TParsedJSProperty = any;
  export type JSPropertyPosition = any;
  export type JSVarProperty = any;
  export type JSFunctionProperty = any;
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
  export type Def = any;
}

declare module 'codemirror' {
  const _default: any;
  export default _default;
}

// Widget types
declare module 'widgets/BaseWidget' {
  export type WidgetProps = any;
  export type WidgetState = any;
  export type WidgetCardProps = any;
  export type WidgetOperation = any;
  const _default: any;
  export default _default;
}

declare module 'widgets/BaseWidgetHOC/withBaseWidgetHOC' {
  export type BaseWidgetProps = any;
  const _default: any;
  export default _default;
}

declare module 'widgets/WidgetUtils' {
  export const getWidgetMinMaxDimensionsInPixel: any;
  export const isCompactMode: any;
  export const GRID_DENSITY_MIGRATION_V1: number;
  const _default: any;
  export default _default;
}

// Pages/Components
declare module 'pages/Editor/APIEditor/helpers' { const _d: any; export default _d; export const CONTENT_TYPE_HEADER_KEY: any; }
declare module 'pages/Editor/APIEditor/constants' { const _d: any; export default _d; export const API_EDITOR_TABS: any; export const POST_BODY_FORMAT_OPTIONS: any; }
declare module 'pages/Editor/SaaSEditor/constants' { const _d: any; export default _d; export const SAAS_EDITOR_API_ID_PATH: string; }
declare module 'pages/AppViewer/AppViewSocket/AppViewSocket' { export function sendSocketMessage(...args: any[]): any; export function getEvalMode(): any; export function getPageInfo(): any; }

// Navigation
declare module 'navigation/FocusEntity' {
  const _d: any; export default _d;
  export const FocusEntity: any;
  export type FocusEntityInfo = any;
  export const identifyEntityFromPath: any;
}

// Reflow
declare module 'reflow/reflowTypes' {
  export type ReflowedSpaceMap = any;
  export type SpaceMap = any;
  export type BlockSpace = any;
  export type CollidingSpace = any;
  export type OccupiedSpace = any;
  export type GridProps = any;
  export type MovementLimitMap = any;
  export type ReflowDirection = any;
  export type DirectionalReflow = any;
  const _d: any; export default _d;
}

// Components
declare module 'components/formControls/utils' {
  export const getViewType: any;
  export const isHidden: any;
  export const actionPathFromName: any;
  export const checkIfSectionCanRender: any;
  export const isValidFormConfig: any;
  export const caculateIsHidden: any;
  export const evaluateCondtionWithType: any;
  export const extractConditionalOutput: any;
  export type ViewTypes = any;
  export type HiddenType = any;
  const _d: any; export default _d;
}

declare module 'components/editorComponents/GlobalSearch/utils' {
  export const algoliaHighlightTag: string;
  export type SearchCategory = any;
  export type SearchItem = any;
  export type SelectEvent = any;
  export const SEARCH_CATEGORY_ID: any;
  export const getEntityId: any;
  export const filterCategories: any;
  export const getFilterCategoryList: any;
  const _d: any; export default _d;
}

declare module 'components/editorComponents/Debugger/helpers' {
  export const getDebuggerSource: any;
  export type DebuggerMessage = any;
  const _d: any; export default _d;
}

declare module 'components/editorComponents/CodeEditor/EditorConfig' {
  export type EditorConfig = any;
  export const EditorModes: any;
  export const EditorSize: any;
  export const EditorTheme: any;
  export const TabBehaviour: any;
  const _d: any; export default _d;
}

declare module 'components/editorComponents/emptyResponse' {
  export const EMPTY_RESPONSE: any;
}

// Store module
declare module 'store' {
  const _d: any;
  export default _d;
}

// Layout
declare module 'layoutSystems/anvil/layoutComponents/LayoutFactory' { const _d: any; export default _d; }
declare module 'layoutSystems/anvil/layoutComponents/BaseLayoutComponent' { const _d: any; export default _d; }
declare module 'layoutSystems/withLayoutSystemWidgetHOC' { export const getLayoutSystem: any; const _d: any; export default _d; }

// WidgetQueryGenerators
declare module 'WidgetQueryGenerators/types' {
  export type WidgetQueryGenerationConfig = any;
  export type WidgetQueryGenerationFormConfig = any;
  export type ActionConfigurationMongoDB = any;
  const _d: any; export default _d;
}

// Autocomplete
declare module 'utils/autocomplete/CodemirrorTernService' { const _d: any; export default _d; }
declare module 'utils/autocomplete/defCreatorUtils' {
  export const generateTypeDef: any;
  export const dataTypesGen: any;
  export type Def = any;
  const _d: any; export default _d;
}
declare module 'utils/autocomplete/EntityDefinitions' { const _d: any; export default _d; }
declare module 'utils/autocomplete/dataTreeTypeDefCreator' { export const dataTreeTypeDefCreator: any; const _d: any; export default _d; }

// Misc
declare module 'utils/hooks/useFeatureFlagOverride' { const _d: any; export default _d; }
declare module 'utils/loadGoogleMapsApi' { const _d: any; export default _d; }
declare module 'smartlook-client' { const _d: any; export default _d; }

// ====== Wildcard declarations ======
// { [key: string]: any } as default + __brand allows any named destructuring to be truthy
// For `import type { X }` from wildcard, X resolves to `any` via the index signature fallback

declare module 'layoutSystems/*' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module 'UITelemetry/*' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module 'widgets' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module 'widgets/*' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module 'pages/*' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module 'components/*' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module 'navigation/*' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module 'reflow' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module 'reflow/*' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module 'plugins/*' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module 'templates/*' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module 'transformers/*' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module 'usagePulse' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module 'RouteChangeListener' { const _d: { [k: string]: any }; export default _d; }
declare module 'WidgetQueryGenerators/*' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module 'utils/autocomplete/*' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }

// @appsmith/* catch-all
declare module '@appsmith/pages/*' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module '@appsmith/hooks' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module '@appsmith/plugins/*' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module '@appsmith/navigation/*' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module '@appsmith/configs/types' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module '@appsmith/types/*' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }

// Third-party browser-only libraries
declare module '@blueprintjs/core' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module '@blueprintjs/icons' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module '@design-system/theming' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module '@design-system/widgets' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module 'design-system-old/*' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module '@shared/dsl/src/migrate/types' { const _d: { [k: string]: any }; export default _d; }
declare module '@syncfusion/*' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module '@uppy/*' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module 'socket.io-client' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module 'copy-to-clipboard' { const _d: any; export default _d; }
declare module 'downloadjs' { const _d: any; export default _d; }
declare module 'lottie-web' { const _d: any; export default _d; }
declare module 'tinycolor2' { const _d: any; export default _d; }
declare module 'react-device-detect' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module 'react-dom' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module 'react-modal' { const _d: any; export default _d; }
declare module 'scroll-into-view-if-needed' { const _d: any; export default _d; }
declare module 'resize-observer-polyfill' { const _d: any; export default _d; }
declare module 'validate-color' { const _d: any; export default _d; }
declare module 'node-forge' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module 'yjs' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module 'proxy-memoize' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module 'fuse.js' { const _d: any; export default _d; }
declare module 'localforage' { const _d: any; export default _d; }
declare module 'unescape-js' { const _d: any; export default _d; }
declare module 'toposort' { const _d: any; export default _d; }
declare module 'js-sha256' { const _d: { [k: string]: any }; export default _d; export const __brand: any; }
declare module 'js-regex-pl' { const _d: any; export default _d; }
declare module 'nanoid/generate' { const _d: any; export default _d; }

// ====== Global type declarations ======

declare const SentryRoute: any;
declare const uuid4: (...args: any[]) => string;
declare const operateWidget: any;
declare const captureException: (...args: any[]) => void;

// ====== Asset modules ======
declare module '*.css' { const content: Record<string, string>; export default content; }
declare module '*.svg' { const content: string; export default content; }
declare module '*.png' { const content: string; export default content; }
declare module '*.gif' { const content: string; export default content; }
declare module '*.json.txt' { const content: any; export default content; }
