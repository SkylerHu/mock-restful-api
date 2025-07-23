const Enum = require("js-enumerate");

const LookupEnum = new Enum([
  { key: "EXACT", value: "exact", label: "精确匹配" },
  { key: "IS_NULL", value: "isnull", label: "是否为空" },
  { key: "IN", value: "in", label: "限定枚举值" },
  { key: "STARTSWITH", value: "startswith", label: "前缀匹配" },
  { key: "ENDSWITH", value: "endswith", label: "后缀匹配" },
  { key: "CONTAINS", value: "contains", label: "内容包含" },
  { key: "REGEX", value: "regex", label: "正则" },
  { key: "RANGE", value: "range", label: "取值范围" },
  { key: "CSV", value: "csv", label: "取值范围" },
  { key: "LT", value: "lt", label: "小于" },
  { key: "LTE", value: "lte", label: "小于等于" },
  { key: "GT", value: "gt", label: "大于" },
  { key: "GTE", value: "gte", label: "大于等于" },
]);


const MethodEnum = new Enum({
  GET: "GET",
  POST: "POST",
  DELETE: "DELETE",
  PUT: "PUT",
  PATCH: "PATCH",
  HEAD: "HEAD",
  OPTIONS: "OPTIONS",
});

const ALLOW_METHODS = MethodEnum.map(member => member.value.toUpperCase()).concat(MethodEnum.map(member => member.value.toLowerCase()));

module.exports = {
  MethodEnum,
  LookupEnum,
  ALLOW_METHODS,
};