const { validateSubmitData } = require("./validator.js");
const utils = require("./utils.js");
const logger = require("./logger.js");
const { LookupEnum, MethodEnum } = require("./enums.js");

const FIELD_SEPARATOR = "__";

/**
 * 根据 fieldName 从 row 中找出对应的值
 * @param {Ojbect} row
 * @param {string} fieldName
 * @returns
 */
const findRowValueByFieldName = (row, fieldName) => {
  let value;
  if (utils.isBlank(fieldName) || !utils.isDict(row)) {
    // 字段为空； row 为空或者数组时不做处理
    return value;
  }
  value = row[fieldName];
  if (value !== undefined) {
    // 有值直接取
    return value;
  }
  const info = fieldName.split(FIELD_SEPARATOR);
  if (info.length === 1) {
    value = row[info[0]];
  } else {
    // 递归层级寻找
    const data = row[info[0]];
    const childName = info.slice(1).join(FIELD_SEPARATOR);
    value = findRowValueByFieldName(data, childName);
  }
  return value;
};

/**
 * 根据value的类型，转换targetValue值的类型与之对应
 * @param {any} value
 * @param {any} targetValue
 * @returns
 */
const transTargetValueType = (value, targetValue) => {
  if (utils.isAbsNumber(value)) {
    if (utils.isArray(targetValue)) {
      targetValue = targetValue.map(v => (utils.isBlank(v) ? v : Number(v)));
    } else if (!utils.isBlank(targetValue)) {
      targetValue = Number(targetValue);
      if (Number.isNaN(targetValue)) {
        // 数字只能与数字比较
        targetValue = undefined;
      }
    }
  } else if (utils.isAbsBoolean(value)) {
    const transToBool = v => (utils.isBooleanFalse(v) ? false : utils.isBooleanTrue(v) ? true : v);

    if (utils.isArray(targetValue)) {
      targetValue = targetValue.map(v => transToBool(v));
    } else {
      targetValue = transToBool(targetValue);
      if (!utils.isAbsBoolean(targetValue)) {
        // 不是 boolean 对比
        targetValue = undefined;
      }
    }
  }
  return targetValue;
};

/**
 * 处理 "a,b" 这样的数据为 ["a", "b"]
 * @param {string} value
 * @returns array 返回值一定是数组
 */
const parseCsvValue = value => {
  if (utils.isBlank(value)) {
    value = [];
  } else if (utils.isString(value)) {
    // 支持 key=a,b,c 类型的数据
    value = value.split(",");
  } else if (!utils.isArray(value)) {
    value = [value];
  }
  return value;
};

/**
 * 将value和targetValue，根据不同的lookup进行不同的比较
 * @param {any} value
 * @param {str} lookup
 * @param {any} targetValue
 * @returns bool, 满足条件返回true
 */
const compareValueByLookup = (value, lookup, targetValue) => {
  if (utils.isBlank(targetValue)) {
    // 无目标，则默认匹配
    return true;
  }
  if (value === undefined && lookup !== LookupEnum.IS_NULL) {
    // isnull特殊； 其他值未定义的情况，一律匹配失败
    return false;
  }
  if ((utils.isArray(targetValue) && targetValue.length === 0) || utils.isDict(targetValue)) {
    // 目标值数组不能为空；不能是字典
    return false;
  }

  // 转换需要的类型
  let success = false;
  switch (lookup) {
    case LookupEnum.EXACT: {
      targetValue = transTargetValueType(value, targetValue);
      // 不用 ===，query中解析出来的数字是字符串，兼容 1 == "1"
      success = value == targetValue;
      break;
    }
    case LookupEnum.IS_NULL: {
      if (utils.isBooleanTrue(targetValue)) {
        success = utils.isNull(value);
      } else if (utils.isBooleanFalse(targetValue)) {
        success = !utils.isNull(value);
      } else {
        success = false;
      }
      break;
    }
    case LookupEnum.IN: {
      // 用 == 为了兼容 1 == "1" 的场景
      targetValue = parseCsvValue(targetValue);
      success = utils.isArray(targetValue) && targetValue.filter(v => v == value).length > 0;
      break;
    }
    case LookupEnum.STARTSWITH: {
      success = utils.isString(value) && value.startsWith(String(targetValue));
      break;
    }
    case LookupEnum.ENDSWITH: {
      success = utils.isString(value) && value.endsWith(String(targetValue));
      break;
    }
    case LookupEnum.CONTAINS: {
      success = utils.isString(value) && value.indexOf(String(targetValue)) > -1;
      break;
    }
    case LookupEnum.REGEX: {
      success = utils.isString(value) && value.match(new RegExp(targetValue));
      break;
    }
    case LookupEnum.RANGE: {
      if (!utils.allowCompareRange(value)) {
        success = false;
      } else {
        targetValue = parseCsvValue(targetValue);
        // 默认query解析 range=a&range=b 可得到数组
        if (targetValue.length > 2) {
          throw Error(`The range value must be an array of length 2.`);
        }
        let [start, end] = targetValue;
        if (utils.isBlank(start) && utils.isBlank(end)) {
          // 都为空，则通过
          success = true;
        } else if (utils.isBlank(start)) {
          success = utils.allowCompareRange(end) && value <= end;
        } else if (utils.isBlank(end)) {
          success = utils.allowCompareRange(start) && value >= start;
        } else {
          success = utils.allowCompareRange(start) && utils.allowCompareRange(end) && value >= start && value <= end;
        }
      }
      break;
    }
    case LookupEnum.LT: {
      success = utils.allowCompareRange(value) && utils.allowCompareRange(targetValue) && value < targetValue;
      break;
    }
    case LookupEnum.LTE: {
      success = utils.allowCompareRange(value) && utils.allowCompareRange(targetValue) && value <= targetValue;
      break;
    }
    case LookupEnum.GT: {
      success = utils.allowCompareRange(value) && utils.allowCompareRange(targetValue) && value > targetValue;
      break;
    }
    case LookupEnum.GTE: {
      success = utils.allowCompareRange(value) && utils.allowCompareRange(targetValue) && value >= targetValue;
      break;
    }
  }
  return success;
};

