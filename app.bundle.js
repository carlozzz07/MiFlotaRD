var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/@capacitor/core/dist/index.js
var ExceptionCode, CapacitorException, getPlatformId, createCapacitor, initCapacitorGlobal, Capacitor, registerPlugin, WebPlugin, encode, decode, CapacitorCookiesPluginWeb, CapacitorCookies, readBlobAsBase64, normalizeHttpHeaders, buildUrlParams, buildRequestInit, CapacitorHttpPluginWeb, CapacitorHttp, SystemBarsStyle, SystemBarType, SystemBarsPluginWeb, SystemBars;
var init_dist = __esm({
  "node_modules/@capacitor/core/dist/index.js"() {
    (function(ExceptionCode2) {
      ExceptionCode2["Unimplemented"] = "UNIMPLEMENTED";
      ExceptionCode2["Unavailable"] = "UNAVAILABLE";
    })(ExceptionCode || (ExceptionCode = {}));
    CapacitorException = class extends Error {
      constructor(message, code, data) {
        super(message);
        this.message = message;
        this.code = code;
        this.data = data;
      }
    };
    getPlatformId = (win) => {
      var _a, _b;
      if (win === null || win === void 0 ? void 0 : win.androidBridge) {
        return "android";
      } else if ((_b = (_a = win === null || win === void 0 ? void 0 : win.webkit) === null || _a === void 0 ? void 0 : _a.messageHandlers) === null || _b === void 0 ? void 0 : _b.bridge) {
        return "ios";
      } else {
        return "web";
      }
    };
    createCapacitor = (win) => {
      const capCustomPlatform = win.CapacitorCustomPlatform || null;
      const cap = win.Capacitor || {};
      const Plugins = cap.Plugins = cap.Plugins || {};
      const getPlatform = () => {
        return capCustomPlatform !== null ? capCustomPlatform.name : getPlatformId(win);
      };
      const isNativePlatform = () => getPlatform() !== "web";
      const isPluginAvailable = (pluginName) => {
        const plugin = registeredPlugins.get(pluginName);
        if (plugin === null || plugin === void 0 ? void 0 : plugin.platforms.has(getPlatform())) {
          return true;
        }
        if (getPluginHeader(pluginName)) {
          return true;
        }
        return false;
      };
      const getPluginHeader = (pluginName) => {
        var _a;
        return (_a = cap.PluginHeaders) === null || _a === void 0 ? void 0 : _a.find((h) => h.name === pluginName);
      };
      const handleError = (err) => win.console.error(err);
      const registeredPlugins = /* @__PURE__ */ new Map();
      const registerPlugin2 = (pluginName, jsImplementations = {}) => {
        const registeredPlugin = registeredPlugins.get(pluginName);
        if (registeredPlugin) {
          console.warn(`Capacitor plugin "${pluginName}" already registered. Cannot register plugins twice.`);
          return registeredPlugin.proxy;
        }
        const platform = getPlatform();
        const pluginHeader = getPluginHeader(pluginName);
        let jsImplementation;
        const loadPluginImplementation = async () => {
          if (!jsImplementation && platform in jsImplementations) {
            jsImplementation = typeof jsImplementations[platform] === "function" ? jsImplementation = await jsImplementations[platform]() : jsImplementation = jsImplementations[platform];
          } else if (capCustomPlatform !== null && !jsImplementation && "web" in jsImplementations) {
            jsImplementation = typeof jsImplementations["web"] === "function" ? jsImplementation = await jsImplementations["web"]() : jsImplementation = jsImplementations["web"];
          }
          return jsImplementation;
        };
        const createPluginMethod = (impl, prop) => {
          var _a, _b;
          if (pluginHeader) {
            const methodHeader = pluginHeader === null || pluginHeader === void 0 ? void 0 : pluginHeader.methods.find((m) => prop === m.name);
            if (methodHeader) {
              if (methodHeader.rtype === "promise") {
                return (options) => cap.nativePromise(pluginName, prop.toString(), options);
              } else {
                return (options, callback) => cap.nativeCallback(pluginName, prop.toString(), options, callback);
              }
            } else if (impl) {
              return (_a = impl[prop]) === null || _a === void 0 ? void 0 : _a.bind(impl);
            }
          } else if (impl) {
            return (_b = impl[prop]) === null || _b === void 0 ? void 0 : _b.bind(impl);
          } else {
            throw new CapacitorException(`"${pluginName}" plugin is not implemented on ${platform}`, ExceptionCode.Unimplemented);
          }
        };
        const createPluginMethodWrapper = (prop) => {
          let remove;
          const wrapper = (...args) => {
            const p = loadPluginImplementation().then((impl) => {
              const fn = createPluginMethod(impl, prop);
              if (fn) {
                const p2 = fn(...args);
                remove = p2 === null || p2 === void 0 ? void 0 : p2.remove;
                return p2;
              } else {
                throw new CapacitorException(`"${pluginName}.${prop}()" is not implemented on ${platform}`, ExceptionCode.Unimplemented);
              }
            });
            if (prop === "addListener") {
              p.remove = async () => remove();
            }
            return p;
          };
          wrapper.toString = () => `${prop.toString()}() { [capacitor code] }`;
          Object.defineProperty(wrapper, "name", {
            value: prop,
            writable: false,
            configurable: false
          });
          return wrapper;
        };
        const addListener = createPluginMethodWrapper("addListener");
        const removeListener = createPluginMethodWrapper("removeListener");
        const addListenerNative = (eventName, callback) => {
          const call = addListener({ eventName }, callback);
          const remove = async () => {
            const callbackId = await call;
            removeListener({
              eventName,
              callbackId
            }, callback);
          };
          const p = new Promise((resolve) => call.then(() => resolve({ remove })));
          p.remove = async () => {
            console.warn(`Using addListener() without 'await' is deprecated.`);
            await remove();
          };
          return p;
        };
        const proxy = new Proxy({}, {
          get(_, prop) {
            switch (prop) {
              // https://github.com/facebook/react/issues/20030
              case "$$typeof":
                return void 0;
              case "toJSON":
                return () => ({});
              case "addListener":
                return pluginHeader ? addListenerNative : addListener;
              case "removeListener":
                return removeListener;
              default:
                return createPluginMethodWrapper(prop);
            }
          }
        });
        Plugins[pluginName] = proxy;
        registeredPlugins.set(pluginName, {
          name: pluginName,
          proxy,
          platforms: /* @__PURE__ */ new Set([...Object.keys(jsImplementations), ...pluginHeader ? [platform] : []])
        });
        return proxy;
      };
      if (!cap.convertFileSrc) {
        cap.convertFileSrc = (filePath) => filePath;
      }
      cap.getPlatform = getPlatform;
      cap.handleError = handleError;
      cap.isNativePlatform = isNativePlatform;
      cap.isPluginAvailable = isPluginAvailable;
      cap.registerPlugin = registerPlugin2;
      cap.Exception = CapacitorException;
      cap.DEBUG = !!cap.DEBUG;
      cap.isLoggingEnabled = !!cap.isLoggingEnabled;
      return cap;
    };
    initCapacitorGlobal = (win) => win.Capacitor = createCapacitor(win);
    Capacitor = /* @__PURE__ */ initCapacitorGlobal(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
    registerPlugin = Capacitor.registerPlugin;
    WebPlugin = class {
      constructor() {
        this.listeners = {};
        this.retainedEventArguments = {};
        this.windowListeners = {};
      }
      addListener(eventName, listenerFunc) {
        let firstListener = false;
        const listeners = this.listeners[eventName];
        if (!listeners) {
          this.listeners[eventName] = [];
          firstListener = true;
        }
        this.listeners[eventName].push(listenerFunc);
        const windowListener = this.windowListeners[eventName];
        if (windowListener && !windowListener.registered) {
          this.addWindowListener(windowListener);
        }
        if (firstListener) {
          this.sendRetainedArgumentsForEvent(eventName);
        }
        const remove = async () => this.removeListener(eventName, listenerFunc);
        const p = Promise.resolve({ remove });
        return p;
      }
      async removeAllListeners() {
        this.listeners = {};
        for (const listener in this.windowListeners) {
          this.removeWindowListener(this.windowListeners[listener]);
        }
        this.windowListeners = {};
      }
      notifyListeners(eventName, data, retainUntilConsumed) {
        const listeners = this.listeners[eventName];
        if (!listeners) {
          if (retainUntilConsumed) {
            let args = this.retainedEventArguments[eventName];
            if (!args) {
              args = [];
            }
            args.push(data);
            this.retainedEventArguments[eventName] = args;
          }
          return;
        }
        listeners.forEach((listener) => listener(data));
      }
      hasListeners(eventName) {
        var _a;
        return !!((_a = this.listeners[eventName]) === null || _a === void 0 ? void 0 : _a.length);
      }
      registerWindowListener(windowEventName, pluginEventName) {
        this.windowListeners[pluginEventName] = {
          registered: false,
          windowEventName,
          pluginEventName,
          handler: (event) => {
            this.notifyListeners(pluginEventName, event);
          }
        };
      }
      unimplemented(msg = "not implemented") {
        return new Capacitor.Exception(msg, ExceptionCode.Unimplemented);
      }
      unavailable(msg = "not available") {
        return new Capacitor.Exception(msg, ExceptionCode.Unavailable);
      }
      async removeListener(eventName, listenerFunc) {
        const listeners = this.listeners[eventName];
        if (!listeners) {
          return;
        }
        const index = listeners.indexOf(listenerFunc);
        if (index !== -1) {
          this.listeners[eventName].splice(index, 1);
        }
        if (!this.listeners[eventName].length) {
          this.removeWindowListener(this.windowListeners[eventName]);
        }
      }
      addWindowListener(handle) {
        window.addEventListener(handle.windowEventName, handle.handler);
        handle.registered = true;
      }
      removeWindowListener(handle) {
        if (!handle) {
          return;
        }
        window.removeEventListener(handle.windowEventName, handle.handler);
        handle.registered = false;
      }
      sendRetainedArgumentsForEvent(eventName) {
        const args = this.retainedEventArguments[eventName];
        if (!args) {
          return;
        }
        delete this.retainedEventArguments[eventName];
        args.forEach((arg) => {
          this.notifyListeners(eventName, arg);
        });
      }
    };
    encode = (str) => encodeURIComponent(str).replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent).replace(/[()]/g, escape);
    decode = (str) => str.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
    CapacitorCookiesPluginWeb = class extends WebPlugin {
      async getCookies() {
        const cookies = document.cookie;
        const cookieMap = {};
        cookies.split(";").forEach((cookie) => {
          if (cookie.length <= 0)
            return;
          let [key, value] = cookie.replace(/=/, "CAP_COOKIE").split("CAP_COOKIE");
          key = decode(key).trim();
          value = decode(value).trim();
          cookieMap[key] = value;
        });
        return cookieMap;
      }
      async setCookie(options) {
        try {
          const encodedKey = encode(options.key);
          const encodedValue = encode(options.value);
          const expires = options.expires ? `; expires=${options.expires.replace("expires=", "")}` : "";
          const path = (options.path || "/").replace("path=", "");
          const domain = options.url != null && options.url.length > 0 ? `domain=${options.url}` : "";
          document.cookie = `${encodedKey}=${encodedValue || ""}${expires}; path=${path}; ${domain};`;
        } catch (error) {
          return Promise.reject(error);
        }
      }
      async deleteCookie(options) {
        try {
          document.cookie = `${options.key}=; Max-Age=0`;
        } catch (error) {
          return Promise.reject(error);
        }
      }
      async clearCookies() {
        try {
          const cookies = document.cookie.split(";") || [];
          for (const cookie of cookies) {
            document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, `=;expires=${(/* @__PURE__ */ new Date()).toUTCString()};path=/`);
          }
        } catch (error) {
          return Promise.reject(error);
        }
      }
      async clearAllCookies() {
        try {
          await this.clearCookies();
        } catch (error) {
          return Promise.reject(error);
        }
      }
    };
    CapacitorCookies = registerPlugin("CapacitorCookies", {
      web: () => new CapacitorCookiesPluginWeb()
    });
    readBlobAsBase64 = async (blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result;
        resolve(base64String.indexOf(",") >= 0 ? base64String.split(",")[1] : base64String);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(blob);
    });
    normalizeHttpHeaders = (headers = {}) => {
      const originalKeys = Object.keys(headers);
      const loweredKeys = Object.keys(headers).map((k) => k.toLocaleLowerCase());
      const normalized = loweredKeys.reduce((acc, key, index) => {
        acc[key] = headers[originalKeys[index]];
        return acc;
      }, {});
      return normalized;
    };
    buildUrlParams = (params, shouldEncode = true) => {
      if (!params)
        return null;
      const output = Object.entries(params).reduce((accumulator, entry) => {
        const [key, value] = entry;
        let encodedValue;
        let item;
        if (Array.isArray(value)) {
          item = "";
          value.forEach((str) => {
            encodedValue = shouldEncode ? encodeURIComponent(str) : str;
            item += `${key}=${encodedValue}&`;
          });
          item.slice(0, -1);
        } else {
          encodedValue = shouldEncode ? encodeURIComponent(value) : value;
          item = `${key}=${encodedValue}`;
        }
        return `${accumulator}&${item}`;
      }, "");
      return output.substr(1);
    };
    buildRequestInit = (options, extra = {}) => {
      const output = Object.assign({ method: options.method || "GET", headers: options.headers }, extra);
      const headers = normalizeHttpHeaders(options.headers);
      const type = headers["content-type"] || "";
      if (typeof options.data === "string") {
        output.body = options.data;
      } else if (type.includes("application/x-www-form-urlencoded")) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(options.data || {})) {
          params.set(key, value);
        }
        output.body = params.toString();
      } else if (type.includes("multipart/form-data") || options.data instanceof FormData) {
        const form = new FormData();
        if (options.data instanceof FormData) {
          options.data.forEach((value, key) => {
            form.append(key, value);
          });
        } else {
          for (const key of Object.keys(options.data)) {
            form.append(key, options.data[key]);
          }
        }
        output.body = form;
        const headers2 = new Headers(output.headers);
        headers2.delete("content-type");
        output.headers = headers2;
      } else if (type.includes("application/json") || typeof options.data === "object") {
        output.body = JSON.stringify(options.data);
      }
      return output;
    };
    CapacitorHttpPluginWeb = class extends WebPlugin {
      /**
       * Perform an Http request given a set of options
       * @param options Options to build the HTTP request
       */
      async request(options) {
        const requestInit = buildRequestInit(options, options.webFetchExtra);
        const urlParams = buildUrlParams(options.params, options.shouldEncodeUrlParams);
        const url = urlParams ? `${options.url}?${urlParams}` : options.url;
        const response = await fetch(url, requestInit);
        const contentType = response.headers.get("content-type") || "";
        let { responseType = "text" } = response.ok ? options : {};
        if (contentType.includes("application/json")) {
          responseType = "json";
        }
        let data;
        let blob;
        switch (responseType) {
          case "arraybuffer":
          case "blob":
            blob = await response.blob();
            data = await readBlobAsBase64(blob);
            break;
          case "json":
            data = await response.json();
            break;
          case "document":
          case "text":
          default:
            data = await response.text();
        }
        const headers = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        return {
          data,
          headers,
          status: response.status,
          url: response.url
        };
      }
      /**
       * Perform an Http GET request given a set of options
       * @param options Options to build the HTTP request
       */
      async get(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "GET" }));
      }
      /**
       * Perform an Http POST request given a set of options
       * @param options Options to build the HTTP request
       */
      async post(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "POST" }));
      }
      /**
       * Perform an Http PUT request given a set of options
       * @param options Options to build the HTTP request
       */
      async put(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "PUT" }));
      }
      /**
       * Perform an Http PATCH request given a set of options
       * @param options Options to build the HTTP request
       */
      async patch(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "PATCH" }));
      }
      /**
       * Perform an Http DELETE request given a set of options
       * @param options Options to build the HTTP request
       */
      async delete(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "DELETE" }));
      }
    };
    CapacitorHttp = registerPlugin("CapacitorHttp", {
      web: () => new CapacitorHttpPluginWeb()
    });
    (function(SystemBarsStyle2) {
      SystemBarsStyle2["Dark"] = "DARK";
      SystemBarsStyle2["Light"] = "LIGHT";
      SystemBarsStyle2["Default"] = "DEFAULT";
    })(SystemBarsStyle || (SystemBarsStyle = {}));
    (function(SystemBarType2) {
      SystemBarType2["StatusBar"] = "StatusBar";
      SystemBarType2["NavigationBar"] = "NavigationBar";
    })(SystemBarType || (SystemBarType = {}));
    SystemBarsPluginWeb = class extends WebPlugin {
      async setStyle() {
        this.unavailable("not available for web");
      }
      async setAnimation() {
        this.unavailable("not available for web");
      }
      async show() {
        this.unavailable("not available for web");
      }
      async hide() {
        this.unavailable("not available for web");
      }
    };
    SystemBars = registerPlugin("SystemBars", {
      web: () => new SystemBarsPluginWeb()
    });
  }
});

