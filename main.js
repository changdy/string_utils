const { app, BrowserWindow, Tray, globalShortcut } = require("electron");
const electron = require("electron");

const path = require("path");
let mainWindow,
  windowsConfig = {
    width: 800,
    height: 300,
    resizable: false,
    title: "字符串转换小工具",
    frame: false,
    opacity: 0.95,
    skipTaskbar: true,
    maximizable: false,
    minimizable: false,
    transparent: false,
    show: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true
    }
  };
app.on("window-all-closed", function() {
  if (appIcon) {
    appIcon.destroy();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", function() {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on("browser-window-blur", function() {
  // mainWindow.hide();
});
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
  app.on("ready", initApp);
}

function initApp() {
  createWindow();
  crateTray();
  registerShortcut();
}
function createWindow() {
  mainWindow = new BrowserWindow(windowsConfig);
  mainWindow.loadFile("index.html");
  mainWindow.on("closed", function() {
    mainWindow = null;
  });
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });
}

function crateTray() {
  const iconName =
    process.platform === "win32" ? "windows-icon.png" : "iconTemplate.png";
  const iconPath = path.join(__dirname, "/assets/app-icon/tray/" + iconName);
  appIcon = new Tray(iconPath);
  appIcon.on("click", () => {
    mainWindow.show();
  });
  appIcon.on("right-click", () => {
    // 立即退出貌似会有bug
    setTimeout(() => {
      app.quit();
    }, 200);
  });
  appIcon.setToolTip("小工具");
}

function registerShortcut() {
  globalShortcut.register("CommandOrControl+1+Shift", () => {
    let tempPoint = electron.screen.getCursorScreenPoint();
    mainWindow.setPosition(tempPoint.x - 180, tempPoint.y - 100);
    mainWindow.show();
  });
}
