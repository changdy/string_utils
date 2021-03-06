const { clipboard } = require("electron");
const { BrowserWindow } = require("electron").remote;
const operate = require("./string-operate");
const textArea = document.getElementById("textarea");
const typeSelect = document.getElementById("type-select");
const copyBtn = document.getElementById("btn");

let valueArr = [];
let domArr = document.getElementById("type-select").getElementsByTagName("option");
for (let i = 0; i < domArr.length; i++) {
  valueArr.push(domArr[i].value);
}
const currentWin = BrowserWindow.getAllWindows()[0];
document.addEventListener("keydown", (x) => {
  let key = x.key,
    keyLowerCase = x.key.toLowerCase();
  if (key === "Escape") {
    currentWin.hide();
  } else if (keyLowerCase === "j") {
    changeSelectValue(1);
  } else if (keyLowerCase === "k") {
    changeSelectValue(-1);
  } else if (key === "Enter") {
    copyBtn.click();
  }
});
function changeSelectValue(value) {
  let selectValue = typeSelect.value;
  let newIndex = (valueArr.indexOf(selectValue) + value + valueArr.length) % valueArr.length;
  typeSelect.value = valueArr[newIndex];
}

let mybatisReg = /@Select|@Update|@Delete|@Insert/;
let numberReg = /^\d+$/;

currentWin.on("focus", () => {
  let currentValue = clipboard.readText();
  if (currentValue) {
    currentValue = currentValue.trim().replace(/\r/g, ""); // win 平台下面是\r\n 需要注意
    textArea.value = currentValue;
    let desValue = operate.getDAesString(currentValue);
    if (desValue !== "" && desValue !== undefined) {
      typeSelect.value = "des";
      return;
    }
    if (numberReg.test(currentValue)) {
      typeSelect.value = "generate";
    } else if (/=> +Parameters: /.test(currentValue)) {
      typeSelect.value = "log";
    } else if (mybatisReg.test(currentValue)) {
      typeSelect.value = "mybatis";
    } else if (currentValue.split("\n").every((x) => x.startsWith("UPDATE") || x.startsWith("INSERT ") )) {
      typeSelect.value = "sql";
    } else if (checkJsonArr(currentValue)) {
      typeSelect.value = "json";
    } else {
      let strArr = currentValue.split("\n");
      let setSize = new Set(strArr).size;
      typeSelect.value = strArr.length === setSize ? "join" : "sort";
    }
  }
});

function checkJsonArr(str) {
  try {
    return JSON.parse(str) instanceof Array;
  } catch (err) {
    return false;
  }
}