import { LayoutSystemTypes } from "layoutSystems/types";
import type { DSLWidget } from "WidgetProvider/constants";

// In Node service context, DSL transformers for Auto/Anvil are stubbed.
// Only Fixed layout returns identity transform.
export function getLayoutSystemDSLTransformer(
  layoutSystemType: LayoutSystemTypes,
  _mainCanvasWidth: number,
) {
  switch (layoutSystemType) {
    case LayoutSystemTypes.FIXED:
      return (dsl: DSLWidget) => dsl;
    case LayoutSystemTypes.AUTO:
      // Auto layout DSL transformer requires browser-specific modules
      return (dsl: DSLWidget) => dsl;
    case LayoutSystemTypes.ANVIL:
      return (dsl: DSLWidget) => dsl;
  }
}