// node_modules/@capacitor/haptics/dist/esm/definitions.js
var ImpactStyle, NotificationType;
var init_definitions = __esm({
  "node_modules/@capacitor/haptics/dist/esm/definitions.js"() {
    (function(ImpactStyle2) {
      ImpactStyle2["Heavy"] = "HEAVY";
      ImpactStyle2["Medium"] = "MEDIUM";
      ImpactStyle2["Light"] = "LIGHT";
    })(ImpactStyle || (ImpactStyle = {}));
    (function(NotificationType2) {
      NotificationType2["Success"] = "SUCCESS";
      NotificationType2["Warning"] = "WARNING";
      NotificationType2["Error"] = "ERROR";
    })(NotificationType || (NotificationType = {}));
  }
});

// node_modules/@capacitor/haptics/dist/esm/web.js
var web_exports = {};
__export(web_exports, {
  HapticsWeb: () => HapticsWeb
});
var HapticsWeb;
var init_web = __esm({
  "node_modules/@capacitor/haptics/dist/esm/web.js"() {
    init_dist();
    init_definitions();
    HapticsWeb = class extends WebPlugin {
      constructor() {
        super(...arguments);
        this.selectionStarted = false;
      }
      async impact(options) {
        const pattern = this.patternForImpact(options === null || options === void 0 ? void 0 : options.style);
        this.vibrateWithPattern(pattern);
      }
      async notification(options) {
        const pattern = this.patternForNotification(options === null || options === void 0 ? void 0 : options.type);
        this.vibrateWithPattern(pattern);
      }
      async vibrate(options) {
        const duration = (options === null || options === void 0 ? void 0 : options.duration) || 300;
        this.vibrateWithPattern([duration]);
      }
      async selectionStart() {
        this.selectionStarted = true;
      }
      async selectionChanged() {
        if (this.selectionStarted) {
          this.vibrateWithPattern([70]);
        }
      }
      async selectionEnd() {
        this.selectionStarted = false;
      }
      patternForImpact(style = ImpactStyle.Heavy) {
        if (style === ImpactStyle.Medium) {
          return [43];
        } else if (style === ImpactStyle.Light) {
          return [20];
        }
        return [61];
      }
      patternForNotification(type = NotificationType.Success) {
        if (type === NotificationType.Warning) {
          return [30, 40, 30, 50, 60];
        } else if (type === NotificationType.Error) {
          return [27, 45, 50];
        }
        return [35, 65, 21];
      }
      vibrateWithPattern(pattern) {
        if (navigator.vibrate) {
          navigator.vibrate(pattern);
        } else {
          throw this.unavailable("Browser does not support the vibrate API");
        }
      }
    };
  }
});

// node_modules/@capacitor/haptics/dist/esm/index.js
init_dist();
init_definitions();
var Haptics = registerPlugin("Haptics", {
  web: () => Promise.resolve().then(() => (init_web(), web_exports)).then((m) => new m.HapticsWeb())
});

