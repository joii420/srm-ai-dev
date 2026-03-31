import type { DSLWidget } from "../types";
export declare enum TextSizes {
    HEADING1 = "HEADING1",
    HEADING2 = "HEADING2",
    HEADING3 = "HEADING3",
    PARAGRAPH = "PARAGRAPH",
    PARAGRAPH2 = "PARAGRAPH2"
}
export declare const BUTTON_GROUP_CHILD_STYLESHEET: {
    button: {
        buttonColor: string;
    };
};
export declare const TABLE_WIDGET_CHILD_STYLESHEET: {
    button: {
        buttonColor: string;
        borderRadius: string;
        boxShadow: string;
    };
    menuButton: {
        menuColor: string;
        borderRadius: string;
        boxShadow: string;
    };
    iconButton: {
        menuColor: string;
        borderRadius: string;
        boxShadow: string;
    };
};
export declare const JSON_FORM_WIDGET_CHILD_STYLESHEET: {
    ARRAY: {
        accentColor: string;
        borderRadius: string;
        boxShadow: string;
        cellBorderRadius: string;
        cellBoxShadow: string;
    };
    OBJECT: {
        borderRadius: string;
        boxShadow: string;
        cellBorderRadius: string;
        cellBoxShadow: string;
    };
    CHECKBOX: {
        accentColor: string;
        borderRadius: string;
    };
    CURRENCY_INPUT: {
        accentColor: string;
        borderRadius: string;
        boxShadow: string;
    };
    DATEPICKER: {
        accentColor: string;
        borderRadius: string;
        boxShadow: string;
    };
    EMAIL_INPUT: {
        accentColor: string;
        borderRadius: string;
        boxShadow: string;
    };
    MULTISELECT: {
        accentColor: string;
        borderRadius: string;
        boxShadow: string;
    };
    MULTILINE_TEXT_INPUT: {
        accentColor: string;
        borderRadius: string;
        boxShadow: string;
    };
    NUMBER_INPUT: {
        accentColor: string;
        borderRadius: string;
        boxShadow: string;
    };
    PASSWORD_INPUT: {
        accentColor: string;
        borderRadius: string;
        boxShadow: string;
    };
    PHONE_NUMBER_INPUT: {
        accentColor: string;
        borderRadius: string;
        boxShadow: string;
    };
    RADIO_GROUP: {
        accentColor: string;
        boxShadow: string;
    };
    SELECT: {
        accentColor: string;
        borderRadius: string;
        boxShadow: string;
    };
    SWITCH: {
        accentColor: string;
        boxShadow: string;
    };
    TEXT_INPUT: {
        accentColor: string;
        borderRadius: string;
        boxShadow: string;
    };
};
/**
 * Recursive function to traverse through all the children of the JSON form in theming migration.
 * @param schemaItem
 * @param propertyPath
 * @param callback
 */
export declare const parseSchemaItem: (schemaItem: any, propertyPath: string, callback: (schemaItem: any, propertyPath: string) => void) => void;
/**
 * This function will add the given propertyName into the dynamicPropertyPathList.
 * @param propertyName
 * @param child
 */
export declare const addPropertyToDynamicPropertyPathList: (propertyName: string, child: DSLWidget) => void;
export declare const migrateStylingPropertiesForTheming: (currentDSL: DSLWidget) => DSLWidget;
//# sourceMappingURL=057-migrate-styling-properties-for-theming.d.ts.map