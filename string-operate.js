const { clipboard } = require("electron");
const CryptoJS = require("crypto-js");
const BigNumber = require("bignumber.js");
const textArea = document.getElementById("textarea");
const copyBtn = document.getElementById("btn");
const typeSelect = document.getElementById("type-select");
const JSONbig = require('json-bigint');


copyBtn.addEventListener("click", () => {
  let inputString = textArea.value.trim();
  let selectValue = typeSelect.value;
  if (selectValue === "mybatis") {
    inputString = mybatisJoins(inputString);
  } else if (selectValue === "sort") {
    inputString = sortJoins(inputString);
    typeSelect.value = "join";
  } else if (selectValue === "sql") {
    inputString = getInfoBySql(inputString);
    typeSelect.value = "sort";
  } else if (selectValue === "join") {
    inputString = strJoins(inputString);
  } else if (selectValue === "log") {
    inputString = logToSql(inputString);
  } else if (selectValue === "generate") {
    inputString = generate(inputString);
    typeSelect.value = "sort";
  } else if (selectValue === "json") {
    inputString = getValueFromJson(inputString);
    typeSelect.value = "sort";
  } else if (selectValue === "des") {
    inputString = getDAesString(inputString);
    typeSelect.value = "sort";
  }
  clipboard.writeText(inputString);
  textArea.value = inputString;
});

