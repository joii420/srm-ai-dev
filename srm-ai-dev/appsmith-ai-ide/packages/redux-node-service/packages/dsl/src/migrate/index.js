"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateDSL = exports.calculateDynamicHeight = exports.LATEST_DSL_VERSION = void 0;
const transform_1 = require("../transform");
const _001_update_containers_1 = require("./migrations/001-update-containers");
const _002_chart_data_migration_1 = require("./migrations/002-chart-data-migration");
const _003_map_data_migration_1 = require("./migrations/003-map-data-migration");
const _004_single_chart_data_migration_1 = require("./migrations/004-single-chart-data-migration");
const _005_tabs_widget_property_migration_1 = require("./migrations/005-tabs-widget-property-migration");
const _006_dynamic_path_list_migration_1 = require("./migrations/006-dynamic-path-list-migration");
const _007_canvas_name_conflict_migration_1 = require("./migrations/007-canvas-name-conflict-migration");
const _008_renamed_canvas_name_conflict_migration_1 = require("./migrations/008-renamed-canvas-name-conflict-migration");
const _009_table_widget_property_pane_migration_1 = require("./migrations/009-table-widget-property-pane-migration");
const _010_add_version_number_migration_1 = require("./migrations/010-add-version-number-migration");
const _011_migrate_table_primary_columns_binding_1 = require("./migrations/011-migrate-table-primary-columns-binding");
const _012_migrate_incorrect_dynamic_binding_path_lists_1 = require("./migrations/012-migrate-incorrect-dynamic-binding-path-lists");
const _013_migrate_old_chart_data_1 = require("./migrations/013-migrate-old-chart-data");
const _014_rte_default_value_migration_1 = require("./migrations/014-rte-default-value-migration");
const _015_migrate_text_style_from_text_widget_1 = require("./migrations/015-migrate-text-style-from-text-widget");
const _016_migrate_chart_data_from_array_to_object_1 = require("./migrations/016-migrate-chart-data-from-array-to-object");
const _017_migrate_tabs_data_1 = require("./migrations/017-migrate-tabs-data");
const _018_migrate_initial_values_1 = require("./migrations/018-migrate-initial-values");
const _019_migrate_to_new_layout_1 = require("./migrations/019-migrate-to-new-layout");
const _020_migrate_newly_added_tabs_widgets_missing_data_1 = require("./migrations/020-migrate-newly-added-tabs-widgets-missing-data");
const _021_migrate_overflowing_tabs_widgets_1 = require("./migrations/021-migrate-overflowing-tabs-widgets");
const _022_migrate_table_widget_parent_row_space_property_1 = require("./migrations/022-migrate-table-widget-parent-row-space-property");
const _023_add_log_blacklist_to_all_widget_children_1 = require("./migrations/023-add-log-blacklist-to-all-widget-children");
const _024_migrate_table_widget_header_visibility_properties_1 = require("./migrations/024-migrate-table-widget-header-visibility-properties");
const _025_migrate_items_to_list_data_in_list_widget_1 = require("./migrations/025-migrate-items-to-list-data-in-list-widget");
const _026_migrate_datepicker_min_max_date_1 = require("./migrations/026-migrate-datepicker-min-max-date");
const _027_migrate_filter_value_for_dropdown_widget_1 = require("./migrations/027-migrate-filter-value-for-dropdown-widget");
const _028_migrate_table_primary_columns_computed_value_1 = require("./migrations/028-migrate-table-primary-columns-computed-value");
const _029_migrate_to_new_multiselect_1 = require("./migrations/029-migrate-to-new-multiselect");
const _030_migrate_table_widget_delimiter_properties_1 = require("./migrations/030-migrate-table-widget-delimiter-properties");
const _031_migrate_is_disabled_to_button_column_1 = require("./migrations/031-migrate-is-disabled-to-button-column");
const _032_migrate_table_default_selected_row_1 = require("./migrations/032-migrate-table-default-selected-row");
const _033_migrate_menu_button_widget_button_properties_1 = require("./migrations/033-migrate-menu-button-widget-button-properties");
const _034_migrate_button_widget_validation_1 = require("./migrations/034-migrate-button-widget-validation");
const _035_migrate_input_validation_1 = require("./migrations/035-migrate-input-validation");
const _036_revert_table_default_selected_row_1 = require("./migrations/036-revert-table-default-selected-row");
const _037_migrate_table_sanitize_column_keys_1 = require("./migrations/037-migrate-table-sanitize-column-keys");
const _038_migrate_resizable_modal_widget_properties_1 = require("./migrations/038-migrate-resizable-modal-widget-properties");
const _039_migrate_table_widget_selected_row_bindings_1 = require("./migrations/039-migrate-table-widget-selected-row-bindings");
const _040_revert_button_style_to_button_color_1 = require("./migrations/040-revert-button-style-to-button-color");
const _041_migrate_button_variant_1 = require("./migrations/041-migrate-button-variant");
const _042_migrate_map_widget_is_clicked_marker_centered_1 = require("./migrations/042-migrate-map-widget-is-clicked-marker-centered");
const _043_map_allow_horizontal_scroll_mirgation_1 = require("./migrations/043-map-allow-horizontal-scroll-mirgation");
const _044_is_sortable_migration_1 = require("./migrations/044-is-sortable-migration");
const _045_migrate_table_widget_icon_button_variant_1 = require("./migrations/045-migrate-table-widget-icon-button-variant");
const _046_migrate_checkbox_group_widget_inline_property_1 = require("./migrations/046-migrate-checkbox-group-widget-inline-property");
const _048_migrate_recaptcha_type_1 = require("./migrations/048-migrate-recaptcha-type");
const _049_add_private_widgets_to_all_list_widgets_1 = require("./migrations/049-add-private-widgets-to-all-list-widgets");
const _051_migrate_phone_input_widget_allow_formatting_1 = require("./migrations/051-migrate-phone-input-widget-allow-formatting");
const _052_migrate_modal_icon_button_widget_1 = require("./migrations/052-migrate-modal-icon-button-widget");
const _053_migrate_scroll_truncate_property_1 = require("./migrations/053-migrate-scroll-truncate-property");
const _054_migrate_phone_input_widget_default_dial_code_1 = require("./migrations/054-migrate-phone-input-widget-default-dial-code");
const _055_migrate_currency_input_widget_default_currency_code_1 = require("./migrations/055-migrate-currency-input-widget-default-currency-code");
const _056_migrate_radio_group_alignment_property_1 = require("./migrations/056-migrate-radio-group-alignment-property");
const _057_migrate_styling_properties_for_theming_1 = require("./migrations/057-migrate-styling-properties-for-theming");
const _058_migrate_checkbox_switch_property_1 = require("./migrations/058-migrate-checkbox-switch-property");
const _059_migrate_chart_widget_reskinning_data_1 = require("./migrations/059-migrate-chart-widget-reskinning-data");
const _060_migrate_table_widget_v2_validation_1 = require("./migrations/060-migrate-table-widget-v2-validation");
const _062_migrate_select_type_widget_default_value_1 = require("./migrations/062-migrate-select-type-widget-default-value");
const _063_migrate_map_chart_widget_reskinning_data_1 = require("./migrations/063-migrate-map-chart-widget-reskinning-data");
const _064_migrate_rate_widget_disabed_state_1 = require("./migrations/064-migrate-rate-widget-disabed-state");
const _065_migrate_code_scanner_layout_1 = require("./migrations/065-migrate-code-scanner-layout");
const _066_migrate_table_widget_v2_validation_binding_1 = require("./migrations/066-migrate-table-widget-v2-validation-binding");
const _067_migrate_label_position_1 = require("./migrations/067-migrate-label-position");
const _068_migrate_properties_for_dynamic_height_1 = require("./migrations/068-migrate-properties-for-dynamic-height");
const _069_migrate_menu_button_dynamic_items_1 = require("./migrations/069-migrate-menu-button-dynamic-items");
const _070_migrate_child_stylesheet_from_dynamic_binding_path_list_1 = require("./migrations/070-migrate-child-stylesheet-from-dynamic-binding-path-list");
const _071_migrate_table_widget_v2_select_option_1 = require("./migrations/071-migrate-table-widget-v2-select-option");
const _072_migrate_list_widget_children_for_auto_height_1 = require("./migrations/072-migrate-list-widget-children-for-auto-height");
const _073_mirgate_input_widget_show_step_arrows_1 = require("./migrations/073-mirgate-input-widget-show-step-arrows");
const _074_migrate_mwnu_button_dynamic_items_inside_table_widget_1 = require("./migrations/074-migrate-mwnu-button-dynamic-items-inside-table-widget");
const _075_migrate_input_widgets_multiline_input_type_1 = require("./migrations/075-migrate-input-widgets-multiline-input-type");
const _076_migrate_column_freeze_attributes_1 = require("./migrations/076-migrate-column-freeze-attributes");
const _077_migrate_table_select_option_attributes_for_new_row_1 = require("./migrations/077-migrate-table-select-option-attributes-for-new-row");
const _078_migrate_binding_prefix_suffix_for_inline_edit_validation_control_1 = require("./migrations/078-migrate-binding-prefix-suffix-for-inline-edit-validation-control");
const _079_migrate_table_widget_table_data_js_mode_1 = require("./migrations/079-migrate-table-widget-table-data-js-mode");
const _080_migrate_select_widget_option_to_source_data_1 = require("./migrations/080-migrate-select-widget-option-to-source-data");
const _081_migrate_select_widget_source_data_binding_path_list_1 = require("./migrations/081-migrate-select-widget-source-data-binding-path-list");
const _082_migrate_chart_widget_label_orientation_stagger_option_1 = require("./migrations/082-migrate-chart-widget-label-orientation-stagger-option");
const _083_migrate_add_show_hide_data_point_labels_1 = require("./migrations/083-migrate-add-show-hide-data-point-labels");
const _084_migrate_select_widget_add_source_data_property_path_list_1 = require("./migrations/084-migrate-select-widget-add-source-data-property-path-list");
const _085_migrate_default_values_for_custom_echart_1 = require("./migrations/085-migrate-default-values-for-custom-echart");
const _086_migrate_table_server_side_filtering_1 = require("./migrations/086-migrate-table-server-side-filtering");
const _087_migrate_chart_widget_customechartdata_1 = require("./migrations/087-migrate-chart-widget-customechartdata");
const _088_migrate_custom_widget_dynamic_height_1 = require("./migrations/088-migrate-custom-widget-dynamic-height");
exports.LATEST_DSL_VERSION = 89;
const calculateDynamicHeight = () => {
    const DEFAULT_GRID_ROW_HEIGHT = 10;
    const screenHeight = typeof window !== "undefined" ? window.innerHeight : 600;
    const gridRowHeight = DEFAULT_GRID_ROW_HEIGHT;
    // DGRH - DEFAULT_GRID_ROW_HEIGHT
    // View Mode: Header height + Page Selection Tab = 8 * DGRH (approx)
    // Edit Mode: Header height + Canvas control = 8 * DGRH (approx)
    // buffer: ~8 grid row height
    const buffer = gridRowHeight +
        2 * 48 /*pixelToNumber(theme.smallHeaderHeight) */ +
        37; /*pixelToNumber(theme.bottomBarHeight);*/
    const calculatedMinHeight = Math.floor((screenHeight - buffer) / gridRowHeight) * gridRowHeight;
    return calculatedMinHeight;
};
exports.calculateDynamicHeight = calculateDynamicHeight;
const migrateUnversionedDSL = (currentDSL) => {
    const DEFAULT_GRID_ROW_HEIGHT = 10;
    if (currentDSL.version === undefined) {
        // Since this top level widget is a CANVAS_WIDGET,
        // DropTargetComponent needs to know the minimum height the canvas can take
        // See DropTargetUtils.ts
        currentDSL.minHeight = (0, exports.calculateDynamicHeight)();
        currentDSL.bottomRow = currentDSL.minHeight - DEFAULT_GRID_ROW_HEIGHT;
        // For the first time the DSL is created, remove one row from the total possible rows
        // to adjust for padding and margins.
        currentDSL.snapRows =
            Math.floor(currentDSL.bottomRow / DEFAULT_GRID_ROW_HEIGHT) - 1;
        // Force the width of the canvas to 1224 px
        currentDSL.rightColumn = 1224;
        // The canvas is a CANVAS_WIDGET which doesn't have a background or borders by default
        currentDSL.backgroundColor = "none";
        currentDSL.containerStyle = "none";
        currentDSL.type = "CANVAS_WIDGET";
        currentDSL.detachFromLayout = true;
        currentDSL.canExtend = true;
        // Update version to make sure this doesn't run every time.
        currentDSL.version = 1;
    }
    return currentDSL;
};
// A rudimentary transform function which updates the DSL based on its version.
// A more modular approach needs to be designed.
// This needs the widget config to be already built to migrate correctly
const migrateVersionedDSL = (currentDSL, newPage = false) => {
    if (currentDSL.version === 1) {
        if (currentDSL.children && currentDSL.children.length > 0)
            currentDSL.children = currentDSL.children.map(_001_update_containers_1.updateContainers);
        currentDSL.version = 2;
    }
    if (currentDSL.version === 2) {
        currentDSL = (0, _002_chart_data_migration_1.chartDataMigration)(currentDSL);
        currentDSL.version = 3;
    }
    if (currentDSL.version === 3) {
        currentDSL = (0, _003_map_data_migration_1.mapDataMigration)(currentDSL);
        currentDSL.version = 4;
    }
    if (currentDSL.version === 4) {
        currentDSL = (0, _004_single_chart_data_migration_1.singleChartDataMigration)(currentDSL);
        currentDSL.version = 5;
    }
    if (currentDSL.version === 5) {
        currentDSL = (0, _005_tabs_widget_property_migration_1.tabsWidgetTabsPropertyMigration)(currentDSL);
        currentDSL.version = 6;
    }
    if (currentDSL.version === 6) {
        currentDSL = (0, _006_dynamic_path_list_migration_1.dynamicPathListMigration)(currentDSL);
        currentDSL.version = 7;
    }
    if (currentDSL.version === 7) {
        currentDSL = (0, _007_canvas_name_conflict_migration_1.canvasNameConflictMigration)(currentDSL);
        currentDSL.version = 8;
    }
    if (currentDSL.version === 8) {
        currentDSL = (0, _008_renamed_canvas_name_conflict_migration_1.renamedCanvasNameConflictMigration)(currentDSL);
        currentDSL.version = 9;
    }
    if (currentDSL.version === 9) {
        currentDSL = (0, _009_table_widget_property_pane_migration_1.tableWidgetPropertyPaneMigrations)(currentDSL);
        currentDSL.version = 10;
    }
    if (currentDSL.version === 10) {
        currentDSL = (0, _010_add_version_number_migration_1.addVersionNumberMigration)(currentDSL);
        currentDSL.version = 11;
    }
    if (currentDSL.version === 11) {
        currentDSL = (0, _011_migrate_table_primary_columns_binding_1.migrateTablePrimaryColumnsBindings)(currentDSL);
        currentDSL.version = 12;
    }
    if (currentDSL.version === 12) {
        currentDSL = (0, _012_migrate_incorrect_dynamic_binding_path_lists_1.migrateIncorrectDynamicBindingPathLists)(currentDSL);
        currentDSL.version = 13;
    }
    if (currentDSL.version === 13) {
        currentDSL = (0, _013_migrate_old_chart_data_1.migrateOldChartData)(currentDSL);
        currentDSL.version = 14;
    }
    if (currentDSL.version === 14) {
        currentDSL = (0, _014_rte_default_value_migration_1.rteDefaultValueMigration)(currentDSL);
        currentDSL.version = 15;
    }
    if (currentDSL.version === 15) {
        currentDSL = (0, _015_migrate_text_style_from_text_widget_1.migrateTextStyleFromTextWidget)(currentDSL);
        currentDSL.version = 16;
    }
    if (currentDSL.version === 16) {
        currentDSL = (0, _016_migrate_chart_data_from_array_to_object_1.migrateChartDataFromArrayToObject)(currentDSL);
        currentDSL.version = 17;
    }
    if (currentDSL.version === 17) {
        currentDSL = (0, _017_migrate_tabs_data_1.migrateTabsData)(currentDSL);
        currentDSL.version = 18;
    }
    if (currentDSL.version === 18) {
        currentDSL = (0, _018_migrate_initial_values_1.migrateInitialValues)(currentDSL);
        currentDSL.version = 19;
    }
    if (currentDSL.version === 19) {
        currentDSL.snapColumns = 64; // GridDefaults.DEFAULT_GRID_COLUMNS;
        currentDSL.snapRows = (0, _019_migrate_to_new_layout_1.getCanvasSnapRows)(currentDSL.bottomRow);
        if (!newPage) {
            currentDSL = (0, _019_migrate_to_new_layout_1.migrateToNewLayout)(currentDSL);
        }
        currentDSL.version = 20;
    }
    if (currentDSL.version === 20) {
        currentDSL = (0, _020_migrate_newly_added_tabs_widgets_missing_data_1.migrateNewlyAddedTabsWidgetsMissingData)(currentDSL);
        currentDSL.version = 21;
    }
    if (currentDSL.version === 21) {
        const canvasWidgets = (0, transform_1.flattenDSL)(currentDSL);
        currentDSL = (0, _021_migrate_overflowing_tabs_widgets_1.migrateWidgetsWithoutLeftRightColumns)(currentDSL, canvasWidgets);
        currentDSL = (0, _021_migrate_overflowing_tabs_widgets_1.migrateOverFlowingTabsWidgets)(currentDSL, canvasWidgets);
        currentDSL.version = 22;
    }
    if (currentDSL.version === 22) {
        currentDSL = (0, _022_migrate_table_widget_parent_row_space_property_1.migrateTableWidgetParentRowSpaceProperty)(currentDSL);
        currentDSL.version = 23;
    }
    if (currentDSL.version === 23) {
        currentDSL = (0, _023_add_log_blacklist_to_all_widget_children_1.addLogBlackListToAllListWidgetChildren)(currentDSL);
        currentDSL.version = 24;
    }
    if (currentDSL.version === 24) {
        currentDSL = (0, _024_migrate_table_widget_header_visibility_properties_1.migrateTableWidgetHeaderVisibilityProperties)(currentDSL);
        currentDSL.version = 25;
    }
    if (currentDSL.version === 25) {
        currentDSL = (0, _025_migrate_items_to_list_data_in_list_widget_1.migrateItemsToListDataInListWidget)(currentDSL);
        currentDSL.version = 26;
    }
    if (currentDSL.version === 26) {
        currentDSL = (0, _026_migrate_datepicker_min_max_date_1.migrateDatePickerMinMaxDate)(currentDSL);
        currentDSL.version = 27;
    }
    if (currentDSL.version === 27) {
        currentDSL = (0, _027_migrate_filter_value_for_dropdown_widget_1.migrateFilterValueForDropDownWidget)(currentDSL);
        currentDSL.version = 28;
    }
    if (currentDSL.version === 28) {
        currentDSL = (0, _028_migrate_table_primary_columns_computed_value_1.migrateTablePrimaryColumnsComputedValue)(currentDSL);
        currentDSL.version = 29;
    }
    if (currentDSL.version === 29) {
        currentDSL = (0, _029_migrate_to_new_multiselect_1.migrateToNewMultiSelect)(currentDSL);
        currentDSL.version = 30;
    }
    if (currentDSL.version === 30) {
        currentDSL = (0, _030_migrate_table_widget_delimiter_properties_1.migrateTableWidgetDelimiterProperties)(currentDSL);
        currentDSL.version = 31;
    }
    if (currentDSL.version === 31) {
        currentDSL = (0, _031_migrate_is_disabled_to_button_column_1.migrateIsDisabledToButtonColumn)(currentDSL);
        currentDSL.version = 32;
    }
    if (currentDSL.version === 32) {
        currentDSL = (0, _032_migrate_table_default_selected_row_1.migrateTableDefaultSelectedRow)(currentDSL);
        currentDSL.version = 33;
    }
    if (currentDSL.version === 33) {
        currentDSL = (0, _033_migrate_menu_button_widget_button_properties_1.migrateMenuButtonWidgetButtonProperties)(currentDSL);
        currentDSL.version = 34;
    }
    if (currentDSL.version === 34) {
        currentDSL = (0, _034_migrate_button_widget_validation_1.migrateButtonWidgetValidation)(currentDSL);
        currentDSL.version = 35;
    }
    if (currentDSL.version === 35) {
        currentDSL = (0, _035_migrate_input_validation_1.migrateInputValidation)(currentDSL);
        currentDSL.version = 36;
    }
    if (currentDSL.version === 36) {
        currentDSL = (0, _036_revert_table_default_selected_row_1.revertTableDefaultSelectedRow)(currentDSL);
        currentDSL.version = 37;
    }
    if (currentDSL.version === 37) {
        currentDSL = (0, _037_migrate_table_sanitize_column_keys_1.migrateTableSanitizeColumnKeys)(currentDSL);
        currentDSL.version = 38;
    }
    if (currentDSL.version === 38) {
        currentDSL = (0, _038_migrate_resizable_modal_widget_properties_1.migrateResizableModalWidgetProperties)(currentDSL);
        currentDSL.version = 39;
    }
    if (currentDSL.version === 39) {
        currentDSL = (0, _039_migrate_table_widget_selected_row_bindings_1.migrateTableWidgetSelectedRowBindings)(currentDSL);
        currentDSL.version = 40;
    }
    if (currentDSL.version === 40) {
        currentDSL = (0, _040_revert_button_style_to_button_color_1.revertButtonStyleToButtonColor)(currentDSL);
        currentDSL.version = 41;
    }
    if (currentDSL.version === 41) {
        currentDSL = (0, _041_migrate_button_variant_1.migrateButtonVariant)(currentDSL);
        currentDSL.version = 42;
    }
    if (currentDSL.version === 42) {
        currentDSL = (0, _042_migrate_map_widget_is_clicked_marker_centered_1.migrateMapWidgetIsClickedMarkerCentered)(currentDSL);
        currentDSL.version = 43;
    }
    if (currentDSL.version === 43) {
        currentDSL = (0, _043_map_allow_horizontal_scroll_mirgation_1.mapAllowHorizontalScrollMigration)(currentDSL);
        currentDSL.version = 44;
    }
    if (currentDSL.version === 44) {
        currentDSL = (0, _044_is_sortable_migration_1.isSortableMigration)(currentDSL);
        currentDSL.version = 45;
    }
    if (currentDSL.version === 45) {
        currentDSL = (0, _045_migrate_table_widget_icon_button_variant_1.migrateTableWidgetIconButtonVariant)(currentDSL);
        currentDSL.version = 46;
    }
    if (currentDSL.version === 46) {
        currentDSL = (0, _046_migrate_checkbox_group_widget_inline_property_1.migrateCheckboxGroupWidgetInlineProperty)(currentDSL);
        currentDSL.version = 47;
    }
    if (currentDSL.version === 47) {
        // We're skipping this to fix a bad table migration.
        // skipped migration is added as version 51
        currentDSL.version = 48;
    }
    if (currentDSL.version === 48) {
        currentDSL = (0, _048_migrate_recaptcha_type_1.migrateRecaptchaType)(currentDSL);
        currentDSL.version = 49;
    }
    if (currentDSL.version === 49) {
        currentDSL = (0, _049_add_private_widgets_to_all_list_widgets_1.addPrivateWidgetsToAllListWidgets)(currentDSL);
        currentDSL.version = 50;
    }
    if (currentDSL.version === 50) {
        /*
         * We're skipping this to fix a bad table migration - migrateTableWidgetNumericColumnName
         * it overwrites the computedValue of the table columns
         */
        currentDSL.version = 51;
    }
    if (currentDSL.version === 51) {
        currentDSL = (0, _051_migrate_phone_input_widget_allow_formatting_1.migratePhoneInputWidgetAllowFormatting)(currentDSL);
        currentDSL.version = 52;
    }
    if (currentDSL.version === 52) {
        currentDSL = (0, _052_migrate_modal_icon_button_widget_1.migrateModalIconButtonWidget)(currentDSL);
        currentDSL.version = 53;
    }
    if (currentDSL.version === 53) {
        currentDSL = (0, _053_migrate_scroll_truncate_property_1.migrateScrollTruncateProperties)(currentDSL);
        currentDSL.version = 54;
    }
    if (currentDSL.version === 54) {
        currentDSL = (0, _054_migrate_phone_input_widget_default_dial_code_1.migratePhoneInputWidgetDefaultDialCode)(currentDSL);
        currentDSL.version = 55;
    }
    if (currentDSL.version === 55) {
        currentDSL = (0, _055_migrate_currency_input_widget_default_currency_code_1.migrateCurrencyInputWidgetDefaultCurrencyCode)(currentDSL);
        currentDSL.version = 56;
    }
    if (currentDSL.version === 56) {
        currentDSL = (0, _056_migrate_radio_group_alignment_property_1.migrateRadioGroupAlignmentProperty)(currentDSL);
        currentDSL.version = 57;
    }
    if (currentDSL.version === 57) {
        currentDSL = (0, _057_migrate_styling_properties_for_theming_1.migrateStylingPropertiesForTheming)(currentDSL);
        currentDSL.version = 58;
    }
    if (currentDSL.version === 58) {
        currentDSL = (0, _058_migrate_checkbox_switch_property_1.migrateCheckboxSwitchProperty)(currentDSL);
        currentDSL.version = 59;
    }
    if (currentDSL.version === 59) {
        /**
         * migrateChartWidgetReskinningData function will be executed again in version 61,
         * since for older apps the accentColor and fontFamily didn't get migrated.
         */
        currentDSL = (0, _059_migrate_chart_widget_reskinning_data_1.migrateChartWidgetReskinningData)(currentDSL);
        currentDSL.version = 60;
    }
    if (currentDSL.version === 60) {
        currentDSL = (0, _060_migrate_table_widget_v2_validation_1.migrateTableWidgetV2Validation)(currentDSL);
        currentDSL.version = 61;
    }
    if (currentDSL.version === 61) {
        currentDSL = (0, _059_migrate_chart_widget_reskinning_data_1.migrateChartWidgetReskinningData)(currentDSL);
        currentDSL.version = 62;
    }
    if (currentDSL.version === 62) {
        currentDSL = (0, _062_migrate_select_type_widget_default_value_1.MigrateSelectTypeWidgetDefaultValue)(currentDSL);
        currentDSL.version = 63;
    }
    if (currentDSL.version === 63) {
        currentDSL = (0, _063_migrate_map_chart_widget_reskinning_data_1.migrateMapChartWidgetReskinningData)(currentDSL);
        currentDSL.version = 64;
    }
    if (currentDSL.version === 64) {
        currentDSL = (0, _064_migrate_rate_widget_disabed_state_1.migrateRateWidgetDisabledState)(currentDSL);
        currentDSL.version = 65;
    }
    if (currentDSL.version === 65) {
        currentDSL = (0, _065_migrate_code_scanner_layout_1.migrateCodeScannerLayout)(currentDSL);
        currentDSL.version = 66;
    }
    if (currentDSL.version === 66) {
        currentDSL = (0, _066_migrate_table_widget_v2_validation_binding_1.migrateTableWidgetV2ValidationBinding)(currentDSL);
        currentDSL.version = 67;
    }
    if (currentDSL.version === 67) {
        currentDSL = (0, _067_migrate_label_position_1.migrateLabelPosition)(currentDSL);
        currentDSL.version = 68;
    }
    if (currentDSL.version === 68) {
        currentDSL = (0, _068_migrate_properties_for_dynamic_height_1.migratePropertiesForDynamicHeight)(currentDSL);
        currentDSL.version = 69;
    }
    if (currentDSL.version === 69) {
        currentDSL = (0, _069_migrate_menu_button_dynamic_items_1.migrateMenuButtonDynamicItems)(currentDSL);
        currentDSL.version = 70;
    }
    if (currentDSL.version === 70) {
        currentDSL = (0, _070_migrate_child_stylesheet_from_dynamic_binding_path_list_1.migrateChildStylesheetFromDynamicBindingPathList)(currentDSL);
        currentDSL.version = 71;
    }
    if (currentDSL.version === 71) {
        currentDSL = (0, _071_migrate_table_widget_v2_select_option_1.migrateTableWidgetV2SelectOption)(currentDSL);
        currentDSL.version = 72;
    }
    if (currentDSL.version === 72) {
        currentDSL = (0, _072_migrate_list_widget_children_for_auto_height_1.migrateListWidgetChildrenForAutoHeight)(currentDSL);
        currentDSL.version = 73;
    }
    if (currentDSL.version === 73) {
        currentDSL = (0, _073_mirgate_input_widget_show_step_arrows_1.migrateInputWidgetShowStepArrows)(currentDSL);
        currentDSL.version = 74;
    }
    if (currentDSL.version === 74) {
        currentDSL = (0, _074_migrate_mwnu_button_dynamic_items_inside_table_widget_1.migrateMenuButtonDynamicItemsInsideTableWidget)(currentDSL);
        currentDSL.version = 75;
    }
    if (currentDSL.version === 75) {
        currentDSL = (0, _075_migrate_input_widgets_multiline_input_type_1.migrateInputWidgetsMultiLineInputType)(currentDSL);
        currentDSL.version = 76;
    }
    if (currentDSL.version === 76) {
        currentDSL = (0, _076_migrate_column_freeze_attributes_1.migrateColumnFreezeAttributes)(currentDSL);
        currentDSL.version = 77;
    }
    if (currentDSL.version === 77) {
        currentDSL = (0, _077_migrate_table_select_option_attributes_for_new_row_1.migrateTableSelectOptionAttributesForNewRow)(currentDSL);
        currentDSL.version = 78;
    }
    if (currentDSL.version == 78) {
        currentDSL =
            (0, _078_migrate_binding_prefix_suffix_for_inline_edit_validation_control_1.migrateBindingPrefixSuffixForInlineEditValidationControl)(currentDSL);
        currentDSL.version = 79;
    }
    if (currentDSL.version == 79) {
        currentDSL = (0, _079_migrate_table_widget_table_data_js_mode_1.migrateTableWidgetTableDataJsMode)(currentDSL);
        currentDSL.version = 80;
    }
    if (currentDSL.version === 80) {
        currentDSL = (0, _080_migrate_select_widget_option_to_source_data_1.migrateSelectWidgetOptionToSourceData)(currentDSL);
        currentDSL.version = 81;
    }
    if (currentDSL.version === 81) {
        currentDSL = (0, _081_migrate_select_widget_source_data_binding_path_list_1.migrateSelectWidgetSourceDataBindingPathList)(currentDSL);
        currentDSL.version = 82;
    }
    if (currentDSL.version == 82) {
        currentDSL = (0, _082_migrate_chart_widget_label_orientation_stagger_option_1.migrateChartWidgetLabelOrientationStaggerOption)(currentDSL);
        currentDSL.version = 83;
    }
    if (currentDSL.version == 83) {
        currentDSL = (0, _083_migrate_add_show_hide_data_point_labels_1.migrateAddShowHideDataPointLabels)(currentDSL);
        currentDSL.version = 84;
    }
    if (currentDSL.version === 84) {
        currentDSL = (0, _084_migrate_select_widget_add_source_data_property_path_list_1.migrateSelectWidgetAddSourceDataPropertyPathList)(currentDSL);
        currentDSL.version = 85;
    }
    if (currentDSL.version === 85) {
        currentDSL = (0, _085_migrate_default_values_for_custom_echart_1.migrateDefaultValuesForCustomEChart)(currentDSL);
        currentDSL.version = 86;
    }
    if (currentDSL.version === 86) {
        currentDSL = (0, _086_migrate_table_server_side_filtering_1.migrateTableServerSideFiltering)(currentDSL);
        currentDSL.version = 87;
    }
    if (currentDSL.version === 87) {
        currentDSL = (0, _087_migrate_chart_widget_customechartdata_1.migrateChartwidgetCustomEchartConfig)(currentDSL);
        currentDSL.version = 88;
    }
    if (currentDSL.version === 88) {
        currentDSL = (0, _088_migrate_custom_widget_dynamic_height_1.migrateCustomWidgetDynamicHeight)(currentDSL);
        currentDSL.version = exports.LATEST_DSL_VERSION;
    }
    return currentDSL;
};
const migrateDSL = (currentDSL, newPage = false) => {
    if (currentDSL.version === undefined) {
        const initialDSL = migrateUnversionedDSL(currentDSL);
        return migrateVersionedDSL(initialDSL, newPage);
    }
    else {
        return migrateVersionedDSL(currentDSL, newPage);
    }
};
exports.migrateDSL = migrateDSL;
//# sourceMappingURL=index.js.map