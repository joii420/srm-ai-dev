"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateStylingPropertiesForTheming = exports.addPropertyToDynamicPropertyPathList = exports.parseSchemaItem = exports.JSON_FORM_WIDGET_CHILD_STYLESHEET = exports.TABLE_WIDGET_CHILD_STYLESHEET = exports.BUTTON_GROUP_CHILD_STYLESHEET = exports.TextSizes = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const lodash_1 = require("lodash");
const utils_1 = require("../utils");
var ButtonBorderRadiusTypes;
(function (ButtonBorderRadiusTypes) {
    ButtonBorderRadiusTypes["SHARP"] = "SHARP";
    ButtonBorderRadiusTypes["ROUNDED"] = "ROUNDED";
    ButtonBorderRadiusTypes["CIRCLE"] = "CIRCLE";
})(ButtonBorderRadiusTypes || (ButtonBorderRadiusTypes = {}));
var BoxShadowTypes;
(function (BoxShadowTypes) {
    BoxShadowTypes["NONE"] = "NONE";
    BoxShadowTypes["VARIANT1"] = "VARIANT1";
    BoxShadowTypes["VARIANT2"] = "VARIANT2";
    BoxShadowTypes["VARIANT3"] = "VARIANT3";
    BoxShadowTypes["VARIANT4"] = "VARIANT4";
    BoxShadowTypes["VARIANT5"] = "VARIANT5";
})(BoxShadowTypes || (BoxShadowTypes = {}));
var TextSizes;
(function (TextSizes) {
    TextSizes["HEADING1"] = "HEADING1";
    TextSizes["HEADING2"] = "HEADING2";
    TextSizes["HEADING3"] = "HEADING3";
    TextSizes["PARAGRAPH"] = "PARAGRAPH";
    TextSizes["PARAGRAPH2"] = "PARAGRAPH2";
})(TextSizes = exports.TextSizes || (exports.TextSizes = {}));
const THEMING_BORDER_RADIUS = {
    none: "0px",
    rounded: "0.375rem",
    circle: "9999px",
};
const THEMEING_TEXT_SIZES = {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    md: "1.125rem",
    lg: "1.5rem",
    xl: "1.875rem",
    "2xl": "3rem",
    "3xl": "3.75rem",
};
const rgbaMigrationConstantV56 = "rgba(0, 0, 0, 0.25)";
const DEFAULT_BOXSHADOW = "none";
const ROOT_SCHEMA_KEY = "__root_schema__";
const Colors = {
    GREEN: "#03B365",
};
exports.BUTTON_GROUP_CHILD_STYLESHEET = {
    button: {
        buttonColor: "{{appsmith.theme.colors.primaryColor}}",
    },
};
exports.TABLE_WIDGET_CHILD_STYLESHEET = {
    button: {
        buttonColor: "{{appsmith.theme.colors.primaryColor}}",
        borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
        boxShadow: "none",
    },
    menuButton: {
        menuColor: "{{appsmith.theme.colors.primaryColor}}",
        borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
        boxShadow: "none",
    },
    iconButton: {
        menuColor: "{{appsmith.theme.colors.primaryColor}}",
        borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
        boxShadow: "none",
    },
};
exports.JSON_FORM_WIDGET_CHILD_STYLESHEET = {
    ARRAY: {
        accentColor: "{{appsmith.theme.colors.primaryColor}}",
        borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
        boxShadow: "none",
        cellBorderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
        cellBoxShadow: "none",
    },
    OBJECT: {
        borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
        boxShadow: "none",
        cellBorderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
        cellBoxShadow: "none",
    },
    CHECKBOX: {
        accentColor: "{{appsmith.theme.colors.primaryColor}}",
        borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
    },
    CURRENCY_INPUT: {
        accentColor: "{{appsmith.theme.colors.primaryColor}}",
        borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
        boxShadow: "none",
    },
    DATEPICKER: {
        accentColor: "{{appsmith.theme.colors.primaryColor}}",
        borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
        boxShadow: "none",
    },
    EMAIL_INPUT: {
        accentColor: "{{appsmith.theme.colors.primaryColor}}",
        borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
        boxShadow: "none",
    },
    MULTISELECT: {
        accentColor: "{{appsmith.theme.colors.primaryColor}}",
        borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
        boxShadow: "none",
    },
    MULTILINE_TEXT_INPUT: {
        accentColor: "{{appsmith.theme.colors.primaryColor}}",
        borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
        boxShadow: "none",
    },
    NUMBER_INPUT: {
        accentColor: "{{appsmith.theme.colors.primaryColor}}",
        borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
        boxShadow: "none",
    },
    PASSWORD_INPUT: {
        accentColor: "{{appsmith.theme.colors.primaryColor}}",
        borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
        boxShadow: "none",
    },
    PHONE_NUMBER_INPUT: {
        accentColor: "{{appsmith.theme.colors.primaryColor}}",
        borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
        boxShadow: "none",
    },
    RADIO_GROUP: {
        accentColor: "{{appsmith.theme.colors.primaryColor}}",
        boxShadow: "none",
    },
    SELECT: {
        accentColor: "{{appsmith.theme.colors.primaryColor}}",
        borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
        boxShadow: "none",
    },
    SWITCH: {
        accentColor: "{{appsmith.theme.colors.primaryColor}}",
        boxShadow: "none",
    },
    TEXT_INPUT: {
        accentColor: "{{appsmith.theme.colors.primaryColor}}",
        borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
        boxShadow: "none",
    },
};
/**
 * Recursive function to traverse through all the children of the JSON form in theming migration.
 * @param schemaItem
 * @param propertyPath
 * @param callback
 */
