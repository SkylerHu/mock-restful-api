const { test, expect, describe, afterEach } = require("@jest/globals");

const logger = require("../src/logger.js");
const loadFile = require("../src/loadFile.js");
const { validateConfig } = require("../src/validator.js");

const TEST_FILE_PATH = "fixtures/open/custom.json";
const TEST_RESTFUL_FILE = "fixtures/users.json";

describe("test load file", () => {
  afterEach(() => {
    global.jsonConfig = {};
  });
  test("test get json file list", () => {
    expect(loadFile.getJsonFileList(TEST_FILE_PATH)).toEqual([TEST_FILE_PATH]);
    expect(loadFile.getJsonFileList("fixtures/open/")).toEqual([TEST_FILE_PATH]);
    expect(loadFile.getJsonFileList("fixtures")).toEqual(["fixtures/groups.json", "fixtures/illegal.json", TEST_FILE_PATH, TEST_RESTFUL_FILE]);
  });

  test("test load file content", () => {
    const content = loadFile.loadFileContent(TEST_FILE_PATH);
    expect(content["file_path"]).toEqual(TEST_FILE_PATH);
    expect(content).toHaveProperty("apis");
    expect(content["apis"]).toHaveLength(6);
  });
  test("test load dir or not json file", () => {
    expect(loadFile.loadFileContent("fixtures")).toBeUndefined();
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringMatching(/The filePath is not a file/));
    expect(loadFile.loadFileContent("fixtures/open/text.txt")).toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(expect.stringMatching(/load file fail/));
  });

  test("test validate rote", () => {
    expect(() => loadFile.validateRoute({}, global.jsonConfig)).toThrow(/"method" cannot be empty/);
    expect(() => loadFile.validateRoute({ method: "get" }, global.jsonConfig)).toThrow(/"path" cannot be empty/);

    // 加载文件
    loadFile.loadFileToConfig(TEST_RESTFUL_FILE);
    const { config, routes } = global.jsonConfig[TEST_RESTFUL_FILE];
    expect(routes).toHaveLength(9);
    const { restful } = config;
    expect(() => loadFile.validateRoute({ restful }, global.jsonConfig)).toThrow(/The restful interface already exists/);
    const route = routes[routes.length - 1];
    expect(() => loadFile.validateRoute(route, global.jsonConfig)).toThrow(/method\+path already exists/);
  });
  test("test load file to config", () => {
    loadFile.loadFileToConfig(TEST_RESTFUL_FILE);
    const { routes } = global.jsonConfig[TEST_RESTFUL_FILE];
    expect(routes).toHaveLength(9);
    // 多次加载相同文件，路由不会增多
    loadFile.loadFileToConfig(TEST_RESTFUL_FILE);
    const { routes: routes2 } = global.jsonConfig[TEST_RESTFUL_FILE];
    expect(routes2).toHaveLength(9);

    // 处理非json文件会报错
    expect(loadFile.loadFileToConfig("fixtures/open/test.text")).toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(expect.stringMatching(/load config fail/));

    // 总的入口
    loadFile.initJsonFiles("fixtures");
    let allRoutes = [];
    for (let filePath in global.jsonConfig) {
      const { routes } = global.jsonConfig[filePath] || {};
      allRoutes = allRoutes.concat(routes);
    }
    expect(allRoutes).toHaveLength(20);
  });
});

describe("test validate config", () => {
  test("test validate config fail", () => {
    expect(() => validateConfig([])).toThrow(/must be of type object/);
    expect(() => validateConfig({ page_size: "a" })).toThrow(/must be a number/);
    expect(() => validateConfig({ page_size: -1 })).toThrow(/must be greater than or equal to 1/);
    expect(() => validateConfig({ filter_fields: [] })).toThrow(/must be of type object/);
    expect(() => validateConfig({ filter_fields: { test: "test" } })).toThrow(/must be an array/);
    expect(() => validateConfig({ search_fields: {} })).toThrow(/must be an array/);
    expect(() => validateConfig({ ordering_fields: {} })).toThrow(/must be an array/);
    expect(() => validateConfig({ ordering: {} })).toThrow(/must be an array/);
    expect(() => validateConfig({ pk_field: 1 })).toThrow(/must be a string/);
    expect(() => validateConfig({ rules: [] })).toThrow(/must be of type object/);
    expect(() => validateConfig({ rules: { test: [] } })).toThrow(/must be of type object/);
    expect(() => validateConfig({ rules: { test: {} } })).toThrow(/rules.test.type.*is required/);
    expect(() => validateConfig({ rows: {} })).toThrow(/must be an array/);
    expect(() => validateConfig({ rows: [1, 2] })).toThrow(/must be of type object/);
    expect(() => validateConfig({ actions: {} })).toThrow(/must be an array/);
    expect(() => validateConfig({ actions: [1] })).toThrow(/must be of type object/);
    expect(() => validateConfig({ actions: [{}] })).toThrow(/actions\[\d+\].method.*is required/);
    expect(() => validateConfig({ actions: [{ method: "GET" }] })).toThrow(/actions\[\d+\].url_path.*is required/);
    expect(() => validateConfig({ apis: {} })).toThrow(/must be an array/);
    expect(() => validateConfig({ apis: [1] })).toThrow(/must be of type object/);
    expect(() => validateConfig({ apis: [{}] })).toThrow(/apis\[\d+\].method.*is required/);
    expect(() => validateConfig({ apis: [{ method: "GET" }] })).toThrow(/apis\[\d+\].path.*is required/);
  });

  test("test load file validate fail", () => {
    expect(loadFile.genConfigToRoutes("fixtures/illegal.json.txt")).toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(expect.stringMatching(/The file content is illegal/));
  });
});
