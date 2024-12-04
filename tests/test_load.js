import { test, expect, describe, afterEach } from "@jest/globals";

import logger from "../src/logger.js";
import * as loadFile from "../src/loadFile.js";

const TEST_FILE_PATH = "fixtures/open/custom.json";
const TEST_RESTFUL_FILE = "fixtures/users.json";

describe("test load file", () => {
  afterEach(() => {
    global.jsonConfig = {};
  });
  test("test get json file list", () => {
    expect(loadFile.getJsonFileList(TEST_FILE_PATH)).toEqual([TEST_FILE_PATH]);
    expect(loadFile.getJsonFileList("fixtures/open/")).toEqual([TEST_FILE_PATH]);
    expect(loadFile.getJsonFileList("fixtures")).toEqual(["fixtures/groups.json", TEST_FILE_PATH, TEST_RESTFUL_FILE]);
  });

  test("test load file content", () => {
    const content = loadFile.loadFileContent(TEST_FILE_PATH);
    expect(content["file_path"]).toEqual(TEST_FILE_PATH);
    expect(content).toHaveProperty("apis");
    expect(content["apis"]).toHaveLength(5);
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
    expect(allRoutes).toHaveLength(19);
  });
});

describe("test validate config", () => {
  test("test validate config fail", () => {
    expect(() => loadFile.validateConfig([])).toThrow(/must be a dict/);
    expect(() => loadFile.validateConfig({ page_size: "1" })).toThrow(/must be a int/);
    expect(() => loadFile.validateConfig({ page_size: -1 })).toThrow(/greater than 0/);
    expect(() => loadFile.validateConfig({ filter_fields: [] })).toThrow(/must be a dict/);
    expect(() => loadFile.validateConfig({ filter_fields: { test: "test" } })).toThrow(/values can only be set arrays/);
    expect(() => loadFile.validateConfig({ search_fields: {} })).toThrow(/must be a array/);
    expect(() => loadFile.validateConfig({ ordering_fields: {} })).toThrow(/must be a array/);
    expect(() => loadFile.validateConfig({ ordering: {} })).toThrow(/must be a array/);
    expect(() => loadFile.validateConfig({ pk_field: 1 })).toThrow(/must be a string/);
    expect(() => loadFile.validateConfig({ rules: [] })).toThrow(/must be a dict/);
    expect(() => loadFile.validateConfig({ rules: { test: [] } })).toThrow(/values can only be set dict/);
    expect(() => loadFile.validateConfig({ rules: { test: {} } })).toThrow(/value must have a "type"/);
    expect(() => loadFile.validateConfig({ rows: {} })).toThrow(/must be a array/);
    expect(() => loadFile.validateConfig({ rows: [1, 2] })).toThrow(/item value must be a dict/);
    expect(() => loadFile.validateConfig({ actions: {} })).toThrow(/must be a array/);
    expect(() => loadFile.validateConfig({ actions: [1] })).toThrow(/item value must be a dict/);
    expect(() => loadFile.validateConfig({ actions: [{}] })).toThrow(/item value must have a "method"/);
    expect(() => loadFile.validateConfig({ actions: [{ method: "GET" }] })).toThrow(/item value must have a "url_path"/);
    expect(() => loadFile.validateConfig({ apis: {} })).toThrow(/must be a array/);
    expect(() => loadFile.validateConfig({ apis: [1] })).toThrow(/item value must be a dict/);
    expect(() => loadFile.validateConfig({ apis: [{}] })).toThrow(/item value must have a "method"/);
    expect(() => loadFile.validateConfig({ apis: [{ method: "GET" }] })).toThrow(/item value must have a "path"/);
  });

  test("test load file validate fail", () => {
    expect(loadFile.genConfigToRoutes("fixtures/illegal.json.txt")).toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(expect.stringMatching(/The file content is illegal/));
  });
});
