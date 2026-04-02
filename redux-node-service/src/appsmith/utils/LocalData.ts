import { get, set } from "lodash";

const LOCAL_DATA_KEY = "custom_global_local_data";

class LocalData {
  data: any = {};
  constructor() {}

  init() {
    try {
      const data = JSON.parse(localStorage.getItem(LOCAL_DATA_KEY) || "{}");
      this.data = data;
      if (typeof data !== "object") {
        this.data = {};
      }
    } catch (error) {
      this.data = {};
    }
  }

  setData(path: string, value: any) {
    set(this.data, path, value);
    localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(this.data));
  }

  getData(path: string) {
    return get(this.data, path);
  }
}

const localData = new LocalData();

export default localData;
