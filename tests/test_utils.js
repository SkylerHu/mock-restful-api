const { test, expect, describe } = require("@jest/globals");

const utils = require("../src/utils.js");

describe("test utils", () => {
  test("test utils judge value type", () => {
    // isNull
    expect(utils.isNull(null)).toBeTruthy();
    expect(utils.isNull(undefined)).toBeTruthy();
    expect(utils.isNull("")).toBeFalsy();
    // isBlank
    expect(utils.isBlank(null)).toBeTruthy();
    expect(utils.isBlank("")).toBeTruthy();
    expect(utils.isBlank(0)).toBeFalsy;
    // isBooleanTrue
    ["true", "True", "1", 1, true].forEach(value => {
      expect(utils.isBooleanTrue(value)).toBeTruthy();
      expect(utils.isBoolean(value)).toBeTruthy();
    });
    expect(utils.isBooleanTrue("a")).toBeFalsy();
    // isBooleanFalse
    ["false", "False", "0", 0, false].forEach(value => {
      expect(utils.isBooleanFalse(value)).toBeTruthy();
      expect(utils.isBoolean(value)).toBeTruthy();
    });
    expect(utils.isBooleanFalse("a")).toBeFalsy();
    // isAbsBoolean
    expect(utils.isAbsBoolean(1)).toBeFalsy();
    expect(utils.isAbsBoolean(true)).toBeTruthy();
    expect(utils.isAbsBoolean(false)).toBeTruthy();
    // isString
    expect(utils.isString("a")).toBeTruthy();
    expect(utils.isString([])).toBeFalsy();
    expect(utils.isString({})).toBeFalsy();
    expect(utils.isString(1)).toBeFalsy();
    expect(utils.isString(false)).toBeFalsy();
    // isAbsNumber
    expect(utils.isAbsNumber(1)).toBeTruthy();
    expect(utils.isAbsNumber(1.1)).toBeTruthy();
    expect(utils.isAbsNumber(-1)).toBeTruthy();
    expect(utils.isAbsNumber("0")).toBeFalsy();
    expect(utils.isAbsNumber("0.0")).toBeFalsy();
    expect(utils.isAbsNumber(NaN)).toBeFalsy();
    expect(utils.isAbsNumber(Infinity)).toBeFalsy();
    // isNumber
    expect(utils.isNumber(1)).toBeTruthy();
    expect(utils.isNumber("0")).toBeTruthy();
    expect(utils.isNumber("1.1")).toBeTruthy();
    expect(utils.isNumber("-1.1")).toBeTruthy();
    expect(utils.isNumber("a")).toBeFalsy();
    expect(utils.isNumber([])).toBeFalsy();
    expect(utils.isNumber([0])).toBeFalsy();
    expect(utils.isNumber({})).toBeFalsy();
    // isArray
    expect(utils.isArray([])).toBeTruthy();
    expect(utils.isArray([1, "a"])).toBeTruthy();
    expect(utils.isArray({})).toBeFalsy();
    expect(utils.isArray("a,b")).toBeFalsy();
    // isDict
    expect(utils.isDict({})).toBeTruthy();
    expect(utils.isDict(0)).toBeFalsy();
    expect(utils.isDict([])).toBeFalsy();
    expect(utils.isDict([0, "a"])).toBeFalsy();
    expect(utils.isDict("a,b")).toBeFalsy();
    // allowCompareRange
    expect(utils.allowCompareRange(1)).toBeTruthy();
    expect(utils.allowCompareRange(true)).toBeTruthy();
    expect(utils.allowCompareRange(null)).toBeTruthy();
    expect(utils.allowCompareRange("")).toBeTruthy();
    expect(utils.allowCompareRange("a,b")).toBeTruthy();
    expect(utils.allowCompareRange([])).toBeFalsy();
    expect(utils.allowCompareRange({})).toBeFalsy();
  });
});
