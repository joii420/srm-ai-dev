/**根据组件类型处理日期数据 */
export const initDataSource = (
  fieldSource: Record<string, string | number>[],
  data: Record<string, any>[],
) => {
  const dateFields = fieldSource?.filter((f) => f?.type === "date") ?? [];
  const newData =
    dateFields?.length > 0
      ? data?.map((d) => {
          const dateFieldsData =
            dateFields?.reduce(
              (
                prev: Record<string, unknown>,
                next: Record<string, string | number>,
              ) => {
                const field = next.field;
                let value = d[field];
                if (typeof value === "string" && value != "") {
                  switch (next?.columnType) {
                    case "SFDATEPICKER_WIDGET":
                      value = new Date(value);
                      value.setHours(0, 0, 0, 0);
                      break;
                    case "SFDATETIMEPICKER_WIDGET":
                      value = new Date(value);
                      break;
                    case "SFTIMEPICKER_WIDGET":
                      break;
                  }
                }
                prev[field] = value;
                return prev;
              },
              {},
            ) ?? {};
          return Object.assign({}, d, dateFieldsData);
        })
      : data;
  return newData;
};
