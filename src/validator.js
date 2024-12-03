import Joi from "joi";
import * as utils from "./utils.js";

const buildJoiSchema = rules => {
  let schema = {};
  for (let key in rules) {
    let item = rules[key];
    let rule = Joi[item.type]();
    for (let attr in item) {
      if (attr === "type") {
        continue;
      }
      if (rule[attr]) {
        // 函数存在则调用
        const value = item[attr];
        if (utils.isAbsBoolean(value)) {
          if (value === true) {
            // 例如 required: true 的场景
            rule = rule[attr]();
          }
        } else {
          rule = rule[attr](value);
        }
      }
    }

    schema[key] = rule;
  }
  return Joi.object(schema);
};


export const validateSubmitData = (data, rules, partial = false) => {
  if (!utils.isDict(rules) || Object.keys(rules).length === 0) {
    return true;
  }
  let myRules;
  if (partial) {
    for (let fieldName in rules) {
      // 部分更新的情况下只校验表单传递了的字段
      if (data && data[fieldName] !== undefined) {
        myRules[fieldName] = rules[fieldName];
      }
    }
  } else {
    myRules = { ...rules };
  }
  const joiSchema = buildJoiSchema(myRules);
  const result = joiSchema.validate(data);
  if (result.error) {
    throw Error(result.error.details);
  }
  return result;
};
