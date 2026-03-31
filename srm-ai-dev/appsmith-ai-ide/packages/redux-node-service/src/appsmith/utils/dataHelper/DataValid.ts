/**
 * @param val any
 * @return true if val is null or undefined
 */
export function isNoU(val: any) {
  return val === null || val === undefined;
}

/**
 * @param val any
 * @return true if val is null or undefined or ''
 */
export function isEmpty(val: any) {
  return isNoU(val) || val === "";
}
