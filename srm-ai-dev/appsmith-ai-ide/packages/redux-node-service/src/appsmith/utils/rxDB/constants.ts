//schema选择常量
interface schemaOptions {
  [key: string]: any;
}
export const SCHEMA_OPTIONS: schemaOptions = {
  globalCollection: {
    // title: "用户全局参数和权限信息",
    type: "object",
    version: 0,
    primaryKey: {
      key: "id",
      fields: ["g_user", "g_enterprise"],
      separator: "|",
    },
    properties: {
      g_enterprise: {
        type: "string",
      },
      g_site: {
        type: "string",
      },
      g_user: {
        type: "string",
      },
      g_user_name: {
        type: "string",
      },
      g_account: {
        type: "string",
      },
      g_dept: {
        type: "string",
      },
      g_dept_name: {
        type: "string",
      },
      g_prod: {
        type: "string",
      },
      g_lang: {
        type: "string",
      },
      g_date_format: {
        type: "string",
      },
      g_time_format: {
        type: "string",
      },
      g_datetime_format: {
        type: "string",
      },
      g_timezone: {
        type: "string",
      },
      g_number_format: {
        type: "string",
      },
      g_money_format: {
        type: "string",
      },
      g_system_params: {
        type: "array",
        items: {
          properties: {
            code: {
              type: "string",
            },
            data_form: {
              type: "string",
            },
            default_value: {
              type: "string",
            },
            error_handle: {
              type: "string",
            },
            explain: {
              type: "string",
            },
            modal_code: {
              type: "string",
            },
            scope: {
              type: "string",
            },
            status: {
              type: "string",
            },
            value_scope: {
              type: "string",
            },
            value_scope_explain: {
              type: "string",
            },
            verify_code: {
              type: "string",
            },
          },
        },
      },
      g_enterprise_params: {
        type: "array",
        items: {
          properties: {
            code: {
              type: "string",
            },
            data_form: {
              type: "string",
            },
            default_value: {
              type: "string",
            },
            error_handle: {
              type: "string",
            },
            explain: {
              type: "string",
            },
            modal_code: {
              type: "string",
            },
            scope: {
              type: "string",
            },
            status: {
              type: "string",
            },
            value_scope: {
              type: "string",
            },
            value_scope_explain: {
              type: "string",
            },
            verify_code: {
              type: "string",
            },
          },
        },
      },
      g_site_params: {
        type: "array",
        items: {
          properties: {
            code: {
              type: "string",
            },
            data_form: {
              type: "string",
            },
            default_value: {
              type: "string",
            },
            error_handle: {
              type: "string",
            },
            explain: {
              type: "string",
            },
            modal_code: {
              type: "string",
            },
            scope: {
              type: "string",
            },
            status: {
              type: "string",
            },
            value_scope: {
              type: "string",
            },
            value_scope_explain: {
              type: "string",
            },
            verify_code: {
              type: "string",
            },
          },
        },
      },
      g_priv: {
        type: "array",
        items: {
          properties: {
            applications: {
              type: "array",
              items: {
                properties: {
                  application: {
                    type: "string",
                  },
                  buttons: {
                    type: "array",
                    items: {
                      properties: {
                        enable: {
                          type: "boolean",
                        },
                        id: {
                          type: "string",
                        },
                        visible: {
                          type: "boolean",
                        },
                      },
                    },
                  },
                  fields: {
                    type: "array",
                    items: {
                      properties: {
                        fields: {
                          type: "string",
                        },
                        hided: {
                          type: "boolean",
                        },
                        share_format: {
                          type: "string",
                        },
                        share_type: {
                          type: "string",
                        },
                        shared: {
                          type: "boolean",
                        },
                        visible: {
                          type: "boolean",
                        },
                      },
                    },
                  },
                },
              },
            },
            site: {
              type: "string",
            },
          },
        },
      },
    },
    required: ["g_user", "g_enterprise"],
  },
  gzsz_file: {
    //key = 表名 即 schema的名称
    title: "gzsz_file", //同表名
    version: "0", //rxdb必要字段
    type: "object", //rxdb必要字段
    primaryKey: {
      //主键设置
      key: "id", //rxdb必要字段
      fields: [
        //复合主键列表
        "gzsz001",
        "gzsz002",
      ],
      separator: "|", //主键分隔符
    },
    properties: {
      //定义schema的栏位属性
      gzsz001: {
        type: "string", //栏位类型  目前有 string|number|date 三种类型
      },
      gzsz002: {
        type: "string",
      },
      gzsz003: {
        type: "string",
      },
    },
    required: [
      //RXDB存储中必填的栏位
      "gzsz001",
      "gzsz002",
    ],
  },
};
