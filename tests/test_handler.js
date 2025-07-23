const { test, expect, describe, beforeEach, afterEach } = require("@jest/globals");

const handler = require("../src/handler.js");
const { loadFileToConfig } = require("../src/loadFile.js");
const { LookupEnum, MethodEnum } = require("../src/enums.js");
const { validateSubmitData } = require("../src/validator.js");
const logger = require("../src/logger.js");

// 不能更改，会影响测试用例
const TEST_ROWS = [
  { id: 1, name: "ab" },
  { id: 2, name: "c", city: { name: "beijing" } },
  { id: 3, name: "a" },
  { id: 4, name: "e" },
  { id: 5, name: "e" },
];
const firstRow = TEST_ROWS[1];

describe("test handle restfule api", () => {
  test("test find value by field name", () => {
    // 不正常的数据输入
    expect(handler.findRowValueByFieldName(null, "id")).toBeUndefined();
    expect(handler.findRowValueByFieldName([], "id")).toBeUndefined();
    expect(handler.findRowValueByFieldName(firstRow, "")).toBeUndefined();
    // 字段不存在
    expect(handler.findRowValueByFieldName(firstRow, "_id")).toBeUndefined();
    // 正常取值
    expect(handler.findRowValueByFieldName(firstRow, "id")).toBe(firstRow["id"]);
    expect(handler.findRowValueByFieldName(firstRow, "city__name")).toBe(firstRow["city"]["name"]);
    expect(handler.findRowValueByFieldName({ a__b: 12 }, "a__b")).toBe(12);
    expect(handler.findRowValueByFieldName({ a: { b: { c: 3 } } }, "a__b__c")).toBe(3);
    // 字段不存在
    expect(handler.findRowValueByFieldName({ a: 12 }, "a__b")).toBeUndefined;
    // 不支持从数组获取数据
    expect(handler.findRowValueByFieldName({ a: [{ b: 2 }] }, "a__b")).toBeUndefined();
  });

  test("teset trans value type", () => {
    // test number
    expect(handler.transTargetValueType(1, ["1", "2"])).toEqual([1, 2]);
    expect(handler.transTargetValueType(1, ["", "2"])).toEqual(["", 2]);
    expect(handler.transTargetValueType(1, "2")).toBe(2);
    expect(handler.transTargetValueType(1, "a")).toBeUndefined();
    expect(handler.transTargetValueType(1, "")).toBe("");

    // test bool
    expect(handler.transTargetValueType(true, ["true", "1", 1])).toEqual([true, true, true]);
    expect(handler.transTargetValueType(true, ["false", "0", 0])).toEqual([false, false, false]);
    expect(handler.transTargetValueType(true, 1)).toBeTruthy();
    expect(handler.transTargetValueType(true, 0)).toBeFalsy();
    expect(handler.transTargetValueType(true, "a")).toBeUndefined();

    // test other
    expect(handler.transTargetValueType("a", "false")).toBe("false");
  });

  test("test compare value by lookup", () => {
    LookupEnum.forEach(item => {
      // targetValue为空时，相当于没有传递过滤参数
      expect(handler.compareValueByLookup("a", item.value, "")).toBeTruthy();
      // 不支持的targetValue类型
      expect(handler.compareValueByLookup("a", item.value, { a: 1 })).toBeFalsy();
      expect(handler.compareValueByLookup("a", item.value, [])).toBeFalsy();
    });
    const illegalLookup = "test";
    expect(LookupEnum.has(illegalLookup)).toBeFalsy();
    expect(handler.compareValueByLookup(1, illegalLookup, 1)).toBeFalsy();

    // exact
    expect(handler.compareValueByLookup(1, LookupEnum.EXACT, 1)).toBeTruthy();
    expect(handler.compareValueByLookup(1, LookupEnum.EXACT, "1")).toBeTruthy();
    expect(handler.compareValueByLookup(1, LookupEnum.EXACT, "true")).toBeFalsy();
    expect(handler.compareValueByLookup(undefined, LookupEnum.EXACT, "true")).toBeFalsy();
    // isnull
    expect(handler.compareValueByLookup(undefined, LookupEnum.IS_NULL, "a")).toBeFalsy();
    expect(handler.compareValueByLookup("a", LookupEnum.IS_NULL, ["a"])).toBeFalsy();
    expect(handler.compareValueByLookup("a", LookupEnum.IS_NULL, [])).toBeFalsy();
    expect(handler.compareValueByLookup({ a: 1 }, LookupEnum.IS_NULL, { a: 1 })).toBeFalsy();
    expect(handler.compareValueByLookup(1, LookupEnum.IS_NULL, "true")).toBeFalsy();
    expect(handler.compareValueByLookup(1, LookupEnum.IS_NULL, "False")).toBeTruthy();
    expect(handler.compareValueByLookup(null, LookupEnum.IS_NULL, "true")).toBeTruthy(); // targetValue需是bool值的表达范畴, see isBooleanTrue
    expect(handler.compareValueByLookup(null, LookupEnum.IS_NULL, true)).toBeTruthy();
    // in
    expect(handler.compareValueByLookup("1", LookupEnum.IN, "1")).toBeTruthy();
    expect(handler.compareValueByLookup(1, LookupEnum.IN, "1")).toBeTruthy();
    expect(handler.compareValueByLookup(true, LookupEnum.IN, "1")).toBeTruthy(); // bool也可惊醒比较
    expect(handler.compareValueByLookup("a", LookupEnum.IN, "a")).toBeTruthy();
    expect(handler.compareValueByLookup("a", LookupEnum.IN, ["a", "b"])).toBeTruthy();
    expect(handler.compareValueByLookup("a", LookupEnum.IN, "a,b")).toBeTruthy();
    expect(handler.compareValueByLookup("a", LookupEnum.IN, "ab")).toBeFalsy();
    // startswith
    expect(handler.compareValueByLookup("a", LookupEnum.STARTSWITH, "b")).toBeFalsy();
    expect(handler.compareValueByLookup("1abc", LookupEnum.STARTSWITH, 1)).toBeTruthy();
    expect(handler.compareValueByLookup(1, LookupEnum.STARTSWITH, 1)).toBeFalsy(); // 非字符串匹配失败
    // endswith
    expect(handler.compareValueByLookup("a", LookupEnum.ENDSWITH, "b")).toBeFalsy();
    expect(handler.compareValueByLookup("ba", LookupEnum.ENDSWITH, "a")).toBeTruthy();
    expect(handler.compareValueByLookup(1, LookupEnum.ENDSWITH, "1")).toBeFalsy();
    // contains
    expect(handler.compareValueByLookup("a", LookupEnum.CONTAINS, "b")).toBeFalsy();
    expect(handler.compareValueByLookup("a", LookupEnum.CONTAINS, "bac")).toBeFalsy();
    expect(handler.compareValueByLookup(1, LookupEnum.CONTAINS, "ba1")).toBeFalsy();
    // regex
    expect(handler.compareValueByLookup("abc1d", LookupEnum.REGEX, "abc")).toBeTruthy();
    expect(handler.compareValueByLookup("abc1d", LookupEnum.REGEX, "abc\\d")).toBeTruthy();
    expect(handler.compareValueByLookup("abc1_d", LookupEnum.REGEX, "^\\w+$")).toBeTruthy();
    expect(handler.compareValueByLookup("abc1d", LookupEnum.REGEX, "abcd")).toBeFalsy();
    // range
    expect(handler.compareValueByLookup("1", LookupEnum.RANGE, [0, 2])).toBeTruthy();
    expect(handler.compareValueByLookup(1, LookupEnum.RANGE, [0, 2])).toBeTruthy();
    expect(handler.compareValueByLookup(1, LookupEnum.RANGE, [])).toBeFalsy();
    expect(handler.compareValueByLookup(1, LookupEnum.RANGE, "0,2")).toBeTruthy();
    expect(handler.compareValueByLookup(1, LookupEnum.RANGE, "0")).toBeTruthy();
    expect(handler.compareValueByLookup(1, LookupEnum.RANGE, ",2")).toBeTruthy();
    expect(handler.compareValueByLookup(1, LookupEnum.RANGE, 0)).toBeTruthy();
    expect(handler.compareValueByLookup(1, LookupEnum.RANGE, ",")).toBeTruthy();
    expect(handler.compareValueByLookup([0], LookupEnum.RANGE, ",")).toBeFalsy();
    expect(() => handler.compareValueByLookup(1, LookupEnum.RANGE, "0,2,4")).toThrow(/range value must be an array of length 2/);
    expect(handler.compareValueByLookup([0], LookupEnum.CSV, ",")).toBeFalsy();
    // lt
    expect(handler.compareValueByLookup(1, LookupEnum.LT, 2)).toBeTruthy();
    expect(handler.compareValueByLookup("1", LookupEnum.LT, 2)).toBeTruthy();
    expect(handler.compareValueByLookup(2, LookupEnum.LT, 2)).toBeFalsy();
    expect(handler.compareValueByLookup(3, LookupEnum.LT, 2)).toBeFalsy();
    expect(handler.compareValueByLookup([0], LookupEnum.LT, 2)).toBeFalsy();
    // lte
    expect(handler.compareValueByLookup(1, LookupEnum.LTE, 2)).toBeTruthy();
    expect(handler.compareValueByLookup("1", LookupEnum.LTE, 2)).toBeTruthy();
    expect(handler.compareValueByLookup(2, LookupEnum.LTE, 2)).toBeTruthy();
    expect(handler.compareValueByLookup(3, LookupEnum.LTE, 2)).toBeFalsy();
    expect(handler.compareValueByLookup([0], LookupEnum.LTE, 2)).toBeFalsy();
    // gt
    expect(handler.compareValueByLookup(3, LookupEnum.GT, 2)).toBeTruthy();
    expect(handler.compareValueByLookup("3", LookupEnum.GT, 2)).toBeTruthy();
    expect(handler.compareValueByLookup(2, LookupEnum.GT, 2)).toBeFalsy();
    expect(handler.compareValueByLookup(1, LookupEnum.GT, 2)).toBeFalsy();
    expect(handler.compareValueByLookup([3], LookupEnum.GT, 2)).toBeFalsy();
    // gte
    expect(handler.compareValueByLookup(3, LookupEnum.GTE, 2)).toBeTruthy();
    expect(handler.compareValueByLookup("3", LookupEnum.GTE, 2)).toBeTruthy();
    expect(handler.compareValueByLookup(2, LookupEnum.GTE, 2)).toBeTruthy();
    expect(handler.compareValueByLookup(1, LookupEnum.GTE, 2)).toBeFalsy();
    expect(handler.compareValueByLookup([3], LookupEnum.GTE, 2)).toBeFalsy();
  });

  test("test filter rows", () => {
    // 异常参数输入
    expect(handler.handleFilterRows(undefined, [], TEST_ROWS, { name: "c" })).toHaveLength(TEST_ROWS.length);
    expect(handler.handleFilterRows({}, {}, TEST_ROWS, { name: "c" })).toHaveLength(TEST_ROWS.length);
    expect(handler.handleFilterRows({}, undefined, TEST_ROWS, { name: "c" })).toHaveLength(TEST_ROWS.length);
    expect(handler.handleFilterRows({}, [], TEST_ROWS, [])).toHaveLength(TEST_ROWS.length);
    expect(handler.handleFilterRows({}, [], TEST_ROWS, "")).toHaveLength(TEST_ROWS.length);
    let results;
    // filterFields
    results = handler.handleFilterRows({ name: ["exact"] }, [], TEST_ROWS, { name: "a" });
    expect(results).toHaveLength(1);
    expect(results).toEqual([{ id: 3, name: "a" }]);
    results = handler.handleFilterRows({ name: ["exact"] }, [], TEST_ROWS, { name__exact: "a" });
    expect(results).toEqual([{ id: 3, name: "a" }]);
    results = handler.handleFilterRows({ name: ["contain"] }, [], TEST_ROWS, { name: "a" });
    expect(results).toHaveLength(TEST_ROWS.length);
    results = handler.handleFilterRows({ name: ["contains"] }, [], TEST_ROWS, { name__contains: "a" });
    expect(results).toHaveLength(2);
    // searchFields
    results = handler.handleFilterRows({}, [], TEST_ROWS, { search: "ab" });
    expect(results).toHaveLength(TEST_ROWS.length);
    results = handler.handleFilterRows({}, ["name"], TEST_ROWS, { search: "ab" });
    expect(results).toHaveLength(1);
    expect(results).toEqual([{ id: 1, name: "ab" }]);
  });

  test("test ordering rows by fields", () => {
    let results;
    // 参数输入为空时
    results = handler.handleSortRows(TEST_ROWS, "", []);
    expect(results.map(item => item.id)).toEqual([1, 2, 3, 4, 5]);
    results = handler.handleSortRows(TEST_ROWS, "name", []);
    expect(results.map(item => item.id)).toEqual([1, 2, 3, 4, 5]);
    results = handler.handleSortRows(TEST_ROWS, "name", ["id"]);
    expect(results.map(item => item.id)).toEqual([1, 2, 3, 4, 5]);
    results = handler.handleSortRows(TEST_ROWS, "", ["name"]);
    expect(results.map(item => item.id)).toEqual([1, 2, 3, 4, 5]);
    // -id未生效
    results = handler.handleSortRows(TEST_ROWS, "name,-id", ["name"]);
    expect(results.map(item => item.id)).toEqual([3, 1, 2, 4, 5]);
    // 两个都生效
    results = handler.handleSortRows(TEST_ROWS, "+name,-id", ["name", "id"]);
    expect(results.map(item => item.id)).toEqual([3, 1, 2, 5, 4]);
    // -id未生效
    results = handler.handleSortRows(TEST_ROWS, "-name,-id", ["name"]);
    expect(results.map(item => item.id)).toEqual([4, 5, 2, 1, 3]);
    // name未生效
    results = handler.handleSortRows(TEST_ROWS, "name,-id", ["id"]);
    expect(results.map(item => item.id)).toEqual([5, 4, 3, 2, 1]);
    // 二级排序
    results = handler.handleSortRows(TEST_ROWS, "city__name", ["city__name"]);
    expect(results.map(item => item.id)).toEqual([2, 1, 3, 4, 5]);
  });

  test("test query rows", () => {
    const config = {
      rows: TEST_ROWS,
      search_fields: ["name"],
      ordering_fields: ["name", "id"],
      pk_field: "id",
    };
    let results = handler.queryRows({ search: "a", ordering: ["+name"] }, config);
    expect(results.map(item => item.id)).toEqual([3, 1]);
    // 查找具体row
    let row;
    row = handler.findRowByPk(1, null, config);
    expect(row[config.pk_field]).toBe(1);
    row = handler.findRowByPk(-1, null, config);
    expect(row).toBeUndefined();
    // 带了搜索条件，找不到
    row = handler.findRowByPk(2, { search: "a" }, config);
    expect(row).toBeUndefined();
    // 更换pk_field
    config["pk_field"] = "name";
    row = handler.findRowByPk(1, null, config);
    expect(row).toBeUndefined();
    row = handler.findRowByPk("a", null, config);
    expect(row["id"]).toBe(3);
  });

  test("gen new pk", () => {
    expect(handler.genRowCreateNewPk("id", TEST_ROWS)).toBe(6);
    expect(handler.genRowCreateNewPk("name", TEST_ROWS)).toBe(1);
  });
});