function getInfoBySql(str) {
  let tempArr = str.split("\n");
  if (tempArr.every((x) => / SET  WHERE /.test(x))) {
    tempArr = tempArr.map((x) => {
      return x
        .replace(/^UPDATE.+?= /, "")
        .replace(/;$/, "")
        .replace(/^'|^`|'$|`$/g, "");
    });
  } else if (tempArr.every((x) => x.startsWith("INSERT "))) {
    tempArr = tempArr.map((x) => {
      return x
        .replace(/^.+\) VALUES \(/, "")
        .replace(/\);$/, "")
        .replace(/^'|'$/g, "");
    });
  } else {
    tempArr = tempArr.map((x) => {
      return x
        .replace(/^UPDATE .+?= /, "")
        .replace(/;$/, "")
        .replace(/ where.+/i, "")
        .replace(/^'|^`|'$|`$/g, "");
    });
  }
  return tempArr.join("\n");
}

// 排序
function sortJoins(temp) {
  let tempArr = Array.from(new Set(temp.split("\n")));
  if (tempArr.every((x) => new BigNumber(x).toString() !== "NaN")) {
    return tempArr
      .map((x) => new BigNumber(x))
      .sort((a, b) => a.comparedTo(b))
      .map((x) => x.toFixed())
      .join("\n");
  } else {
    return tempArr.sort((a, b) => (a.toLowerCase() > b.toLowerCase() ? 1 : -1)).join("\n");
  }
}
// mybatis操作
function mybatisJoins(temp) {
  temp = temp.replace(/@Select\(|@Update\(|@Delete\(|@Insert\(/, "");
  return eval(temp.substring(0, temp.lastIndexOf(")")).trim());
}

// 生成数字
function generate(inputString) {
  return [...new Array(parseInt(inputString)).keys()].reverse().join("\n");
}

// 字符串拼接
function strJoins(temp) {
  let tempArr = temp.split("\n");
  if (tempArr.length === 1) {
    if (temp.includes('"')) {
      temp = temp.replace(/","/g, "$|^").replace('"', "^");
      return temp.substring(0, temp.length - 1) + "$";
    } else if (temp.includes("^")) {
      temp = temp.replace(/\$\|\^/g, ",");
      return temp.slice(1, temp.length - 1);
    } else {
      return '"' + temp.replace(/,/g, '","') + '"';
    }
  } else {
    return '"' + tempArr.join('","') + '"';
  }
}

const nativeArr = "(Byte),(Float),(Long),(Short),(Double),(Integer),(Boolean),(BigDecimal)".split(',');
const stringArr = "(String),(StringReader),(Timestamp),(LocalDate)".split(',');


class MybatisLog {
  constructor(isParam, arr) {
    this.isParam = isParam;
    this.isUsed = false;
    this.arr = arr === undefined ? [] : arr;
  }
  push(item) {
    this.arr.push(item);
  }
  setParamUsed() {
    this.isUsed = true;
  }
  effectiveParam(length) {
    return this.isParam && !this.isUsed && this.arr.length === length;
  }
  getLength() {
    return this.arr.length;
  }
}
let logTypeArr = [/\WDEBUG\W/, /\WINFO\W/, /\WTRACE\W/,/\WWARN\W/,/\WERROR\W/]
function logToSql(logs) {
  let logArr = logs.split("\n");
  let resultArr = [];
  for (let index = logArr.length - 1; index > 0; index--) {
    if (/\(.+?\)$/.test(logArr[index]) && logTypeArr.every(x => !x.test(logArr[index]))) {
      logArr[index - 1] = logArr[index - 1] + "\n" + logArr[index];
      logArr[index] = "";
    }
  }

  for (let index = 0; index < logArr.length; index++) {
    const element = logArr[index];
    if (/=> +Parameters: /.test(element)) {
      let arr = parseParamLog(element);
      if (arr.length > 0) {
        resultArr.push(new MybatisLog(true, arr));
      }
    } else if (/=> +Preparing: /.test(element)) {
      let arr = element.replace(/.+=> +Preparing: /, "").split("?");
      resultArr.push(new MybatisLog(false, arr));
    }
  }
  let sqlArr = [];
  for (let index = 0; index < resultArr.length; index++) {
    const element = resultArr[index];
    if (!element.isParam) {
      if (element.getLength() == 1) {
        sqlArr.push(element.arr[0]);
      } else {
        sqlArr.push(getRealSql(resultArr, index));
      }
    }
  }
  return sqlArr.join("\n");
}

function getRealSql(resultArr, index) {
  const element = resultArr[index];
  for (let j = index + 1; j < resultArr.length; j++) {
    let params = resultArr[j];
    // 判断是否匹配
    if (params.effectiveParam(element.getLength() - 1)) {
      let paramsArr = params.arr;
      let sql = "";
      // 如果匹配的话, 拼接字符串
      for (let l = 0; l < paramsArr.length; l++) {
        sql += element.arr[l] + paramsArr[l];
      }
      sql += element.arr[paramsArr.length];
      // 判断是否包含`;`
      if (!element.arr[paramsArr.length].includes(";")) {
        sql += ";";
      }
      resultArr[j].setParamUsed();
      return sql;
    }
  }
  return element.arr.join("");
}

function parseParamLog(paramLog) {
  paramLog = paramLog.replace(/.+=> +Parameters: /, " ")
  if (paramLog.length <= 3) {
    return [];
  }
  let paramValue = [];
  const splitedArr = paramLog.split(',');
  let formerValue = '';
  splitedArr.forEach(x => {
    x = formerValue + x.replace(/^ /, '');
    formerValue = '';
    if (x.endsWith('(LocalDateTime)')) {
      x = `'${x.replace("T", " ").replace(/\.\d+$/, "")}'`;
    } else if (stringArr.some(y => x.endsWith(y))) {
      x = `'${x.replace(/\n/g, '')}'`;
    } else if (x !== 'null' && nativeArr.every(y => !x.endsWith(y))) {
      formerValue = x;
      return;
    }
    if (x.endsWith("'")) {
      paramValue.push(x.replace(/\(\w+\)'$/, "'"));
    } else {
      paramValue.push(x.replace(/\(\w+\)$/, ""));
    }
  });
  return paramValue;
}

let key = CryptoJS.enc.Utf8.parse(process.env["jsutils_key"] ?? "");
let iv = CryptoJS.enc.Utf8.parse(process.env["jsutils_iv"] ?? "");

function getDAesString(encrypted) {
  try {
    let decrypted = CryptoJS.AES.decrypt(encrypted, key, {
      iv: iv,
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });
    return decrypted.toString(CryptoJS.enc.Utf8) ?? "";
  } catch (err) {
    return "";
  }
}

function getValueFromJson(str) {
  return JSONbig.parse(str).map((x) => {
    let arr = Object.keys(x);
    if (arr.includes("id")) {
      return x.id;
    }
    return x[arr[0]];
  }).join("\n");
}

module.exports = {
  getDAesString: function (encrypted) {
    return getDAesString(encrypted);
  },
};
