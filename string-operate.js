const { clipboard } = require("electron");

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
  }
  clipboard.writeText(inputString);
  textArea.value = inputString;
});
// 排序
function sortJoins(temp) {
  let tempArr = Array.from(new Set(temp.split("\n")));
  if (tempArr.every(x => parseFloat(x).toString() !== "NaN")) {
    return tempArr
      .map(x => parseFloat(x))
      .sort((a, b) => (a - b > 0 ? 1 : -1))
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