const filePath = "fixtures/users.json";

describe("test restfule api", () => {
  beforeEach(() => {
    // 加载配置
    loadFileToConfig(filePath);
  });
  afterEach(() => {
    global.jsonConfig = {};
  });

  test("test validate restful post data", () => {
    // 测试users.json中的rules
    const {
      config: { rules },
    } = global.jsonConfig[filePath];
    // 输入参数为空
    expect(validateSubmitData({ test: 1 }, [])).toEqual({ test: 1 });
    expect(validateSubmitData({ test: 1 }, {}, true)).toEqual({ test: 1 });
    expect(validateSubmitData({}, rules, true)).toEqual({});
    expect(() => validateSubmitData([], rules, true)).toThrow(/only be a dictionary/);
    let data = {
      nickname: "test",
      is_active: true,
      age: 18,
      gender: "male",
      score: 100,
      created_at: "2024-12-07T15:57:08.000Z",
      test: "other",
    };
    expect(() => validateSubmitData(data, rules)).toThrow(/username.*is required/);
    expect(validateSubmitData(data, rules, true)).toBeDefined();
    expect(logger.error).toHaveBeenCalled();
    // 正常数据
    data["username"] = "test";
    let result = validateSubmitData(data, rules);
    delete result.created_at;
    const expectRet = JSON.parse(JSON.stringify(data));
    delete expectRet.created_at;
    expect(result).toEqual(expectRet);
    // test error
    expect(validateSubmitData(data, { create_at: { type: "date", format: "YYYY-MM-DD HH:mm:ss" } })).toBeDefined();
    expect(logger.error).toHaveBeenCalled();
    // test_format joi没有这个方法
    expect(validateSubmitData(data, { nickname: { type: "string", test_format: "test" } })).toBeDefined();
    expect(logger.error).toHaveBeenCalled();
  });

  test("test restful api response", () => {
    const {
      config: { rows, pk_field },
    } = global.jsonConfig[filePath];
    const oldLength = rows.length;
    let response;
    response = handler.initRestfulResponse({ method: MethodEnum.GET }, "_test", {});
    expect(response.code).toBe(404);
    // get list
    response = handler.initRestfulResponse({ method: MethodEnum.GET }, filePath, {});
    expect(response.json.count).toBe(oldLength);
    // list 分页
    response = handler.initRestfulResponse({ method: MethodEnum.GET, query: { page_size: 1 } }, filePath, {});
    expect(response.json.count).toBe(oldLength);
    expect(response.json.results).toHaveLength(1);
    // post data
    let body = {
      nickname: "test",
      is_active: true,
      age: 18,
      gender: "male",
      score: 100,
      created_at: "2024-12-07T15:57:08.000Z",
      test: "other",
    };
    response = handler.initRestfulResponse({ method: MethodEnum.POST, body }, filePath, {});
    expect(response.code).toBe(400);
    body["username"] = "test";
    response = handler.initRestfulResponse({ method: MethodEnum.POST, body }, filePath, {});
    expect(response.code).toBe(201);
    expect(response.json[pk_field]).toBe(6);
    expect(rows).toHaveLength(oldLength + 1);
    // put list
    response = handler.initRestfulResponse({ method: MethodEnum.PUT, body: { name: newName } }, filePath, {});
    expect(response.code).toBe(405);
    // 传递pk_filed
    const pk = 0;
    body = {
      ...body,
      [pk_field]: pk,
      username: "test2",
    };
    response = handler.initRestfulResponse({ method: MethodEnum.POST, body }, filePath, {});
    expect(response.code).toBe(201);
    expect(response.json[pk_field]).toBe(pk);
    expect(rows).toHaveLength(oldLength + 2);
    // get detail
    response = handler.initRestfulResponse({ method: MethodEnum.GET }, filePath, { detail: true });
    expect(response.code).toBe(404);
    response = handler.initRestfulResponse({ method: MethodEnum.GET, params: [] }, filePath, { detail: true });
    expect(response.code).toBe(404);
    response = handler.initRestfulResponse({ method: MethodEnum.GET, params: { pk } }, filePath, { detail: true });
    expect(response.code).toBe(200);
    expect(response.json[pk_field]).toBe(pk);
    // 带了筛选条件，不满足无法获取数据
    response = handler.initRestfulResponse({ method: MethodEnum.GET, params: { pk }, query: { search: "sky" } }, filePath, { detail: true });
    expect(response.code).toBe(404);
    // put 数据不全
    const newName = "test_new";
    response = handler.initRestfulResponse({ method: MethodEnum.PUT, params: { pk }, body: { name: newName } }, filePath, { detail: true });
    expect(response.code).toBe(400);
    response = handler.initRestfulResponse({ method: MethodEnum.PUT, params: { pk }, body: { ...body, [pk_field]: pk } }, filePath, { detail: true });
    expect(response.code).toBe(200);
    expect(response.json.name !== newName).toBeTruthy();
    response = handler.initRestfulResponse({ method: MethodEnum.PUT, params: { pk } }, filePath, { detail: true });
    expect(response.code).toBe(400);
    // patch 修改成功
    response = handler.initRestfulResponse({ method: MethodEnum.PATCH, params: { pk }, body: { name: newName } }, filePath, { detail: true });
    expect(response.code).toBe(200);
    response = handler.initRestfulResponse({ method: MethodEnum.GET, params: { pk } }, filePath, { detail: true });
    expect(response.code).toBe(200);
    expect(response.json.name).toBe(newName);
    // post to detail, not allow
    response = handler.initRestfulResponse({ method: MethodEnum.POST, params: { pk }, body: {} }, filePath, { detail: true });
    expect(response.code).toBe(405);
    // delete
    response = handler.initRestfulResponse({ method: MethodEnum.DELETE, params: { pk } }, filePath, { detail: true });
    expect(response.code).toBe(204);
    expect(response.json[pk_field]).toBe(pk);
    response = handler.initRestfulResponse({ method: MethodEnum.DELETE, params: { pk } }, filePath, { detail: true });
    expect(response.code).toBe(404);
    // get after delete
    response = handler.initRestfulResponse({ method: MethodEnum.GET, params: { pk } }, filePath, { detail: true });
    expect(rows).toHaveLength(oldLength + 1);
    expect(response.json).toBeUndefined();
    expect(response.code).toBe(404);
  });
});
