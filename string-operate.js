const { clipboard } = require("electron");

const BigNumber = require("bignumber.js");
const textArea = document.getElementById("textarea");
const copyBtn = document.getElementById("btn");
const typeSelect = document.getElementById("type-select");

copyBtn.addEventListener("click", () => {
  let inputString = textArea.value.trim();
  let selectValue = typeSelect.value;
  if (selectValue === "mybatis") {
    inputString = mybatisJoins(inputString);
  } else if (selectValue === "sort") {
    inputString = sortJoins(inputString);
  } else if (selectValue === "join") {
    inputString = strJoins(inputString);
  } else if (selectValue === "log") {
    inputString = logToSql(inputString);
  }
  clipboard.writeText(inputString);
  textArea.value = inputString;
});
// 排序
function sortJoins(temp) {
  let tempArr = Array.from(new Set(temp.split("\n")));
  if (tempArr.every((x) =>new BigNumber(x).toString() !== "NaN")) {
    return tempArr
      .map(x => new BigNumber(x))
      .sort((a, b) => a.comparedTo(b))
      .map(x => x.toFixed())
      .join("\n");
  } else {
    return tempArr
      .sort((a, b) => (a.toLowerCase() > b.toLowerCase() ? 1 : -1))
      .join("\n");
  }
}
// mybatis操作
function mybatisJoins(temp) {
  temp = temp.replace(/@Select\(|@Update\(|@Delete\(|@Insert\(/, "");
  return eval(temp.substring(0, temp.lastIndexOf(")")).trim());
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

let keyWordsArr = "Byte,null,Float,Long,Short,String,Double,Integer,Boolean,Timestamp,LocalDate,BigDecimal,LocalDateTime,StringReader"
  .split(",")
  .map(x => x + "), ");

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

function logToSql(logs) {
  let logArr = logs.split("\n");
  let resultArr = [];
  for (let index = 0; index < logArr.length; index++) {
    const element = logArr[index];
    if (element.includes(" ==> Parameters:")) {
      let arr = parseParamLog(element);
      if (arr.length > 0) {
        resultArr.push(new MybatisLog(true, arr));
      }
    } else if (element.includes(" ==>  Preparing:")) {
      let arr = element.replace(/.+==>  Preparing: /, "").split("?");
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
  let chars = (paramLog.replace(/.+==> Parameters: /, "") + ", ")
    .replace(/, null, /g, ", null(null), ")
    .replace(/, null, /g, ", null(null), ")
    .replace(/^null, /, "null(null), ")
    .split("");
  if (chars.length <= 3) {
    return [];
  }
  let paramValue = [];
  for (let i = 1, j = 0; i < chars.length; i++) {
    if (chars[i] === "(") {
      // 这里获取类型
      let type = chars.slice(i + 1, i + 17).join("");
      // 这里获取 参数信息
      let value = chars.slice(j, i).join("");
      for (const item of keyWordsArr) {
        if (type.startsWith(item)) {
          if (item.startsWith("LocalDateTime")) {
            value = `'${value.replace("T", " ").replace(/\.\d+$/, "")}'`;
          } else if (
            item.startsWith("String") ||
            item.startsWith("StringReader") ||
            item.startsWith("Timestamp") ||
            item.startsWith("LocalDate")
          ) {
            value = `'${value}'`;
          }
          j = i + item.length + 1;
          // 此处 i 此处赋值之后 会再for 里面再次加1
          i = j - 1; // 避免空字符串判断失败
          paramValue.push(value);
          break;
        }
      }
    }
  }
  return paramValue;
}