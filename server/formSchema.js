const formSchema = {
  title: "住院患者入院评估表",
  description: "请根据患者实际情况填写以下评估内容",
  fields: [
    {
      id: "patient_name",
      type: "text",
      label: "患者姓名",
      placeholder: "请输入姓名",
      required: true,
      order: 1
    },
    {
      id: "age",
      type: "number",
      label: "年龄",
      placeholder: "请输入年龄",
      required: true,
      order: 2,
      min: 0,
      max: 150
    },
    {
      id: "gender",
      type: "radio",
      label: "性别",
      required: true,
      order: 3,
      options: [
        { value: "male", label: "男" },
        { value: "female", label: "女" }
      ]
    },
    {
      id: "has_fever",
      type: "radio",
      label: "是否有发热症状？",
      required: true,
      order: 4,
      options: [
        { value: "yes", label: "是" },
        { value: "no", label: "否" }
      ]
    },
    {
      id: "fever_duration",
      type: "select",
      label: "发热持续时间",
      required: true,
      order: 5,
      showWhen: {
        field: "has_fever",
        equals: "yes"
      },
      options: [
        { value: "lt_1d", label: "少于1天" },
        { value: "1_3d", label: "1-3天" },
        { value: "3_7d", label: "3-7天" },
        { value: "gt_7d", label: "超过7天" }
      ]
    },
    {
      id: "fever_temperature",
      type: "number",
      label: "最高体温(℃)",
      required: true,
      order: 6,
      min: 35,
      max: 42,
      step: 0.1,
      showWhen: {
        field: "has_fever",
        equals: "yes"
      }
    },
    {
      id: "has_cough",
      type: "radio",
      label: "是否有咳嗽症状？",
      required: true,
      order: 7,
      options: [
        { value: "yes", label: "是" },
        { value: "no", label: "否" }
      ]
    },
    {
      id: "cough_type",
      type: "checkbox",
      label: "咳嗽类型（可多选）",
      required: true,
      order: 8,
      showWhen: {
        field: "has_cough",
        equals: "yes"
      },
      options: [
        { value: "dry", label: "干咳" },
        { value: "wet", label: "湿咳" },
        { value: "spasmodic", label: "痉挛性咳嗽" },
        { value: "paroxysmal", label: "阵发性咳嗽" }
      ]
    },
    {
      id: "has_preexisting",
      type: "radio",
      label: "是否有既往病史？",
      required: true,
      order: 9,
      options: [
        { value: "yes", label: "是" },
        { value: "no", label: "否" }
      ]
    },
    {
      id: "preexisting_history",
      type: "group",
      label: "既往病史详情",
      order: 10,
      showWhen: {
        and: [
          { field: "has_preexisting", equals: "yes" },
          { or: [
              { field: "age", operator: ">", value: 60 },
              { field: "age", operator: "<", value: 18 }
            ]
          }
        ]
      },
      fields: [
        {
          id: "has_hypertension",
          type: "radio",
          label: "高血压病史",
          required: true,
          order: 101,
          options: [
            { value: "yes", label: "有" },
            { value: "no", label: "无" }
          ]
        },
        {
          id: "hypertension_years",
          type: "number",
          label: "高血压病史年限",
          required: true,
          order: 102,
          min: 1,
          max: 80,
          showWhen: {
            field: "has_hypertension",
            equals: "yes"
          }
        },
        {
          id: "has_diabetes",
          type: "radio",
          label: "糖尿病病史",
          required: true,
          order: 103,
          options: [
            { value: "yes", label: "有" },
            { value: "no", label: "无" }
          ]
        },
        {
          id: "diabetes_type",
          type: "radio",
          label: "糖尿病类型",
          required: true,
          order: 104,
          showWhen: {
            field: "has_diabetes",
            equals: "yes"
          },
          options: [
            { value: "type1", label: "1型糖尿病" },
            { value: "type2", label: "2型糖尿病" },
            { value: "gestational", label: "妊娠期糖尿病" },
            { value: "other", label: "其他类型" }
          ]
        },
        {
          id: "diabetes_medication",
          type: "text",
          label: "糖尿病用药情况",
          placeholder: "请输入用药名称和剂量",
          required: false,
          order: 105,
          showWhen: {
            field: "has_diabetes",
            equals: "yes"
          }
        },
        {
          id: "has_heart_disease",
          type: "radio",
          label: "心脏病病史",
          required: true,
          order: 106,
          options: [
            { value: "yes", label: "有" },
            { value: "no", label: "无" }
          ]
        },
        {
          id: "heart_disease_detail",
          type: "group",
          label: "心脏病详情",
          order: 107,
          showWhen: {
            field: "has_heart_disease",
            equals: "yes"
          },
          fields: [
            {
              id: "heart_disease_type",
              type: "radio",
              label: "心脏病类型",
              required: true,
              order: 1071,
              options: [
                { value: "chd", label: "冠心病" },
                { value: "hf", label: "心力衰竭" },
                { value: "arrhythmia", label: "心律失常" },
                { value: "valvular", label: "瓣膜性心脏病" },
                { value: "other", label: "其他" }
              ]
            },
            {
              id: "heart_disease_other",
              type: "text",
              label: "其他心脏病类型说明",
              placeholder: "请说明具体类型",
              required: true,
              order: 1072,
              showWhen: {
                field: "heart_disease_type",
                equals: "other"
              }
            },
            {
              id: "heart_surgery",
              type: "radio",
              label: "是否接受过心脏手术？",
              required: true,
              order: 1073,
              options: [
                { value: "yes", label: "是" },
                { value: "no", label: "否" }
              ]
            },
            {
              id: "heart_surgery_detail",
              type: "text",
              label: "手术详情",
              placeholder: "请描述手术类型和时间",
              required: true,
              order: 1074,
              showWhen: {
                field: "heart_surgery",
                equals: "yes"
              }
            }
          ]
        }
      ]
    },
    {
      id: "allergies",
      type: "radio",
      label: "是否有过敏史？",
      required: true,
      order: 11,
      options: [
        { value: "yes", label: "是" },
        { value: "no", label: "否" }
      ]
    },
    {
      id: "allergy_detail",
      type: "checkbox",
      label: "过敏源（可多选）",
      required: true,
      order: 12,
      showWhen: {
        field: "allergies",
        equals: "yes"
      },
      options: [
        { value: "penicillin", label: "青霉素" },
        { value: "sulfa", label: "磺胺类" },
        { value: "aspirin", label: "阿司匹林" },
        { value: "iodine", label: "碘剂" },
        { value: "other", label: "其他" }
      ]
    },
    {
      id: "allergy_other",
      type: "text",
      label: "其他过敏源说明",
      placeholder: "请描述其他过敏源",
      required: true,
      order: 13,
      showWhen: {
        and: [
          { field: "allergies", equals: "yes" },
          { field: "allergy_detail", contains: "other" }
        ]
      }
    },
    {
      id: "pregnant",
      type: "radio",
      label: "是否妊娠？",
      required: true,
      order: 14,
      showWhen: {
        field: "gender",
        equals: "female"
      },
      options: [
        { value: "yes", label: "是" },
        { value: "no", label: "否" }
      ]
    },
    {
      id: "pregnancy_week",
      type: "number",
      label: "孕周(周)",
      required: true,
      order: 15,
      min: 0,
      max: 42,
      showWhen: {
        and: [
          { field: "gender", equals: "female" },
          { field: "pregnant", equals: "yes" }
        ]
      }
    },
    {
      id: "smoking",
      type: "radio",
      label: "是否吸烟？",
      required: true,
      order: 16,
      options: [
        { value: "yes", label: "是" },
        { value: "no", label: "否" }
      ]
    },
    {
      id: "smoking_detail",
      type: "group",
      label: "吸烟详情",
      order: 17,
      showWhen: {
        field: "smoking",
        equals: "yes"
      },
      fields: [
        {
          id: "smoking_years",
          type: "number",
          label: "吸烟年限(年)",
          required: true,
          order: 171,
          min: 1,
          max: 80
        },
        {
          id: "smoking_per_day",
          type: "number",
          label: "每日吸烟量(支)",
          required: true,
          order: 172,
          min: 1,
          max: 200
        },
        {
          id: "smoking_quit",
          type: "radio",
          label: "是否已戒烟？",
          required: true,
          order: 173,
          options: [
            { value: "yes", label: "是" },
            { value: "no", label: "否" }
          ]
        },
        {
          id: "quit_years",
          type: "number",
          label: "戒烟年限(年)",
          required: true,
          order: 174,
          min: 1,
          max: 80,
          showWhen: {
            and: [
              { field: "smoking", equals: "yes" },
              { field: "smoking_quit", equals: "yes" }
            ]
          }
        }
      ]
    },
    {
      id: "drinking",
      type: "radio",
      label: "是否饮酒？",
      required: true,
      order: 18,
      options: [
        { value: "yes", label: "是" },
        { value: "no", label: "否" }
      ]
    },
    {
      id: "drinking_detail",
      type: "group",
      label: "饮酒详情",
      order: 19,
      showWhen: {
        and: [
          { field: "drinking", equals: "yes" },
          { or: [
              { field: "age", operator: ">=", value: 60 },
              { field: "has_preexisting", equals: "yes" }
            ]
          }
        ]
      },
      fields: [
        {
          id: "drinking_type",
          type: "radio",
          label: "饮酒类型",
          required: true,
          order: 191,
          options: [
            { value: "beer", label: "啤酒" },
            { value: "wine", label: "红酒" },
            { value: "liquor", label: "白酒/烈酒" },
            { value: "mixed", label: "混合" }
          ]
        },
        {
          id: "drinking_amount",
          type: "select",
          label: "日均饮酒量",
          required: true,
          order: 192,
          options: [
            { value: "lt_1", label: "少于1两" },
            { value: "1_3", label: "1-3两" },
            { value: "3_5", label: "3-5两" },
            { value: "gt_5", label: "超过5两" }
          ]
        }
      ]
    },
    {
      id: "symptom_severity",
      type: "radio",
      label: "症状严重程度自评",
      required: true,
      order: 20,
      options: [
        { value: "mild", label: "轻微" },
        { value: "moderate", label: "中等" },
        { value: "severe", label: "严重" },
        { value: "critical", label: "危重" }
      ]
    },
    {
      id: "emergency_contact",
      type: "radio",
      label: "是否需要联系紧急联系人？",
      required: true,
      order: 21,
      showWhen: {
        or: [
          { field: "symptom_severity", equals: "severe" },
          { field: "symptom_severity", equals: "critical" }
        ]
      },
      options: [
        { value: "yes", label: "是" },
        { value: "no", label: "否" }
      ]
    },
    {
      id: "contact_info",
      type: "group",
      label: "紧急联系人信息",
      order: 22,
      showWhen: {
        and: [
          { or: [
              { field: "symptom_severity", equals: "severe" },
              { field: "symptom_severity", equals: "critical" }
            ]
          },
          { field: "emergency_contact", equals: "yes" }
        ]
      },
      fields: [
        {
          id: "contact_name",
          type: "text",
          label: "联系人姓名",
          placeholder: "请输入姓名",
          required: true,
          order: 221
        },
        {
          id: "contact_relation",
          type: "select",
          label: "与患者关系",
          required: true,
          order: 222,
          options: [
            { value: "spouse", label: "配偶" },
            { value: "parent", label: "父母" },
            { value: "child", label: "子女" },
            { value: "sibling", label: "兄弟姐妹" },
            { value: "friend", label: "朋友" },
            { value: "other", label: "其他" }
          ]
        },
        {
          id: "contact_phone",
          type: "text",
          label: "联系电话",
          placeholder: "请输入电话号码",
          required: true,
          order: 223
        }
      ]
    },
    {
      id: "additional_notes",
      type: "textarea",
      label: "其他备注信息",
      placeholder: "请输入其他需要说明的情况...",
      required: false,
      order: 23
    }
  ]
};

module.exports = formSchema;
