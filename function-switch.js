const { clipboard } = require("electron");
const { BrowserWindow } = require("electron").remote;

const textArea = document.getElementById("textarea");
const typeSelect = document.getElementById("type-select");
const copyBtn = document.getElementById("btn");

let valueArr = [];
let domArr = document
  .getElementById("type-select")
  .getElementsByTagName("option");
for (let i = 0; i < domArr.length; i++) {
  valueArr.push(domArr[i].value);
}
const currentWin = BrowserWindow.getAllWindows()[0];
document.addEventListener("keydown", x => {
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
  let newIndex =
    (valueArr.indexOf(selectValue) + value + valueArr.length) % valueArr.length;
  typeSelect.value = valueArr[newIndex];
}

currentWin.on("focus", () => {
  let currentValue = clipboard.readText();
  if (currentValue) {
    textArea.value = currentValue;
  }
});
