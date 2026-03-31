import moment from "moment";

export enum TransformerMode {
  date,
  time,
  date_time,
}

const SPLIT_PLACEHOLDER = "{{{||}}}";
// 有效的时间模板字符匹配 匹配连续相同的字符
const MATCH_VALUE_REG_STR = "(([yYmMdDhHsS])\\2*)";

interface MatchFormatItem {
  key: string;
  isValue: boolean;
}

/**
 * 转化时间format字符串
 * @param format string
 * @returns ({ key: string, isValue: boolean })[]
 * @example
 * readFormat('yyyy-MM:dd')
 * => [
 *  {key: "", isValue: false},
 *  {key: "yyyy", isValue: true},
 *  {key: "-", isValue: false},
 *  {key: "MM", isValue: true},
 *  {key: ":", isValue: false},
 *  {key: "dd", isValue: true},
 *  {key: "", isValue: false},
 * ]
 */
function readFormat(format: string) {
  const reg = new RegExp(MATCH_VALUE_REG_STR, "g");
  const matchStr = format;
  const valueList: string[] = [];
  const splitList = matchStr
    .replace(reg, function (str) {
      valueList.push(str);
      return SPLIT_PLACEHOLDER;
    })
    .split(SPLIT_PLACEHOLDER);
  const matchList: MatchFormatItem[] = [];
  matchList.push({
    key: splitList[0],
    isValue: false,
  });
  for (let i = 0, len = valueList.length; i < len; i++) {
    const curValue = valueList[i];
    const curSplit = splitList[i + 1];
    matchList.push({
      key: curValue,
      isValue: true,
    });
    matchList.push({
      key: curSplit,
      isValue: false,
    });
  }

  return matchList;
}

class BaseTransformer {
  format: string;
  momentFormat: string;
  queryFormat: string;
  /**
   * 输入补全规则，匹配的输入自动格式化成format对应的结构
   * @example
   * inputFormatList = [
   *    "y{4}M{2}d{2}",
   *    "y{4}-M{1,2}-d{1,2}",
   * ]
   */
  inputFormatList: string[] = [];
  matchList: MatchFormatItem[] = [];
  constructor(format: string) {
    this.format = format;
    this.momentFormat = format.replaceAll("y", "Y").replaceAll("d", "D");
    this.queryFormat = this.momentFormat.replace(/[^\w:\s]+/g, "-");
    // this.matchList = readFormat(this.format);
  }

  /**
   * 按规则补全日期字符串
   * @param text string
   * @param inputFormatList string[]
   * @param strict boolean 严格匹配，不替换分隔符
   * @returns string
   */
  compatibleInput(text: string, inputFormatList?: string[], strict?: boolean) {
    if (!text) return text;

    inputFormatList = inputFormatList || this.inputFormatList;
    // 非严格模式将连续的无效字符替换为-
    const formatText = strict ? text : text.replace(/[\W_]+/g, "-");
    // 比较输入规则，找到匹配的规则
    const matchInputFormat = inputFormatList.find((inputFormat) => {
      const regStr = inputFormat.replace(/[yYmMdDhHsS]/g, "\\d");
      const reg = new RegExp(`^${regStr}$`);
      return reg.test(formatText);
    });

    if (matchInputFormat) {
      let index = 0;
      const keys: string[] = [];
      // 替换字符为相同长度的\d，用于后续正则抓取输入的数字内容
      const _matchInputFormat = matchInputFormat.replace(
        /([yYmMdDhHsS])(\{\d+(,\d+)?\})/g,
        function (str, _1, _2) {
          // 按照出现顺序记录字符，用于填充format的时候，准确找到对应的年月日等
          keys[index++] = _1;
          return `(\\d${_2})`;
        },
      );
      const values: any = {};
      formatText.replace(
        new RegExp(`^${_matchInputFormat}$`),
        function (str, ...args) {
          args.forEach((item, i) => {
            // 按照字符，记录抓取到的输入的时间信息，并存入到values之中
            const key = keys[i];
            values[key] = item;
          });

          return str;
        },
      );

      const reg = new RegExp(MATCH_VALUE_REG_STR, "g");
      // 替换填充format时间模板字符对应的数据
      text = this.format.replace(reg, function (str) {
        let val = values[str[0]];
        if (!val) return str;

        if (str[0] === "y") {
          // 两位年份需要补齐完整年份
          if (val.length == 2) {
            const year = new Date().getFullYear().toString();
            val = year.slice(0, 2) + val;
          }
        } else if (val.length < 2) {
          // 保证字符长度为2
          val = "0" + val;
        }

        return val;
      });
    }

    return text;
  }

