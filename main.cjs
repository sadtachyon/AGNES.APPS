const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  shell,
  protocol,
  net,
  session,
  Menu,
} = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { LocalProjects } = require("./local-projects.cjs");
const smoke = process.argv.includes("--smoke-test");
if (smoke)
  app.setPath(
    "userData",
    path.join(app.getPath("temp"), "agnes-desktop-smoke"),
  );
protocol.registerSchemesAsPrivileged([
  {
    scheme: "agnes",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);
let window,
  registry,
  selecting = false;
const entry = "agnes://hub/index.html";
function trusted(event) {
  if (
    !window ||
    event.sender !== window.webContents ||
    event.senderFrame !== window.webContents.mainFrame ||
    event.senderFrame.url !== entry
  )
    throw new Error("Untrusted frame");
}
function external(url) {
  try {
    const parsed = new URL(url);
    if (["https:", "http:"].includes(parsed.protocol))
      shell.openExternal(parsed.href).catch(() => {});
  } catch {}
}
if (!app.requestSingleInstanceLock() && !smoke) app.quit();
else {
  app.on("second-instance", () => {
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });
  app
    .whenReady()
    .then(async () => {
      Menu.setApplicationMenu(null);
      registry = new LocalProjects(
        path.join(app.getPath("userData"), "local-projects.json"),
        (target) => shell.openPath(target),
      );
      await registry.load();
      const root = path.resolve(__dirname, "renderer");
      protocol.handle("agnes", async (request) => {
        const url = new URL(request.url);
        if (url.host !== "hub") return new Response(null, { status: 403 });
        let file;
        try {
          file = path.resolve(root, "." + decodeURIComponent(url.pathname));
        } catch {
          return new Response(null, { status: 400 });
        }
        if (file !== root && !file.startsWith(root + path.sep))
          return new Response(null, { status: 403 });
        try {
          const response = await net.fetch(
            pathToFileURL(file === root ? path.join(root, "index.html") : file)
              .href,
          );
          const headers = new Headers(response.headers);
          headers.set(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https://avatars.githubusercontent.com blob: data:; connect-src 'self' https://api.github.com; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-src 'none'",
          );
          return new Response(response.body, {
            status: response.status,
            headers,
          });
        } catch {
          return new Response(null, { status: 404 });
        }
      });
      session.defaultSession.setPermissionRequestHandler(
        (_contents, _permission, callback) => callback(false),
      );
      session.defaultSession.setPermissionCheckHandler(() => false);
      window = new BrowserWindow({
        title: "AGNES.DEV",
        icon: path.join(__dirname, "icon.ico"),
        frame: false,
        titleBarStyle: "hidden",
        width: 1280,
        height: 840,
        minWidth: 560,
        minHeight: 520,
        backgroundColor: "#0c0d0f",
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
          preload: path.join(__dirname, "preload.cjs"),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          webSecurity: true,
        },
      });
      window.webContents.setWindowOpenHandler(({ url }) => {
        external(url);
        return { action: "deny" };
      });
      window.webContents.on("will-navigate", (event, url) => {
        if (url !== entry) {
          event.preventDefault();
          external(url);
        }
      });
      window.webContents.on("will-attach-webview", (event) =>
        event.preventDefault(),
      );
      ipcMain.handle("agnes:choose-project", async (event, kind) => {
        trusted(event);
        if (!["file", "folder"].includes(kind)) throw new Error("Invalid kind");
        if (selecting) return null;
        selecting = true;
        try {
          const result = await dialog.showOpenDialog(window, {
            title:
              kind === "folder"
                ? "Escolher pasta do projeto"
                : "Escolher arquivo do projeto",
            buttonLabel: "Selecionar",
            properties: [
              kind === "folder" ? "openDirectory" : "openFile",
              "dontAddToRecent",
            ],
          });
          return result.canceled || !result.filePaths[0]
            ? null
            : await registry.remember(result.filePaths[0], kind);
        } finally {
          selecting = false;
        }
      });
      ipcMain.handle("agnes:open-project", async (event, token) => {
        trusted(event);
        return registry.open(token);
      });
      ipcMain.handle("agnes:window-action", async (event, action) => {
        trusted(event);
        if (action === "minimize") window.minimize();
        else if (action === "toggle-maximize")
          window.isMaximized() ? window.unmaximize() : window.maximize();
        else if (action === "close") window.close();
      });
      window.on("ready-to-show", () => {
        if (!smoke) window.show();
      });
      if (smoke) {
        window.webContents.on("console-message", (details) => {
          if (details.level === "error") {
            console.error(details.message);
            app.exit(1);
          }
        });
        window.webContents.on("did-finish-load", () => {
          console.log("AGNES_DESKTOP_LOADED");
          setTimeout(() => app.quit(), 1200);
        });
        window.webContents.on("render-process-gone", (_e, details) => {
          console.error(details.reason);
          app.exit(1);
        });
        window.webContents.on("did-fail-load", (_e, code, description) => {
          console.error(code, description);
          app.exit(1);
        });
      }
      await window.loadURL(entry);
    })
    .catch((error) => {
      console.error(error.message);
      if (!smoke)
        dialog.showErrorBox(
          "AGNES.DEV",
          "Não foi possível iniciar o app: " + error.message,
        );
      app.exit(1);
    });
  app.on("window-all-closed", () => app.quit());
}