const handleFilterRows = (filterFields, searchFields, rows, query) => {
  if (utils.isBlank(query)) {
    return rows;
  }
  if (!utils.isDict(query)) {
    // 格式不对
    return rows;
  }
  // 初始化 filters
  const filters = [];
  for (let fieldName in filterFields) {
    const lookups = filterFields[fieldName];
    for (let lookup of lookups) {
      let value = query[`${fieldName}${FIELD_SEPARATOR}${lookup}`];
      if (value === undefined && lookup === LookupEnum.EXACT) {
        value = query[fieldName];
      }
      if (!utils.isBlank(value)) {
        // 不为空才有效
        filters.push({ fieldName, lookup, targetValue: value });
      }
    }
  }
  let results = rows.filter(row => {
    for (let item of filters) {
      const { fieldName, lookup, targetValue } = item;
      const value = findRowValueByFieldName(row, fieldName);
      const isMatch = compareValueByLookup(value, lookup, targetValue);
      if (!isMatch) {
        // 只要有未匹配到的，直接结束
        return false;
      }
    }
    const { search } = query;
    if (utils.isBlank(search) || !utils.isArray(searchFields) || searchFields.length === 0) {
      // 无search, 上面filters又全部通过
      return true;
    }
    // 处理 searchFields
    for (let fieldName of searchFields) {
      const value = findRowValueByFieldName(row, fieldName);
      const isMatch = compareValueByLookup(value, LookupEnum.CONTAINS, search);
      if (isMatch) {
        // 只要有一个匹配到的，则算搜索成功
        return true;
      }
    }
    // search 所有未匹配
    return false;
  });
  return results;
};

const handleSortRows = (rows, ordering, orderingFields) => {
  const results = [...rows];
  let orderList = parseCsvValue(ordering);
  if (orderList.length === 0) {
    // 不排序
    return results;
  }
  if (!utils.isArray(orderingFields) || orderingFields.length === 0) {
    // 未配置搜索条件
    logger.warn(`ordering=${ordering} is not effective because "orderingFields" is not configured.`);
    return results;
  }
  orderList = orderList
    .map(order => {
      let isAsc = true; // 默认升序
      let fieldName = order;
      if (fieldName.startsWith("-")) {
        isAsc = false;
        fieldName = fieldName.substring(1);
      } else if (fieldName.startsWith("+")) {
        fieldName = fieldName.substring(1);
      }
      if (!orderingFields.includes(fieldName)) {
        // 限定了排序范围
        fieldName = undefined;
      }
      return { isAsc, fieldName, order };
    })
    .filter(item => item.fieldName);
  if (orderList.length > 0) {
    results.sort((a, b) => {
      // 返回值： >0 a在b后；<0 a在b前；=0 保持a、b顺序不变
      let ret = 0;
      for (let item of orderList) {
        let { isAsc, fieldName } = item;
        let _ret;
        const v1 = findRowValueByFieldName(a, fieldName);
        const v2 = findRowValueByFieldName(b, fieldName);
        if (v1 === v2) {
          continue;
        }
        _ret = compareValueByLookup(v1, LookupEnum.LT, v2);
        if (_ret) {
          // v1 < v2
          ret = isAsc ? -1 : 1;
          break;
        } else {
          // v1 > v2
          ret = isAsc ? 1 : -1;
          break;
        }
      }
      return ret;
    });
  }
  return results;
};