  compatibleQueryInput(text: string, hasTime?: boolean) {
    if (!text) return text;

    const textList = text.split("|");
    const resultList: string[] = [];
    const isValid = textList.every((str) => {
      const reg = /^([><=]=?|!=|<>)?([\[\]?*-\d\s]+((:|\.\.)[\[\]?*-\d\s]+)?)$/;
      const timeReg =
        /^([><=]=?|!=|<>)?([\[\]?*-\d\s:]+((\.\.)[\[\]?*-\d\s:]+)?)$/;
      // 校验输入是否合法，并截取中间的时间字符串
      const match = hasTime ? str.match(timeReg) : str.match(reg);
      if (!match) return false;

      let flag = true;

      const formatStr = (str: string) => {
        const t = this.compatibleInput(str, undefined, true);
        const time = moment(t, this.momentFormat, true);
        flag = flag && time.isValid();
        return time.isValid() ? time.format(this.queryFormat) : t;
      };

      if (match[2].includes("..")) {
        const rangeList = match[2].split("..");
        // 补全时间字符串
        resultList.push(
          (match[1] || "") +
            rangeList.map((item) => formatStr(item)).join(".."),
        );
      } else if (!hasTime && match[2].includes(":")) {
        const rangeList = match[2].split(":");
        // 补全时间字符串
        resultList.push(
          (match[1] || "") + rangeList.map((item) => formatStr(item)).join(":"),
        );
      } else {
        // 补全时间字符串
        resultList.push((match[1] || "") + formatStr(match[2]));
      }
      return flag;
    });

    if (!isValid) return "";

    return resultList.join("|");
  }
}

class TimeTransformer extends BaseTransformer {
  constructor(format: string) {
    super(format);
    const hasHour = format.includes("H");
    const hasMinute = format.includes("m");
    const hasSecond = format.includes("s");
    if (hasHour && hasMinute && hasSecond) {
      this.inputFormatList = [
        "H{2}m{2}s{2}",
        "H{1,2}-m{2}s{2}",
        "H{2}m{2}-s{1,2}",
        "H{1,2}-m{1,2}-s{1,2}",
      ];
    }
    if (hasHour && hasMinute && !hasSecond) {
      this.inputFormatList = ["H{2}m{2}", "H{1,2}-m{1,2}"];
    }
    if (!hasHour && hasMinute && hasSecond) {
      this.inputFormatList = ["m{2}s{2}", "m{1,2}-s{1,2}"];
    }
  }
}

class DateTimeTransformer extends BaseTransformer {
  dateTransformer: DateTransformer;
  timeTransformer: TimeTransformer;
  constructor(format: string) {
    super(format);
    const [dateFormat, timeFormat] = format.split(/\s+(?=H)/);
    this.dateTransformer = createTimeTransformer(
      dateFormat,
      TransformerMode.date,
    );
    this.timeTransformer = createTimeTransformer(
      timeFormat,
      TransformerMode.time,
    );
  }

  compatibleInput(text: string, inputFormatList?: string[], strict?: boolean) {
    if (!text) return text;

    const [dateText, timeText] = text.split(/\s+(?=\d)/);
    if (!dateText || !timeText) return text;
    const dateStr = `${this.dateTransformer.compatibleInput(dateText, inputFormatList, strict)}`;
    const timeStr = `${this.timeTransformer.compatibleInput(timeText, inputFormatList, strict)}`;
    return `${dateStr} ${timeStr}`;
  }
}

class DateTransformer extends BaseTransformer {
  inputFormatList = [
    "y{4}M{2}d{2}",
    "y{4}-M{2}d{2}",
    "y{4}M{2}-d{1,2}",
    "y{4}-M{1,2}-d{1,2}",
    "y{2}M{2}d{2}",
    "y{2}-M{2}d{2}",
    "y{2}M{2}-d{1,2}",
    "y{2}-M{1,2}-d{1,2}",
  ];
  constructor(format: string) {
    super(format);
  }
}

type Transform<T extends TransformerMode> = T extends TransformerMode.date
  ? DateTransformer
  : T extends TransformerMode.time
    ? TimeTransformer
    : T extends TransformerMode.date_time
      ? DateTimeTransformer
      : never;

export function createTimeTransformer<T extends TransformerMode>(
  format: string,
  mode: T,
): Transform<T> {
  switch (mode) {
    case TransformerMode.time:
      return new TimeTransformer(format) as any;
    case TransformerMode.date_time:
      return new DateTimeTransformer(format) as any;
    default:
      return new DateTransformer(format) as any;
  }
}
