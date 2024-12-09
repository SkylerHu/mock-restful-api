const isNull = value => value === undefined || value === null;

const isBlank = value => isNull(value) || value === "";

const isBooleanTrue = value => ["true", "True", "1", 1, true].includes(value);

const isBooleanFalse = value => ["false", "False", "0", 0, false].includes(value);

const isAbsBoolean = value => typeof value === "boolean";

const isBoolean = value => isBooleanTrue(value) || isBooleanFalse(value);

const isString = value => typeof value === "string";

// 是绝对数字
const isAbsNumber = value => typeof value === "number" && isFinite(value);

// 可能是数字、字符串类型的数值
const isNumber = value => isAbsNumber(value) || (isString(value) && !Number.isNaN(Number(value)));

// 或者：value instanceof Array
const isArray = value => Array.isArray(value);

// 注意 typeof不准确，null / [] 都是 object
const isDict = value => Object.prototype.toString.call(value) === "[object Object]";

// 允许进行对比的类型
const allowCompareRange = value => isBlank(value) || isBoolean(value) || isString(value) || isNumber(value);

module.exports = {
  isNull,
  isBlank,
  isBooleanFalse,
  isBooleanTrue,
  isBoolean,
  isAbsBoolean,
  isString,
  isAbsNumber,
  isNumber,
  isArray,
  isDict,
  allowCompareRange,
};