const queryRows = (query, config) => {
  const { filter_fields: filterFields, search_fields: searchFields, ordering: defaultOrdering, ordering_fields: orderingFields, rows } = config;
  // 刷选 + 搜索
  let results = handleFilterRows(filterFields, searchFields, rows, query);
  // 排序
  if (utils.isDict(query)) {
    const { ordering } = query;
    results = handleSortRows(results, ordering || defaultOrdering, orderingFields);
  }
  // 返回结果
  return results;
};

const findRowByPk = (pkValue, query, config) => {
  let results = queryRows(query, config);
  const { pk_field: pkField } = config;
  results = results.filter(row => utils.isDict(row) && row[pkField] == pkValue);
  const row = results.length > 0 ? results[0] : undefined;
  return row;
};

const genRowCreateNewPk = (pkField, rows) => {
  const pks = rows.map(item => item[pkField]).filter(v => v && utils.isNumber(v));
  let last = 0;
  if (pks.length > 0) {
    pks.sort(); // 排序
    last = pks[pks.length - 1];
  }
  const pk = Number(last) + 1;
  return pk;
};

const initRestfulResponse = (req, filePath, route) => {
  const configData = global.jsonConfig[filePath];
  if (!utils.isDict(configData)) {
    return { code: 404, text: `path=${route.path} Not Found` };
  }
  let response = {};
  const { query } = req;
  const { config } = configData;
  const { detail } = route;
  const { pk_field: pkField, rules, page_size: defaultSize } = config;
  let { rows } = config;
  if (!detail) {
    switch (req.method.toUpperCase()) {
      case MethodEnum.GET: {
        // 列表
        const results = queryRows(query, config);
        // 分页
        const page = Number(query?.page || 1);
        const pageSize = Number(query?.page_size || defaultSize);
        const pageRows = results.slice((page - 1) * pageSize, page * pageSize);
        response = { json: { count: results.length, results: pageRows } };
        break;
      }
      case MethodEnum.POST: {
        // 创建
        const row = req.body;
        try {
          validateSubmitData(row, rules);
          if (utils.isNull(row[pkField])) {
            // 没有pk，自动生成一个
            row[pkField] = genRowCreateNewPk(pkField, rows);
          }
          rows.push(row);
          response = { json: row, code: 201 };
        } catch (err) {
          logger.error(`${req.method} ${req.path} error: ${err}`);
          response = { json: { detail: err.message }, code: 400 };
        }
        break;
      }
      default: {
        response = { code: 405, json: { detail: `Method "${req.method}" not allowed.` } };
        break;
      }
    }
  } else {
    if (!utils.isDict(req.params) || utils.isBlank(req.params.pk)) {
      response = { code: 404, text: "Not Found params.pk" };
      return response;
    }
    const pkValue = req.params.pk;
    const row = findRowByPk(pkValue, query, config);
    if (!row) {
      response = { code: 404, text: "Not Found by query" };
    } else {
      switch (req.method) {
        case MethodEnum.GET: {
          // 详情
          response = { json: row, code: 200 };
          break;
        }
        case MethodEnum.PUT:
        case MethodEnum.PATCH: {
          // 更新
          const data = req.body || {};
          const partial = req.method === MethodEnum.PATCH;
          try {
            validateSubmitData(data, rules, partial);
            if (!partial) {
              // 非局部更新、移除所有
              for (let key in row) {
                if (key !== pkField) {
                  // 不删除主键
                  delete row[key];
                }
              }
            }
            for (let key in data) {
              if (key === pkField) {
                // 不更新主键
                continue;
              }
              row[key] = data[key];
            }
            response = { json: row, code: 200 };
          } catch (err) {
            logger.error(err);
            response = { json: { detail: err.message }, code: 400 };
          }
          break;
        }
        case MethodEnum.DELETE: {
          // 删除
          let idx;
          for (idx = 0; idx < rows.length; idx++) {
            if (rows[idx][pkField] == row[pkField]) {
              break;
            }
          }
          rows.splice(idx, 1);
          response = { json: row, code: 204 };
          break;
        }
        default: {
          response = { code: 405, json: { detail: `Method "${req.method}" not allowed.` } };
          break;
        }
      }
    }
  }

  return response;
};

module.exports = {
  findRowValueByFieldName,
  transTargetValueType,
  compareValueByLookup,
  handleFilterRows,
  handleSortRows,
  queryRows,
  findRowByPk,
  genRowCreateNewPk,
  initRestfulResponse
};