// js/auth.js
var Auth = {
  async getSession(client) {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  },
  async signIn(client, email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  },
  async signOut(client) {
    const { error } = await client.auth.signOut();
    if (error) throw error;
  },
  async loadCloudDatabase(client, userId) {
    const { data, error } = await client.from("flota_cloud_store").select("db_data").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    return data?.db_data ?? null;
  },
  async saveCloudDatabase(client, userId, database) {
    const { error } = await client.from("flota_cloud_store").upsert({
      user_id: userId,
      db_data: database,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    if (error) throw error;
  }
};

// js/ui.js
var moneyFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});
function parseMoney(value) {
  const normalized = String(value ?? "").replace(/,/g, "").replace(/[^\d.]/g, "");
  const decimalAt = normalized.indexOf(".");
  const clean = decimalAt === -1 ? normalized : `${normalized.slice(0, decimalAt + 1)}${normalized.slice(decimalAt + 1).replace(/\./g, "")}`;
  return Math.max(0, Number.parseFloat(clean) || 0);
}
function formatMoneyInput(value, fixed = false) {
  const normalized = String(value ?? "").replace(/,/g, "").replace(/[^\d.]/g, "");
  const decimalAt = normalized.indexOf(".");
  let integer = decimalAt === -1 ? normalized : normalized.slice(0, decimalAt);
  let fraction = decimalAt === -1 ? "" : normalized.slice(decimalAt + 1).replace(/\./g, "").slice(0, 2);
  integer = integer.replace(/^0+(?=\d)/, "");
  if (fixed && normalized !== "") fraction = fraction.padEnd(2, "0");
  const grouped = integer ? moneyFormatter.format(Number(integer)) : normalized ? "0" : "";
  return decimalAt === -1 && !fixed ? grouped : `${grouped}.${fraction}`;
}
function bindFinancialInputs(root = document) {
  root.addEventListener("input", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.matches(".financial-input")) return;
    const caret = input.selectionStart ?? input.value.length;
    const digitsBeforeCaret = input.value.slice(0, caret).replace(/[^\d]/g, "").length;
    input.value = formatMoneyInput(input.value);
    let nextCaret = 0;
    let digitsSeen = 0;
    while (nextCaret < input.value.length && digitsSeen < digitsBeforeCaret) {
      if (/\d/.test(input.value[nextCaret])) digitsSeen += 1;
      nextCaret += 1;
    }
    input.setSelectionRange(nextCaret, nextCaret);
  });
  root.addEventListener("focusout", (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.matches(".financial-input") && input.value !== "") {
      input.value = formatMoneyInput(input.value, true);
    }
  });
}
function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  const icon = document.getElementById("toastIcon");
  const text = document.getElementById("toastMsg");
  if (!toast || !icon || !text) return;
  icon.className = isError ? "fa-solid fa-circle-exclamation text-rose-500 text-base" : "fa-solid fa-circle-check text-emerald-500 text-base";
  text.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add("hidden"), 3200);
}
function openModal(title, html, maxWidthClass = "max-w-2xl") {
  const container = document.getElementById("modalContainer");
  const titleElement = document.getElementById("modalTitle");
  const body = document.getElementById("modalBody");
  const overlay = document.getElementById("modalOverlay");
  if (!container || !titleElement || !body || !overlay) return;
  container.className = `modal-shell ${maxWidthClass}`;
  titleElement.textContent = title;
  body.innerHTML = html;
  overlay.classList.remove("hidden");
}
function closeModal() {
  document.getElementById("modalOverlay")?.classList.add("hidden");
}
function truckStatusBadge(status) {
  const available = status !== "Fuera de Servicio";
  return `<span class="${available ? "badge-available" : "badge-out-of-service"}">${available ? "Disponible" : "Fuera de Servicio"}</span>`;
}
function whatsappLink(phone, message) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  const international = digits.length === 10 ? `1${digits}` : digits;
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}
var UI = {
  showToast(msg, isError = false) {
    showToast(msg, isError);
  },
  openModal(title, html, maxWidthClass = "max-w-2xl") {
    openModal(title, html, maxWidthClass);
  },
  closeModal() {
    closeModal();
  },
  switchTab(tab) {
    this.activeTab = tab;
    ["trips", "scheduled", "trucks", "incidents", "drivers", "analytics", "reports", "catalogs", "security"].forEach((t) => {
      const panel = document.getElementById("tabPanel_" + t);
      const btn = document.getElementById("tabBtn_" + t);
      if (panel) panel.classList.toggle("hidden", t !== tab);
      if (btn) btn.className = t === tab ? "tab-btn tab-btn-active" : "tab-btn";
    });
    if (tab === "analytics") {
      this.renderAnalyticsCharts();
    }
  },
  renderRemindersBanner() {
    const container = document.getElementById("remindersBannerContainer");
    const today = this.offsetDateISO(0);
    const tomorrow = this.offsetDateISO(1);
    const allSched = this.getAllScheduledSorted();
    const urgent = allSched.filter((s) => s.date === today || s.date === tomorrow || s.date < today);
    if (urgent.length === 0) {
      container.innerHTML = "";
      return;
    }
    const rowsHtml = urgent.map((s) => {
      const isToday = s.date === today;
      const isTomorrow = s.date === tomorrow;
      const badge = isToday ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500 text-slate-950">HOY</span>` : isTomorrow ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-900 dark:bg-white text-white dark:text-slate-900">MA\xD1ANA</span>` : `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-600 text-white">PENDIENTE</span>`;
      return `
            <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="text-xs">
                <div class="flex flex-wrap items-center gap-2">
                  ${badge}
                  <span class="font-mono font-bold">${s.date}</span>
                  <span class="text-amber-700 dark:text-amber-400 font-semibold"><i class="fa-regular fa-bell mr-1"></i>Recordar: ${this.formatTime12h(s.reminderTime || "06:00")}</span>
                  <span class="text-emerald-700 dark:text-emerald-400 font-semibold"><i class="fa-solid fa-truck-fast mr-1"></i>Salida: ${this.formatTime12h(s.departureTime || "08:00")}</span>
                  <span class="font-bold text-slate-900 dark:text-white">${s.route || "Ruta por definir"}</span>
                </div>
                <div class="text-slate-500 dark:text-slate-400 mt-1">
                  Cami\xF3n: <b>${this.getTruckName(s.truckId)}</b> \xB7 Chofer: <b>${this.getDriverName(s.driverId)}</b>
                  ${s.notes ? ` \xB7 <i>"${s.notes}"</i>` : ""}
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button type="button" onclick="App.liquidateScheduledTrip('${s.id}')" class="btn-emerald !py-1.5 !px-3 text-xs">
                  <i class="fa-solid fa-check"></i> Liquidar
                </button>
                <button type="button" onclick="App.openScheduledModal('${s.id}')" class="btn-outline !py-1.5 !px-2.5 text-xs">
                  <i class="fa-solid fa-pen"></i>
                </button>
              </div>
            </div>
          `;
    }).join("");
    container.innerHTML = `
          <div class="card p-4 border-l-4 border-l-amber-500">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-bell text-amber-500"></i>
                <h3 class="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Recordatorio de Viajes Anticipados (Hoy / Ma\xF1ana)
                </h3>
              </div>
              <button type="button" onclick="App.switchTab('scheduled')" class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                Ver toda la Agenda (${allSched.length}) \u2192
              </button>
            </div>
            <div class="space-y-2">${rowsHtml}</div>
          </div>
        `;
  },
  renderAll() {
    const s = this.getPeriodSummary();
    const periodLabel = this.formatMonthLabel(this.getSelectedMonth());
    this.renderRemindersBanner();
    document.getElementById("periodSummaryLabel").innerHTML = `Periodo activo: <b class="text-slate-900 dark:text-white">${periodLabel}</b> (${s.trips.length} viajes \xB7 ${s.incidents.length} incidencias)`;
    const netEl = document.getElementById("kpiOwnerNet");
    netEl.textContent = this.formatRD(s.finalOwnerNet);
    netEl.className = `text-2xl font-mono font-bold ${s.finalOwnerNet >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`;
    document.getElementById("kpiMarginPercent").textContent = `Margen: ${s.marginPct}% \xB7 Fletes \u2212 (Viajes + Taller + Incidencias)`;
    document.getElementById("kpiGrossFreight").textContent = this.formatRD(s.gross);
    document.getElementById("kpiTripsCount").textContent = s.trips.length;
    document.getElementById("kpiClientsCount").textContent = s.clients;
    document.getElementById("kpiTripExpensesTotal").textContent = this.formatRD(s.tripExp);
    document.getElementById("kpiTripExpensesBreakdown").textContent = `Comb: ${this.formatRD(s.fuel)} \xB7 Peajes: ${this.formatRD(s.tolls)} \xB7 N\xF3mina: ${this.formatRD(s.drvPay + s.hlpPay)}`;
    document.getElementById("kpiMaintAndIncTotal").textContent = this.formatRD(s.maintTotal + s.incidentTotal);
    document.getElementById("kpiMaintAndIncBreakdown").textContent = `Taller: ${this.formatRD(s.maintTotal)} \xB7 Incidencias: ${this.formatRD(s.incidentTotal)}`;
    document.getElementById("badgeCountTrips").textContent = s.trips.length;
    document.getElementById("badgeCountScheduled").textContent = s.scheduled.length;
    document.getElementById("badgeCountTrucks").textContent = this.db.trucks.length;
    document.getElementById("badgeCountIncidents").textContent = s.incidents.length;
    document.getElementById("badgeCountDrivers").textContent = this.db.drivers.length;
    document.getElementById("reportPeriodTitle").textContent = periodLabel;
    document.getElementById("repTripsCount").textContent = `${s.trips.length} viaje(s)`;
    document.getElementById("repGross").textContent = this.formatRD(s.gross);
    document.getElementById("repTotalExpenses").textContent = this.formatRD(s.tripExp + s.maintTotal + s.incidentTotal);
    document.getElementById("repNet").textContent = this.formatRD(s.finalOwnerNet);
    const dSel = document.getElementById("tripFilterDriver");
    const tSel = document.getElementById("tripFilterTruck");
    const pD = dSel.value || "ALL", pT = tSel.value || "ALL";
    dSel.innerHTML = `<option value="ALL">Todos los choferes</option>` + this.db.drivers.map((d) => `<option value="${d.id}">${d.name}</option>`).join("");
    if ([...dSel.options].some((o) => o.value === pD)) dSel.value = pD;
    tSel.innerHTML = `<option value="ALL">Todos los camiones</option>` + this.db.trucks.map((t) => `<option value="${t.id}">${t.name}</option>`).join("");
    if ([...tSel.options].some((o) => o.value === pT)) tSel.value = pT;
    this.renderTripsTab();
    this.renderScheduledTab();
    this.renderTrucksTab();
    this.renderIncidentsTab();
    this.renderDriversTab();
    this.renderCatalogsTab();
    if (this.activeTab === "analytics") {
      this.renderAnalyticsCharts();
    }
  },
  renderTripsTab() {
    const fDrv = document.getElementById("tripFilterDriver").value || "ALL";
    const fTrk = document.getElementById("tripFilterTruck").value || "ALL";
    const trips = this.getFilteredTrips().filter(
      (t) => (fDrv === "ALL" || String(t.driverId) === String(fDrv)) && (fTrk === "ALL" || String(t.truckId) === String(fTrk))
    );
    const tbody = document.getElementById("tableTripsBody");
    const tfoot = document.getElementById("tableTripsFoot");
    if (trips.length === 0) {
      tbody.innerHTML = `
            <tr>
              <td colspan="13" class="py-12 text-center text-slate-400 text-xs">
                <i class="fa-solid fa-route text-2xl mb-2 block text-slate-300 dark:text-slate-600"></i>
                No hay viajes registrados en este periodo. Haz clic en <b>"+ Agregar Nuevo..."</b> arriba para registrar un viaje.
              </td>
            </tr>`;
      tfoot.innerHTML = "";
      return;
    }
    let sGross = 0, sFuel = 0, sTolls = 0, sDrv = 0, sHlp = 0, sOth = 0, sExp = 0, sNet = 0, sCli = 0;
    tbody.innerHTML = trips.map((t) => {
      const m = this.calcTrip(t);
      sGross += m.gross;
      sFuel += m.fuel;
      sTolls += m.tolls;
      sDrv += m.drvPay;
      sHlp += m.hlpPay;
      sOth += m.other;
      sExp += m.totalExpense;
      sNet += m.netOwner;
      sCli += Number(t.clientsCount) || 0;
      return `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40">
              <td class="td font-mono font-semibold whitespace-nowrap">${t.date}</td>
              <td class="td">
                <div class="font-semibold text-slate-900 dark:text-white">${t.route}</div>
                <span class="text-[11px] text-slate-500 dark:text-slate-400">${t.clientsCount} cliente(s)</span>
              </td>
              <td class="td font-medium">${this.getTruckName(t.truckId)}</td>
              <td class="td">
                <div class="font-medium text-slate-900 dark:text-white">${this.getDriverName(t.driverId)}</div>
                <div class="text-[11px] text-slate-400">Ayud: ${this.getHelpersNames(t.helperIds)}</div>
              </td>
              <td class="td text-right font-mono font-semibold whitespace-nowrap">${this.formatRD(m.gross)}</td>
              <td class="td text-right font-mono text-amber-700 dark:text-amber-400 whitespace-nowrap">${this.formatRD(m.fuel)}</td>
              <td class="td text-right font-mono text-amber-700 dark:text-amber-400 whitespace-nowrap">${this.formatRD(m.tolls)}</td>
              <td class="td text-right font-mono whitespace-nowrap">${this.formatRD(m.drvPay)}</td>
              <td class="td text-right font-mono whitespace-nowrap">${this.formatRD(m.hlpPay)}</td>
              <td class="td text-right font-mono whitespace-nowrap">${this.formatRD(m.other)}</td>
              <td class="td text-right font-mono font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">${this.formatRD(m.totalExpense)}</td>
              <td class="td text-right font-mono font-bold bg-emerald-50/60 dark:bg-emerald-950/30 ${m.netOwner >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600"} whitespace-nowrap">
                ${this.formatRD(m.netOwner)}
              </td>
              <td class="td text-center whitespace-nowrap">
                <button type="button" onclick="App.openTripModal('${t.id}')" class="btn-outline !py-1 !px-2 text-xs" title="Editar"><i class="fa-solid fa-pen"></i></button>
                <button type="button" onclick="App.deleteTrip('${t.id}')" class="btn-outline !py-1 !px-2 text-xs hover:text-rose-600" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
              </td>
            </tr>
          `;
    }).join("");
    tfoot.innerHTML = `
          <tr>
            <td class="py-3 px-3">TOTAL (${trips.length})</td>
            <td class="py-3 px-3">${sCli} clientes</td>
            <td colspan="2"></td>
            <td class="py-3 px-3 text-right whitespace-nowrap">${this.formatRD(sGross)}</td>
            <td class="py-3 px-3 text-right whitespace-nowrap">${this.formatRD(sFuel)}</td>
            <td class="py-3 px-3 text-right whitespace-nowrap">${this.formatRD(sTolls)}</td>
            <td class="py-3 px-3 text-right whitespace-nowrap">${this.formatRD(sDrv)}</td>
            <td class="py-3 px-3 text-right whitespace-nowrap">${this.formatRD(sHlp)}</td>
            <td class="py-3 px-3 text-right whitespace-nowrap">${this.formatRD(sOth)}</td>
            <td class="py-3 px-3 text-right text-rose-600 whitespace-nowrap">${this.formatRD(sExp)}</td>
            <td class="py-3 px-3 text-right text-emerald-700 dark:text-emerald-400 whitespace-nowrap">${this.formatRD(sNet)}</td>
            <td></td>
          </tr>
        `;
  },
  renderScheduledTab() {
    const list = this.getAllScheduledSorted();
    const container = document.getElementById("scheduledListContainer");
    const today = this.offsetDateISO(0);
    const tomorrow = this.offsetDateISO(1);
    if (list.length === 0) {
      container.innerHTML = `
            <div class="col-span-full py-10 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
              <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">No hay viajes anticipados programados en este periodo</p>
              <button type="button" onclick="App.openScheduledModal()" class="btn-primary mt-3">+ Agendar Viaje Anticipado</button>
            </div>`;
      return;
    }
    container.innerHTML = list.map((s) => {
      const m = this.calcTrip(s);
      const isToday = s.date === today;
      const isTomorrow = s.date === tomorrow;
      const badge = isToday ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500 text-slate-950">HOY</span>` : isTomorrow ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-900 dark:bg-white text-white dark:text-slate-900">MA\xD1ANA</span>` : `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">PROGRAMADO</span>`;
      return `
            <div class="card p-4 flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between gap-2 mb-3">
                  ${badge}
                  <span class="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">${s.date}</span>
                </div>

                <div class="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs mb-3">
                  <div>
                    <span class="text-[10px] uppercase text-slate-400 block font-semibold">Recordar desde</span>
                    <span class="font-mono font-bold text-amber-600 dark:text-amber-400">${this.formatTime12h(s.reminderTime || "06:00")}</span>
                  </div>
                  <div class="border-l border-slate-200 dark:border-slate-700 pl-2.5">
                    <span class="text-[10px] uppercase text-slate-400 block font-semibold">Hora de Salida</span>
                    <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400">${this.formatTime12h(s.departureTime || "08:00")}</span>
                  </div>
                </div>

                <h3 class="font-bold text-sm text-slate-900 dark:text-white">${s.route || "Ruta por definir"}</h3>
                <p class="text-xs text-slate-500 mt-0.5">${s.clientsCount ? `${s.clientsCount} cliente(s)` : "Clientes por definir"}</p>

                <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs space-y-1 text-slate-600 dark:text-slate-300">
                  <div><b>Cami\xF3n:</b> ${this.getTruckName(s.truckId)}</div>
                  <div><b>Chofer:</b> ${this.getDriverName(s.driverId)}</div>
                  <div><b>Ayudante(s):</b> ${this.getHelpersNames(s.helperIds)}</div>
                </div>

                <div class="mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 text-xs">
                  ${m.hasAnyFinancial ? `<div class="flex justify-between"><span>Flete: <b>${this.formatRD(m.gross)}</b></span><span class="text-emerald-600 font-bold">Ganancia Neta: ${this.formatRD(m.netOwner)}</span></div>` : `<span class="text-slate-400 italic">Cobro y pagos opcionales (definir al liquidar)</span>`}
                </div>

                ${s.notes ? `<p class="text-xs text-slate-500 mt-2 italic">"${s.notes}"</p>` : ""}
              </div>

              <div class="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                <button type="button" onclick="App.liquidateScheduledTrip('${s.id}')" class="btn-emerald !py-1.5 flex-1">
                  <i class="fa-solid fa-check"></i> Liquidar
                </button>
                <button type="button" onclick="App.openScheduledModal('${s.id}')" class="btn-outline !py-1.5"><i class="fa-solid fa-pen"></i></button>
                <button type="button" onclick="App.deleteScheduledTrip('${s.id}')" class="btn-outline !py-1.5 hover:text-rose-600"><i class="fa-solid fa-trash"></i></button>
              </div>
            </div>
          `;
    }).join("");
  },
  renderTrucksTab() {
    const trips = this.getFilteredTrips();
    const maints = this.getFilteredMaintenances();
    const incidents = this.getFilteredIncidents();
    const grid = document.getElementById("trucksGrid");
    if (this.db.trucks.length === 0) {
      grid.innerHTML = `
            <div class="col-span-full py-10 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
              <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">No hay camiones registrados en la flota</p>
              <button type="button" onclick="App.openTruckModal()" class="btn-primary mt-3">+ Crear Primer Cami\xF3n</button>
            </div>`;
    } else {
      grid.innerHTML = this.db.trucks.map((trk) => {
        const tTrips = trips.filter((t) => String(t.truckId) === String(trk.id));
        const tMaints = maints.filter((m) => String(m.truckId) === String(trk.id));
        const tIncs = incidents.filter((i) => String(i.truckId) === String(trk.id));
        let gross = 0, tripExp = 0, tripsNet = 0;
        tTrips.forEach((t) => {
          const m = this.calcTrip(t);
          gross += m.gross;
          tripExp += m.totalExpense;
          tripsNet += m.netOwner;
        });
        const maintCost = tMaints.reduce((s, x) => s + (Number(x.cost) || 0), 0);
        const incCost = tIncs.reduce((s, x) => s + (Number(x.cost) || 0), 0);
        const realNet = tripsNet - maintCost - incCost;
        return `
              <div class="card p-5 flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <div>
                      <span class="text-[11px] font-mono font-semibold text-slate-400 block">Placa: ${trk.plate}</span>
                      <h3 class="font-bold text-base text-slate-900 dark:text-white">${trk.name}</h3>
                      <p class="text-xs text-slate-500">${trk.model}</p>
                      <div class="mt-2">${truckStatusBadge(trk.status)}</div>
                    </div>
                    <div class="px-3.5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-center min-w-[88px] shrink-0">
                      <span class="text-2xl font-mono font-extrabold leading-none block">${tTrips.length}</span>
                      <span class="text-[9px] font-bold uppercase tracking-wider block mt-1">Viajes</span>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-2.5 my-4 text-xs">
                    <div class="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900">
                      <span class="text-slate-400 block">Total Fletes</span>
                      <span class="font-mono font-bold text-slate-900 dark:text-white">${this.formatRD(gross)}</span>
                    </div>
                    <div class="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900">
                      <span class="text-slate-400 block">Gastos Viajes</span>
                      <span class="font-mono font-bold text-amber-600">-${this.formatRD(tripExp)}</span>
                    </div>
                    <div class="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900">
                      <span class="text-slate-400 block">Taller (${tMaints.length})</span>
                      <span class="font-mono font-bold text-rose-600">-${this.formatRD(maintCost)}</span>
                    </div>
                    <div class="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900">
                      <span class="text-slate-400 block">Incidencias (${tIncs.length})</span>
                      <span class="font-mono font-bold text-rose-600">-${this.formatRD(incCost)}</span>
                    </div>
                  </div>

                  <div class="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                    <span class="text-xs font-bold text-emerald-800 dark:text-emerald-300">Ganancia Neta</span>
                    <span class="font-mono font-bold text-sm ${realNet >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600"}">${this.formatRD(realNet)}</span>
                  </div>
                </div>

                <div class="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                  <button type="button" onclick="App.openTruckHistoryModal('${trk.id}')" class="btn-primary !py-1.5 flex-1">Ver Historial</button>
                  <button type="button" onclick="App.openTruckModal('${trk.id}')" class="btn-outline !py-1.5" title="Editar"><i class="fa-solid fa-pen"></i></button>
                  <button type="button" onclick="App.deleteTruck('${trk.id}')" class="btn-outline !py-1.5 hover:text-rose-600" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                </div>
              </div>
            `;
      }).join("");
    }
    const mBody = document.getElementById("tableMaintBody");
    mBody.innerHTML = maints.length === 0 ? `<tr><td colspan="5" class="py-6 text-center text-slate-400 text-xs">Sin mantenimientos registrados en este periodo.</td></tr>` : maints.map((m) => `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40">
              <td class="td font-mono font-semibold whitespace-nowrap">${m.date}</td>
              <td class="td font-semibold">${this.getTruckName(m.truckId)}</td>
              <td class="td">${m.description}</td>
              <td class="td text-right font-mono font-bold text-rose-600 whitespace-nowrap">${this.formatRD(m.cost)}</td>
              <td class="td text-center">
                <button type="button" onclick="App.deleteMaintenance('${m.id}')" class="btn-outline !py-1 !px-2 text-xs hover:text-rose-600"><i class="fa-solid fa-trash"></i></button>
              </td>
            </tr>`).join("");
  },
  renderIncidentsTab() {
    const list = this.getFilteredIncidents();
    const tbody = document.getElementById("tableIncidentsBody");
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400 text-xs">No hay incidencias registradas en este periodo.</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map((inc) => {
      const badge = inc.severity === "Alta" ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300" : inc.severity === "Media" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
      return `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40">
              <td class="td font-mono font-semibold whitespace-nowrap">${inc.date}</td>
              <td class="td font-semibold">${this.getTruckName(inc.truckId)}</td>
              <td class="td">${this.getDriverName(inc.driverId)}</td>
              <td class="td"><span class="px-2 py-0.5 rounded text-xs font-bold ${badge}">${inc.severity}</span></td>
              <td class="td">${inc.description}</td>
              <td class="td text-right font-mono font-bold text-rose-600 whitespace-nowrap">-${this.formatRD(inc.cost)}</td>
              <td class="td text-center">
                <button type="button" onclick="App.deleteIncident('${inc.id}')" class="btn-outline !py-1 !px-2 text-xs hover:text-rose-600"><i class="fa-solid fa-trash"></i></button>
              </td>
            </tr>
          `;
    }).join("");
  },
  renderDriversTab() {
    const trips = this.getFilteredTrips();
    const grid = document.getElementById("driversGrid");
    if (this.db.drivers.length === 0) {
      grid.innerHTML = `
            <div class="col-span-full py-10 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
              <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">No hay choferes registrados</p>
              <button type="button" onclick="App.openDriverModal()" class="btn-primary mt-3">+ Crear Primer Chofer</button>
            </div>`;
      return;
    }
    grid.innerHTML = this.db.drivers.map((drv) => {
      const dTrips = trips.filter((t) => String(t.driverId) === String(drv.id));
      let gross = 0, fuel = 0, drvPaid = 0, net = 0;
      dTrips.forEach((t) => {
        const m = this.calcTrip(t);
        gross += m.gross;
        fuel += m.fuel;
        drvPaid += m.drvPay;
        net += m.netOwner;
      });
      const settlementUrl = whatsappLink(
        drv.phone,
        `Liquidaci\xF3n de viajes. Fletes: ${this.formatRD(gross)}, Combustible: ${this.formatRD(fuel)}, Restante Generado: ${this.formatRD(net)}`
      );
      return `
            <div class="card p-5 flex flex-col justify-between">
              <div>
                <div class="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 class="font-bold text-base text-slate-900 dark:text-white">${drv.name}</h3>
                    <p class="text-xs text-slate-500">${drv.phone || ""} ${drv.note ? "\xB7 " + drv.note : ""}</p>
                  </div>
                  <span class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 font-mono font-bold text-xs">${dTrips.length} viajes</span>
                </div>
                <div class="grid grid-cols-2 gap-2.5 my-4 text-xs">
                  <div class="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900">
                    <span class="text-slate-400 block">Total Fletes</span>
                    <span class="font-mono font-bold">${this.formatRD(gross)}</span>
                  </div>
                  <div class="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900">
                    <span class="text-slate-400 block">Combustible</span>
                    <span class="font-mono font-bold text-amber-600">${this.formatRD(fuel)}</span>
                  </div>
                  <div class="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900">
                    <span class="text-slate-400 block">Cobr\xF3 Chofer</span>
                    <span class="font-mono font-bold">${this.formatRD(drvPaid)}</span>
                  </div>
                  <div class="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
                    <span class="text-emerald-700 dark:text-emerald-300 block font-semibold">Restante Generado</span>
                    <span class="font-mono font-bold text-emerald-700 dark:text-emerald-400">${this.formatRD(net)}</span>
                  </div>
                </div>
              </div>
              <div class="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                ${settlementUrl ? `<a href="${settlementUrl}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp" aria-label="Enviar liquidaci\xF3n por WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>` : '<span class="text-[11px] text-slate-400">Sin tel\xE9fono</span>'}
                <button type="button" onclick="App.openDriverHistoryModal('${drv.id}')" class="btn-primary !py-1.5 flex-1">Ver Historial</button>
                <button type="button" onclick="App.openDriverModal('${drv.id}')" class="btn-outline !py-1.5"><i class="fa-solid fa-pen"></i></button>
                <button type="button" onclick="App.deleteDriver('${drv.id}')" class="btn-outline !py-1.5 hover:text-rose-600"><i class="fa-solid fa-trash"></i></button>
              </div>
            </div>
          `;
    }).join("");
  },
  renderAnalyticsCharts() {
    const s = this.getPeriodSummary();
    const payroll = s.drvPay + s.hlpPay;
    const isDark = document.documentElement.classList.contains("dark");
    const textColor = isDark ? "#cbd5e1" : "#334155";
    const ctxD = document.getElementById("canvasExpensesDoughnut").getContext("2d");
    if (this.chartDoughnut) this.chartDoughnut.destroy();
    const labelsD = ["Combustible", "Peajes", "N\xF3mina", "Otros", "Taller", "Incidencias"];
    const dataD = [s.fuel, s.tolls, payroll, s.other, s.maintTotal, s.incidentTotal];
    const colorsD = ["#d97706", "#0284c7", "#4f46e5", "#64748b", "#e11d48", "#be123c"];
    this.chartDoughnut = new Chart(ctxD, {
      type: "doughnut",
      data: {
        labels: labelsD,
        datasets: [{ data: dataD, backgroundColor: colorsD, borderWidth: 2, borderColor: isDark ? "#1e293b" : "#ffffff" }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { color: textColor, boxWidth: 12, font: { size: 11 } } } }
      }
    });
    document.getElementById("expensesLegendBox").innerHTML = labelsD.map((l, i) => `
          <div class="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-900">
            <span class="truncate text-slate-600 dark:text-slate-300">${l}</span>
            <span class="font-mono font-bold ml-2">${this.formatRD(dataD[i])}</span>
          </div>
        `).join("");
    const ctxB = document.getElementById("canvasTrucksBar").getContext("2d");
    if (this.chartBar) this.chartBar.destroy();
    const names = this.db.trucks.map((t) => t.name);
    const incArr = [], costArr = [], netArr = [];
    this.db.trucks.forEach((trk) => {
      const tTrips = s.trips.filter((t) => String(t.truckId) === String(trk.id));
      const tMaints = s.maints.filter((m) => String(m.truckId) === String(trk.id));
      const tIncs = s.incidents.filter((i) => String(i.truckId) === String(trk.id));
      let g = 0, exp = 0;
      tTrips.forEach((t) => {
        const m = this.calcTrip(t);
        g += m.gross;
        exp += m.totalExpense;
      });
      const mCost = tMaints.reduce((a, x) => a + (Number(x.cost) || 0), 0);
      const iCost = tIncs.reduce((a, x) => a + (Number(x.cost) || 0), 0);
      const totalCost = exp + mCost + iCost;
      incArr.push(g);
      costArr.push(totalCost);
      netArr.push(g - totalCost);
    });
    this.chartBar = new Chart(ctxB, {
      type: "bar",
      data: {
        labels: names.length ? names : ["Sin camiones registrados"],
        datasets: [
          { label: "Ingresos Fletes", data: incArr.length ? incArr : [0], backgroundColor: "#0f172a", borderRadius: 4 },
          { label: "Gastos", data: costArr.length ? costArr : [0], backgroundColor: "#e11d48", borderRadius: 4 },
          { label: "Ganancia Neta", data: netArr.length ? netArr : [0], backgroundColor: "#059669", borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { color: textColor } } },
        scales: {
          x: { ticks: { color: textColor } },
          y: { beginAtZero: true, ticks: { color: textColor } }
        }
      }
    });
  },
  renderCatalogsTab() {
    const trips = this.getFilteredTrips();
    const hList = document.getElementById("helpersList");
    if (this.db.helpers.length === 0) {
      hList.innerHTML = `<div class="text-xs text-slate-400 py-4 text-center">Sin ayudantes registrados.</div>`;
    } else {
      hList.innerHTML = this.db.helpers.map((h) => {
        const hTrips = trips.filter((t) => (t.helperIds || []).map(String).includes(String(h.id)));
        const earned = hTrips.reduce((sum, t) => sum + (Number(t.helperPay) || 0) / ((t.helperIds || []).length || 1), 0);
        return `
              <div class="p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div class="font-semibold text-sm">${h.name}</div>
                  <div class="text-xs text-slate-500">${h.phone || ""} \xB7 ${hTrips.length} viaje(s)</div>
                </div>
                <div class="flex items-center gap-3">
                  <span class="font-mono font-bold text-sm">${this.formatRD(earned)}</span>
                  <button type="button" onclick="App.deleteHelper('${h.id}')" class="text-slate-400 hover:text-rose-600"><i class="fa-solid fa-trash"></i></button>
                </div>
              </div>`;
      }).join("");
    }
    const rList = document.getElementById("routesList");
    if (this.db.routes.length === 0) {
      rList.innerHTML = `<div class="text-xs text-slate-400 py-4 text-center">Sin rutas predefinidas.</div>`;
    } else {
      rList.innerHTML = this.db.routes.map((r) => {
        const count = trips.filter((t) => t.route === r.name).length;
        return `
              <div class="p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div class="font-semibold text-sm">${r.name}</div>
                  <div class="text-xs text-slate-500">${count} viaje(s)</div>
                </div>
                <button type="button" onclick="App.deleteRoute('${r.id}')" class="text-slate-400 hover:text-rose-600"><i class="fa-solid fa-trash"></i></button>
              </div>`;
      }).join("");
    }
  },
  updateLiveCalc() {
    const g = parseMoney(document.getElementById("fTripGross")?.value);
    const exp = parseMoney(document.getElementById("fTripFuel")?.value) + parseMoney(document.getElementById("fTripTolls")?.value) + parseMoney(document.getElementById("fTripDrvPay")?.value) + parseMoney(document.getElementById("fTripHlpPay")?.value) + parseMoney(document.getElementById("fTripOther")?.value);
    const net = g - exp;
    const expEl = document.getElementById("liveTripExp");
    const netEl = document.getElementById("liveTripNet");
    if (expEl) expEl.textContent = this.formatRD(exp);
    if (netEl) netEl.textContent = this.formatRD(net);
  }
};

// js/db.js
var STORAGE_KEY = "miflota_rd_prod_v1";
var COLLECTIONS = [
  "trucks",
  "drivers",
  "helpers",
  "routes",
  "trips",
  "scheduledTrips",
  "maintenances",
  "incidents"
];
function createEmptyDatabase() {
  return Object.fromEntries(COLLECTIONS.map((collection) => [collection, []]));
}
function getCollection(database, collectionName) {
  if (!COLLECTIONS.includes(collectionName)) {
    throw new Error(`Colecci\xF3n de base de datos desconocida: ${collectionName}`);
  }
  return database[collectionName];
}
function addRecord(database, collectionName, record, prepend = false) {
  const collection = getCollection(database, collectionName);
  if (prepend) collection.unshift(record);
  else collection.push(record);
  return record;
}
function updateRecord(database, collectionName, id, changes) {
  const collection = getCollection(database, collectionName);
  const index = collection.findIndex((record) => String(record.id) === String(id));
  if (index === -1) throw new Error(`No existe el registro ${id} en ${collectionName}.`);
  collection[index] = { ...collection[index], ...changes };
  return collection[index];
}
function deleteRecord(database, collectionName, id) {
  const collection = getCollection(database, collectionName);
  const index = collection.findIndex((record) => String(record.id) === String(id));
  if (index === -1) return false;
  collection.splice(index, 1);
  return true;
}
function normalizeDatabase(value) {
  const source = value && typeof value === "object" ? value : {};
  const database = createEmptyDatabase();
  for (const collection of COLLECTIONS) {
    database[collection] = Array.isArray(source[collection]) ? source[collection] : [];
  }
  database.trucks = database.trucks.map((truck) => ({
    ...truck,
    status: truck.status === "Fuera de Servicio" ? truck.status : "Disponible"
  }));
  return database;
}
function loadLocalDatabase() {
  const serialized = localStorage.getItem(STORAGE_KEY);
  if (!serialized) return createEmptyDatabase();
  return normalizeDatabase(JSON.parse(serialized));
}
function saveLocalDatabase(database) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeDatabase(database)));
}
async function loadDatabase(user, auth) {
  try {
    const cloudDatabase = await auth.loadCloudDatabase(user.id);
    if (cloudDatabase && Object.keys(cloudDatabase).length > 0) {
      const database = normalizeDatabase(cloudDatabase);
      saveLocalDatabase(database);
      return { database, cloudError: null };
    }
    return { database: loadLocalDatabase(), cloudError: null };
  } catch (cloudError) {
    return { database: loadLocalDatabase(), cloudError };
  }
}
async function saveDatabase(database, user, auth, onCloudStatus) {
  const normalized = normalizeDatabase(database);
  saveLocalDatabase(normalized);
  if (!user) return { cloudSynced: false };
  onCloudStatus?.("saving");
  try {
    await auth.saveCloudDatabase(user.id, normalized);
    onCloudStatus?.("synced");
    return { cloudSynced: true };
  } catch (error) {
    onCloudStatus?.("offline");
    console.error("No se pudo sincronizar con Supabase; los datos quedaron guardados localmente.", error);
    return { cloudSynced: false, error };
  }
}

// js/app.js
var SUPABASE_URL = "https://pofpqcvejdrlxindicpc.supabase.co";
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvZnBxY3ZlamRybHhpbmRpY3BjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MTc0NzUsImV4cCI6MjEwODE5MzQ3NX0.flLYbLEnM3gro3JpG4ANvrCiks7nXauGPxDN4uVIqIE";
var supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
var databaseAuth = {
  loadCloudDatabase: (userId) => Auth.loadCloudDatabase(supabaseClient, userId),
  saveCloudDatabase: (userId, database) => Auth.saveCloudDatabase(supabaseClient, userId, database)
};
var THEME_KEY = "miflota_rd_theme_prod_v1";
async function notifySuccess() {
  try {
    await Haptics.notification({ type: "SUCCESS" });
  } catch (error) {
    console.warn("No se pudo activar la notificaci\xF3n h\xE1ptica.", error);
  }
}
function getCurrentPosition() {
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      (error) => {
        console.warn("No se pudo obtener la ubicaci\xF3n GPS de la incidencia.", error);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 1e4, maximumAge: 0 }
    );
  });
}
function readReceiptImage(file) {
  if (!file) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("No se pudo leer la imagen."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("El archivo seleccionado no es una imagen v\xE1lida."));
      image.onload = () => {
        try {
          const maxDimension = 1280;
          const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);
          canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        } catch (error) {
          reject(error);
        }
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
var MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
];
var App = {
  db: null,
  activeTab: "trips",
  chartDoughnut: null,
  chartBar: null,
  uid(prefix = "id") {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  },
  formatRD(val) {
    const num = Number(val) || 0;
    const sign = num < 0 ? "-" : "";
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(num));
    return `${sign}RD$ ${formatted}`;
  },
  formatTime12h(timeStr) {
    if (!timeStr) return "Sin hora";
    const [hStr, mStr] = timeStr.split(":");
    let h = parseInt(hStr, 10);
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${String(h).padStart(2, "0")}:${mStr} ${ampm}`;
  },
  formatMonthLabel(yyyyMm) {
    if (!yyyyMm || yyyyMm === "ALL") return "Todos los meses (Hist\xF3rico)";
    const [year, month] = yyyyMm.split("-");
    const mIdx = parseInt(month, 10) - 1;
    return `${MONTHS_ES[mIdx] || month} ${year}`;
  },
  offsetDateISO(days) {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  },
  // Base de datos inicial 100% en blanco
  getEmptyDatabase() {
    return createEmptyDatabase();
  },
  toggleAddMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById("addNewDropdownMenu");
    const chev = document.getElementById("addMenuChevron");
    const isHidden = menu.classList.toggle("hidden");
    if (chev) chev.style.transform = isHidden ? "rotate(0deg)" : "rotate(180deg)";
  },
  closeAddMenu() {
    const menu = document.getElementById("addNewDropdownMenu");
    const chev = document.getElementById("addMenuChevron");
    if (menu) menu.classList.add("hidden");
    if (chev) chev.style.transform = "rotate(0deg)";
  },
  initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || "light";
    document.documentElement.classList.toggle("dark", saved === "dark");
    this.updateThemeIcon();
  },
  toggleTheme() {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    this.updateThemeIcon();
    if (this.activeTab === "analytics") this.renderAnalyticsCharts();
  },
  updateThemeIcon() {
    const isDark = document.documentElement.classList.contains("dark");
    const icon = document.getElementById("themeIcon");
    if (icon) icon.className = isDark ? "fa-solid fa-sun text-amber-400 text-sm" : "fa-solid fa-moon text-slate-600 text-sm";
  },
  currentUser: null,
  async init() {
    this.initTheme();
    this.db = this.getEmptyDatabase();
    bindFinancialInputs(document);
    document.addEventListener("click", (e) => {
      const wrapper = document.getElementById("addNewDropdownWrapper");
      if (wrapper && !wrapper.contains(e.target)) {
        this.closeAddMenu();
      }
    });
    let session;
    try {
      session = await Auth.getSession(supabaseClient);
    } catch (error) {
      console.error("No se pudo verificar la sesi\xF3n de Supabase.", error);
      document.getElementById("authGateOverlay").classList.remove("hidden");
      this.showToast("No se pudo verificar la sesi\xF3n. Revisa tu conexi\xF3n.", true);
      return;
    }
    if (session && session.user) {
      await this.unlockAndLoadCloudData(session.user);
    } else {
      document.getElementById("authGateOverlay").classList.remove("hidden");
    }
  },
  async loginWithSupabase(e) {
    e.preventDefault();
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const errEl = document.getElementById("authErrorMsg");
    const btn = document.getElementById("authSubmitBtn");
    errEl.classList.add("hidden");
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Verificando...';
    try {
      const user = await Auth.signIn(supabaseClient, email, password);
      await this.unlockAndLoadCloudData(user);
      this.showToast("Sesi\xF3n iniciada y datos sincronizados");
    } catch (error) {
      console.error("No se pudo iniciar sesi\xF3n en Supabase.", error);
      errEl.textContent = error?.status === 400 ? "Credenciales inv\xE1lidas. Verifica tu correo y contrase\xF1a." : "No fue posible iniciar sesi\xF3n. Verifica tu conexi\xF3n e int\xE9ntalo de nuevo.";
      errEl.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-lock-open"></i> <span>Iniciar Sesi\xF3n Segura</span>';
    }
  },
  async unlockAndLoadCloudData(user) {
    this.currentUser = user;
    document.getElementById("authGateOverlay").classList.add("hidden");
    const { database, cloudError } = await loadDatabase(user, databaseAuth);
    this.db = database;
    if (cloudError) {
      console.error("No se pudo cargar la nube; se usar\xE1n los datos locales.", cloudError);
      this.showToast("No se pudo conectar a la nube; datos locales cargados", true);
    } else {
      await this.save();
    }
    this.populateMonthFilter();
    this.renderAll();
  },
  async logoutSupabase() {
    if (!confirm("\xBFCerrar sesi\xF3n en este dispositivo?")) return;
    await Auth.signOut(supabaseClient);
    this.currentUser = null;
    document.getElementById("authGateOverlay").classList.remove("hidden");
  },
  async save() {
    const badge = document.getElementById("cloudSyncBadge");
    await saveDatabase(this.db, this.currentUser, databaseAuth, (state) => {
      if (!badge) return;
      badge.innerHTML = state === "saving" ? '<i class="fa-solid fa-arrows-rotate fa-spin"></i> Guardando...' : state === "synced" ? '<i class="fa-solid fa-cloud-check"></i> Sincronizado' : '<i class="fa-solid fa-triangle-exclamation text-rose-500"></i> Solo Local';
    });
  },
  // Cruza fechas de forma segura contra el selector de mes global ("YYYY-MM" o "ALL")
  matchesPeriod(recordDate, periodCode) {
    const target = periodCode || this.getSelectedMonth();
    if (!target || target === "ALL") return true;
    const clean = String(recordDate || "").trim();
    return clean.slice(0, 7) === target;
  },
  getAvailableMonths() {
    const currentMonth = this.offsetDateISO(0).slice(0, 7);
    const set = /* @__PURE__ */ new Set([currentMonth]);
    this.db.trips.forEach((t) => {
      if (t.date) set.add(String(t.date).trim().slice(0, 7));
    });
    this.db.maintenances.forEach((m) => {
      if (m.date) set.add(String(m.date).trim().slice(0, 7));
    });
    this.db.incidents.forEach((i) => {
      if (i.date) set.add(String(i.date).trim().slice(0, 7));
    });
    this.db.scheduledTrips.forEach((s) => {
      if (s.date) set.add(String(s.date).trim().slice(0, 7));
    });
    return [...set].filter(Boolean).sort().reverse();
  },
  populateMonthFilter(forceSelectMonth = null) {
    const sel = document.getElementById("monthFilter");
    const prev = forceSelectMonth || sel?.value || "ALL";
    const sorted = this.getAvailableMonths();
    sel.innerHTML = `<option value="ALL">Todos los meses (Hist\xF3rico)</option>` + sorted.map((m) => `<option value="${m}">${this.formatMonthLabel(m)}</option>`).join("");
    if ([...sel.options].some((o) => o.value === prev)) {
      sel.value = prev;
    } else {
      sel.value = "ALL";
    }
  },
  getSelectedMonth() {
    const val = document.getElementById("monthFilter")?.value;
    return val ? val : "ALL";
  },
  // Si el usuario tiene un mes específico filtrado y registra algo de otro mes, sincroniza el filtro para que vea su registro de inmediato
  syncFilterWithNewRecordDate(dateStr) {
    const current = this.getSelectedMonth();
    const recMonth = String(dateStr || "").trim().slice(0, 7);
    if (current !== "ALL" && recMonth && recMonth !== current) {
      this.populateMonthFilter(recMonth);
    } else {
      this.populateMonthFilter(current);
    }
  },
  getFilteredTrips(monthOverride = null) {
    const m = monthOverride || this.getSelectedMonth();
    return this.db.trips.filter((t) => this.matchesPeriod(t.date, m)).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  },
  getFilteredMaintenances(monthOverride = null) {
    const m = monthOverride || this.getSelectedMonth();
    return this.db.maintenances.filter((x) => this.matchesPeriod(x.date, m)).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  },
  getFilteredIncidents(monthOverride = null) {
    const m = monthOverride || this.getSelectedMonth();
    return this.db.incidents.filter((i) => this.matchesPeriod(i.date, m)).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  },
  getAllScheduledSorted(monthOverride = null) {
    const m = monthOverride || this.getSelectedMonth();
    return this.db.scheduledTrips.filter((s) => this.matchesPeriod(s.date, m)).sort((a, b) => `${a.date}T${a.departureTime || "00:00"}`.localeCompare(`${b.date}T${b.departureTime || "00:00"}`));
  },
  calcTrip(t) {
    const gross = Number(t.freightGross) || 0;
    const fuel = Number(t.fuelCost) || 0;
    const tolls = Number(t.tollsCost) || 0;
    const drvPay = Number(t.driverPay) || 0;
    const hlpPay = Number(t.helperPay) || 0;
    const other = Number(t.otherCost) || 0;
    const totalExpense = fuel + tolls + drvPay + hlpPay + other;
    const netOwner = gross - totalExpense;
    const hasAnyFinancial = Boolean(
      t.freightGross !== "" && t.freightGross !== null && t.freightGross !== void 0 && Number(t.freightGross) > 0 || totalExpense > 0
    );
    return { gross, fuel, tolls, drvPay, hlpPay, other, totalExpense, netOwner, hasAnyFinancial };
  },
  getTruckName(id) {
    if (!id) return "Por asignar";
    return this.db.trucks.find((x) => String(x.id) === String(id))?.name || "Por asignar";
  },
  getDriverName(id) {
    if (!id) return "Por asignar";
    return this.db.drivers.find((x) => String(x.id) === String(id))?.name || "Por asignar";
  },
  getHelpersNames(ids = []) {
    if (!ids || ids.length === 0) return "Sin ayudante";
    return ids.map((id) => this.db.helpers.find((x) => String(x.id) === String(id))?.name).filter(Boolean).join(", ") || "Sin ayudante";
  },
  getPeriodSummary(monthOverride = null) {
    const trips = this.getFilteredTrips(monthOverride);
    const maints = this.getFilteredMaintenances(monthOverride);
    const incidents = this.getFilteredIncidents(monthOverride);
    const scheduled = this.getAllScheduledSorted(monthOverride);
    let gross = 0, fuel = 0, tolls = 0, drvPay = 0, hlpPay = 0, other = 0, tripExp = 0, tripNet = 0, clients = 0;
    trips.forEach((t) => {
      const m = this.calcTrip(t);
      gross += m.gross;
      fuel += m.fuel;
      tolls += m.tolls;
      drvPay += m.drvPay;
      hlpPay += m.hlpPay;
      other += m.other;
      tripExp += m.totalExpense;
      tripNet += m.netOwner;
      clients += Number(t.clientsCount) || 0;
    });
    const maintTotal = maints.reduce((s, x) => s + (Number(x.cost) || 0), 0);
    const incidentTotal = incidents.reduce((s, x) => s + (Number(x.cost) || 0), 0);
    const finalOwnerNet = tripNet - maintTotal - incidentTotal;
    const marginPct = gross > 0 ? (finalOwnerNet / gross * 100).toFixed(1) : 0;
    return { trips, maints, incidents, scheduled, gross, fuel, tolls, drvPay, hlpPay, other, tripExp, tripNet, maintTotal, incidentTotal, finalOwnerNet, clients, marginPct };
  },
  // PESTAÑA 1: Centro de Viajes
  // PESTAÑA 2: Agenda Anticipada (filtrada por el mes global seleccionado)
  // PESTAÑA 3: Camiones y Taller (con botón "Ver Historial" del Camión respetando el mes seleccionado)
  // PESTAÑA 4: Incidencias
  // PESTAÑA 5: Choferes (con "Restante Generado")
  // PESTAÑA 6: Analítica Visual
  // PESTAÑA 8: Catálogos
  // =====================================================================
  // 2. MODALES DE HISTORIAL CORREGIDOS (RESPETANDO EL MES GLOBAL ACTIVO)
  // =====================================================================
  openDriverHistoryModal(driverId) {
    const d = this.db.drivers.find((x) => String(x.id) === String(driverId));
    if (!d) return;
    const periodLabel = this.formatMonthLabel(this.getSelectedMonth());
    const dTrips = this.getFilteredTrips().filter((t) => String(t.driverId) === String(driverId));
    let totalFletes = 0, totalCobradoChofer = 0, totalRestanteGenerado = 0;
    const rowsHtml = dTrips.map((t) => {
      const m = this.calcTrip(t);
      totalFletes += m.gross;
      totalCobradoChofer += m.drvPay;
      totalRestanteGenerado += m.netOwner;
      return `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40">
              <td class="td font-mono font-semibold whitespace-nowrap">${t.date}</td>
              <td class="td">
                <div class="font-semibold text-slate-900 dark:text-white">${t.route}</div>
                <span class="text-[11px] text-slate-400">${t.clientsCount} cliente(s) \xB7 Ayud: ${this.getHelpersNames(t.helperIds)}</span>
              </td>
              <td class="td">${this.getTruckName(t.truckId)}</td>
              <td class="td text-right font-mono font-semibold whitespace-nowrap">${this.formatRD(m.gross)}</td>
              <td class="td text-right font-mono text-sky-700 dark:text-sky-400 font-semibold whitespace-nowrap">${this.formatRD(m.drvPay)}</td>
              <td class="td text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">${this.formatRD(m.netOwner)}</td>
            </tr>
          `;
    }).join("");
    const footHtml = dTrips.length > 0 ? `
          <tfoot class="bg-slate-100 dark:bg-slate-800/90 font-mono font-bold text-xs border-t-2 border-slate-300 dark:border-slate-600">
            <tr>
              <td class="py-3 px-3" colspan="3">TOTALES DEL PERIODO (${dTrips.length} viajes)</td>
              <td class="py-3 px-3 text-right whitespace-nowrap">${this.formatRD(totalFletes)}</td>
              <td class="py-3 px-3 text-right text-sky-700 dark:text-sky-400 whitespace-nowrap">${this.formatRD(totalCobradoChofer)}</td>
              <td class="py-3 px-3 text-right text-emerald-700 dark:text-emerald-400 whitespace-nowrap">${this.formatRD(totalRestanteGenerado)}</td>
            </tr>
          </tfoot>
        ` : "";
    this.openModal(`Historial de Chofer: ${d.name} \u2014 ${periodLabel}`, `
          <div class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span class="text-slate-400 uppercase font-semibold block">Total Fletes</span>
                <span class="font-mono font-bold text-base text-slate-900 dark:text-white mt-0.5 block">${this.formatRD(totalFletes)}</span>
              </div>
              <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span class="text-slate-400 uppercase font-semibold block">Total Cobrado por Chofer</span>
                <span class="font-mono font-bold text-base text-sky-600 dark:text-sky-400 mt-0.5 block">${this.formatRD(totalCobradoChofer)}</span>
              </div>
              <div class="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                <span class="text-emerald-800 dark:text-emerald-300 uppercase font-bold block">Restante Generado</span>
                <span class="font-mono font-bold text-base text-emerald-700 dark:text-emerald-400 mt-0.5 block">${this.formatRD(totalRestanteGenerado)}</span>
              </div>
            </div>

            <div class="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
              <table class="w-full border-collapse">
                <thead>
                  <tr>
                    <th class="th">Fecha</th>
                    <th class="th">Ruta y Clientes</th>
                    <th class="th">Cami\xF3n</th>
                    <th class="th text-right">Total Fletes</th>
                    <th class="th text-right">Cobrado por Chofer</th>
                    <th class="th text-right">Restante Generado</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml || '<tr><td colspan="6" class="py-8 text-center text-slate-400 text-xs">Sin viajes registrados para este chofer en el periodo seleccionado.</td></tr>'}
                </tbody>
                ${footHtml}
              </table>
            </div>
          </div>
        `, "max-w-4xl");
  },
  openTruckHistoryModal(truckId) {
    const trk = this.db.trucks.find((x) => String(x.id) === String(truckId));
    if (!trk) return;
    const periodLabel = this.formatMonthLabel(this.getSelectedMonth());
    const tTrips = this.getFilteredTrips().filter((t) => String(t.truckId) === String(truckId));
    const tMaints = this.getFilteredMaintenances().filter((m) => String(m.truckId) === String(truckId));
    const tIncs = this.getFilteredIncidents().filter((i) => String(i.truckId) === String(truckId));
    let totalFletes = 0, totalGastosViajes = 0, totalNetoViajes = 0;
    const tripRowsHtml = tTrips.map((t) => {
      const m = this.calcTrip(t);
      totalFletes += m.gross;
      totalGastosViajes += m.totalExpense;
      totalNetoViajes += m.netOwner;
      return `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40">
              <td class="td font-mono font-semibold whitespace-nowrap">${t.date}</td>
              <td class="td"><b>${t.route}</b> (${t.clientsCount} cli.)</td>
              <td class="td">${this.getDriverName(t.driverId)}</td>
              <td class="td text-right font-mono">${this.formatRD(m.gross)}</td>
              <td class="td text-right font-mono text-amber-600">-${this.formatRD(m.totalExpense)}</td>
              <td class="td text-right font-mono font-bold text-emerald-600">${this.formatRD(m.netOwner)}</td>
            </tr>
          `;
    }).join("");
    const maintCost = tMaints.reduce((s, x) => s + (Number(x.cost) || 0), 0);
    const incCost = tIncs.reduce((s, x) => s + (Number(x.cost) || 0), 0);
    const totalTallerEIncidencias = maintCost + incCost;
    const gananciaNetaCamion = totalFletes - totalGastosViajes - totalTallerEIncidencias;
    const maintAndIncRows = [
      ...tMaints.map((m) => `
            <tr>
              <td class="td font-mono font-semibold whitespace-nowrap">${m.date}</td>
              <td class="td"><span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Taller</span></td>
              <td class="td">${m.description}</td>
              <td class="td text-right font-mono font-bold text-rose-600">-${this.formatRD(m.cost)}</td>
            </tr>`),
      ...tIncs.map((i) => `
            <tr>
              <td class="td font-mono font-semibold whitespace-nowrap">${i.date}</td>
              <td class="td"><span class="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">Incidencia (${i.severity})</span></td>
              <td class="td">${i.description}</td>
              <td class="td text-right font-mono font-bold text-rose-600">-${this.formatRD(i.cost)}</td>
            </tr>`)
    ].join("");
    this.openModal(`Historial de Cami\xF3n: ${trk.name} (${trk.plate}) \u2014 ${periodLabel}`, `
          <div class="space-y-5">
            <!-- 4 Tarjetas de Resumen del Cami\xF3n en el Periodo -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span class="text-slate-400 uppercase font-semibold block">Total Fletes</span>
                <span class="font-mono font-bold text-sm sm:text-base text-slate-900 dark:text-white mt-0.5 block">${this.formatRD(totalFletes)}</span>
              </div>
              <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span class="text-slate-400 uppercase font-semibold block">Total Gastos de Viajes</span>
                <span class="font-mono font-bold text-sm sm:text-base text-amber-600 mt-0.5 block">-${this.formatRD(totalGastosViajes)}</span>
              </div>
              <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span class="text-slate-400 uppercase font-semibold block">Total Gastos Taller/Incidencias</span>
                <span class="font-mono font-bold text-sm sm:text-base text-rose-600 mt-0.5 block">-${this.formatRD(totalTallerEIncidencias)}</span>
              </div>
              <div class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                <span class="text-emerald-800 dark:text-emerald-300 uppercase font-bold block">Ganancia Neta</span>
                <span class="font-mono font-bold text-sm sm:text-base ${gananciaNetaCamion >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600"} mt-0.5 block">${this.formatRD(gananciaNetaCamion)}</span>
              </div>
            </div>

            <!-- Tabla 1: Viajes del Cami\xF3n en ese mes -->
            <div>
              <h4 class="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">Viajes Realizados en este Periodo (${tTrips.length})</h4>
              <div class="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                <table class="w-full border-collapse">
                  <thead>
                    <tr>
                      <th class="th">Fecha</th>
                      <th class="th">Ruta</th>
                      <th class="th">Chofer</th>
                      <th class="th text-right">Flete</th>
                      <th class="th text-right">Gastos Viaje</th>
                      <th class="th text-right">Ganancia Neta Viaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${tripRowsHtml || '<tr><td colspan="6" class="py-6 text-center text-slate-400 text-xs">Sin viajes registrados en este periodo</td></tr>'}
                  </tbody>
                  ${tTrips.length > 0 ? `
                    <tfoot class="bg-slate-100 dark:bg-slate-800/90 font-mono font-bold text-xs border-t-2 border-slate-300 dark:border-slate-600">
                      <tr>
                        <td class="py-2.5 px-3" colspan="3">SUBTOTAL VIAJES (${tTrips.length})</td>
                        <td class="py-2.5 px-3 text-right">${this.formatRD(totalFletes)}</td>
                        <td class="py-2.5 px-3 text-right text-amber-600">-${this.formatRD(totalGastosViajes)}</td>
                        <td class="py-2.5 px-3 text-right text-emerald-600">${this.formatRD(totalNetoViajes)}</td>
                      </tr>
                    </tfoot>` : ""}
                </table>
              </div>
            </div>

            <!-- Tabla 2: Mantenimientos e Incidencias del Cami\xF3n en ese mes -->
            <div>
              <h4 class="font-bold text-xs uppercase tracking-wider text-rose-600 mb-2">Mantenimientos de Taller e Incidencias en este Periodo (${tMaints.length + tIncs.length})</h4>
              <div class="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                <table class="w-full border-collapse">
                  <thead>
                    <tr>
                      <th class="th">Fecha</th>
                      <th class="th">Tipo</th>
                      <th class="th">Descripci\xF3n</th>
                      <th class="th text-right">Costo (RD$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${maintAndIncRows || '<tr><td colspan="4" class="py-6 text-center text-slate-400 text-xs">Sin gastos de taller ni incidencias en este periodo</td></tr>'}
                  </tbody>
                  ${tMaints.length + tIncs.length > 0 ? `
                    <tfoot class="bg-slate-100 dark:bg-slate-800/90 font-mono font-bold text-xs border-t-2 border-slate-300 dark:border-slate-600">
                      <tr>
                        <td class="py-2.5 px-3" colspan="3">SUBTOTAL TALLER E INCIDENCIAS</td>
                        <td class="py-2.5 px-3 text-right text-rose-600">-${this.formatRD(totalTallerEIncidencias)}</td>
                      </tr>
                    </tfoot>` : ""}
                </table>
              </div>
            </div>
          </div>
        `, "max-w-4xl");
  },
  // =====================================================================
  // MODALES DE REGISTRO Y EDICIÓN (CRUD)
  // =====================================================================
  openTripModal(tripId = null, fromScheduledId = null) {
    const t = tripId ? this.db.trips.find((x) => String(x.id) === String(tripId)) : fromScheduledId ? this.db.scheduledTrips.find((x) => String(x.id) === String(fromScheduledId)) : null;
    const today = this.offsetDateISO(0);
    const routeOpts = this.db.routes.map((r) => `<option value="${r.name}"></option>`).join("");
    const selHelpers = t ? (t.helperIds || []).map(String) : [];
    const availableTrucks = this.db.trucks.filter((truck) => truck.status !== "Fuera de Servicio");
    const truckFieldHtml = availableTrucks.length ? `<select id="fTripTruck" required class="inp"><option value="">Selecciona un cami\xF3n</option>${availableTrucks.map((k) => `<option value="${k.id}" ${t && String(t.truckId) === String(k.id) ? "selected" : ""}>${k.name} \xB7 ${k.plate}</option>`).join("")}</select>` : this.db.trucks.length === 0 ? `<button type="button" onclick="App.closeModal(); App.openTruckModal()" class="btn-rose w-full">Primero registra un cami\xF3n</button>` : `<button type="button" onclick="App.closeModal(); App.switchTab('trucks')" class="btn-rose w-full">No hay camiones disponibles; revisa la flota</button>`;
    const driverFieldHtml = this.db.drivers.length > 0 ? `<select id="fTripDriver" required class="inp">${this.db.drivers.map((d) => `<option value="${d.id}" ${t && String(t.driverId) === String(d.id) ? "selected" : ""}>${d.name}</option>`).join("")}</select>` : `<input type="text" id="fTripNewDriverName" required placeholder="Ej. Ram\xF3n Almonte (Se crear\xE1)" class="inp" />`;
    const helpersChecks = this.db.helpers.length > 0 ? this.db.helpers.map((h) => `
              <label class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer text-xs font-medium">
                <input type="checkbox" name="tripHelpers" value="${h.id}" ${selHelpers.includes(String(h.id)) ? "checked" : ""} class="accent-slate-900 w-4 h-4 rounded" />
                <span>${h.name}</span>
              </label>`).join("") : `<input type="text" id="fTripNewHelperName" placeholder="Nombre de ayudante (Opcional - se guardar\xE1)" class="inp" />`;
    this.openModal(fromScheduledId ? "Liquidar Viaje Anticipado" : tripId ? "Editar Viaje" : "Registrar y Liquidar Viaje", `
          <form onsubmit="App.saveTrip(event, ${tripId ? `'${tripId}'` : "null"}, ${fromScheduledId ? `'${fromScheduledId}'` : "null"})" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label class="lbl">Fecha del Viaje</label><input type="date" id="fTripDate" value="${t ? t.date : today}" required class="inp font-mono" /></div>
              <div class="sm:col-span-2">
                <label class="lbl">Ruta Realizada</label>
                <input type="text" id="fTripRoute" list="dlRoutes" value="${t && t.route ? t.route : ""}" required placeholder="Ej. Santiago \u2194 Santo Domingo" class="inp" />
                <datalist id="dlRoutes">${routeOpts}</datalist>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label class="lbl">Cant. Clientes Atendidos</label><input type="number" min="1" id="fTripClients" value="${t && t.clientsCount ? t.clientsCount : 1}" required class="inp font-mono font-bold" /></div>
              <div><label class="lbl">Cami\xF3n</label>${truckFieldHtml}</div>
              <div><label class="lbl">Chofer</label>${driverFieldHtml}</div>
            </div>
            <div><label class="lbl">Ayudante(s)</label><div class="flex flex-wrap gap-2">${helpersChecks}</div></div>
            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
              <div>
                <label class="lbl !text-emerald-600">Ganancia Bruta por Flete (RD$)</label>
                <input type="text" inputmode="decimal" id="fTripGross" oninput="App.updateLiveCalc()" value="${formatMoneyInput(t && t.freightGross !== "" ? t.freightGross : "")}" required class="inp font-mono font-bold financial-input" />
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div><label class="lbl">Combustible (RD$)</label><input type="text" inputmode="decimal" id="fTripFuel" oninput="App.updateLiveCalc()" value="${formatMoneyInput(t && t.fuelCost !== "" ? t.fuelCost : 0)}" required class="inp font-mono financial-input" /></div>
                <div><label class="lbl">Peajes (RD$)</label><input type="text" inputmode="decimal" id="fTripTolls" oninput="App.updateLiveCalc()" value="${formatMoneyInput(t && t.tollsCost !== "" ? t.tollsCost : 0)}" required class="inp font-mono financial-input" /></div>
                <div><label class="lbl">Pago Chofer (RD$)</label><input type="text" inputmode="decimal" id="fTripDrvPay" oninput="App.updateLiveCalc()" value="${formatMoneyInput(t && t.driverPay !== "" ? t.driverPay : 0)}" required class="inp font-mono financial-input" /></div>
                <div><label class="lbl">Pago Ayudante (RD$)</label><input type="text" inputmode="decimal" id="fTripHlpPay" oninput="App.updateLiveCalc()" value="${formatMoneyInput(t && t.helperPay !== "" ? t.helperPay : 0)}" required class="inp font-mono financial-input" /></div>
                <div class="col-span-2"><label class="lbl">Otros Gastos / Dieta (RD$)</label><input type="text" inputmode="decimal" id="fTripOther" oninput="App.updateLiveCalc()" value="${formatMoneyInput(t && t.otherCost !== "" ? t.otherCost : 0)}" class="inp font-mono financial-input" /></div>
              </div>
            </div>
            <div class="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
              <div><span class="text-[10px] uppercase text-slate-400 block font-semibold">Total Gastos</span><span id="liveTripExp" class="text-base font-mono font-bold text-amber-400">RD$ 0.00</span></div>
              <div class="text-right"><span class="text-[10px] uppercase text-emerald-400 block font-semibold">Ganancia Neta</span><span id="liveTripNet" class="text-xl font-mono font-bold text-emerald-400">RD$ 0.00</span></div>
            </div>
            <div><label class="lbl">Notas</label><input type="text" id="fTripNotes" value="${t ? t.notes || "" : ""}" class="inp" /></div>
            <div class="flex justify-end gap-2">
              <button type="button" onclick="App.closeModal()" class="btn-outline">Cancelar</button>
              <button type="submit" class="btn-emerald"><i class="fa-solid fa-check"></i> Guardar Viaje</button>
            </div>
          </form>
        `);
    this.updateLiveCalc();
  },
  async saveTrip(e, id = null, fromScheduledId = null) {
    e.preventDefault();
    let truckId = document.getElementById("fTripTruck")?.value;
    const selectedTruck = this.db.trucks.find((truck) => String(truck.id) === String(truckId));
    if (!selectedTruck || selectedTruck.status === "Fuera de Servicio") {
      this.showToast("Selecciona un cami\xF3n disponible para registrar el viaje.", true);
      return;
    }
    let driverId = document.getElementById("fTripDriver")?.value;
    const newDriverName = document.getElementById("fTripNewDriverName")?.value.trim();
    if (!driverId && newDriverName) {
      driverId = this.uid("drv");
      addRecord(this.db, "drivers", { id: driverId, name: newDriverName, phone: "", note: "" });
    }
    let helperIds = [...document.querySelectorAll('input[name="tripHelpers"]:checked')].map((c) => c.value);
    const newHelperName = document.getElementById("fTripNewHelperName")?.value.trim();
    if (newHelperName) {
      const hId = this.uid("hlp");
      addRecord(this.db, "helpers", { id: hId, name: newHelperName, phone: "" });
      helperIds.push(hId);
    }
    const route = document.getElementById("fTripRoute").value.trim();
    const dateVal = document.getElementById("fTripDate").value;
    if (route && !this.db.routes.some((r) => r.name.toLowerCase() === route.toLowerCase())) {
      addRecord(this.db, "routes", { id: this.uid("rt"), name: route });
    }
    const payload = {
      date: dateVal,
      route,
      clientsCount: Number(document.getElementById("fTripClients").value) || 1,
      truckId,
      driverId,
      helperIds,
      freightGross: parseMoney(document.getElementById("fTripGross").value),
      fuelCost: parseMoney(document.getElementById("fTripFuel").value),
      tollsCost: parseMoney(document.getElementById("fTripTolls").value),
      driverPay: parseMoney(document.getElementById("fTripDrvPay").value),
      helperPay: parseMoney(document.getElementById("fTripHlpPay").value),
      otherCost: parseMoney(document.getElementById("fTripOther").value),
      notes: document.getElementById("fTripNotes").value.trim()
    };
    if (id) updateRecord(this.db, "trips", id, payload);
    else addRecord(this.db, "trips", { id: this.uid("trp"), ...payload }, true);
    if (fromScheduledId) {
      deleteRecord(this.db, "scheduledTrips", fromScheduledId);
    }
    await this.save();
    this.syncFilterWithNewRecordDate(dateVal);
    this.closeModal();
    this.renderAll();
    this.showToast("Viaje guardado correctamente");
    await notifySuccess();
  },
  deleteTrip(id) {
    if (!confirm("\xBFEliminar este viaje?")) return;
    deleteRecord(this.db, "trips", id);
    this.save();
    this.renderAll();
    this.showToast("Viaje eliminado");
  },
  openScheduledModal(schedId = null) {
    const s = schedId ? this.db.scheduledTrips.find((x) => String(x.id) === String(schedId)) : null;
    const tomorrow = this.offsetDateISO(1);
    const routeOpts = this.db.routes.map((r) => `<option value="${r.name}"></option>`).join("");
    const truckOpts = `<option value="">-- Por asignar (Opcional) --</option>` + this.db.trucks.map((k) => `<option value="${k.id}" ${s && String(s.truckId) === String(k.id) ? "selected" : ""}>${k.name}</option>`).join("");
    const driverOpts = `<option value="">-- Por asignar (Opcional) --</option>` + this.db.drivers.map((d) => `<option value="${d.id}" ${s && String(s.driverId) === String(d.id) ? "selected" : ""}>${d.name}</option>`).join("");
    const selHelpers = s ? (s.helperIds || []).map(String) : [];
    const helpersChecks = this.db.helpers.map((h) => `
          <label class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer text-xs font-medium">
            <input type="checkbox" name="schedHelpers" value="${h.id}" ${selHelpers.includes(String(h.id)) ? "checked" : ""} class="accent-slate-900 w-4 h-4 rounded" />
            <span>${h.name}</span>
          </label>
        `).join("");
    this.openModal(s ? "Editar Viaje Anticipado" : "Agendar Viaje Anticipado con Recordatorio", `
          <form onsubmit="App.saveScheduledTrip(event, ${s ? `'${s.id}'` : "null"})" class="space-y-4">
            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="lbl">Fecha del Viaje *</label>
                <input type="date" id="fSchDate" value="${s ? s.date : tomorrow}" required class="inp font-mono font-bold" />
              </div>
              <div>
                <label class="lbl">Hora Inicio Recordatorio *</label>
                <input type="time" id="fSchReminderTime" value="${s ? s.reminderTime || "05:00" : "05:00"}" required class="inp font-mono font-bold" />
              </div>
              <div>
                <label class="lbl">Hora de Salida *</label>
                <input type="time" id="fSchDepartureTime" value="${s ? s.departureTime || "06:30" : "06:30"}" required class="inp font-mono font-bold" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="sm:col-span-2">
                <label class="lbl">Ruta (Opcional)</label>
                <input type="text" id="fSchRoute" list="dlSchRoutes" value="${s ? s.route || "" : ""}" placeholder="Ej. Santiago \u2194 Santo Domingo" class="inp" />
                <datalist id="dlSchRoutes">${routeOpts}</datalist>
              </div>
              <div>
                <label class="lbl">Cant. Clientes (Opcional)</label>
                <input type="number" min="1" id="fSchClients" value="${s && s.clientsCount ? s.clientsCount : ""}" placeholder="Opcional" class="inp font-mono" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label class="lbl">Cami\xF3n (Opcional)</label><select id="fSchTruck" class="inp">${truckOpts}</select></div>
              <div><label class="lbl">Chofer (Opcional)</label><select id="fSchDriver" class="inp">${driverOpts}</select></div>
            </div>

            <div><label class="lbl">Ayudante(s) (Opcional)</label><div class="flex flex-wrap gap-2">${helpersChecks || '<span class="text-xs text-slate-400">Sin ayudantes creados</span>'}</div></div>

            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
              <span class="text-xs font-bold uppercase text-slate-400 block">Montos de Cobro y Pagos (100% Opcionales)</span>
              <div>
                <label class="lbl">Flete a Cobrar (RD$ \u2014 Opcional)</label>
                <input type="text" inputmode="decimal" id="fTripGross" oninput="App.updateLiveCalc()" value="${formatMoneyInput(s && s.freightGross !== "" ? s.freightGross : "")}" placeholder="Opcional" class="inp font-mono financial-input" />
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div><label class="lbl">Combustible (Opcional)</label><input type="text" inputmode="decimal" id="fTripFuel" oninput="App.updateLiveCalc()" value="${formatMoneyInput(s && s.fuelCost !== "" ? s.fuelCost : "")}" class="inp font-mono financial-input" /></div>
                <div><label class="lbl">Peajes (Opcional)</label><input type="text" inputmode="decimal" id="fTripTolls" oninput="App.updateLiveCalc()" value="${formatMoneyInput(s && s.tollsCost !== "" ? s.tollsCost : "")}" class="inp font-mono financial-input" /></div>
                <div><label class="lbl">Pago Chofer (Opcional)</label><input type="text" inputmode="decimal" id="fTripDrvPay" oninput="App.updateLiveCalc()" value="${formatMoneyInput(s && s.driverPay !== "" ? s.driverPay : "")}" class="inp font-mono financial-input" /></div>
                <div><label class="lbl">Pago Ayud. (Opcional)</label><input type="text" inputmode="decimal" id="fTripHlpPay" oninput="App.updateLiveCalc()" value="${formatMoneyInput(s && s.helperPay !== "" ? s.helperPay : "")}" class="inp font-mono financial-input" /></div>
                <div class="col-span-2"><label class="lbl">Otros / Avance (Opcional)</label><input type="text" inputmode="decimal" id="fTripOther" oninput="App.updateLiveCalc()" value="${formatMoneyInput(s && s.otherCost !== "" ? s.otherCost : "")}" class="inp font-mono financial-input" /></div>
              </div>
              <div class="flex justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-700">
                <span>Gastos Previstos: <b id="liveTripExp" class="font-mono">RD$ 0.00</b></span>
                <span>Ganancia Neta: <b id="liveTripNet" class="font-mono text-emerald-600">RD$ 0.00</b></span>
              </div>
            </div>

            <div><label class="lbl">Nota del Recordatorio (Opcional)</label><input type="text" id="fSchNotes" value="${s ? s.notes || "" : ""}" class="inp" /></div>

            <div class="flex justify-end gap-2">
              <button type="button" onclick="App.closeModal()" class="btn-outline">Cancelar</button>
              <button type="submit" class="btn-primary">Guardar en Agenda</button>
            </div>
          </form>
        `);
    this.updateLiveCalc();
  },
  saveScheduledTrip(e, id = null) {
    e.preventDefault();
    const helperIds = [...document.querySelectorAll('input[name="schedHelpers"]:checked')].map((c2) => c2.value);
    const route = document.getElementById("fSchRoute").value.trim();
    const dateVal = document.getElementById("fSchDate").value;
    if (route && !this.db.routes.some((r) => r.name.toLowerCase() === route.toLowerCase())) {
      addRecord(this.db, "routes", { id: this.uid("rt"), name: route });
    }
    const g = document.getElementById("fTripGross").value;
    const f = document.getElementById("fTripFuel").value;
    const tl = document.getElementById("fTripTolls").value;
    const d = document.getElementById("fTripDrvPay").value;
    const h = document.getElementById("fTripHlpPay").value;
    const o = document.getElementById("fTripOther").value;
    const c = document.getElementById("fSchClients").value;
    const payload = {
      date: dateVal,
      reminderTime: document.getElementById("fSchReminderTime").value,
      departureTime: document.getElementById("fSchDepartureTime").value,
      route: route || "",
      clientsCount: c !== "" ? Number(c) : "",
      truckId: document.getElementById("fSchTruck").value || "",
      driverId: document.getElementById("fSchDriver").value || "",
      helperIds,
      freightGross: g !== "" ? parseMoney(g) : "",
      fuelCost: f !== "" ? parseMoney(f) : "",
      tollsCost: tl !== "" ? parseMoney(tl) : "",
      driverPay: d !== "" ? parseMoney(d) : "",
      helperPay: h !== "" ? parseMoney(h) : "",
      otherCost: o !== "" ? parseMoney(o) : "",
      notes: document.getElementById("fSchNotes").value.trim()
    };
    if (id) updateRecord(this.db, "scheduledTrips", id, payload);
    else addRecord(this.db, "scheduledTrips", { id: this.uid("sch"), ...payload });
    this.save();
    this.syncFilterWithNewRecordDate(dateVal);
    this.closeModal();
    this.switchTab("scheduled");
    this.renderAll();
    this.showToast("Viaje anticipado guardado en Agenda");
  },
  liquidateScheduledTrip(schedId) {
    this.openTripModal(null, schedId);
  },
  deleteScheduledTrip(id) {
    if (!confirm("\xBFEliminar este viaje anticipado?")) return;
    deleteRecord(this.db, "scheduledTrips", id);
    this.save();
    this.renderAll();
  },
  openIncidentModal() {
    const today = this.offsetDateISO(0);
    const truckField = this.db.trucks.length > 0 ? `<select id="fIncTruck" required class="inp">${this.db.trucks.map((t) => `<option value="${t.id}">${t.name}</option>`).join("")}</select>` : `<input type="text" id="fIncNewTruck" required placeholder="Nombre del cami\xF3n" class="inp" />`;
    const driverField = this.db.drivers.length > 0 ? `<select id="fIncDriver" required class="inp">${this.db.drivers.map((d) => `<option value="${d.id}">${d.name}</option>`).join("")}</select>` : `<input type="text" id="fIncNewDriver" required placeholder="Nombre del chofer" class="inp" />`;
    this.openModal("Registrar Incidencia en Ruta", `
          <form onsubmit="App.saveIncident(event)" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label class="lbl">Fecha</label><input type="date" id="fIncDate" value="${today}" required class="inp font-mono" /></div>
              <div>
                <label class="lbl">Gravedad</label>
                <select id="fIncSeverity" required class="inp">
                  <option value="Baja">Baja</option>
                  <option value="Media" selected>Media</option>
                  <option value="Alta">Alta</option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label class="lbl">Cami\xF3n Involucrado</label>${truckField}</div>
              <div><label class="lbl">Chofer</label>${driverField}</div>
            </div>
            <div><label class="lbl">Descripci\xF3n de la Incidencia</label><input id="fIncDesc" required placeholder="Ej. Aver\xEDa en ruta, neum\xE1tico, choque leve..." class="inp" /></div>
            <div><label class="lbl">Costo Asociado (RD$)</label><input type="text" inputmode="decimal" id="fIncCost" value="0.00" required class="inp font-mono font-bold text-rose-600 financial-input" /></div>
            <div><label class="lbl">Foto del incidente (opcional)</label><input type="file" id="fIncPhoto" accept="image/*" capture="environment" class="inp" /></div>
            <div class="flex justify-end gap-2">
              <button type="button" onclick="App.closeModal()" class="btn-outline">Cancelar</button>
              <button type="submit" class="btn-rose">Guardar Incidencia</button>
            </div>
          </form>
        `, "max-w-lg");
  },
  async saveIncident(e) {
    e.preventDefault();
    let truckId = document.getElementById("fIncTruck")?.value;
    const newTrk = document.getElementById("fIncNewTruck")?.value.trim();
    if (!truckId && newTrk) {
      truckId = this.uid("trk");
      addRecord(this.db, "trucks", { id: truckId, name: newTrk, plate: "S/P", model: "General", status: "Disponible" });
    }
    let driverId = document.getElementById("fIncDriver")?.value;
    const newDrv = document.getElementById("fIncNewDriver")?.value.trim();
    if (!driverId && newDrv) {
      driverId = this.uid("drv");
      addRecord(this.db, "drivers", { id: driverId, name: newDrv, phone: "", note: "" });
    }
    const dateVal = document.getElementById("fIncDate").value;
    const photoFile = document.getElementById("fIncPhoto").files[0];
    let photo;
    try {
      photo = await readReceiptImage(photoFile);
    } catch (error) {
      console.error("No se pudo procesar la foto de la incidencia.", error);
      this.showToast("No se pudo leer la foto. Intenta seleccionar otra imagen.", true);
      return;
    }
    const location = await getCurrentPosition();
    addRecord(this.db, "incidents", {
      id: this.uid("inc"),
      date: dateVal,
      severity: document.getElementById("fIncSeverity").value,
      truckId,
      driverId,
      description: document.getElementById("fIncDesc").value.trim(),
      cost: parseMoney(document.getElementById("fIncCost").value),
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
      receiptImage: photo
    }, true);
    await this.save();
    this.syncFilterWithNewRecordDate(dateVal);
    this.closeModal();
    this.switchTab("incidents");
    this.renderAll();
    this.showToast(location ? "Incidencia registrada" : "Incidencia registrada; ubicaci\xF3n GPS no disponible");
    await notifySuccess();
  },
  deleteIncident(id) {
    if (!confirm("\xBFEliminar esta incidencia?")) return;
    deleteRecord(this.db, "incidents", id);
    this.save();
    this.renderAll();
  },
  openDriverModal(id = null) {
    const d = id ? this.db.drivers.find((x) => String(x.id) === String(id)) : null;
    this.openModal(d ? "Editar Chofer" : "Nuevo Chofer", `
          <form onsubmit="App.saveDriver(event, ${d ? `'${d.id}'` : "null"})" class="space-y-4">
            <div><label class="lbl">Nombre Completo</label><input id="fDrvName" value="${d ? d.name : ""}" required class="inp" /></div>
            <div><label class="lbl">Tel\xE9fono / C\xE9dula</label><input id="fDrvPhone" value="${d ? d.phone : ""}" class="inp" /></div>
            <div><label class="lbl">Nota</label><input id="fDrvNote" value="${d ? d.note || "" : ""}" class="inp" /></div>
            <button type="submit" class="w-full btn-primary">Guardar Chofer</button>
          </form>`, "max-w-md");
  },
  saveDriver(e, id = null) {
    e.preventDefault();
    const data = { name: document.getElementById("fDrvName").value.trim(), phone: document.getElementById("fDrvPhone").value.trim(), note: document.getElementById("fDrvNote").value.trim() };
    if (id) updateRecord(this.db, "drivers", id, data);
    else addRecord(this.db, "drivers", { id: this.uid("drv"), ...data });
    this.save();
    this.closeModal();
    this.renderAll();
    this.showToast("Chofer guardado");
  },
  deleteDriver(id) {
    if (!confirm("\xBFEliminar chofer?")) return;
    deleteRecord(this.db, "drivers", id);
    this.save();
    this.renderAll();
  },
  openTruckModal(id = null) {
    const t = id ? this.db.trucks.find((x) => String(x.id) === String(id)) : null;
    this.openModal(t ? "Editar Cami\xF3n" : "Nuevo Cami\xF3n", `
          <form onsubmit="App.saveTruck(event, ${t ? `'${t.id}'` : "null"})" class="space-y-4">
            <div><label class="lbl">Ficha / Nombre</label><input id="fTrkName" value="${t ? t.name : ""}" required class="inp" /></div>
            <div><label class="lbl">Placa</label><input id="fTrkPlate" value="${t ? t.plate : ""}" required class="inp" /></div>
            <div><label class="lbl">Marca y Modelo</label><input id="fTrkModel" value="${t ? t.model : ""}" required class="inp" /></div>
            <div>
              <label class="lbl">Estado de la flota</label>
              <select id="fTrkStatus" class="inp">
                <option value="Disponible" ${!t || t.status !== "Fuera de Servicio" ? "selected" : ""}>Disponible</option>
                <option value="Fuera de Servicio" ${t?.status === "Fuera de Servicio" ? "selected" : ""}>Fuera de Servicio</option>
              </select>
            </div>
            <button type="submit" class="w-full btn-primary">Guardar Cami\xF3n</button>
          </form>`, "max-w-md");
  },
  saveTruck(e, id = null) {
    e.preventDefault();
    const data = {
      name: document.getElementById("fTrkName").value.trim(),
      plate: document.getElementById("fTrkPlate").value.trim(),
      model: document.getElementById("fTrkModel").value.trim(),
      status: document.getElementById("fTrkStatus").value
    };
    if (id) updateRecord(this.db, "trucks", id, data);
    else addRecord(this.db, "trucks", { id: this.uid("trk"), ...data });
    this.save();
    this.closeModal();
    this.renderAll();
    this.showToast("Cami\xF3n guardado");
  },
  deleteTruck(id) {
    if (!confirm("\xBFEliminar cami\xF3n?")) return;
    deleteRecord(this.db, "trucks", id);
    this.save();
    this.renderAll();
  },
  openMaintenanceModal() {
    const today = this.offsetDateISO(0);
    const truckField = this.db.trucks.length > 0 ? `<select id="fMntTruck" required class="inp">${this.db.trucks.map((t) => `<option value="${t.id}">${t.name}</option>`).join("")}</select>` : `<input type="text" id="fMntNewTruck" required placeholder="Nombre del cami\xF3n" class="inp" />`;
    this.openModal("Registrar Gasto de Taller (Mantenimiento)", `
          <form onsubmit="App.saveMaintenance(event)" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div><label class="lbl">Fecha</label><input type="date" id="fMntDate" value="${today}" required class="inp font-mono" /></div>
              <div><label class="lbl">Cami\xF3n</label>${truckField}</div>
            </div>
            <div><label class="lbl">Descripci\xF3n del Mantenimiento / Repuesto</label><input id="fMntDesc" required class="inp" /></div>
            <div><label class="lbl">Costo (RD$)</label><input type="text" inputmode="decimal" id="fMntCost" required class="inp font-mono font-bold text-rose-600 financial-input" /></div>
            <div><label class="lbl">Foto de factura (opcional)</label><input type="file" id="fMntPhoto" accept="image/*" capture="environment" class="inp" /></div>
            <button type="submit" class="w-full btn-primary">Guardar Mantenimiento</button>
          </form>`, "max-w-md");
  },
  async saveMaintenance(e) {
    e.preventDefault();
    let truckId = document.getElementById("fMntTruck")?.value;
    const newTrk = document.getElementById("fMntNewTruck")?.value.trim();
    if (!truckId && newTrk) {
      truckId = this.uid("trk");
      addRecord(this.db, "trucks", { id: truckId, name: newTrk, plate: "S/P", model: "General", status: "Disponible" });
    }
    const dateVal = document.getElementById("fMntDate").value;
    const cost = parseMoney(document.getElementById("fMntCost").value);
    if (cost <= 0) {
      this.showToast("El costo del mantenimiento debe ser mayor que cero.", true);
      return;
    }
    let photo;
    try {
      photo = await readReceiptImage(document.getElementById("fMntPhoto").files[0]);
    } catch (error) {
      console.error("No se pudo procesar la foto de la factura.", error);
      this.showToast("No se pudo leer la foto. Intenta seleccionar otra imagen.", true);
      return;
    }
    addRecord(this.db, "maintenances", {
      id: this.uid("mnt"),
      date: dateVal,
      truckId,
      description: document.getElementById("fMntDesc").value.trim(),
      cost,
      receiptImage: photo
    }, true);
    await this.save();
    this.syncFilterWithNewRecordDate(dateVal);
    this.closeModal();
    this.renderAll();
    this.showToast("Mantenimiento registrado");
    await notifySuccess();
  },
  deleteMaintenance(id) {
    if (!confirm("\xBFEliminar mantenimiento?")) return;
    deleteRecord(this.db, "maintenances", id);
    this.save();
    this.renderAll();
  },
  openHelperModal() {
    this.openModal("Nuevo Ayudante", `
          <form onsubmit="App.saveHelper(event)" class="space-y-4">
            <div><label class="lbl">Nombre</label><input id="fHlpName" required class="inp" /></div>
            <div><label class="lbl">Tel\xE9fono</label><input id="fHlpPhone" class="inp" /></div>
            <button type="submit" class="w-full btn-primary">Guardar Ayudante</button>
          </form>`, "max-w-md");
  },
  saveHelper(e) {
    e.preventDefault();
    addRecord(this.db, "helpers", { id: this.uid("hlp"), name: document.getElementById("fHlpName").value.trim(), phone: document.getElementById("fHlpPhone").value.trim() });
    this.save();
    this.closeModal();
    this.renderAll();
    this.showToast("Ayudante guardado");
  },
  deleteHelper(id) {
    deleteRecord(this.db, "helpers", id);
    this.save();
    this.renderAll();
  },
  openRouteModal() {
    this.openModal("Nueva Ruta", `
          <form onsubmit="App.saveRoute(event)" class="space-y-4">
            <div><label class="lbl">Nombre de la Ruta</label><input id="fRtName" required class="inp" /></div>
            <button type="submit" class="w-full btn-primary">Guardar Ruta</button>
          </form>`, "max-w-md");
  },
  saveRoute(e) {
    e.preventDefault();
    addRecord(this.db, "routes", { id: this.uid("rt"), name: document.getElementById("fRtName").value.trim() });
    this.save();
    this.closeModal();
    this.renderAll();
    this.showToast("Ruta guardada");
  },
  deleteRoute(id) {
    deleteRecord(this.db, "routes", id);
    this.save();
    this.renderAll();
  },
  // =====================================================================
  // POPUP DE SELECCIÓN DE PERIODO PARA REPORTES (PDF Y EXCEL .XLSX)
  // =====================================================================
  openExportPeriodModal(formatType) {
    const months = this.getAvailableMonths();
    const currentSelected = this.getSelectedMonth();
    const optionsHtml = `<option value="ALL" ${currentSelected === "ALL" ? "selected" : ""}>Todos los meses (Hist\xF3rico)</option>` + months.map((m) => `<option value="${m}" ${currentSelected === m ? "selected" : ""}>${this.formatMonthLabel(m)}</option>`).join("");
    const isPDF = formatType === "PDF";
    this.openModal(isPDF ? "Generar Reporte Corporativo PDF" : "Generar Libro de Excel (.XLSX)", `
          <form onsubmit="App.confirmExportByPeriod(event, '${formatType}')" class="space-y-5">
            <div>
              <label class="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                \xBFDe qu\xE9 periodo deseas generar el reporte?
              </label>
              <select id="exportModalPeriodSelect" class="inp font-bold">
                ${optionsHtml}
              </select>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Se incluir\xE1n \xFAnicamente los viajes, gastos de taller e incidencias que pertenezcan al periodo elegido.
              </p>
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button type="button" onclick="App.closeModal()" class="btn-outline">Cancelar</button>
              <button type="submit" class="${isPDF ? "btn-primary" : "btn-emerald"}">
                <i class="fa-solid ${isPDF ? "fa-file-pdf" : "fa-file-excel"}"></i>
                <span>Generar</span>
              </button>
            </div>
          </form>
        `, "max-w-md");
  },
  confirmExportByPeriod(e, formatType) {
    e.preventDefault();
    const chosenPeriod = document.getElementById("exportModalPeriodSelect").value || "ALL";
    this.closeModal();
    if (formatType === "PDF") {
      this.generateCorporatePDF(chosenPeriod);
    } else {
      this.exportExcelXLSX(chosenPeriod);
    }
  },
  // =====================================================================
  // EXPORTACIÓN PDF CORPORATIVO DINÁMICO (CON OVERFLOW LINEBREAK)
  // =====================================================================
  generateCorporatePDF(periodCode = "ALL") {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("landscape", "pt", "a4");
    const s = this.getPeriodSummary(periodCode);
    const periodLabel = this.formatMonthLabel(periodCode);
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 842, 72, "F");
    doc.setFillColor(5, 150, 105);
    doc.roundedRect(36, 18, 36, 36, 6, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("MF", 45, 41);
    doc.setFontSize(17);
    doc.text("MiFlota RD \u2014 Reporte Financiero Corporativo", 84, 34);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(`Periodo: ${periodLabel}   |   Fecha de emisi\xF3n: ${(/* @__PURE__ */ new Date()).toLocaleDateString("es-DO")}`, 84, 52);
    const kpiY = 88;
    const kpis = [
      { label: "INGRESOS FLETES", val: this.formatRD(s.gross), rgb: [15, 23, 42] },
      { label: "GASTOS VIAJES", val: this.formatRD(s.tripExp), rgb: [180, 83, 9] },
      { label: "TALLER E INCIDENCIAS", val: this.formatRD(s.maintTotal + s.incidentTotal), rgb: [190, 18, 60] },
      { label: "GANANCIA NETA", val: this.formatRD(s.finalOwnerNet), rgb: [5, 150, 105] }
    ];
    kpis.forEach((k, idx) => {
      const x = 36 + idx * 195;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(x, kpiY, 182, 50, 6, 6, "FD");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text(k.label, x + 12, kpiY + 18);
      doc.setFontSize(12);
      doc.setTextColor(...k.rgb);
      doc.text(k.val, x + 12, kpiY + 36);
    });
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`1. Desglose de Viajes Realizados (${s.trips.length})`, 36, 158);
    const tripBody = s.trips.map((t) => {
      const m = this.calcTrip(t);
      return [
        t.date,
        t.route,
        String(t.clientsCount),
        this.getTruckName(t.truckId),
        this.getDriverName(t.driverId),
        this.formatRD(m.gross),
        this.formatRD(m.fuel),
        this.formatRD(m.tolls),
        this.formatRD(m.drvPay),
        this.formatRD(m.hlpPay),
        this.formatRD(m.other),
        this.formatRD(m.totalExpense),
        this.formatRD(m.netOwner)
      ];
    });
    doc.autoTable({
      startY: 165,
      margin: { left: 36, right: 36 },
      head: [["Fecha", "Ruta", "Cli.", "Cami\xF3n", "Chofer", "Flete Bruto", "Comb.", "Peajes", "Chofer", "Ayud.", "Otros", "Gasto Total", "Ganancia Neta"]],
      body: tripBody.length ? tripBody : [["-", "Sin viajes registrados en este periodo", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "RD$ 0.00"]],
      theme: "grid",
      styles: { overflow: "linebreak", cellPadding: 4, fontSize: 7.5, valign: "middle" },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 115 },
        2: { cellWidth: 26, halign: "center" },
        3: { cellWidth: 68 },
        4: { cellWidth: 68 },
        5: { halign: "right" },
        6: { halign: "right" },
        7: { halign: "right" },
        8: { halign: "right" },
        9: { halign: "right" },
        10: { halign: "right" },
        11: { halign: "right", textColor: [190, 18, 60] },
        12: { halign: "right", fontStyle: "bold", textColor: [5, 150, 105] }
      }
    });
    const nextY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`2. Mantenimientos de Taller (${s.maints.length}) e Incidencias (${s.incidents.length})`, 36, nextY);
    const combinedBody = [
      ...s.maints.map((m) => [m.date, "Mantenimiento Taller", this.getTruckName(m.truckId), m.description, this.formatRD(m.cost)]),
      ...s.incidents.map((i) => [i.date, `Incidencia (${i.severity})`, this.getTruckName(i.truckId), i.description, this.formatRD(i.cost)])
    ];
    doc.autoTable({
      startY: nextY + 7,
      margin: { left: 36, right: 36 },
      head: [["Fecha", "Categor\xEDa", "Cami\xF3n", "Descripci\xF3n", "Costo (RD$)"]],
      body: combinedBody.length ? combinedBody : [["-", "-", "-", "Sin registros en este periodo", "RD$ 0.00"]],
      theme: "grid",
      styles: { overflow: "linebreak", cellPadding: 4, fontSize: 8, valign: "middle" },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 65 },
        1: { cellWidth: 110 },
        2: { cellWidth: 110 },
        4: { cellWidth: 95, halign: "right", fontStyle: "bold", textColor: [190, 18, 60] }
      }
    });
    doc.save(`MiFlota_RD_${periodCode}.pdf`);
    this.showToast("Reporte PDF Corporativo descargado");
  },
  // =====================================================================
  // EXPORTACIÓN A EXCEL REAL (.XLSX) CON AUTOAJUSTE DE COLUMNAS (SHEETJS)
  // =====================================================================
  exportExcelXLSX(periodCode = "ALL") {
    const s = this.getPeriodSummary(periodCode);
    const periodLabel = this.formatMonthLabel(periodCode);
    const rows = [
      ["MIFLOTA RD \u2014 REPORTE FINANCIERO Y OPERATIVO"],
      ["Periodo Filtrado:", periodLabel],
      ["Fecha de Generaci\xF3n:", (/* @__PURE__ */ new Date()).toLocaleDateString("es-DO")],
      [],
      ["RESUMEN FINANCIERO DEL PERIODO"],
      ["Ingresos por Fletes", this.formatRD(s.gross)],
      ["Gastos Operativos de Viajes", this.formatRD(s.tripExp)],
      ["Gastos de Taller (Mantenimiento)", this.formatRD(s.maintTotal)],
      ["Gastos de Incidencias en Ruta", this.formatRD(s.incidentTotal)],
      ["Ganancia Neta", this.formatRD(s.finalOwnerNet)],
      [],
      ["HISTORIAL DETALLADO DE VIAJES REALIZADOS"],
      ["Fecha", "Ruta", "Cant. Clientes", "Cami\xF3n", "Chofer", "Ayudante(s)", "Flete Bruto (RD$)", "Combustible (RD$)", "Peajes (RD$)", "Pago Chofer (RD$)", "Pago Ayudante (RD$)", "Otros (RD$)", "Gasto Total (RD$)", "Ganancia Neta (RD$)", "Notas"]
    ];
    s.trips.forEach((t) => {
      const m = this.calcTrip(t);
      rows.push([
        t.date,
        t.route,
        Number(t.clientsCount) || 0,
        this.getTruckName(t.truckId),
        this.getDriverName(t.driverId),
        this.getHelpersNames(t.helperIds),
        this.formatRD(m.gross),
        this.formatRD(m.fuel),
        this.formatRD(m.tolls),
        this.formatRD(m.drvPay),
        this.formatRD(m.hlpPay),
        this.formatRD(m.other),
        this.formatRD(m.totalExpense),
        this.formatRD(m.netOwner),
        t.notes || ""
      ]);
    });
    rows.push(
      [],
      ["MANTENIMIENTOS DE TALLER E INCIDENCIAS EN RUTA"],
      ["Fecha", "Categor\xEDa", "Cami\xF3n", "Chofer / Responsable", "Descripci\xF3n Detallada", "Costo (RD$)"]
    );
    s.maints.forEach((m) => {
      rows.push([m.date, "Mantenimiento Taller", this.getTruckName(m.truckId), "-", m.description, this.formatRD(m.cost)]);
    });
    s.incidents.forEach((i) => {
      rows.push([i.date, `Incidencia (${i.severity})`, this.getTruckName(i.truckId), this.getDriverName(i.driverId), i.description, this.formatRD(i.cost)]);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const colWidths = [];
    rows.forEach((row) => {
      row.forEach((cellVal, colIdx) => {
        const len = String(cellVal ?? "").length;
        colWidths[colIdx] = Math.max(colWidths[colIdx] || 14, len + 5);
      });
    });
    ws["!cols"] = colWidths.map((w) => ({ wch: Math.min(w, 48) }));
    XLSX.utils.book_append_sheet(wb, ws, "Reporte MiFlota RD");
    XLSX.writeFile(wb, `MiFlota_RD_${periodCode}.xlsx`);
    this.showToast("Libro de Excel (.xlsx) descargado");
  },
  // =====================================================================
  // RESPALDO Y SEGURIDAD (.JSON)
  // =====================================================================
  exportBackupJSON() {
    const blob = new Blob([JSON.stringify(this.db, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Backup_MiFlota_RD_${this.offsetDateISO(0)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast("Copia de seguridad (.json) descargada");
  },
  restoreBackupJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed || typeof parsed !== "object") throw new Error("Invalido");
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        this.showToast("Copia restaurada. Recargando...");
        setTimeout(() => window.location.reload(), 800);
      } catch (err) {
        this.showToast("El archivo JSON seleccionado no es v\xE1lido", true);
      }
    };
    reader.readAsText(file);
  },
  clearAllData() {
    if (!confirm("\xBFEst\xE1s seguro de vaciar absolutamente todo el sistema? Esta acci\xF3n no se puede deshacer.")) return;
    this.db = this.getEmptyDatabase();
    this.save();
    this.populateMonthFilter("ALL");
    this.renderAll();
    this.showToast("El sistema ha sido vaciado por completo");
  }
};
Object.assign(App, UI);
window.App = App;
window.addEventListener("DOMContentLoaded", () => App.init());
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").then(() => console.log("Service Worker registrado con \xE9xito.")).catch((error) => console.error("Error al registrar el Service Worker.", error));
}
/*! Bundled license information:

@capacitor/core/dist/index.js:
  (*! Capacitor: https://capacitorjs.com/ - MIT License *)
*/
