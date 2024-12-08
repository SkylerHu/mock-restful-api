const Joi = require("joi");
const utils = require("./utils.js");
const logger = require("./logger.js");
const { LookupEnum, ALLOW_METHODS } = require("./enums.js");

const handleValidateResult = result => {
  if (result.error) {
    const errMsgs = [];
    result.error.details.forEach(err => {
      // logger.error(`validate error ==> ${err.message}`);
      errMsgs.push(err.message);
    });
    logger.error("validate error details:\n" + JSON.stringify(result.error.details, null, 2));
    throw Error(errMsgs);
  }
};

const buildJoiSchema = rules => {
  let schema = {};
  for (let key in rules) {
    let item = rules[key];
    try {
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
            if (utils.isArray(value)) {
              rule = rule[attr](...value);
            } else {
              if (item.type === "string" && attr === "pattern") {
                rule = rule.pattern(new RegExp(value));
              } else {
                rule = rule[attr](value);
              }
            }
          }
        }
      }

      schema[key] = rule;
    } catch (err) {
      logger.error(`The rule is illegal, not support: ${JSON.stringify(item)}`);
      logger.error(err);
    }
  }
  return Joi.object(schema).unknown();
};

const validateSubmitData = (data, rules, partial = false) => {
  if (!utils.isDict(data)) {
    throw Error("The resutful created data submitted by post can only be a dictionary.");
  }
  if (!utils.isDict(rules)) {
    return data;
  }
  let myRules = {};
  if (partial) {
    for (let fieldName in rules) {
      // 部分更新的情况下只校验表单传递了的字段
      if (data[fieldName] !== undefined) {
        myRules[fieldName] = rules[fieldName];
      }
    }
  } else {
    myRules = { ...rules };
  }
  const joiSchema = buildJoiSchema(myRules);
  const result = joiSchema.validate(data);
  handleValidateResult(result);
  return result.value;
};

const validateConfig = data => {
  const schema = Joi.object({
    restful: Joi.string(),
    page_size: Joi.number().min(1).integer(),
    filter_fields: Joi.object().pattern(Joi.string(), Joi.array().items(Joi.string().valid(...LookupEnum.map(member => member.value)))),
    search_fields: Joi.array().items(Joi.string()),
    ordering_fields: Joi.array().items(Joi.string()),
    ordering: Joi.array().items(Joi.string()),
    pk_field: Joi.string(),
    rules: Joi.object().pattern(Joi.string(), Joi.object({ type: Joi.string().required() }).unknown()),
    rows: Joi.array().items(Joi.object()),
    actions: Joi.array().items(
      Joi.object({
        method: Joi.string().valid(...ALLOW_METHODS).required(),
        url_path: Joi.string().required(),
        detail: Joi.boolean(),
        response: Joi.object({
          code: Joi.number().min(1).integer(),
          headers: Joi.object().pattern(Joi.string(), Joi.string()),
          json: Joi.alternatives().try(Joi.object(), Joi.array()),
          file: Joi.string(),
          text: Joi.string(),
        }).unknown(),
      })
    ),
    apis: Joi.array().items(
      Joi.object({
        method: Joi.string().valid(...ALLOW_METHODS).required(),
        path: Joi.string().required(),
        response: Joi.object({
          code: Joi.number().min(1).integer(),
          headers: Joi.object().pattern(Joi.string(), Joi.string()),
          json: Joi.alternatives().try(Joi.object(), Joi.array()),
          file: Joi.string(),
          text: Joi.string(),
        }).unknown(),
      })
    ),
  }).unknown();
  const result = schema.validate(data);
  handleValidateResult(result);
  return result.value;
};

module.exports = {
  handleValidateResult,
  validateSubmitData,
  validateConfig,
};
