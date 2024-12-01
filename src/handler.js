import * as utils from "./utils.js";
const { logger } = utils;

const FIELD_SEPARATOR = "__";

/**
 * 根据 fieldName 从 row 中找出对应的值
 * @param {Ojbect} row
 * @param {string} fieldName
 * @returns
 */
export const findRowValueByFieldName = (row, fieldName) => {
  let value;
  if (utils.isEmpty(fieldName) || utils.isNull(row) || utils.isArray(row)) {
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
    value = row[fieldName];
  } else {
    // 递归层级寻找
    const data = row[fieldName[0]];
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
      targetValue = targetValue.map(v => (utils.isEmpty(v) ? v : Number(v)));
    } else if (!utils.isEmpty(targetValue)) {
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

const parseCsvValue = value => {
  if (utils.isString(value)) {
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
export const compareValueByLookup = (value, lookup, targetValue) => {
  if (utils.isEmpty(targetValue)) {
    // 无目标，则默认匹配
    return true;
  }
  if (value === undefined && lookup !== "isnull") {
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
    case "exact": {
      targetValue = transTargetValueType(value, targetValue);
      // 不用 ===，query中解析出来的数字是字符串，兼容 1 == "1"
      success = value == targetValue;
      break;
    }
    case "isnull": {
      if (utils.isBooleanTrue(targetValue)) {
        success = utils.isNull(value);
      } else if (utils.isBooleanFalse(targetValue)) {
        success = !utils.isNull(value);
      } else {
        success = false;
      }
      break;
    }
    case "in": {
      // 用 == 为了兼容 1 == "1" 的场景
      targetValue = parseCsvValue(targetValue);
      success = utils.isArray(targetValue) && targetValue.filter(v => v == value).length > 0;
      break;
    }
    case "startswith": {
      success = utils.isString(value) && value.startsWith(String(targetValue));
      break;
    }
    case "endswith": {
      success = utils.isString(value) && value.endsWith(String(targetValue));
      break;
    }
    case "contains": {
      success = utils.isString(value) && value.indexOf(String(targetValue)) > -1;
      break;
    }
    case "regex": {
      success = utils.isString(value) && value.match(new RegExp(targetValue));
      break;
    }
    case "range": {
      if (!utils.allowCompareRange(value)) {
        success = false;
      } else {
        targetValue = parseCsvValue(targetValue);
        // 默认query解析 range=a&range=b 可得到数组
        if (!utils.isArray(targetValue) || targetValue.length !== 2) {
          throw Error(`The range value must be an array of length 2.`);
        }
        let [start, end] = targetValue;
        if (utils.isEmpty(start) && utils.isEmpty(end)) {
          // 都为空，则通过
          success = true;
        } else if (utils.isEmpty(start)) {
          success = utils.allowCompareRange(end) && value <= end;
        } else if (utils.isEmpty(end)) {
          success = utils.allowCompareRange(start) && value >= start;
        } else {
          success = utils.allowCompareRange(start) && utils.allowCompareRange(end) && value >= start && value <= end;
        }
      }
      break;
    }
    case "lt": {
      success = utils.allowCompareRange(value) && utils.allowCompareRange(targetValue) && value < targetValue;
      break;
    }
    case "lte": {
      success = utils.allowCompareRange(value) && utils.allowCompareRange(targetValue) && value <= targetValue;
      break;
    }
    case "gt": {
      success = utils.allowCompareRange(value) && utils.allowCompareRange(targetValue) && value > targetValue;
      break;
    }
    case "gte": {
      success = utils.allowCompareRange(value) && utils.allowCompareRange(targetValue) && value >= targetValue;
      break;
    }
  }
  return success;
};

export const handleFilterRows = (query, rows, filterFields, searchFields) => {
  // 初始化 filters
  const filters = [];
  const fields = Object.keys(filterFields || {});
  for (let i = 0; i < fields.length; i++) {
    const fieldName = fields[i];
    const lookups = filterFields[fieldName] || [];
    for (let j = 0; j < lookups.length; j++) {
      const lookup = lookups[j];
      let value = query[`${fieldName}${FIELD_SEPARATOR}${lookup}`];
      if (value === undefined && lookup === "exact") {
        value = query[fieldName];
      }
      if (!utils.isEmpty(value)) {
        // 不为空才有效
        filters.push({ fieldName, lookup, targetValue: value });
      }
    }
  }
  let results = rows.filter(row => {
    for (let i = 0; i < filters.length; i++) {
      const { fieldName, lookup, targetValue } = filters[i];
      try {
        const value = findRowValueByFieldName(row, fieldName);
        const isMatch = compareValueByLookup(value, lookup, targetValue);
        if (!isMatch) {
          // 只要有未匹配到的，直接结束
          return false;
        }
      } catch (err) {
        logger.error(err);
        logger.error(`filter value error: fileName=${fieldName} lookup=${lookup} targetValue=${targetValue} row: ${JSON.stringify(row)}`);
        return false;
      }
    }
    // 处理 searchFields
    const { search } = query;
    if (!utils.isEmpty(search) && utils.isArray(searchFields)) {
      for (let i = 0; i < searchFields.length; i++) {
        const fieldName = searchFields[i];
        try {
          const value = findRowValueByFieldName(row, fieldName);
          const isMatch = compareValueByLookup(value, "contains", search);
          if (isMatch) {
            // 只要有一个匹配到的，则算搜索成功
            return true;
          }
        } catch (err) {
          logger.error(err);
          logger.error(`search value error: fileName=${fieldName} search=${search} row: ${JSON.stringify(row)}`);
          return false;
        }
      }
    }
    return true;
  });
  return results;
};

export const handleSortRows = (rows, ordering, orderingFields) => {
  const results = [...rows];
  let orderList = parseCsvValue(ordering);
  if (utils.isArray(orderList)) {
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
        if (!utils.isArray(orderingFields) || !orderingFields.includes(fieldName)) {
          // 限定了排序范围
          fieldName = undefined;
        }
        return { isAsc, fieldName, order };
      })
      .filter(item => item.fieldName);
    if (orderList.length > 0) {
      results.sort((a, b) => {
        let ret = true;
        orderList.forEach(item => {
          let { isAsc, fieldName } = item;
          let _ret;
          try {
            const v1 = findRowValueByFieldName(a, fieldName);
            const v2 = findRowValueByFieldName(b, fieldName);
            _ret = compareValueByLookup(v1, isAsc ? "lt" : "gt", v2);
          } catch (err) {
            // 此处排序比较，若是输出错误会有很多，暂不输出日志
            _ret = false;
          }
          ret = ret && _ret;
        });
        return ret;
      });
    }
  }
  return results;
};

export const queryRows = (query, config) => {
  const { filter_fields: filterFields, search_fields: searchFields, ordering: defaultOrdering, ordering_fields: orderingFields, pk_field: pkField = "id", rows } = config;
  // 刷选 + 搜索
  let results = handleFilterRows(query, rows, filterFields, searchFields);
  // 排序
  const { ordering } = query;
  results = handleSortRows(results, ordering || defaultOrdering, orderingFields);
  // 返回结果
  return results;
};

export const findRowByPk = (pkValue, query, config) => {
  let results = queryRows(query, config);
  const { pk_field: pkField } = config;
  results = results.filter(row => utils.isDict(row) && row[pkField] == pkValue);
  const row = results.length > 0 ? results[0] : undefined;
  return row;
};


export const initRestfulResponse = (req, filePath, route) => {
  let response = {};

  const { query } = req;
  const { config } = global.jsonConfig[filePath] || {};
  if (req.path === route.restful) {
    switch (req.method) {
      case "GET": {
        // 列表
        const results = queryRows(query, config);
        // 分页
        const page = Number(query.page || 1);
        const pageSize = Number(query.page_size || config.page_size || 20);
        const pageRows = results.slice((page - 1) * pageSize, page * pageSize);
        response = { json: { count: results.length, results: pageRows } };
        break;
      }
      case "POST": {
        // 创建
        const row = req.body;
        const { pk_field: pkField, rows } = config;
        if (utils.isNull(row[pkField])) {
          // 没有pk，自动生成一个
          const pks = rows.map(item => item[pkField]).filter(v => v && utils.isNumber(v));
          let last = 1;
          if (pks.length > 0) {
            pks.sort(); // 排序
            last = pks[pks.length -1];
          }
          row[pkField] = Number(last) + 1;
        }
        rows.append(row);
        response = { json: row, code: 201 };
        break;
      }
      default: {
        response = { code: 405, json: { detail: `Method "${req.method}" not allowed.` } };
        break;
      }
    }
  } else {
    const row = findRowByPk(req.params[0], req.query, config);
    if (!row) {
      response = { code: 404, text: "Not Found" };
    } else {
      switch (req.method) {
        case "GET": {
          // 详情
          response = { json: row, code: 200 };
          break;
        }
        case "PUT":
        case "PATCH": {
          // 更新
          const data = req.body || {};
          Object.keys(data).forEach(key => {
            row[key] = data[key];
          });
          response = { json: row, code: 200 };
          break;
        }
        case "DELETE": {
          // 删除
          const { pk_field: pkField, rows } = config;
          config.rows = rows.filter(item => item[pkField] == row[pkField]);
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
