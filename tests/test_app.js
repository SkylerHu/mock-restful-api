const { test, describe, beforeAll, afterAll, expect } = require("@jest/globals");

const request = require("supertest");

const initApp = require("../src/app.js");
const { initJsonFiles } = require("../src/loadFile.js");

global.app;

describe("test app api", () => {
  beforeAll(() => {
    // 加载配置
    initJsonFiles("fixtures");
    global.app = initApp();
  });
  afterAll(() => {
    global.jsonConfig = {};
  });
  test("test resutful api", async () => {
    let res;
    // list
    res = await request(global.app).get("/web/users/");
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(5);
    // post
    res = await request(global.app).post("/web/users/").send({ username: "test" }).set("Accept", "application/json");
    expect(res.status).toBe(201);
    const pkValue = res.body.id;
    expect(pkValue).toBeDefined();
    // get detail
    res = await request(global.app).get(`/web/users/${pkValue}/`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(pkValue);
    // patch
    expect(res.body.nickname).toBeUndefined();
    res = await request(global.app).patch(`/web/users/${pkValue}/`).send({ nickname: "test" }).set("Accept", "application/json");
    expect(res.status).toBe(200);
    expect(res.body.nickname).toBe("test");
    // put
    res = await request(global.app).put(`/web/users/${pkValue}/`).send({ nickname: "test" }).set("Accept", "application/json");
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/username.*is required/);
    // delete
    res = await request(global.app).delete(`/web/users/${pkValue}/`);
    expect(res.status).toBe(204);
    // confirm delete
    res = await request(global.app).get(`/web/users/${pkValue}/`);
    expect(res.status).toBe(404);
  });
  test("test resutful actions", async () => {
    let res;
    res = await request(global.app).post("/web/users/create/");
    expect(res.status).toBe(201);
    expect(res.headers["x-test"]).toBe("test");
  });

  test("test normal apis", async () => {
    let res;
    res = await request(global.app).head("/web/enums/head/");
    expect(res.status).toBe(400);
    // response text
    res = await request(global.app).get("/web/enums/");
    expect(res.status).toBe(200);
    // download file
    res = await request(global.app).get("/web/download/");
    expect(res.status).toBe(200);
    res = await request(global.app).get("/web/download/abs/");
    // 文件不存在，所有404
    expect(res.status).toBe(404);
  });
});

describe("test app set prefix", () => {
  beforeAll(() => {
    // 加载配置
    initJsonFiles("fixtures");
  });
  afterAll(() => {
    global.jsonConfig = {};
  });
  test("test resutful api", async () => {
    let res;
    // 不带任何斜线
    let app = initApp({ prefix: "open" });
    res = await request(app).get("/open/web/users/");
    expect(res.status).toBe(200);

    app = initApp({ prefix: "" });
    res = await request(app).get("/web/users/1/");
    expect(res.status).toBe(200);

    // 带斜线
    app = initApp({ prefix: "/" });
    res = await request(app).get("/web/users/");
    expect(res.status).toBe(200);

    app = initApp({ prefix: "/open" });
    res = await request(app).get("/open/web/users/");
    expect(res.status).toBe(200);

    app = initApp({ prefix: "/open/" });
    res = await request(app).get("/open/web/users/");
    expect(res.status).toBe(200);
  });
});

describe("test app delay", () => {
  beforeAll(() => {
    // 加载配置
    initJsonFiles("fixtures");
    global.app = initApp({ delay: 10 });
  });
  afterAll(() => {
    global.jsonConfig = {};
  });
  test("test delay", async () => {
    let res;
    res = await request(global.app).put("/web/info/");
    expect(res.status).toBe(200);
    res = await request(global.app).get("/web/enums/");
    expect(res.status).toBe(200);
  });
});