const parseSchemaItem = (schemaItem, propertyPath, callback) => {
    // Update the theme stuff for this schema
    callback(schemaItem, propertyPath);
    if (schemaItem && !(0, lodash_1.isEmpty)(schemaItem.children)) {
        Object.values(schemaItem.children).forEach((schemaItem) => {
            const childPropertyPath = `${propertyPath}.children.${schemaItem.identifier}`;
            (0, exports.parseSchemaItem)(schemaItem, childPropertyPath, callback);
        });
    }
};
exports.parseSchemaItem = parseSchemaItem;
/**
 * This function will add the given propertyName into the dynamicPropertyPathList.
 * @param propertyName
 * @param child
 */
const addPropertyToDynamicPropertyPathList = (propertyName, child) => {
    const isPropertyPathPresent = (child.dynamicPropertyPathList || []).find((property) => property.key === propertyName);
    if (!isPropertyPathPresent) {
        child.dynamicPropertyPathList = [
            ...(child.dynamicPropertyPathList || []),
            { key: propertyName },
        ];
    }
};
exports.addPropertyToDynamicPropertyPathList = addPropertyToDynamicPropertyPathList;
const migrateStylingPropertiesForTheming = (currentDSL) => {
    const widgetsWithPrimaryColorProp = [
        "DATE_PICKER_WIDGET2",
        "INPUT_WIDGET",
        "INPUT_WIDGET_V2",
        "LIST_WIDGET",
        "MULTI_SELECT_TREE_WIDGET",
        "DROP_DOWN_WIDGET",
        "TABS_WIDGET",
        "SINGLE_SELECT_TREE_WIDGET",
        "TABLE_WIDGET",
        "BUTTON_GROUP_WIDGET",
        "PHONE_INPUT_WIDGET",
        "CURRENCY_INPUT_WIDGET",
        "SELECT_WIDGET",
        "MULTI_SELECT_WIDGET_V2",
        "MULTI_SELECT_WIDGET",
    ];
    currentDSL.children = currentDSL.children?.map((child) => {
        switch (child.borderRadius) {
            case ButtonBorderRadiusTypes.SHARP:
                child.borderRadius = THEMING_BORDER_RADIUS.none;
                break;
            case ButtonBorderRadiusTypes.ROUNDED:
                child.borderRadius = THEMING_BORDER_RADIUS.rounded;
                break;
            case ButtonBorderRadiusTypes.CIRCLE:
                child.borderRadius = THEMING_BORDER_RADIUS.circle;
                (0, exports.addPropertyToDynamicPropertyPathList)("borderRadius", child);
                break;
            default:
                if ((child.type === "CONTAINER_WIDGET" ||
                    child.type === "FORM_WIDGET" ||
                    child.type === "JSON_FORM_WIDGET") &&
                    child.borderRadius) {
                    child.borderRadius = `${child.borderRadius}px`;
                    (0, exports.addPropertyToDynamicPropertyPathList)("borderRadius", child);
                }
                else {
                    child.borderRadius = THEMING_BORDER_RADIUS.none;
                }
        }
        switch (child.boxShadow) {
            case BoxShadowTypes.VARIANT1:
                child.boxShadow = `0px 0px 4px 3px ${child.boxShadowColor || "rgba(0, 0, 0, 0.25)"}`;
                (0, exports.addPropertyToDynamicPropertyPathList)("boxShadow", child);
                break;
            case BoxShadowTypes.VARIANT2:
                child.boxShadow = `3px 3px 4px ${child.boxShadowColor || "rgba(0, 0, 0, 0.25)"}`;
                (0, exports.addPropertyToDynamicPropertyPathList)("boxShadow", child);
                break;
            case BoxShadowTypes.VARIANT3:
                child.boxShadow = `0px 1px 3px ${child.boxShadowColor || "rgba(0, 0, 0, 0.25)"}`;
                (0, exports.addPropertyToDynamicPropertyPathList)("boxShadow", child);
                break;
            case BoxShadowTypes.VARIANT4:
                child.boxShadow = `2px 2px 0px ${child.boxShadowColor || "rgba(0, 0, 0, 0.25)"}`;
                (0, exports.addPropertyToDynamicPropertyPathList)("boxShadow", child);
                break;
            case BoxShadowTypes.VARIANT5:
                child.boxShadow = `-2px -2px 0px ${child.boxShadowColor || "rgba(0, 0, 0, 0.25)"}`;
                (0, exports.addPropertyToDynamicPropertyPathList)("boxShadow", child);
                break;
            default:
                child.boxShadow = DEFAULT_BOXSHADOW;
        }
        /**
         * Migrates the textSize property present at the table level.
         */
        if (child.type === "TABLE_WIDGET") {
            switch (child.textSize) {
                case TextSizes.PARAGRAPH2:
                    child.textSize = THEMEING_TEXT_SIZES.xs;
                    (0, exports.addPropertyToDynamicPropertyPathList)("textSize", child);
                    break;
                case TextSizes.PARAGRAPH:
                    child.textSize = THEMEING_TEXT_SIZES.sm;
                    break;
                case TextSizes.HEADING3:
                    child.textSize = THEMEING_TEXT_SIZES.base;
                    break;
                case TextSizes.HEADING2:
                    child.textSize = THEMEING_TEXT_SIZES.md;
                    (0, exports.addPropertyToDynamicPropertyPathList)("textSize", child);
                    break;
                case TextSizes.HEADING1:
                    child.textSize = THEMEING_TEXT_SIZES.lg;
                    (0, exports.addPropertyToDynamicPropertyPathList)("textSize", child);
                    break;
                default:
                    child.textSize = THEMEING_TEXT_SIZES.sm;
            }
            if (child.hasOwnProperty("primaryColumns")) {
                Object.keys(child.primaryColumns).forEach((key) => {
                    /**
                     * Migrates the textSize property present at the primaryColumn and derivedColumn level.
                     */
                    const column = child.primaryColumns[key];
                    const isDerivedColumn = child.hasOwnProperty("derivedColumns") &&
                        key in child.derivedColumns;
                    const derivedColumn = child.derivedColumns[key];
                    switch (column.textSize) {
                        case TextSizes.PARAGRAPH2:
                            column.textSize = THEMEING_TEXT_SIZES.xs;
                            if (isDerivedColumn) {
                                derivedColumn.textSize = THEMEING_TEXT_SIZES.xs;
                            }
                            (0, exports.addPropertyToDynamicPropertyPathList)(`primaryColumns.${key}.textSize`, child);
                            break;
                        case TextSizes.PARAGRAPH:
                            column.textSize = THEMEING_TEXT_SIZES.sm;
                            if (isDerivedColumn) {
                                derivedColumn.textSize = THEMEING_TEXT_SIZES.sm;
                            }
                            break;
                        case TextSizes.HEADING3:
                            column.textSize = THEMEING_TEXT_SIZES.base;
                            if (isDerivedColumn) {
                                derivedColumn.textSize = THEMEING_TEXT_SIZES.base;
                            }
                            break;
                        case TextSizes.HEADING2:
                            column.textSize = THEMEING_TEXT_SIZES.md;
                            if (isDerivedColumn) {
                                derivedColumn.textSize = THEMEING_TEXT_SIZES.md;
                            }
                            (0, exports.addPropertyToDynamicPropertyPathList)(`primaryColumns.${key}.textSize`, child);
                            break;
                        case TextSizes.HEADING1:
                            column.textSize = THEMEING_TEXT_SIZES.lg;
                            if (isDerivedColumn) {
                                derivedColumn.textSize = THEMEING_TEXT_SIZES.lg;
                            }
                            (0, exports.addPropertyToDynamicPropertyPathList)(`primaryColumns.${key}.textSize`, child);
                            break;
                    }
                    /**
                     * Migrate the borderRadius if exists for the primary columns and derived columns
                     */
                    if (!column.borderRadius) {
                        column.borderRadius = THEMING_BORDER_RADIUS.none;
                        if (isDerivedColumn) {
                            derivedColumn.borderRadius = THEMING_BORDER_RADIUS.none;
                        }
                    }
                    switch (column.borderRadius) {
                        case ButtonBorderRadiusTypes.SHARP:
                            column.borderRadius = THEMING_BORDER_RADIUS.none;
                            if (isDerivedColumn) {
                                derivedColumn.borderRadius = THEMING_BORDER_RADIUS.none;
                            }
                            break;
                        case ButtonBorderRadiusTypes.ROUNDED:
                            column.borderRadius = THEMING_BORDER_RADIUS.rounded;
                            if (isDerivedColumn) {
                                derivedColumn.borderRadius = THEMING_BORDER_RADIUS.rounded;
                            }
                            break;
                        case ButtonBorderRadiusTypes.CIRCLE:
                            column.borderRadius = THEMING_BORDER_RADIUS.circle;
                            if (isDerivedColumn) {
                                derivedColumn.borderRadius = THEMING_BORDER_RADIUS.circle;
                            }
                            break;
                    }
                    /**
                     * Migrate the boxShadow if exists for the primary columns and derived columns:
                     */
                    const isBoxShadowColorDynamic = (0, utils_1.isDynamicValue)(column.boxShadowColor);
                    const newBoxShadowColor = column.boxShadowColor || rgbaMigrationConstantV56;
                    if (column.boxShadow) {
                        (0, exports.addPropertyToDynamicPropertyPathList)(`primaryColumns.${key}.boxShadow`, child);
                    }
                    else {
                        column.boxShadow = "none";
                        if (isDerivedColumn) {
                            derivedColumn.boxShadow = "none";
                        }
                    }
                    switch (column.boxShadow) {
                        case BoxShadowTypes.VARIANT1:
                            if (!isBoxShadowColorDynamic) {
                                // Checks is boxShadowColor is not dynamic
                                column.boxShadow = `0px 0px 4px 3px ${newBoxShadowColor}`;
                                if (isDerivedColumn) {
                                    derivedColumn.boxShadow = `0px 0px 4px 3px ${newBoxShadowColor}`;
                                }
                                delete column.boxShadowColor;
                            }
                            else {
                                // Dynamic
                                column.boxShadow = `0px 0px 4px 3px ${rgbaMigrationConstantV56}`;
                                if (isDerivedColumn) {
                                    derivedColumn.boxShadow = `0px 0px 4px 3px ${rgbaMigrationConstantV56}`;
                                }
                            }
                            break;
                        case BoxShadowTypes.VARIANT2:
                            if (!isBoxShadowColorDynamic) {
                                // Checks is boxShadowColor is not dynamic
                                column.boxShadow = `3px 3px 4px ${newBoxShadowColor}`;
                                if (isDerivedColumn) {
                                    derivedColumn.boxShadow = `3px 3px 4px ${newBoxShadowColor}`;
                                }
                                delete column.boxShadowColor;
                            }
                            else {
                                // Dynamic
                                column.boxShadow = `3px 3px 4px ${rgbaMigrationConstantV56}`;
                                if (isDerivedColumn) {
                                    derivedColumn.boxShadow = `3px 3px 4px ${rgbaMigrationConstantV56}`;
                                }
                            }
                            break;
                        case BoxShadowTypes.VARIANT3:
                            if (!isBoxShadowColorDynamic) {
                                // Checks is boxShadowColor is not dynamic
                                column.boxShadow = `0px 1px 3px ${newBoxShadowColor}`;
                                if (isDerivedColumn) {
                                    derivedColumn.boxShadow = `0px 1px 3px ${newBoxShadowColor}`;
                                }
                                delete column.boxShadowColor;
                            }
                            else {
                                // Dynamic
                                column.boxShadow = `0px 1px 3px ${rgbaMigrationConstantV56}`;
                                if (isDerivedColumn) {
                                    derivedColumn.boxShadow = `0px 1px 3px ${rgbaMigrationConstantV56}`;
                                }
                            }
                            break;
                        case BoxShadowTypes.VARIANT4:
                            if (!isBoxShadowColorDynamic) {
                                // Checks is boxShadowColor is not dynamic
                                column.boxShadow = `2px 2px 0px ${newBoxShadowColor}`;
                                if (isDerivedColumn) {
                                    derivedColumn.boxShadow = `2px 2px 0px ${newBoxShadowColor}`;
                                }
                                delete column.boxShadowColor;
                            }
                            else {
                                column.boxShadow = `2px 2px 0px ${rgbaMigrationConstantV56}`;
                                if (isDerivedColumn) {
                                    derivedColumn.boxShadow = `2px 2px 0px ${rgbaMigrationConstantV56}`;
                                }
                            }
                            break;
                        case BoxShadowTypes.VARIANT5:
                            if (!isBoxShadowColorDynamic) {
                                // Checks is boxShadowColor is not dynamic
                                column.boxShadow = `-2px -2px 0px ${newBoxShadowColor}`;
                                if (isDerivedColumn) {
                                    derivedColumn.boxShadow = `-2px -2px 0px ${newBoxShadowColor}`;
                                }
                                delete column.boxShadowColor;
                            }
                            else {
                                // Dynamic
                                column.boxShadow = `-2px -2px 0px ${rgbaMigrationConstantV56}`;
                                if (isDerivedColumn) {
                                    derivedColumn.boxShadow = `-2px -2px 0px ${rgbaMigrationConstantV56}`;
                                }
                            }
                            break;
                    }
                });
            }
        }
        /**
         * Migrate the parent level properties for JSON Form
         */
        if (child.type === "JSON_FORM_WIDGET") {
            const parentLevelProperties = ["submitButtonStyles", "resetButtonStyles"];
            parentLevelProperties.forEach((propertyName) => {
                const propertyPathBorderRadius = `${propertyName}.borderRadius`;
                const propertyPathBoxShadow = `${propertyName}.boxShadow`;
                const propertyPathBoxShadowColor = `${propertyName}.boxShadowColor`;
                if ((0, lodash_1.has)(child, propertyPathBorderRadius)) {
                    const jsonFormBorderRadius = (0, lodash_1.get)(child, propertyPathBorderRadius);
                    switch (jsonFormBorderRadius) {
                        case ButtonBorderRadiusTypes.SHARP:
                            (0, lodash_1.set)(child, propertyPathBorderRadius, THEMING_BORDER_RADIUS.none);
                            break;
                        case ButtonBorderRadiusTypes.ROUNDED:
                            (0, lodash_1.set)(child, propertyPathBorderRadius, THEMING_BORDER_RADIUS.rounded);
                            break;
                        case ButtonBorderRadiusTypes.CIRCLE:
                            (0, lodash_1.set)(child, propertyPathBorderRadius, THEMING_BORDER_RADIUS.circle);
                            (0, exports.addPropertyToDynamicPropertyPathList)(propertyPathBorderRadius, child);
                            break;
                        default:
                            (0, lodash_1.set)(child, propertyPathBorderRadius, THEMING_BORDER_RADIUS.none);
                    }
                }
                else {
                    (0, lodash_1.set)(child, propertyPathBorderRadius, THEMING_BORDER_RADIUS.none);
                }
                if ((0, lodash_1.has)(child, propertyPathBoxShadow)) {
                    const jsonFormBoxShadow = (0, lodash_1.get)(child, propertyPathBoxShadow);
                    const boxShadowColor = ((0, lodash_1.has)(child, propertyPathBoxShadowColor) &&
                        (0, lodash_1.get)(child, propertyPathBoxShadowColor)) ||
                        "rgba(0, 0, 0, 0.25)";
                    switch (jsonFormBoxShadow) {
                        case BoxShadowTypes.VARIANT1:
                            (0, lodash_1.set)(child, propertyPathBoxShadow, `0px 0px 4px 3px ${boxShadowColor}`);
                            (0, exports.addPropertyToDynamicPropertyPathList)(propertyPathBoxShadow, child);
                            break;
                        case BoxShadowTypes.VARIANT2:
                            (0, lodash_1.set)(child, propertyPathBoxShadow, `3px 3px 4px ${boxShadowColor}`);
                            (0, exports.addPropertyToDynamicPropertyPathList)(propertyPathBoxShadow, child);
                            break;
                        case BoxShadowTypes.VARIANT3:
                            (0, lodash_1.set)(child, propertyPathBoxShadow, `0px 1px 3px ${boxShadowColor}`);
                            (0, exports.addPropertyToDynamicPropertyPathList)(propertyPathBoxShadow, child);
                            break;
                        case BoxShadowTypes.VARIANT4:
                            (0, lodash_1.set)(child, propertyPathBoxShadow, `2px 2px 0px ${boxShadowColor}`);
                            (0, exports.addPropertyToDynamicPropertyPathList)(propertyPathBoxShadow, child);
                            break;
                        case BoxShadowTypes.VARIANT5:
                            (0, lodash_1.set)(child, propertyPathBoxShadow, `-2px -2px 0px ${boxShadowColor}`);
                            (0, exports.addPropertyToDynamicPropertyPathList)(propertyPathBoxShadow, child);
                            break;
                        default:
                            (0, lodash_1.set)(child, propertyPathBoxShadow, DEFAULT_BOXSHADOW);
                    }
                }
                else {
                    (0, lodash_1.set)(child, propertyPathBoxShadow, DEFAULT_BOXSHADOW);
                }
            });
            /**
             * Migrate the children level properties for JSON form
             */
            if ((0, lodash_1.has)(child, "schema")) {
                const clonedSchema = (0, lodash_1.clone)(child.schema);
                (0, exports.parseSchemaItem)(clonedSchema[ROOT_SCHEMA_KEY], `schema.${ROOT_SCHEMA_KEY}`, (schemaItem, propertyPath) => {
                    if (schemaItem) {
                        switch (schemaItem.labelTextSize) {
                            case TextSizes.PARAGRAPH2:
                                schemaItem.labelTextSize = THEMEING_TEXT_SIZES.xs;
                                (0, exports.addPropertyToDynamicPropertyPathList)(`${propertyPath}.labelTextSize`, child);
                                break;
                            case TextSizes.PARAGRAPH:
                                schemaItem.labelTextSize = THEMEING_TEXT_SIZES.sm;
                                break;
                            case TextSizes.HEADING3:
                                schemaItem.labelTextSize = THEMEING_TEXT_SIZES.base;
                                break;
                            case TextSizes.HEADING2:
                                schemaItem.labelTextSize = THEMEING_TEXT_SIZES.md;
                                (0, exports.addPropertyToDynamicPropertyPathList)(`${propertyPath}.labelTextSize`, child);
                                break;
                            case TextSizes.HEADING1:
                                schemaItem.labelTextSize = THEMEING_TEXT_SIZES.lg;
                                (0, exports.addPropertyToDynamicPropertyPathList)(`${propertyPath}.labelTextSize`, child);
                                break;
                            default:
                                schemaItem.labelTextSize = THEMEING_TEXT_SIZES.sm;
                        }
                        // Set the default borderRadius
                        !(0, lodash_1.has)(schemaItem, "borderRadius") &&
                            (0, lodash_1.set)(schemaItem, "borderRadius", THEMING_BORDER_RADIUS.none);
                        // Set the default borderRadius for the Item styles in an array type:
                        !(0, lodash_1.has)(schemaItem, "cellBorderRadius") &&
                            (0, lodash_1.set)(schemaItem, "cellBorderRadius", THEMING_BORDER_RADIUS.none);
                        // Sets the default value for the boxShadow
                        !(0, lodash_1.has)(schemaItem, "boxShadow") &&
                            (0, lodash_1.set)(schemaItem, "boxShadow", DEFAULT_BOXSHADOW);
                        // Sets the default value for the boxShadow property of Item styles inside an array:
                        !(0, lodash_1.has)(schemaItem, "cellBoxShadow") &&
                            (0, lodash_1.set)(schemaItem, "cellBoxShadow", DEFAULT_BOXSHADOW);
                        // Sets default value as green for the accentColor(Most of the widgets require the below property):
                        !(0, lodash_1.has)(schemaItem, "accentColor") &&
                            (0, lodash_1.set)(schemaItem, "accentColor", Colors.GREEN);
                    }
                });
                child.schema = clonedSchema;
            }
        }
        switch (child.fontSize) {
            case TextSizes.PARAGRAPH2:
                child.fontSize = THEMEING_TEXT_SIZES.xs;
                (0, exports.addPropertyToDynamicPropertyPathList)("fontSize", child);
                break;
            case TextSizes.PARAGRAPH:
                child.fontSize = THEMEING_TEXT_SIZES.sm;
                break;
            case TextSizes.HEADING3:
                child.fontSize = THEMEING_TEXT_SIZES.base;
                break;
            case TextSizes.HEADING2:
                child.fontSize = THEMEING_TEXT_SIZES.md;
                (0, exports.addPropertyToDynamicPropertyPathList)("fontSize", child);
                break;
            case TextSizes.HEADING1:
                child.fontSize = THEMEING_TEXT_SIZES.lg;
                (0, exports.addPropertyToDynamicPropertyPathList)("fontSize", child);
                break;
        }
        switch (child.labelTextSize) {
            case TextSizes.PARAGRAPH2:
                child.labelTextSize = THEMEING_TEXT_SIZES.xs;
                (0, exports.addPropertyToDynamicPropertyPathList)("labelTextSize", child);
                break;
            case TextSizes.PARAGRAPH:
                child.labelTextSize = THEMEING_TEXT_SIZES.sm;
                break;
            case TextSizes.HEADING3:
                child.labelTextSize = THEMEING_TEXT_SIZES.base;
                break;
            case TextSizes.HEADING2:
                child.labelTextSize = THEMEING_TEXT_SIZES.md;
                (0, exports.addPropertyToDynamicPropertyPathList)("labelTextSize", child);
                break;
            case TextSizes.HEADING1:
                child.labelTextSize = THEMEING_TEXT_SIZES.lg;
                (0, exports.addPropertyToDynamicPropertyPathList)("labelTextSize", child);
                break;
            default:
                child.labelTextSize = THEMEING_TEXT_SIZES.sm;
        }
        /**
         * Add primaryColor color to missing widgets
         */
        if (widgetsWithPrimaryColorProp.includes(child.type)) {
            child.accentColor = "{{appsmith.theme.colors.primaryColor}}";
            child.dynamicBindingPathList = [
                ...(child.dynamicBindingPathList || []),
                {
                    key: "accentColor",
                },
            ];
        }
        // specific fixes
        if (child.type === "AUDIO_RECORDER_WIDGET") {
            child.borderRadius = THEMING_BORDER_RADIUS.circle;
            child.accentColor = child.backgroundColor;
        }
        if (child.type === "FILE_PICKER_WIDGET_V2") {
            child.buttonColor = Colors.GREEN;
        }
        if (child.type === "CHECKBOX_WIDGET" ||
            child.type === "CHECKBOX_GROUP_WIDGET" ||
            child.type === "SWITCH_WIDGET" ||
            child.type === "SWITCH_GROUP_WIDGET") {
            child.accentColor = Colors.GREEN;
        }
        if (child.type === "TEXT_WIDGET") {
            child.fontFamily = "System Default";
        }
        // Adds childStyleSheets
        switch (child.type) {
            case "BUTTON_GROUP_WIDGET":
                child.childStylesheet = exports.BUTTON_GROUP_CHILD_STYLESHEET;
                break;
            case "JSON_FORM_WIDGET":
                child.childStylesheet = exports.JSON_FORM_WIDGET_CHILD_STYLESHEET;
                break;
            case "TABLE_WIDGET":
                child.childStylesheet = exports.TABLE_WIDGET_CHILD_STYLESHEET;
                break;
        }
        if (child.children && child.children.length > 0) {
            child = (0, exports.migrateStylingPropertiesForTheming)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migrateStylingPropertiesForTheming = migrateStylingPropertiesForTheming;
//# sourceMappingURL=057-migrate-styling-properties-for-theming.js.map