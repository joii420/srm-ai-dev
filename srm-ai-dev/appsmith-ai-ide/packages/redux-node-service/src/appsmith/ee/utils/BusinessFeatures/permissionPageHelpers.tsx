export * from "ce/utils/BusinessFeatures/permissionPageHelpers";
import { hasCreateDSActionPermissionInApp as hasCreateDSActionPermissionInAppCE } from "ce/utils/BusinessFeatures/permissionPageHelpers";
import { EditorNames } from "@appsmith/hooks";

export const hasCreateDSActionPermissionInApp = ({
  dsPermissions,
  editorType,
  isEnabled,
  pagePermissions,
}: {
  dsPermissions?: string[];
  editorType?: string;
  isEnabled: boolean;
  pagePermissions?: string[];
}) => {
  if (editorType === EditorNames.PACKAGE) {
    return false;
  }

  return hasCreateDSActionPermissionInAppCE({
    dsPermissions,
    editorType,
    isEnabled,
    pagePermissions,
  });
};
