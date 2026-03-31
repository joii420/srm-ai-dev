"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateIncorrectDynamicBindingPathLists = exports.addSearchConfigToPanelConfig = exports.generatePropertyPaneSearchConfig = exports.addPropertyConfigIds = exports.convertFunctionsToString = exports.PropertyPaneConfigTemplates = exports.WidgetHeightLimits = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const flow_1 = __importDefault(require("lodash/flow"));
const loglevel_1 = __importDefault(require("loglevel"));
const get_1 = __importDefault(require("lodash/get"));
const isString_1 = __importDefault(require("lodash/isString"));
const _microMemoize = __importStar(require("micro-memoize"));
const memoize = _microMemoize.memoize || _microMemoize.default || _microMemoize;
const lodash_1 = require("lodash");
const utils_1 = require("../utils");
const widget_configs_json_1 = __importDefault(require("../helpers/widget-configs.json"));
exports.WidgetHeightLimits = {
    MAX_HEIGHT_IN_ROWS: 9000,
    MIN_HEIGHT_IN_ROWS: 4,
    MIN_CANVAS_HEIGHT_IN_ROWS: 10,
};
function updateMinMaxDynamicHeight(props, propertyName, propertyValue) {
    const updates = [
        {
            propertyPath: propertyName,
            propertyValue: propertyValue,
        },
    ];
    if (propertyValue === "AUTO_HEIGHT_WITH_LIMITS") {
        const minDynamicHeight = parseInt(props.minDynamicHeight, 10);
        if (isNaN(minDynamicHeight) ||
            minDynamicHeight < exports.WidgetHeightLimits.MIN_HEIGHT_IN_ROWS) {
            updates.push({
                propertyPath: "minDynamicHeight",
                propertyValue: exports.WidgetHeightLimits.MIN_HEIGHT_IN_ROWS,
            });
        }
        const maxDynamicHeight = parseInt(props.maxDynamicHeight, 10);
        if (isNaN(maxDynamicHeight) ||
            maxDynamicHeight === exports.WidgetHeightLimits.MAX_HEIGHT_IN_ROWS ||
            maxDynamicHeight <= exports.WidgetHeightLimits.MIN_HEIGHT_IN_ROWS) {
            updates.push({
                propertyPath: "maxDynamicHeight",
                propertyValue: props.bottomRow - props.topRow + 2,
            });
        }
        // Case where maxDynamicHeight is zero
        if (isNaN(maxDynamicHeight) || maxDynamicHeight === 0) {
            updates.push({
                propertyPath: "maxDynamicHeight",
                propertyValue: props.bottomRow - props.topRow,
            });
        }
    }
    else if (propertyValue === "AUTO_HEIGHT") {
        const minHeightInRows = props.isCanvas
            ? exports.WidgetHeightLimits.MIN_CANVAS_HEIGHT_IN_ROWS
            : exports.WidgetHeightLimits.MIN_HEIGHT_IN_ROWS;
        updates.push({
            propertyPath: "minDynamicHeight",
            propertyValue: minHeightInRows,
        }, {
            propertyPath: "maxDynamicHeight",
            propertyValue: exports.WidgetHeightLimits.MAX_HEIGHT_IN_ROWS,
        });
    }
    if (propertyValue === "FIXED") {
        updates.push({
            propertyPath: "originalBottomRow",
            propertyValue: undefined,
        });
        updates.push({
            propertyPath: "originalTopRow",
            propertyValue: undefined,
        });
    }
    // The following are updates which apply to specific widgets.
    if (propertyValue === "AUTO_HEIGHT" ||
        propertyValue === "AUTO_HEIGHT_WITH_LIMITS") {
        if (props.dynamicHeight === "FIXED") {
            updates.push({
                propertyPath: "originalBottomRow",
                propertyValue: props.bottomRow,
            });
            updates.push({
                propertyPath: "originalTopRow",
                propertyValue: props.topRow,
            });
        }
        if (!props.shouldScrollContents) {
            updates.push({
                propertyPath: "shouldScrollContents",
                propertyValue: true,
            });
        }
        if (props.overflow !== undefined) {
            updates.push({
                propertyPath: "overflow",
                propertyValue: "NONE",
            });
        }
        if (props.scrollContents === true) {
            updates.push({
                propertyPath: "scrollContents",
                propertyValue: false,
            });
        }
        if (props.fixedFooter === true) {
            updates.push({
                propertyPath: "fixedFooter",
                propertyValue: false,
            });
        }
    }
    return updates;
}
exports.PropertyPaneConfigTemplates = {
    dynamicHeight: [
        {
            helpText: "Auto Height: Configure the way the widget height reacts to content changes.",
            propertyName: "dynamicHeight",
            label: "Height",
            controlType: "DROP_DOWN",
            isBindProperty: false,
            isTriggerProperty: false,
            dependencies: [
                "shouldScrollContents",
                "maxDynamicHeight",
                "minDynamicHeight",
                "bottomRow",
                "topRow",
                "overflow",
                "dynamicHeight",
                "isCanvas",
            ],
            updateHook: updateMinMaxDynamicHeight,
            helperText: (props) => {
                return props.isCanvas && props.dynamicHeight === "AUTO_HEIGHT"
                    ? "This widget shows an internal scroll when you add widgets in edit mode. It'll resize after you've added widgets. The scroll won't exist in view mode."
                    : "";
            },
            options: [
                {
                    label: "Auto Height",
                    value: "AUTO_HEIGHT",
                },
                {
                    label: "Auto Height with limits",
                    value: "AUTO_HEIGHT_WITH_LIMITS",
                },
                {
                    label: "Fixed",
                    value: "FIXED",
                },
            ],
            postUpdateAction: "CHECK_CONTAINERS_FOR_AUTO_HEIGHT",
        },
    ],
};
function findAndUpdatePropertyPaneControlConfig(config, propertyPaneUpdates) {
    return config.map((sectionConfig) => {
        if (Array.isArray(sectionConfig.children) &&
            sectionConfig.children.length > 0) {
            Object.keys(propertyPaneUpdates).forEach((propertyName) => {
                const controlConfigIndex = sectionConfig.children?.findIndex((controlConfig) => controlConfig.propertyName === propertyName);
                if (controlConfigIndex !== undefined &&
                    controlConfigIndex > -1 &&
                    sectionConfig.children) {
                    sectionConfig.children[controlConfigIndex] = {
                        ...sectionConfig.children[controlConfigIndex],
                        ...propertyPaneUpdates[propertyName],
                    };
                }
            });
        }
        return sectionConfig;
    });
}
const WidgetFeaturePropertyPaneEnhancements = {
    dynamicHeight: (config, widgetType) => {
        function hideWhenDynamicHeightIsEnabled(props) {
            return (props.dynamicHeight === "AUTO_HEIGHT_WITH_LIMITS" ||
                props.dynamicHeight === "AUTO_HEIGHT");
        }
        let update = findAndUpdatePropertyPaneControlConfig(config, {
            shouldScrollContents: {
                hidden: hideWhenDynamicHeightIsEnabled,
                dependencies: ["dynamicHeight"],
            },
            scrollContents: {
                hidden: hideWhenDynamicHeightIsEnabled,
                dependencies: ["dynamicHeight"],
            },
            fixedFooter: {
                hidden: hideWhenDynamicHeightIsEnabled,
                dependencies: ["dynamicHeight"],
            },
            overflow: {
                hidden: hideWhenDynamicHeightIsEnabled,
                dependencies: ["dynamicHeight"],
            },
        });
        if (widgetType === "MODAL_WIDGET" || widgetType === "DRAWER_WIDGET") {
            update = findAndUpdatePropertyPaneControlConfig(update, {
                dynamicHeight: {
                    options: [
                        {
                            label: "Auto Height",
                            value: "AUTO_HEIGHT",
                        },
                        {
                            label: "Fixed",
                            value: "FIXED",
                        },
                    ],
                },
            });
        }
        return update;
    },
};
function enhancePropertyPaneConfig(config, features, configType, widgetType) {
    // Enhance property pane with widget features
    // TODO(abhinav): The following "configType" check should come
    // from the features themselves.
    if (features && (configType === undefined || configType === "CONTENT")) {
        Object.keys(features).forEach((registeredFeature) => {
            const { sectionIndex } = features[registeredFeature];
            const sectionName = config[sectionIndex]?.sectionName;
            // This has been designed to check if the sectionIndex provided in the
            // features configuration of the widget to point to the section named "General"
            // If not, it logs an error
            // This is a sanity check, and doesn't effect the functionality of the feature
            // For consistency, we expect that all "Auto Height" property pane controls
            // be present in the "General" section of the property pane
            if (!sectionName || sectionName !== "General") {
                loglevel_1.default.error(`Invalid section index for feature: ${registeredFeature} in widget: ${widgetType}`);
            }
            if (Array.isArray(config[sectionIndex].children) &&
                exports.PropertyPaneConfigTemplates[registeredFeature]) {
                config[sectionIndex].children?.push(...exports.PropertyPaneConfigTemplates[registeredFeature]);
                config = WidgetFeaturePropertyPaneEnhancements[registeredFeature](config, widgetType);
            }
        });
    }
    return config;
}
function convertFunctionsToString(config) {
    return config.map((sectionOrControlConfig) => {
        const controlConfig = sectionOrControlConfig;
        if (controlConfig.validation &&
            controlConfig.validation?.type === "FUNCTION" &&
            controlConfig.validation?.params &&
            controlConfig.validation?.params.fn) {
            controlConfig.validation.params.fnString =
                controlConfig.validation.params.fn.toString();
            delete controlConfig.validation.params.fn;
            return sectionOrControlConfig;
        }
        if (sectionOrControlConfig.children) {
            sectionOrControlConfig.children = convertFunctionsToString(sectionOrControlConfig.children);
        }
        const config = sectionOrControlConfig;
        if (config.panelConfig &&
            config.panelConfig.children &&
            Array.isArray(config.panelConfig.children)) {
            config.panelConfig.children = convertFunctionsToString(config.panelConfig.children);
            sectionOrControlConfig = config;
        }
        if (config.panelConfig &&
            config.panelConfig.contentChildren &&
            Array.isArray(config.panelConfig.contentChildren)) {
            config.panelConfig.contentChildren = convertFunctionsToString(config.panelConfig.contentChildren);
            sectionOrControlConfig = config;
        }
        if (config.panelConfig &&
            config.panelConfig.styleChildren &&
            Array.isArray(config.panelConfig.styleChildren)) {
            config.panelConfig.styleChildren = convertFunctionsToString(config.panelConfig.styleChildren);
            sectionOrControlConfig = config;
        }
        return sectionOrControlConfig;
    });
}
exports.convertFunctionsToString = convertFunctionsToString;
const addPropertyConfigIds = (config) => {
    return config.map((sectionOrControlConfig) => {
        sectionOrControlConfig.id = (0, utils_1.generateReactKey)();
        if (sectionOrControlConfig.children) {
            sectionOrControlConfig.children = (0, exports.addPropertyConfigIds)(sectionOrControlConfig.children);
        }
        const config = sectionOrControlConfig;
        if (config.panelConfig) {
            if (config.panelConfig.children &&
                Array.isArray(config.panelConfig.children)) {
                config.panelConfig.children = (0, exports.addPropertyConfigIds)(config.panelConfig.children);
            }
            if (config.panelConfig.contentChildren &&
                Array.isArray(config.panelConfig.contentChildren)) {
                config.panelConfig.contentChildren = (0, exports.addPropertyConfigIds)(config.panelConfig.contentChildren);
            }
            if (config.panelConfig.styleChildren &&
                Array.isArray(config.panelConfig.styleChildren)) {
                config.panelConfig.styleChildren = (0, exports.addPropertyConfigIds)(config.panelConfig.styleChildren);
            }
            sectionOrControlConfig = config;
        }
        return sectionOrControlConfig;
    });
};
exports.addPropertyConfigIds = addPropertyConfigIds;
function addSearchSpecificPropertiesToConfig(config, tag) {
    return config.map((configItem) => {
        if (configItem.sectionName) {
            const sectionConfig = {
                ...configItem,
                collapsible: false,
                tag,
            };
            if (configItem.children) {
                sectionConfig.children = addSearchSpecificPropertiesToConfig(configItem.children, tag);
            }
            return sectionConfig;
        }
        else if (configItem.controlType) {
            const controlConfig = configItem;
            if (controlConfig.panelConfig) {
                return {
                    ...controlConfig,
                    panelConfig: {
                        ...controlConfig.panelConfig,
                        searchConfig: generatePropertyPaneSearchConfig(controlConfig.panelConfig?.contentChildren ?? [], controlConfig.panelConfig?.styleChildren ?? []),
                    },
                };
            }
            return controlConfig;
        }
        return configItem;
    });
}
function generatePropertyPaneSearchConfig(contentConfig, styleConfig) {
    return [
        ...addSearchSpecificPropertiesToConfig(contentConfig, "CONTENT"),
        ...addSearchSpecificPropertiesToConfig(styleConfig, "STYLE"),
    ];
}
exports.generatePropertyPaneSearchConfig = generatePropertyPaneSearchConfig;
function addSearchConfigToPanelConfig(config) {
    return config.map((configItem) => {
        if (configItem.sectionName) {
            const sectionConfig = {
                ...configItem,
            };
            if (configItem.children) {
                sectionConfig.children = addSearchConfigToPanelConfig(configItem.children);
            }
            return sectionConfig;
        }
        else if (configItem.controlType) {
            const controlConfig = configItem;
            if (controlConfig.panelConfig) {
                return {
                    ...controlConfig,
                    panelConfig: {
                        ...controlConfig.panelConfig,
                        searchConfig: generatePropertyPaneSearchConfig(controlConfig.panelConfig?.contentChildren ?? [], controlConfig.panelConfig?.styleChildren ?? []),
                    },
                };
            }
            return controlConfig;
        }
        return configItem;
    });
}
exports.addSearchConfigToPanelConfig = addSearchConfigToPanelConfig;
const getWidgetPropertyPaneContentConfig = (type) => {
    const propertyPaneContentConfig = widget_configs_json_1.default[type]
        .propertyPaneContentConfig;
    const features = widget_configs_json_1.default[type].features;
    if (propertyPaneContentConfig) {
        const enhance = (0, flow_1.default)([
            enhancePropertyPaneConfig,
            convertFunctionsToString,
            exports.addPropertyConfigIds,
            addSearchConfigToPanelConfig,
            Object.freeze,
        ]);
        const enhancedPropertyPaneContentConfig = enhance(propertyPaneContentConfig, features, "CONTENT", type);
        return enhancedPropertyPaneContentConfig;
    }
    else {
        return [];
    }
};
const getWidgetPropertyPaneStyleConfig = (type) => {
    const propertyPaneStyleConfig = widget_configs_json_1.default[type]
        .propertyPaneStyleConfig;
    const features = widget_configs_json_1.default[type].features;
    if (propertyPaneStyleConfig) {
        const enhance = (0, flow_1.default)([
            enhancePropertyPaneConfig,
            convertFunctionsToString,
            exports.addPropertyConfigIds,
            addSearchConfigToPanelConfig,
            Object.freeze,
        ]);
        const enhancedPropertyPaneConfig = enhance(propertyPaneStyleConfig, features, "STYLE");
        return enhancedPropertyPaneConfig;
    }
    else {
        return [];
    }
};
const getWidgetPropertyPaneCombinedConfig = (type) => {
    const contentConfig = getWidgetPropertyPaneContentConfig(type);
    const styleConfig = getWidgetPropertyPaneStyleConfig(type);
    return [...contentConfig, ...styleConfig];
};
const getWidgetPropertyPaneConfig = (type) => {
    const propertyPaneConfig = widget_configs_json_1.default[type].propertyPaneConfig;
    const features = widget_configs_json_1.default[type].features;
    if (Array.isArray(propertyPaneConfig) && propertyPaneConfig.length > 0) {
        const enhance = (0, flow_1.default)([
            enhancePropertyPaneConfig,
            convertFunctionsToString,
            exports.addPropertyConfigIds,
            Object.freeze,
        ]);
        const enhancedPropertyPaneConfig = enhance(propertyPaneConfig, features);
        return enhancedPropertyPaneConfig;
    }
    else {
        const config = getWidgetPropertyPaneCombinedConfig(type);
        if (config === undefined) {
            loglevel_1.default.error("Widget property pane config not defined", type);
            return [];
        }
        else {
            return config;
        }
    }
};
const checkPathsInConfig = (config, path) => {
    const configBindingPaths = {};
    const configTriggerPaths = {};
    const configValidationPaths = {};
    // Purely a Binding Path
    if (config.isBindProperty && !config.isTriggerProperty) {
        configBindingPaths[path] = config.evaluationSubstitutionType || "TEMPLATE";
        if (config.validation) {
            configValidationPaths[path] = config.validation;
        }
    }
    else if (config.isBindProperty && config.isTriggerProperty) {
        configTriggerPaths[path] = true;
    }
    return {
        configBindingPaths,
        configReactivePaths: configBindingPaths,
        configTriggerPaths,
        configValidationPaths,
    };
};
const childHasPanelConfig = (config, widget, basePath, originalWidget) => {
    const panelPropertyPath = config.propertyName;
    const widgetPanelPropertyValues = (0, get_1.default)(widget, panelPropertyPath);
    let bindingPaths = {};
    let reactivePaths = {};
    let triggerPaths = {};
    let validationPaths = {};
    if (widgetPanelPropertyValues) {
        Object.values(widgetPanelPropertyValues).forEach((widgetPanelPropertyValue) => {
            const { panelIdPropertyName } = config.panelConfig;
            const propertyPath = `${basePath}.${widgetPanelPropertyValue[panelIdPropertyName]}`;
            let panelConfigChildren = [
                ...(config.panelConfig.contentChildren || []),
                ...(config.panelConfig.styleChildren || []),
            ];
            if (panelConfigChildren.length === 0)
                panelConfigChildren = config.panelConfig.children;
            panelConfigChildren.forEach((panelColumnConfig) => {
                let isSectionHidden = false;
                if ("hidden" in panelColumnConfig) {
                    isSectionHidden = panelColumnConfig.hidden(originalWidget, propertyPath);
                }
                if (!isSectionHidden) {
                    panelColumnConfig.children.forEach((panelColumnControlOrSectionConfig) => {
                        if (panelColumnControlOrSectionConfig.sectionName !== undefined) {
                            panelColumnControlOrSectionConfig.children.forEach((panelColumnControlConfig) => {
                                const panelPropertyConfigPath = `${propertyPath}.${panelColumnControlConfig.propertyName}`;
                                let isControlHidden = false;
                                if ("hidden" in panelColumnControlConfig) {
                                    isControlHidden = panelColumnControlConfig.hidden(originalWidget, panelPropertyConfigPath);
                                }
                                if (!isControlHidden) {
                                    const { configBindingPaths, configReactivePaths, configTriggerPaths, configValidationPaths, } = checkPathsInConfig(panelColumnControlConfig, panelPropertyConfigPath);
                                    bindingPaths = {
                                        ...configBindingPaths,
                                        ...bindingPaths,
                                    };
                                    reactivePaths = {
                                        ...configReactivePaths,
                                        ...reactivePaths,
                                    };
                                    triggerPaths = {
                                        ...configTriggerPaths,
                                        ...triggerPaths,
                                    };
                                    validationPaths = {
                                        ...configValidationPaths,
                                        ...validationPaths,
                                    };
                                    // Has child Panel Config
                                    if (panelColumnControlConfig.panelConfig) {
                                        const { bindingPaths: panelBindingPaths, reactivePaths: panelReactivePaths, triggerPaths: panelTriggerPaths, validationPaths: panelValidationPaths, } = childHasPanelConfig(panelColumnControlConfig, widgetPanelPropertyValue, panelPropertyConfigPath, originalWidget);
                                        bindingPaths = {
                                            ...panelBindingPaths,
                                            ...bindingPaths,
                                        };
                                        reactivePaths = {
                                            ...panelReactivePaths,
                                            ...reactivePaths,
                                        };
                                        triggerPaths = {
                                            ...panelTriggerPaths,
                                            ...triggerPaths,
                                        };
                                        validationPaths = {
                                            ...panelValidationPaths,
                                            ...validationPaths,
                                        };
                                    }
                                }
                            });
                        }
                        else {
                            const panelPropertyConfigPath = `${propertyPath}.${panelColumnControlOrSectionConfig.propertyName}`;
                            let isControlHidden = false;
                            if ("hidden" in panelColumnControlOrSectionConfig) {
                                isControlHidden = panelColumnControlOrSectionConfig.hidden(originalWidget, panelPropertyConfigPath);
                            }
                            if (!isControlHidden) {
                                const { configBindingPaths, configReactivePaths, configTriggerPaths, configValidationPaths, } = checkPathsInConfig(panelColumnControlOrSectionConfig, panelPropertyConfigPath);
                                bindingPaths = {
                                    ...configBindingPaths,
                                    ...bindingPaths,
                                };
                                reactivePaths = {
                                    ...configReactivePaths,
                                    ...reactivePaths,
                                };
                                triggerPaths = { ...configTriggerPaths, ...triggerPaths };
                                validationPaths = {
                                    ...configValidationPaths,
                                    ...validationPaths,
                                };
                                // Has child Panel Config
                                if (panelColumnControlOrSectionConfig.panelConfig) {
                                    const { bindingPaths: panelBindingPaths, reactivePaths: panelReactivePaths, triggerPaths: panelTriggerPaths, validationPaths: panelValidationPaths, } = childHasPanelConfig(panelColumnControlOrSectionConfig, widgetPanelPropertyValue, panelPropertyConfigPath, originalWidget);
                                    bindingPaths = {
                                        ...panelBindingPaths,
                                        ...bindingPaths,
                                    };
                                    reactivePaths = {
                                        ...panelReactivePaths,
                                        ...reactivePaths,
                                    };
                                    triggerPaths = { ...panelTriggerPaths, ...triggerPaths };
                                    validationPaths = {
                                        ...panelValidationPaths,
                                        ...validationPaths,
                                    };
                                }
                            }
                        }
                    });
                }
            });
        });
    }
    return { reactivePaths, triggerPaths, validationPaths, bindingPaths };
};
const getAllPathsFromPropertyConfigWithoutMemo = (widget, widgetConfig, defaultProperties) => {
    let bindingPaths = {};
    let reactivePaths = {};
    Object.keys(defaultProperties).forEach((property) => {
        reactivePaths[property] = "TEMPLATE";
    });
    let triggerPaths = {};
    let validationPaths = {};
    widgetConfig.forEach((config) => {
        if (config.children) {
            config.children.forEach((controlConfig) => {
                const basePath = controlConfig.propertyName;
                let isHidden = false;
                if ("hidden" in controlConfig) {
                    isHidden = controlConfig.hidden(widget, basePath);
                }
                if (!isHidden) {
                    const path = controlConfig.propertyName;
                    const { configBindingPaths, configReactivePaths, configTriggerPaths, configValidationPaths, } = checkPathsInConfig(controlConfig, path);
                    bindingPaths = {
                        ...bindingPaths,
                        ...configBindingPaths,
                    };
                    // Update default path configs with the ones in the property config
                    reactivePaths = {
                        ...reactivePaths,
                        ...configReactivePaths,
                    };
                    triggerPaths = { ...triggerPaths, ...configTriggerPaths };
                    validationPaths = { ...validationPaths, ...configValidationPaths };
                }
                // Has child Panel Config
                if (controlConfig.panelConfig) {
                    const resultingPaths = childHasPanelConfig(controlConfig, widget, basePath, widget);
                    bindingPaths = {
                        ...bindingPaths,
                        ...resultingPaths.bindingPaths,
                    };
                    reactivePaths = {
                        ...reactivePaths,
                        ...resultingPaths.reactivePaths,
                    };
                    triggerPaths = { ...triggerPaths, ...resultingPaths.triggerPaths };
                    validationPaths = {
                        ...validationPaths,
                        ...resultingPaths.validationPaths,
                    };
                }
                if (controlConfig.children) {
                    const basePropertyPath = controlConfig.propertyName;
                    const widgetPropertyValue = (0, get_1.default)(widget, basePropertyPath, []);
                    // Property in object structure
                    if (!(0, lodash_1.isUndefined)(widgetPropertyValue) &&
                        (0, lodash_1.isObject)(widgetPropertyValue)) {
                        Object.keys(widgetPropertyValue).forEach((key) => {
                            const objectIndexPropertyPath = `${basePropertyPath}.${key}`;
                            controlConfig.children.forEach((childPropertyConfig) => {
                                const childArrayPropertyPath = `${objectIndexPropertyPath}.${childPropertyConfig.propertyName}`;
                                const { configBindingPaths, configReactivePaths, configTriggerPaths, configValidationPaths, } = checkPathsInConfig(childPropertyConfig, childArrayPropertyPath);
                                bindingPaths = {
                                    ...bindingPaths,
                                    ...configBindingPaths,
                                };
                                reactivePaths = {
                                    ...reactivePaths,
                                    ...configReactivePaths,
                                };
                                triggerPaths = { ...triggerPaths, ...configTriggerPaths };
                                validationPaths = {
                                    ...validationPaths,
                                    ...configValidationPaths,
                                };
                            });
                        });
                    }
                }
            });
        }
    });
    return { reactivePaths, triggerPaths, validationPaths, bindingPaths };
};
const getAllPathsFromPropertyConfig = memoize(getAllPathsFromPropertyConfigWithoutMemo, { maxSize: 1000 });
const migrateIncorrectDynamicBindingPathLists = (currentDSL) => {
    const migratedDsl = {
        ...currentDSL,
    };
    const dynamicBindingPathList = [];
    const propertyPaneConfig = getWidgetPropertyPaneConfig(currentDSL.type);
    const { bindingPaths } = getAllPathsFromPropertyConfig(currentDSL, propertyPaneConfig, {});
    Object.keys(bindingPaths).forEach((bindingPath) => {
        const pathValue = (0, get_1.default)(migratedDsl, bindingPath);
        if (pathValue && (0, isString_1.default)(pathValue)) {
            if ((0, utils_1.isDynamicValue)(pathValue)) {
                dynamicBindingPathList.push({ key: bindingPath });
            }
        }
    });
    migratedDsl.dynamicBindingPathList = dynamicBindingPathList;
    if (currentDSL.children) {
        migratedDsl.children = currentDSL.children.map(exports.migrateIncorrectDynamicBindingPathLists);
    }
    return migratedDsl;
};
exports.migrateIncorrectDynamicBindingPathLists = migrateIncorrectDynamicBindingPathLists;
//# sourceMappingURL=012-migrate-incorrect-dynamic-binding-path-lists.js.map