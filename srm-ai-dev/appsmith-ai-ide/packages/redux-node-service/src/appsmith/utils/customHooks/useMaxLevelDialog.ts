import react, { useCallback } from "react";
import { useSelector } from "react-redux";
import { getDialogStack } from "selectors/onboardingSelectors";
//未使用
const useMaxLevelDialog = () => {
  const dialogStack = useSelector(getDialogStack);
  const getMaxLevel = useCallback(
    (level: number) => {
      return dialogStack.length;
    },
    [dialogStack],
  );

  return {
    getMaxLevel,
  };
};

export default useMaxLevelDialog;
