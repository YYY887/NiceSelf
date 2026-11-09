var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now2 = Date.now();
  const seconds = Math.trunc(now2 / 1e3);
  const nanos = now2 % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = /* @__PURE__ */ __name((arrayBuffer, contentType) => {
  return new Response(arrayBuffer, { headers: { "Content-Type": contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase()) } }).formData();
}, "bufferToFormData");

// node_modules/hono/dist/utils/body.js
var MAX_NESTED_OBJECTS = 1e4;
var isRawRequest = /* @__PURE__ */ __name((request) => "headers" in request, "isRawRequest");
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const mediaType = (isRawRequest(request) ? request.headers : request.raw.headers).get("Content-Type")?.split(";")[0].trim().toLowerCase();
  if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") return parseFormData(request, {
    all,
    dot
  });
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  if (!isRawRequest(request) && request.bodyCache.formData) return convertFormDataToBodyData(await request.bodyCache.formData, options);
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const arrayBuffer = await request.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
  if (!isRawRequest(request)) request.bodyCache.formData = formDataPromise;
  const formData = await formDataPromise;
  if (formData) return convertFormDataToBodyData(formData, options);
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  const nestingState = { count: 0 };
  formData.forEach((value, key) => {
    if (!(options.all || key.endsWith("[]"))) form[key] = value;
    else handleParsingAllValues(form, key, value);
  });
  if (options.dot) Object.entries(form).forEach(([key, value]) => {
    if (key.includes(".")) {
      handleParsingNestedValues(form, key, value, nestingState);
      delete form[key];
    }
  });
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) form[key].push(value);
    else form[key] = [form[key], value];
  } else if (!key.endsWith("[]")) form[key] = value;
  else form[key] = [value];
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value, state) => {
  if (/(?:^|\.)__proto__\./.test(key)) return;
  let nestedForm = form;
  const keys = key.split(".", 34);
  if (keys.length > 33) throwNestingLimitExceeded();
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) nestedForm[key2] = value;
    else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        if (state.count++ >= MAX_NESTED_OBJECTS) throwNestingLimitExceeded();
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");
var throwNestingLimitExceeded = /* @__PURE__ */ __name(() => {
  throw new Error("Nesting limit exceeded");
}, "throwNestingLimitExceeded");

// node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") paths.shift();
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return {
    groups,
    path
  };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) if (paths[j].includes(mark)) {
      paths[j] = paths[j].replace(mark, groups[i][1]);
      break;
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") return "*";
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [
        cacheKey,
        match2[1],
        new RegExp(`^${match2[2]}(?=/${next})`)
      ] : [
        label,
        match2[1],
        new RegExp(`^${match2[2]}$`)
      ];
      else patternCache[cacheKey] = [
        label,
        match2[1],
        true
      ];
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) break;
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var stripPathPrefix = /* @__PURE__ */ __name((rawPath, decodedPath, prefixLength) => {
  if (rawPath.at(-1) === "/" && decodedPath.at(-1) !== "/") rawPath = rawPath.slice(0, -1);
  let index = 0;
  for (let i = decodedPath.indexOf("/"); i !== -1 && i < prefixLength; i = decodedPath.indexOf("/", i + 1)) {
    index = rawPath.indexOf("/", index + 1);
    if (index === -1) return "/";
  }
  return rawPath.slice(index) || "/";
}, "stripPathPrefix");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) sub = mergePath(sub, ...rest);
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) return null;
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) basePath += "/" + segment;
    else if (/\:/.test(segment)) {
      if (segment.charCodeAt(segment.length - 1) === 63) {
        if (results.length === 0 && basePath === "") results.push("/");
        else results.push(basePath);
        const optionalSegment = segment.slice(0, -1);
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else basePath += "/" + segment;
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => str.indexOf("%") !== -1 ? tryDecode(str, decodeURIComponent_) : str, "tryDecodeURIComponent");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (value.indexOf("+") !== -1) value = value.replace(/\+/g, " ");
  return tryDecodeURIComponent(value);
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  const hashIndex = url.indexOf("#", 8);
  if (hashIndex !== -1) url = url.slice(0, hashIndex);
  let encoded;
  if (!multiple && key && key.indexOf("%") === -1 && key.indexOf("+") === -1) {
    const queryIndex = url.indexOf("?", 8);
    let keyIndex2 = queryIndex;
    if (keyIndex2 === -1) return;
    if (!url.startsWith(key, keyIndex2 + 1)) keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61 || trailingKeyCode === 38 || isNaN(trailingKeyCode)) {
        if (keyIndex2 > queryIndex && /(?:^|&)[^=&]*[%+]/.test(url.slice(queryIndex + 1, keyIndex2))) break;
        if (trailingKeyCode === 61) {
          const valueIndex = keyIndex2 + key.length + 2;
          const endIndex = url.indexOf("&", valueIndex);
          return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
        }
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) return;
  }
  const results = /* @__PURE__ */ Object.create(null);
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) valueIndex = -1;
    let name = url.slice(keyIndex + 1, valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex);
    if (encoded) name = _decodeURI(name);
    keyIndex = nextKeyIndex;
    if (name === "") continue;
    let value;
    if (valueIndex === -1) value = "";
    else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) value = _decodeURI(value);
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) results[name] = [];
      results[name].push(value);
    } else results[name] ??= value;
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  /**
  * `.raw` can get the raw Request object.
  *
  * @see {@link https://hono.dev/docs/api/request#raw}
  *
  * @example
  * ```ts
  * // For Cloudflare Workers
  * app.post('/', async (c) => {
  *   const metadata = c.req.raw.cf?.hostMetadata?
  *   ...
  * })
  * ```
  */
  raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  /**
  * `.path` can get the pathname of the request.
  *
  * @see {@link https://hono.dev/docs/api/request#path}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const pathname = c.req.path // `/about/me`
  * })
  * ```
  */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex]?.[1][key];
    const param = this.#getParamValue(paramKey);
    return param && tryDecodeURIComponent(param);
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex]?.[1] ?? {});
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) decoded[key] = tryDecodeURIComponent(value);
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) return this.raw.headers.get(name) ?? void 0;
    const headerData = /* @__PURE__ */ Object.create(null);
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) return cachedBody;
    for (const anyCachedKey in bodyCache) return bodyCache[anyCachedKey].then((body) => {
      if (anyCachedKey === "json") body = JSON.stringify(body);
      const contentType = anyCachedKey === "formData" ? void 0 : raw2.headers.get("content-type");
      return new Response(body, { headers: contentType ? { "Content-Type": contentType } : void 0 })[key]();
    });
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  /**
  * `.json()` can parse Request body of type `application/json`
  *
  * @see {@link https://hono.dev/docs/api/request#json}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.json()
  * })
  * ```
  */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
  * `.text()` can parse Request body of type `text/plain`
  *
  * @see {@link https://hono.dev/docs/api/request#text}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.text()
  * })
  * ```
  */
  text() {
    return this.#cachedBody("text");
  }
  /**
  * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
  *
  * @see {@link https://hono.dev/docs/api/request#arraybuffer}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.arrayBuffer()
  * })
  * ```
  */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
  * `.bytes()` parses the request body as a `Uint8Array`.
  *
  * @see {@link https://hono.dev/docs/api/request#bytes}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.bytes()
  * })
  * ```
  */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
  * Parses the request body as a `Blob`.
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.blob();
  * });
  * ```
  * @see https://hono.dev/docs/api/request#blob
  */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
  * Parses the request body as `FormData`.
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.formData();
  * });
  * ```
  * @see https://hono.dev/docs/api/request#formdata
  */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
  * Adds validated data to the request.
  *
  * @param target - The target of the validation.
  * @param data - The validated data to add.
  */
  addValidatedData(target, data) {
    (this.#validatedData ??= {})[target] = data;
  }
  valid(target) {
    return this.#validatedData?.[target];
  }
  /**
  * `.url` can get the request url strings.
  *
  * @see {@link https://hono.dev/docs/api/request#url}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const url = c.req.url // `http://localhost:8787/about/me`
  *   ...
  * })
  * ```
  */
  get url() {
    return this.raw.url;
  }
  /**
  * `.method` can get the method name of the request.
  *
  * @see {@link https://hono.dev/docs/api/request#method}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const method = c.req.method // `GET`
  * })
  * ```
  */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
  * `.matchedRoutes` can return a matched route in the handler
  *
  * @deprecated
  *
  * Use matchedRoutes helper defined in "hono/route" instead.
  *
  * @see {@link https://hono.dev/docs/api/request#matchedroutes}
  *
  * @example
  * ```ts
  * app.use('*', async function logger(c, next) {
  *   await next()
  *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
  *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
  *     console.log(
  *       method,
  *       ' ',
  *       path,
  *       ' '.repeat(Math.max(10 - path.length, 0)),
  *       name,
  *       i === c.req.routeIndex ? '<- respond from here' : ''
  *     )
  *   })
  * })
  * ```
  */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
  * `.routePath` can retrieve the path registered within the handler
  *
  * @deprecated
  *
  * Use routePath helper defined in "hono/route" instead.
  *
  * @see {@link https://hono.dev/docs/api/request#routepath}
  *
  * @example
  * ```ts
  * app.get('/posts/:id', (c) => {
  *   return c.json({ path: c.req.routePath })
  * })
  * ```
  */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) str = str.toString();
    if (str instanceof Promise) str = await str;
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) return Promise.resolve(str);
  if (buffer) buffer[0] += str;
  else buffer = [str];
  const resStr = Promise.all(callbacks.map((c) => c({
    phase,
    buffer,
    context
  }))).then((res) => Promise.all(res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))).then(() => buffer[0]));
  if (preserveCallbacks) return raw(await resStr, callbacks);
  else return resStr;
}, "resolveCallback");

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var createResponseInstance = /* @__PURE__ */ __name((body, init) => new Response(body, init), "createResponseInstance");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  /**
  * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
  *
  * @see {@link https://hono.dev/docs/api/context#env}
  *
  * @example
  * ```ts
  * // Environment object for Cloudflare Workers
  * app.get('*', async c => {
  *   const counter = c.env.COUNTER
  * })
  * ```
  */
  env = {};
  #var;
  finalized = false;
  /**
  * `.error` can get the error object from the middleware if the Handler throws an error.
  *
  * @see {@link https://hono.dev/docs/api/context#error}
  *
  * @example
  * ```ts
  * app.use('*', async (c, next) => {
  *   await next()
  *   if (c.error) {
  *     // do something...
  *   }
  * })
  * ```
  */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
  * Creates an instance of the Context class.
  *
  * @param req - The Request object.
  * @param options - Optional configuration options for the context.
  */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
  * `.req` is the instance of {@link HonoRequest}.
  */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#event}
  * The FetchEvent associated with the current request.
  *
  * @throws Will throw an error if the context does not have a FetchEvent.
  */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) return this.#executionCtx;
    else throw Error("This context has no FetchEvent");
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#executionctx}
  * The ExecutionContext associated with the current request.
  *
  * @throws Will throw an error if the context does not have an ExecutionContext.
  */
  get executionCtx() {
    if (this.#executionCtx) return this.#executionCtx;
    else throw Error("This context has no ExecutionContext");
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#res}
  * The Response object for the current request.
  */
  get res() {
    return this.#res ||= createResponseInstance(null, { headers: this.#preparedHeaders ??= new Headers() });
  }
  /**
  * Sets the Response object for the current request.
  *
  * @param _res - The Response object to set.
  */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") continue;
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) _res.headers.append("set-cookie", cookie);
        } else _res.headers.set(k, v);
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
  * `.render()` can create a response within a layout.
  *
  * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
  *
  * @example
  * ```ts
  * app.get('/', (c) => {
  *   return c.render('Hello!')
  * })
  * ```
  */
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
  * Sets the layout for the response.
  *
  * @param layout - The layout to set.
  * @returns The layout function.
  */
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  /**
  * Gets the current layout for the response.
  *
  * @returns The current layout function.
  */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  /**
  * `.setRenderer()` can set the layout in the custom middleware.
  *
  * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
  *
  * @example
  * ```tsx
  * app.use('*', async (c, next) => {
  *   c.setRenderer((content) => {
  *     return c.html(
  *       <html>
  *         <body>
  *           <p>{content}</p>
  *         </body>
  *       </html>
  *     )
  *   })
  *   await next()
  * })
  * ```
  */
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
  * `.header()` can set headers.
  *
  * @see {@link https://hono.dev/docs/api/context#header}
  *
  * @example
  * ```ts
  * app.get('/welcome', (c) => {
  *   // Set headers
  *   c.header('X-Message', 'Hello!')
  *   c.header('Content-Type', 'text/plain')
  *
  *   // Append multiple headers using the append option (e.g. Vary)
  *   c.header('Vary', 'Accept-Encoding', { append: true })
  *   c.header('Vary', 'User-Agent', { append: true })
  *
  *   return c.body('Thank you for coming')
  * })
  * ```
  */
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized && !this.#res.bodyUsed) this.#res = createResponseInstance(this.#res.body, this.#res);
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) headers.delete(name);
    else if (options?.append) headers.append(name, value);
    else headers.set(name, value);
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  /**
  * `.set()` can set the value specified by the key.
  *
  * @see {@link https://hono.dev/docs/api/context#set-get}
  *
  * @example
  * ```ts
  * app.use('*', async (c, next) => {
  *   c.set('message', 'Hono is hot!!')
  *   await next()
  * })
  * ```
  */
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
  * `.get()` can use the value specified by the key.
  *
  * @see {@link https://hono.dev/docs/api/context#set-get}
  *
  * @example
  * ```ts
  * app.get('/', (c) => {
  *   const message = c.get('message')
  *   return c.text(`The message is "${message}"`)
  * })
  * ```
  */
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
  * `.var` can access the value of a variable.
  *
  * @see {@link https://hono.dev/docs/api/context#var}
  *
  * @example
  * ```ts
  * const result = c.var.client.oneMethod()
  * ```
  */
  get var() {
    if (!this.#var) return {};
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    let responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders;
    if (typeof arg === "object" && arg.headers) {
      responseHeaders ??= new Headers();
      for (const [key, value] of new Headers(arg.headers)) if (key === "set-cookie") responseHeaders.append(key, value);
      else responseHeaders.set(key, value);
    }
    if (headers) {
      if (!responseHeaders) {
        let count = 0;
        for (const k in headers) if (++count > 1 || typeof headers[k] !== "string") {
          responseHeaders = new Headers();
          break;
        }
      }
      if (responseHeaders) for (const k in headers) {
        const v = headers[k];
        if (typeof v === "string") responseHeaders.set(k, v);
        else {
          responseHeaders.delete(k);
          for (const v2 of v) responseHeaders.append(k, v2);
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, {
      status,
      headers: responseHeaders ?? headers
    });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  /**
  * `.body()` can return the HTTP response.
  * You can set headers with `.header()` and set HTTP status code with `.status`.
  * This can also be set in `.text()`, `.json()` and so on.
  *
  * @see {@link https://hono.dev/docs/api/context#body}
  *
  * @example
  * ```ts
  * app.get('/welcome', (c) => {
  *   // Set headers
  *   c.header('X-Message', 'Hello!')
  *   c.header('Content-Type', 'text/plain')
  *   // Set HTTP status code
  *   c.status(201)
  *
  *   // Return the response body
  *   return c.body('Thank you for coming')
  * })
  * ```
  */
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  /**
  * `.text()` can render text as `Content-Type:text/plain`.
  *
  * @see {@link https://hono.dev/docs/api/context#text}
  *
  * @example
  * ```ts
  * app.get('/say', (c) => {
  *   return c.text('Hello!')
  * })
  * ```
  */
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(text, arg, setDefaultContentType(TEXT_PLAIN, headers));
  }, "text");
  /**
  * `.json()` can render JSON as `Content-Type:application/json`.
  *
  * @see {@link https://hono.dev/docs/api/context#json}
  *
  * @example
  * ```ts
  * app.get('/api', (c) => {
  *   return c.json({ message: 'Hello!' })
  * })
  * ```
  */
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(JSON.stringify(object), arg, setDefaultContentType("application/json", headers));
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  /**
  * `.redirect()` can Redirect, default status code is 302.
  *
  * @see {@link https://hono.dev/docs/api/context#redirect}
  *
  * @example
  * ```ts
  * app.get('/redirect', (c) => {
  *   return c.redirect('/')
  * })
  * app.get('/redirect-permanently', (c) => {
  *   return c.redirect('/', 301)
  * })
  * ```
  */
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header("Location", !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString));
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
  * `.notFound()` can return the Not Found Response.
  *
  * @see {@link https://hono.dev/docs/api/context#notfound}
  *
  * @example
  * ```ts
  * app.get('/notfound', (c) => {
  *   return c.notFound()
  * })
  * ```
  */
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) throw new Error("next() called multiple times");
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else handler = i === middleware.length && next || void 0;
      if (handler) try {
        res = await handler(context, () => dispatch(i + 1));
      } catch (err) {
        if (err instanceof Error && onError) {
          context.error = err;
          res = await onError(err, context);
          isError = true;
        } else throw err;
      }
      else if (context.finalized === false && onNotFound) res = await onNotFound(context);
      if (res && (context.finalized === false || isError)) context.res = res;
      return context;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/router.js
var METHODS = [
  "get",
  "post",
  "put",
  "delete",
  "options",
  "patch",
  "query"
];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/utils/mount.js
var getPathPrefixLength = /* @__PURE__ */ __name((c, pathPrefix, routePath) => {
  if (!/[:*]/.test(pathPrefix)) return pathPrefix.length;
  const path = c.req.path;
  const matchResult = c.req[GET_MATCH_RESULT];
  const paramNames = /* @__PURE__ */ new Set();
  let length = 0;
  for (const part of splitRoutingPath(pathPrefix)) {
    const pattern = getPattern(part);
    if (pattern && pattern !== "*") {
      const name = pattern[1];
      if (paramNames.has(name)) throw new Error(`mount(): Duplicate path parameter "${name}" in "${routePath}".`);
      paramNames.add(name);
    }
    if (pattern && pattern !== "*" && pattern[2] !== true) {
      const value = matchResult.length === 2 ? matchResult[1][matchResult[0][c.req.routeIndex][1][pattern[1]]] : matchResult[0][c.req.routeIndex][1][pattern[1]];
      length += value.length + 1;
    } else if (pattern || part.endsWith("*")) {
      const end = path.indexOf("/", length + 1);
      length = end === -1 ? path.length : end;
    } else length += part.length + 1;
  }
  return length;
}, "getPathPrefixLength");
var createMountedRequest = /* @__PURE__ */ __name((c, pathPrefix, routePath) => {
  if (/[^/]\*$/.test(routePath)) throw new Error(`mount(): Wildcard must follow "/" in "${routePath}".`);
  const url = new URL(c.req.raw.url);
  url.pathname = stripPathPrefix(url.pathname, c.req.path, getPathPrefixLength(c, pathPrefix, routePath));
  return new Request(url, c.req.raw);
}, "createMountedRequest");

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class Hono2 {
  static {
    __name(this, "Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  query;
  all;
  on;
  use;
  router;
  getPath;
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    [...METHODS, "all"].forEach((method) => {
      this[method] = (args1, ...args) => {
        const methodName = method.toUpperCase();
        if (typeof args1 === "string") this.#path = args1;
        else this.#addRoute(methodName, this.#path, args1);
        args.forEach((handler) => {
          this.#addRoute(methodName, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          const methodName = m.toUpperCase();
          for (const handler of handlers) this.#addRoute(methodName, this.#path, handler);
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") this.#path = arg1;
      else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute("ALL", this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new Hono2({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  /**
  * `.route()` allows grouping other Hono instance in routes.
  *
  * @see {@link https://hono.dev/docs/api/routing#grouping}
  *
  * @param {string} path - base Path
  * @param {Hono} app - other Hono instance
  * @returns {Hono} routed Hono instance
  *
  * @example
  * ```ts
  * const app = new Hono()
  * const app2 = new Hono()
  *
  * app2.get("/user", (c) => c.text("user"))
  * app.route("/api", app2) // GET /api/user
  * ```
  */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) handler = r.handler;
      else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
  * `.basePath()` allows base paths to be specified.
  *
  * @see {@link https://hono.dev/docs/api/routing#base-path}
  *
  * @param {string} path - base Path
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * const api = new Hono().basePath('/api')
  * ```
  */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
  * `.onError()` handles an error and returns a customized Response.
  *
  * @see {@link https://hono.dev/docs/api/hono#error-handling}
  *
  * @param {ErrorHandler} handler - request Handler for error
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * app.onError((err, c) => {
  *   console.error(`${err}`)
  *   return c.text('Custom Error Message', 500)
  * })
  * ```
  */
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
  * `.notFound()` allows you to customize a Not Found Response.
  *
  * @see {@link https://hono.dev/docs/api/hono#not-found}
  *
  * @param {NotFoundHandler} handler - request handler for not-found
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * app.notFound((c) => {
  *   return c.text('Custom 404 Message', 404)
  * })
  * ```
  */
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
  * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
  *
  * @deprecated Use `mount()` from `hono/mount` instead. `.mount()` will be removed in v5.
  *
  * @see {@link https://hono.dev/docs/api/hono#mount}
  *
  * @param {string} path - base Path
  * @param {Function} applicationHandler - other Request Handler
  * @param {MountOptions} [options] - options of `.mount()`
  * @returns {Hono} mounted Hono instance
  *
  * @example
  * ```ts
  * import { Router as IttyRouter } from 'itty-router'
  * import { Hono } from 'hono'
  * // Create itty-router application
  * const ittyRouter = IttyRouter()
  * // GET /itty-router/hello
  * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
  *
  * const app = new Hono()
  * app.mount('/itty-router', ittyRouter.handle)
  * ```
  *
  * @example
  * ```ts
  * const app = new Hono()
  * // Send the request to another application without modification.
  * app.mount('/app', anotherApp, {
  *   replaceRequest: (req) => req,
  * })
  * ```
  */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") optionHandler = options;
      else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        else replaceRequest = options.replaceRequest;
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    const mergedPath = mergePath(this._basePath, path);
    const defaultReplaceRequest = /* @__PURE__ */ __name((c) => createMountedRequest(c, mergedPath.replace(/\/$/, ""), mergePath(mergedPath, "*")), "defaultReplaceRequest");
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest ? replaceRequest(c.req.raw) : defaultReplaceRequest(c), ...getOptions(c));
      if (res) return res;
      await next();
    }, "handler");
    this.#addRoute("ALL", mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) return this.errorHandler(err, c);
    throw err;
  }
  #dispatch(request, executionCtx, env2, method) {
    if (method === "HEAD") return (async () => new Response(null, await this.#dispatch(request, executionCtx, env2, "GET")))();
    const path = this.getPath(request, { env: env2 });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env: env2,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then((resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) throw new Error("Context is not finalized. Did you forget to return a Response object or `await next()`?");
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
  * `.fetch()` will be entry point of your app.
  *
  * @see {@link https://hono.dev/docs/api/hono#fetch}
  *
  * @param {Request} request - request Object of request
  * @param {Env} env - env Object
  * @param {ExecutionContext} executionCtx - context of execution
  * @returns {Response | Promise<Response>} response of request
  *
  */
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
  * `.request()` is a useful method for testing.
  * You can pass a URL or pathname to send a GET request.
  * app will return a Response object.
  * ```ts
  * test('GET /hello is ok', async () => {
  *   const res = await app.request('/hello')
  *   expect(res.status).toBe(200)
  * })
  * ```
  * @see https://hono.dev/docs/api/hono#request
  */
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    input = input.toString();
    return this.fetch(new Request(/^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`, requestInit), Env, executionCtx);
  }, "request");
  /**
  * `.fire()` automatically adds a global fetch event listener.
  * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
  * @deprecated
  * Use `fire` from `hono/service-worker` instead.
  * ```ts
  * import { Hono } from 'hono'
  * import { fire } from 'hono/service-worker'
  *
  * const app = new Hono()
  * // ...
  * fire(app)
  * ```
  * @see https://hono.dev/docs/api/hono#fire
  * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
  * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
  */
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/hono/dist/router/utils.js
var createNullObject = /* @__PURE__ */ __name(() => /* @__PURE__ */ Object.create(null), "createNullObject");

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name(((method2, path2) => {
    const matcher = matchers[method2] || matchers["ALL"];
    const staticMatch = matcher[2][path2];
    if (staticMatch) return staticMatch;
    const match3 = path2.match(matcher[0]);
    if (!match3) return [[], emptyParam];
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }), "match");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = "[^]*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/[^]*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = /* @__PURE__ */ new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) return b.length === 1 ? a < b ? -1 : 1 : -1;
  if (b.length === 1) return 1;
  if (a === "[^]*" || a === "(?:|/[^]*)") return b === "[^]*" ? -1 : 1;
  else if (b === "[^]*" || b === "(?:|/[^]*)") return -1;
  if (a === "[^/]+") return 1;
  else if (b === "[^/]+") return -1;
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class Node2 {
  static {
    __name(this, "Node");
  }
  #index;
  #varIndex;
  #children = createNullObject();
  insert(tokens, index, paramMap, context, keys) {
    let node = this;
    for (let i = 0, len = tokens.length; i < len; i++) {
      const token = tokens[i];
      const pattern = token.length === 1 ? token === "*" ? i === len - 1 ? [
        "",
        "",
        ONLY_WILDCARD_REG_EXP_STR
      ] : [
        "",
        "",
        LABEL_REG_EXP_STR
      ] : null : token === "/*" ? [
        "",
        "",
        TAIL_WILDCARD_REG_EXP_STR
      ] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let nextNode;
      if (pattern) {
        const name = pattern[1];
        let regexpStr = pattern[2] || "[^/]+";
        if (name && pattern[2]) {
          if (new RegExp(regexpStr).test("")) throw PATH_ERROR;
          regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
          if (/\((?!\?:)/.test(regexpStr)) throw PATH_ERROR;
          if (regexpStr.length === 1 && regExpMetaChars.has(regexpStr)) throw PATH_ERROR;
        }
        keys.push(regexpStr);
        nextNode = node.#children[regexpStr];
        if (!nextNode) {
          if (regexpStr !== "[^]*" && regexpStr !== "(?:|/[^]*)") {
            for (const k in node.#children) if ((regexpStr.length > 1 || k.length > 1) && k !== "[^]*" && k !== "(?:|/[^]*)") throw PATH_ERROR;
          }
          nextNode = node.#children[regexpStr] = new Node2();
        }
        if (name !== "") {
          nextNode.#varIndex ??= context.varIndex++;
          paramMap.push([name, nextNode.#varIndex]);
        }
      } else {
        keys.push(token);
        nextNode = node.#children[token];
        if (!nextNode) {
          for (const k in node.#children) if (k.length > 1 && k !== "[^]*" && k !== "(?:|/[^]*)") throw PATH_ERROR;
          nextNode = node.#children[token] = new Node2();
        }
      }
      node = nextNode;
    }
    if (node.#index !== void 0) throw PATH_ERROR;
    node.#index = index;
  }
  buildRegExpStr() {
    const strList = Object.keys(this.#children).sort(compareKey).map((k) => {
      const c = this.#children[k];
      const childStr = c.buildRegExpStr();
      return childStr === "" ? "" : (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + childStr;
    }).filter(Boolean);
    if (typeof this.#index === "number" && this.#index !== -1) strList.unshift(`#${this.#index}`);
    if (strList.length === 0) return "";
    if (strList.length === 1) return strList[0];
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  #index = 0;
  paths = createNullObject();
  insert(path, isStatic) {
    const keys = [];
    if (isStatic) {
      this.#root.insert(path.split(""), -1, [], this.#context, keys);
      this.paths[path] = [
        -1,
        [],
        keys
      ];
      return;
    }
    const paramAssoc = [];
    const groups = [];
    let markedPath = path;
    for (let i = 0; ; ) {
      let replaced = false;
      markedPath = markedPath.replace(/\{(?:\{[\d,]+\}|[^}])+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) break;
    }
    const tokens = markedPath.match(/(?::[^\/]+)|(?:\/\*$)|./gs) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) if (tokens[j].indexOf(mark) !== -1) {
        tokens[j] = tokens[j].replace(mark, groups[i][1]);
        break;
      }
    }
    this.#root.insert(tokens, this.#index, paramAssoc, this.#context, keys);
    this.paths[path] = [
      this.#index++,
      paramAssoc,
      keys
    ];
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") return [
      /^$/,
      [],
      []
    ];
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [
      new RegExp(`^${regexp}`),
      indexReplacementMap,
      paramReplacementMap
    ];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
function endsWithWildcard(keys) {
  const tail = keys[keys.length - 1];
  return tail === "[^]*" || tail === "(?:|/[^]*)";
}
__name(endsWithWildcard, "endsWithWildcard");
function covers(wildcard, target) {
  const last = wildcard.length - 1;
  for (let i = 0; i < last; i++) if (wildcard[i] !== target[i]) return false;
  return wildcard[last] === "[^]*" || target.length === last || target[last] === "/";
}
__name(covers, "covers");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #handlers;
  #tries;
  constructor() {
    this.#handlers = { ["ALL"]: [] };
    this.#tries = { ["ALL"]: new Trie() };
  }
  #insertPath(method, path) {
    try {
      this.#tries[method].insert(path, !/\*|\/:/.test(path));
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
  }
  add(method, path, handler) {
    const handlers = this.#handlers;
    if (!handlers) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    const tries = this.#tries;
    if (!handlers[method]) {
      tries[method] = new Trie();
      handlers[method] = [...handlers["ALL"]];
      for (const p in tries["ALL"].paths) this.#insertPath(method, p);
    }
    if (path === "/*") path = "*";
    const methods = method === "ALL" ? Object.keys(handlers) : [method];
    const paths = checkOptionalParameter(path) || [path];
    for (const path2 of paths) for (const m of methods) {
      if (!tries[m].paths[path2]) this.#insertPath(m, path2);
      handlers[m].push([handler, path2]);
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = createNullObject();
    for (const method of Object.keys(this.#handlers)) matchers[method] = this.#buildMatcher(method);
    this.#handlers = this.#tries = void 0;
    return matchers;
  }
  #buildMatcher(method) {
    const handlers = this.#handlers[method];
    const trie = this.#tries[method];
    const staticMap = createNullObject();
    const handlerData = [];
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
    const own = createNullObject();
    const entries = handlers.map(([h, p], i) => {
      (own[p] ??= []).push(i);
      return [h, trie.paths[p][1].reduceRight((map, [key, varIndex]) => {
        map[key] = paramReplacementMap[varIndex];
        return map;
      }, createNullObject())];
    });
    const wildcards = Object.keys(own).filter((p) => endsWithWildcard(trie.paths[p][2]));
    for (const path in trie.paths) {
      const [index, , keys] = trie.paths[path];
      const indexes = [...own[path]];
      for (const p of wildcards) if (p !== path && covers(trie.paths[p][2], keys)) indexes.push(...own[p]);
      const data = indexes.sort((a, b) => a - b).map((i) => entries[i]);
      if (index === -1) {
        const last = Math.max(-1, ...data.flatMap(([, map]) => Object.values(map)));
        staticMap[path] = [data, last === -1 ? emptyParam : path.match(regexp).slice(0, last + 1)];
      } else handlerData[index] = data;
    }
    return [
      regexp,
      indexReplacementMap.map((i) => handlerData[i]),
      staticMap
    ];
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    this.#routes.push([
      method,
      path,
      handler
    ]);
  }
  match(method, path) {
    if (!this.#routes) throw new Error("Fatal error");
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) router.add(...routes[i2]);
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) continue;
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) throw new Error("Fatal error");
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) throw new Error("No active router has been determined yet.");
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = createNullObject();
var order = 0;
var Node3 = class Node4 {
  static {
    __name(this, "Node");
  }
  #methods = [];
  #children = createNullObject();
  #patterns = [];
  #pattern;
  #params = emptyParams;
  insert(method, path, handler) {
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = /* @__PURE__ */ new Set();
    let i = 0;
    for (const p of parts) {
      const nextP = parts[++i];
      const pattern = getPattern(p, nextP) || (nextP === void 0 && p && p.indexOf("*") === p.length - 1 ? p : null);
      const isParam = Array.isArray(pattern);
      const key = isParam ? pattern[0] : pattern || p;
      const child = curNode.#children[key] ||= new Node4();
      if (pattern && !child.#pattern) {
        child.#pattern = pattern;
        curNode.#patterns.push(child);
      }
      curNode = child;
      if (isParam) possibleKeys.add(pattern[1]);
    }
    curNode.#methods.push({ [method]: {
      handler,
      possibleKeys: [...possibleKeys],
      score: ++order
    } });
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m["ALL"];
      if (handlerSet) {
        handlerSet.params = createNullObject();
        handlerSets.push(handlerSet);
        for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
          const key = handlerSet.possibleKeys[i2];
          handlerSet.params[key] = params?.[key] && !i2 ? params[key] : nodeParams[key] ?? params?.[key];
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    let curNodes = [this];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else tempNodes.push(nextNode);
        }
        for (const child of node.#patterns) {
          const pattern = child.#pattern;
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (typeof pattern === "string") {
            if (pattern === "*" || part.startsWith(pattern.slice(0, -1))) {
              this.#pushHandlerSets(handlerSets, child, method, node.#params);
              if (pattern === "*") {
                child.#params = params;
                tempNodes.push(child);
              }
            }
            continue;
          }
          const [, name, matcher] = pattern;
          if (!part && matcher === true) continue;
          if (matcher !== true) {
            if (!partOffsets) {
              partOffsets = [];
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.slice(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              if (!Object.hasOwn(params, name)) params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (m[0].length === restPathString.length && child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, node.#params, params);
              for (const _ in child.#children) {
                child.#params = params;
                const componentCount = m[0].match(/\//g)?.length ?? 0;
                (curNodesQueue[componentCount] ||= []).push(child);
                break;
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            if (!Object.hasOwn(params, name)) params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, params, node.#params);
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets[1]) handlerSets.sort((a, b) => {
      return a.score - b.score;
    });
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node = new Node3();
  add(method, path, handler) {
    for (const result of checkOptionalParameter(path) || [path]) this.#node.insert(method, result, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono3 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  /**
  * Creates an instance of the Hono class.
  *
  * @param options - Optional configuration options for the Hono instance.
  */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] });
  }
};

// node_modules/hono/dist/utils/cookie.js
var validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/;
var relaxedCookieNameRegEx = /^[!#-:<>-[\]-~]+$/;
var validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/;
var trimCookieWhitespace = /* @__PURE__ */ __name((value) => {
  let start = 0;
  let end = value.length;
  while (start < end) {
    const charCode = value.charCodeAt(start);
    if (charCode !== 32 && charCode !== 9) break;
    start++;
  }
  while (end > start) {
    const charCode = value.charCodeAt(end - 1);
    if (charCode !== 32 && charCode !== 9) break;
    end--;
  }
  return start === 0 && end === value.length ? value : value.slice(start, end);
}, "trimCookieWhitespace");
var parse = /* @__PURE__ */ __name((cookie, name) => {
  if (name && cookie.indexOf(name) === -1) return {};
  const pairs = cookie.split(";");
  const parsedCookie = /* @__PURE__ */ Object.create(null);
  for (const pairStr of pairs) {
    const valueStartPos = pairStr.indexOf("=");
    if (valueStartPos === -1) continue;
    const cookieName = trimCookieWhitespace(pairStr.substring(0, valueStartPos));
    if (name && name !== cookieName || !relaxedCookieNameRegEx.test(cookieName) || cookieName in parsedCookie) continue;
    let cookieValue = trimCookieWhitespace(pairStr.substring(valueStartPos + 1));
    if (cookieValue.startsWith('"') && cookieValue.endsWith('"')) cookieValue = cookieValue.slice(1, -1);
    if (validCookieValueRegEx.test(cookieValue)) {
      parsedCookie[cookieName] = tryDecodeURIComponent(cookieValue);
      if (name) break;
    }
  }
  return parsedCookie;
}, "parse");
var _serialize = /* @__PURE__ */ __name((name, value, opt = {}) => {
  if (!validCookieNameRegEx.test(name)) throw new Error("Invalid cookie name");
  let cookie = `${name}=${value}`;
  if (name.startsWith("__Secure-") && !opt.secure) throw new Error("__Secure- Cookie must have Secure attributes");
  if (name.startsWith("__Host-")) {
    if (!opt.secure) throw new Error("__Host- Cookie must have Secure attributes");
    if (opt.path !== "/") throw new Error('__Host- Cookie must have Path attributes with "/"');
    if (opt.domain) throw new Error("__Host- Cookie must not have Domain attributes");
  }
  for (const key of [
    "domain",
    "path",
    "sameSite",
    "priority"
  ]) if (opt[key] && /[;\r\n]/.test(opt[key])) throw new Error(`${key} must not contain ";", "\\r", or "\\n"`);
  if (opt && typeof opt.maxAge === "number" && opt.maxAge >= 0) {
    if (opt.maxAge > 3456e4) throw new Error("Cookies Max-Age SHOULD NOT be greater than 400 days (34560000 seconds) in duration.");
    cookie += `; Max-Age=${opt.maxAge | 0}`;
  }
  if (opt.domain && opt.prefix !== "host") cookie += `; Domain=${opt.domain}`;
  if (opt.path) cookie += `; Path=${opt.path}`;
  if (opt.expires) {
    if (opt.expires.getTime() - Date.now() > 3456e7) throw new Error("Cookies Expires SHOULD NOT be greater than 400 days (34560000 seconds) in the future.");
    cookie += `; Expires=${opt.expires.toUTCString()}`;
  }
  if (opt.httpOnly) cookie += "; HttpOnly";
  if (opt.secure) cookie += "; Secure";
  if (opt.sameSite) cookie += `; SameSite=${opt.sameSite.charAt(0).toUpperCase() + opt.sameSite.slice(1)}`;
  if (opt.priority) cookie += `; Priority=${opt.priority.charAt(0).toUpperCase() + opt.priority.slice(1)}`;
  if (opt.partitioned) {
    if (!opt.secure) throw new Error("Partitioned Cookie must have Secure attributes");
    cookie += "; Partitioned";
  }
  return cookie;
}, "_serialize");
var serialize = /* @__PURE__ */ __name((name, value, opt) => {
  value = encodeURIComponent(value);
  return _serialize(name, value, opt);
}, "serialize");

// node_modules/hono/dist/helper/cookie/index.js
var getCookie = /* @__PURE__ */ __name((c, key, prefix) => {
  const cookie = c.req.raw.headers.get("Cookie");
  if (typeof key === "string") {
    if (!cookie) return;
    let finalKey = key;
    if (prefix === "secure") finalKey = "__Secure-" + key;
    else if (prefix === "host") finalKey = "__Host-" + key;
    return parse(cookie, finalKey)[finalKey];
  }
  if (!cookie) return {};
  return parse(cookie);
}, "getCookie");
var generateCookie = /* @__PURE__ */ __name((name, value, opt) => {
  let cookie;
  if (opt?.prefix === "secure") cookie = serialize("__Secure-" + name, value, {
    path: "/",
    ...opt,
    secure: true
  });
  else if (opt?.prefix === "host") cookie = serialize("__Host-" + name, value, {
    ...opt,
    path: "/",
    secure: true,
    domain: void 0
  });
  else cookie = serialize(name, value, {
    path: "/",
    ...opt
  });
  return cookie;
}, "generateCookie");
var setCookie = /* @__PURE__ */ __name((c, name, value, opt) => {
  const cookie = generateCookie(name, value, opt);
  c.header("Set-Cookie", cookie, { append: true });
}, "setCookie");
var deleteCookie = /* @__PURE__ */ __name((c, name, opt) => {
  const deletedCookie = getCookie(c, name, opt?.prefix);
  setCookie(c, name, "", {
    ...opt,
    maxAge: 0
  });
  return deletedCookie;
}, "deleteCookie");

// worker/src/util.ts
var HttpError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
  status;
  static {
    __name(this, "HttpError");
  }
};
function fail(status, message) {
  throw new HttpError(status, message);
}
__name(fail, "fail");
function now() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
__name(now, "now");
function today() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
__name(today, "today");
function jsonText(value) {
  return JSON.stringify(value ?? []);
}
__name(jsonText, "jsonText");
function readStrings(raw2) {
  try {
    const items = JSON.parse(raw2 || "[]");
    return Array.isArray(items) ? items.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}
__name(readStrings, "readStrings");
function cleanSlug(value) {
  return value.toLowerCase().replace(/^[-_ ]+|[-_ ]+$/g, "");
}
__name(cleanSlug, "cleanSlug");
function validSlug(value) {
  return value.length >= 2 && value.length <= 100 && /^[a-z0-9-]+$/.test(value);
}
__name(validSlug, "validSlug");
function validURL(value) {
  if (value === "" || value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.host);
  } catch {
    return false;
  }
}
__name(validURL, "validURL");
function normalizeProjectURL(value) {
  const url = (value || "").trim();
  if (!url || url.startsWith("/") || /^[a-z][a-z\d+.-]*:\/\//i.test(url)) return url;
  return /^[^\s/?#]+\.[^\s/?#]+(?:[/?#].*)?$/.test(url) ? `https://${url}` : url;
}
__name(normalizeProjectURL, "normalizeProjectURL");
function validGitHubLogin(value) {
  return value.length >= 1 && value.length <= 39 && /^[A-Za-z0-9-]+$/.test(value);
}
__name(validGitHubLogin, "validGitHubLogin");
function validAdminUsername(value) {
  return value.length >= 2 && value.length <= 32 && /^[A-Za-z0-9_-]+$/.test(value);
}
__name(validAdminUsername, "validAdminUsername");
function slugify(value) {
  let previousDash = false;
  let out = "";
  for (const char of value.toLowerCase()) {
    if (char >= "a" && char <= "z" || char >= "0" && char <= "9") {
      out += char;
      previousDash = false;
    } else if (!previousDash) {
      out += "-";
      previousDash = true;
    }
  }
  return cleanSlug(out);
}
__name(slugify, "slugify");
function isLoopbackHost(host) {
  if (host.toLowerCase() === "localhost") return true;
  return host === "127.0.0.1" || host === "::1";
}
__name(isLoopbackHost, "isLoopbackHost");
function sameOrigin(origin, configured, requestHost) {
  if (!origin) return true;
  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (configured) {
    try {
      const expected = new URL(configured);
      if (url.protocol === expected.protocol && url.host === expected.host) return true;
      if (isLoopbackHost(url.hostname) && isLoopbackHost(expected.hostname)) return true;
    } catch {
    }
  }
  return url.host === requestHost && (url.protocol === "http:" || url.protocol === "https:");
}
__name(sameOrigin, "sameOrigin");
function publicURL(c) {
  return (c.env.PUBLIC_URL || new URL(c.req.url).origin).replace(/\/$/, "");
}
__name(publicURL, "publicURL");
function sessionDays(c) {
  const days = Number(c.env.SESSION_DAYS || 30);
  return days > 0 ? days : 30;
}
__name(sessionDays, "sessionDays");
async function randomHex(bytes = 32) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return [...buf].map((item) => item.toString(16).padStart(2, "0")).join("");
}
__name(randomHex, "randomHex");
async function sha256Hex(data) {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await pbkdf2(password, salt);
  return `pbkdf2$sha256$100000$${toB64(salt)}$${toB64(new Uint8Array(key))}`;
}
__name(hashPassword, "hashPassword");
async function verifyPassword(password, stored) {
  const parts = stored.split("$");
  if (parts.length !== 5 || parts[0] !== "pbkdf2" || parts[1] !== "sha256") return false;
  const salt = fromB64(parts[3]);
  const expected = fromB64(parts[4]);
  const actual = new Uint8Array(await pbkdf2(password, salt, Number(parts[2]) || 1e5));
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i += 1) diff |= actual[i] ^ expected[i];
  return diff === 0;
}
__name(verifyPassword, "verifyPassword");
async function pbkdf2(password, salt, iterations = 1e5) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
}
__name(pbkdf2, "pbkdf2");
function toB64(bytes) {
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin);
}
__name(toB64, "toB64");
function fromB64(value) {
  const bin = atob(value);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
__name(fromB64, "fromB64");
function mapError(error) {
  if (error instanceof HttpError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("UNIQUE constraint failed")) return new HttpError(409, "slug \u5DF2\u5B58\u5728");
  return new HttpError(400, message || "\u8BF7\u6C42\u65E0\u6548");
}
__name(mapError, "mapError");
function runeCount(value) {
  return [...value].length;
}
__name(runeCount, "runeCount");

// worker/src/store.ts
var PASSWORD_ADMIN_GITHUB_ID = -1;
var Store = class _Store {
  constructor(db) {
    this.db = db;
  }
  db;
  static {
    __name(this, "Store");
  }
  static from(env2) {
    return new _Store(env2.DB);
  }
  articles(includeDrafts) {
    const query = includeDrafts ? `SELECT id,slug,title,summary,markdown,category,tags_json,status,date,reading_minutes,sort_order,created_at,updated_at FROM articles ORDER BY sort_order, date DESC, id DESC` : `SELECT id,slug,title,summary,markdown,category,tags_json,status,date,reading_minutes,sort_order,created_at,updated_at FROM articles WHERE status='published' ORDER BY sort_order, date DESC, id DESC`;
    return this.db.prepare(query).all().then((rows) => rows.results.map(mapArticle));
  }
  async articleBySlug(slug) {
    const row = await this.db.prepare(
      `SELECT id,slug,title,summary,markdown,category,tags_json,status,date,reading_minutes,sort_order,created_at,updated_at FROM articles WHERE slug=? AND status='published'`
    ).bind(slug).first();
    if (!row) fail(404, "\u6587\u7AE0\u4E0D\u5B58\u5728");
    return mapArticle(row);
  }
  async saveArticle(input) {
    if (!input.title || !input.slug) fail(400, "\u6807\u9898\u548C slug \u4E0D\u80FD\u4E3A\u7A7A");
    const article = {
      ...input,
      status: input.status === "published" ? "published" : "draft",
      date: input.date || today(),
      readingMinutes: input.readingMinutes >= 1 ? input.readingMinutes : Math.max(1, Math.floor(runeLen(input.markdown) / 500)),
      tags: input.tags || [],
      updatedAt: now()
    };
    if (!article.id) {
      article.createdAt = article.updatedAt;
      const result = await this.db.prepare(
        `INSERT INTO articles(slug,title,summary,markdown,category,tags_json,status,date,reading_minutes,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(
        article.slug,
        article.title,
        article.summary,
        article.markdown,
        article.category,
        jsonText(article.tags),
        article.status,
        article.date,
        article.readingMinutes,
        article.sortOrder || 0,
        article.createdAt,
        article.updatedAt
      ).run();
      article.id = result.meta.last_row_id || 0;
    } else {
      const result = await this.db.prepare(
        `UPDATE articles SET slug=?,title=?,summary=?,markdown=?,category=?,tags_json=?,status=?,date=?,reading_minutes=?,sort_order=?,updated_at=? WHERE id=?`
      ).bind(
        article.slug,
        article.title,
        article.summary,
        article.markdown,
        article.category,
        jsonText(article.tags),
        article.status,
        article.date,
        article.readingMinutes,
        article.sortOrder || 0,
        article.updatedAt,
        article.id
      ).run();
      if (!result.meta.changes) fail(404, "\u8BB0\u5F55\u4E0D\u5B58\u5728");
    }
    return article;
  }
  categories() {
    return this.db.prepare(`SELECT id,slug,name,description FROM categories ORDER BY id`).all().then((rows) => rows.results);
  }
  async saveCategory(input) {
    if (!input.slug || !input.name) fail(400, "\u540D\u79F0\u548C slug \u4E0D\u80FD\u4E3A\u7A7A");
    if (!input.id) {
      const result = await this.db.prepare(`INSERT INTO categories(slug,name,description) VALUES(?,?,?)`).bind(input.slug, input.name, input.description || "").run();
      input.id = result.meta.last_row_id || 0;
    } else {
      const result = await this.db.prepare(`UPDATE categories SET slug=?,name=?,description=? WHERE id=?`).bind(input.slug, input.name, input.description || "", input.id).run();
      if (!result.meta.changes) fail(404, "\u8BB0\u5F55\u4E0D\u5B58\u5728");
    }
    return input;
  }
  tags() {
    return this.db.prepare(`SELECT id,slug,name FROM tags ORDER BY id`).all().then((rows) => rows.results);
  }
  async saveTag(input) {
    if (!input.slug || !input.name) fail(400, "\u540D\u79F0\u548C slug \u4E0D\u80FD\u4E3A\u7A7A");
    if (!input.id) {
      const result = await this.db.prepare(`INSERT INTO tags(slug,name) VALUES(?,?)`).bind(input.slug, input.name).run();
      input.id = result.meta.last_row_id || 0;
    } else {
      const result = await this.db.prepare(`UPDATE tags SET slug=?,name=? WHERE id=?`).bind(input.slug, input.name, input.id).run();
      if (!result.meta.changes) fail(404, "\u8BB0\u5F55\u4E0D\u5B58\u5728");
    }
    return input;
  }
  projects(includeDrafts) {
    const query = includeDrafts ? `SELECT id,slug,title,summary,markdown,cover_url,logo_url,site_url,site_label,repo_url,repo_label,links_json,technologies_json,screenshots_json,status,sort_order,created_at,updated_at FROM projects ORDER BY sort_order,id` : `SELECT id,slug,title,summary,markdown,cover_url,logo_url,site_url,site_label,repo_url,repo_label,links_json,technologies_json,screenshots_json,status,sort_order,created_at,updated_at FROM projects WHERE status='published' ORDER BY sort_order,id`;
    return this.db.prepare(query).all().then((rows) => rows.results.map(mapProject));
  }
  async saveProject(input) {
    if (!input.slug || !input.title) fail(400, "\u6807\u9898\u548C slug \u4E0D\u80FD\u4E3A\u7A7A");
    const project = {
      ...input,
      status: input.status === "published" ? "published" : "draft",
      screenshots: input.screenshots || [],
      links: input.links || [],
      technologies: input.technologies || [],
      updatedAt: now()
    };
    const linksJSON = jsonText(project.links);
    if (!project.id) {
      project.createdAt = project.updatedAt;
      const result = await this.db.prepare(
        `INSERT INTO projects(slug,title,summary,markdown,cover_url,logo_url,site_url,site_label,repo_url,repo_label,links_json,technologies_json,screenshots_json,status,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(
        project.slug,
        project.title,
        project.summary,
        project.markdown,
        project.coverUrl,
        project.logoUrl,
        project.siteUrl,
        project.siteLabel,
        project.repoUrl,
        project.repoLabel,
        linksJSON,
        jsonText(project.technologies),
        jsonText(project.screenshots),
        project.status,
        project.sortOrder || 0,
        project.createdAt,
        project.updatedAt
      ).run();
      project.id = result.meta.last_row_id || 0;
    } else {
      const result = await this.db.prepare(
        `UPDATE projects SET slug=?,title=?,summary=?,markdown=?,cover_url=?,logo_url=?,site_url=?,site_label=?,repo_url=?,repo_label=?,links_json=?,technologies_json=?,screenshots_json=?,status=?,sort_order=?,updated_at=? WHERE id=?`
      ).bind(
        project.slug,
        project.title,
        project.summary,
        project.markdown,
        project.coverUrl,
        project.logoUrl,
        project.siteUrl,
        project.siteLabel,
        project.repoUrl,
        project.repoLabel,
        linksJSON,
        jsonText(project.technologies),
        jsonText(project.screenshots),
        project.status,
        project.sortOrder || 0,
        project.updatedAt,
        project.id
      ).run();
      if (!result.meta.changes) fail(404, "\u8BB0\u5F55\u4E0D\u5B58\u5728");
    }
    return project;
  }
  async settings() {
    const rows = await this.db.prepare(`SELECT key,value FROM settings`).all();
    const cfg = { siteName: "", siteDescription: "", aboutIntro: "", githubUsername: "" };
    for (const row of rows.results) {
      if (row.key === "site_name") cfg.siteName = row.value;
      if (row.key === "site_description") cfg.siteDescription = row.value;
      if (row.key === "about_intro") cfg.aboutIntro = row.value;
      if (row.key === "github_username") cfg.githubUsername = row.value;
    }
    return cfg;
  }
  async saveSettings(cfg) {
    const values = [
      ["site_name", cfg.siteName],
      ["site_description", cfg.siteDescription],
      ["about_intro", cfg.aboutIntro],
      ["github_username", cfg.githubUsername],
      ["github_cache_bust", String(Date.now())]
    ];
    await this.db.batch(
      values.map(
        ([key, value]) => this.db.prepare(`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).bind(key, value)
      )
    );
  }
  async settingValue(key) {
    return (await this.db.prepare(`SELECT value FROM settings WHERE key=?`).bind(key).first())?.value || "";
  }
  async githubAuth() {
    const [clientId, clientSecret, token] = await Promise.all([
      this.settingValue("github_client_id"),
      this.settingValue("github_client_secret"),
      this.settingValue("github_token")
    ]);
    return { clientId, clientSecret, token };
  }
  async saveGitHubAuth(clientId, clientSecret, token, updateSecret, updateToken) {
    const values = [["github_client_id", clientId.trim()]];
    if (updateSecret) values.push(["github_client_secret", clientSecret.trim()]);
    if (updateToken) values.push(["github_token", token.trim()]);
    await this.db.batch(
      values.map(
        ([key, value]) => this.db.prepare(`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).bind(key, value)
      )
    );
  }
  async delete(kind, id) {
    const tables = { articles: "articles", categories: "categories", tags: "tags", projects: "projects", comments: "comments" };
    const table = tables[kind];
    if (!table) fail(400, "\u672A\u77E5\u8D44\u6E90");
    const result = await this.db.prepare(`DELETE FROM ${table} WHERE id=?`).bind(id).run();
    if (!result.meta.changes) fail(404, "\u8BB0\u5F55\u4E0D\u5B58\u5728");
  }
  async reorder(resource, ids) {
    if (resource !== "articles" && resource !== "projects") fail(400, "\u4E0D\u652F\u6301\u6392\u5E8F\u6B64\u5185\u5BB9");
    const countRow = await this.db.prepare(`SELECT count(*) as n FROM ${resource}`).first();
    if ((countRow?.n || 0) !== ids.length) fail(400, "\u6392\u5E8F\u5217\u8868\u5DF2\u53D8\u5316\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u8BD5");
    const seen = /* @__PURE__ */ new Set();
    const statements = [];
    for (const [index, id] of ids.entries()) {
      if (id <= 0 || seen.has(id)) fail(400, "\u6392\u5E8F\u5217\u8868\u5305\u542B\u91CD\u590D\u6216\u65E0\u6548\u6761\u76EE");
      seen.add(id);
      statements.push(this.db.prepare(`UPDATE ${resource} SET sort_order=? WHERE id=?`).bind(index + 1, id));
    }
    const results = await this.db.batch(statements);
    if (results.some((item) => !item.meta.changes)) fail(400, "\u6392\u5E8F\u5217\u8868\u5305\u542B\u4E0D\u5B58\u5728\u7684\u6761\u76EE");
  }
  async upsertUser(user) {
    await this.db.prepare(
      `INSERT INTO users(github_id,login,name,avatar_url,role) VALUES(?,?,?,?,?) ON CONFLICT(github_id) DO UPDATE SET login=excluded.login,name=excluded.name,avatar_url=excluded.avatar_url,role=excluded.role`
    ).bind(user.githubId, user.login, user.name, user.avatarUrl, user.role).run();
    const row = await this.db.prepare(`SELECT id,github_id as githubId,login,name,avatar_url as avatarUrl,role FROM users WHERE github_id=?`).bind(user.githubId).first();
    if (!row) fail(500, "\u65E0\u6CD5\u4FDD\u5B58\u7528\u6237");
    return row;
  }
  createSession(hash, userId, expires) {
    return this.db.prepare(`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)`).bind(hash, userId, expires).run();
  }
  async sessionUser(hash) {
    return this.db.prepare(
      `SELECT u.id,u.github_id as githubId,u.login,u.name,u.avatar_url as avatarUrl,u.role FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?`
    ).bind(hash, now()).first();
  }
  deleteSession(hash) {
    return this.db.prepare(`DELETE FROM sessions WHERE token_hash=?`).bind(hash).run();
  }
  deleteSessionsForUser(userId) {
    return this.db.prepare(`DELETE FROM sessions WHERE user_id=?`).bind(userId).run();
  }
  async comments(slug, includeHidden) {
    const query = includeHidden ? `SELECT c.id,c.article_id,a.slug as article_slug,u.id as user_id,u.github_id,u.login,u.name,u.avatar_url,u.role,c.body,c.status,c.created_at FROM comments c JOIN articles a ON a.id=c.article_id JOIN users u ON u.id=c.user_id WHERE a.slug=? ORDER BY c.created_at DESC,c.id DESC` : `SELECT c.id,c.article_id,a.slug as article_slug,u.id as user_id,u.github_id,u.login,u.name,u.avatar_url,u.role,c.body,c.status,c.created_at FROM comments c JOIN articles a ON a.id=c.article_id JOIN users u ON u.id=c.user_id WHERE a.slug=? AND c.status='published' AND a.status='published' ORDER BY c.created_at DESC,c.id DESC`;
    const rows = await this.db.prepare(query).bind(slug).all();
    return rows.results.map(mapComment);
  }
  async allComments() {
    const rows = await this.db.prepare(
      `SELECT c.id,c.article_id,a.slug as article_slug,u.id as user_id,u.github_id,u.login,u.name,u.avatar_url,u.role,c.body,c.status,c.created_at FROM comments c JOIN articles a ON a.id=c.article_id JOIN users u ON u.id=c.user_id ORDER BY c.created_at DESC,c.id DESC`
    ).all();
    return rows.results.map(mapComment);
  }
  async addComment(slug, userId, body, user) {
    const article = await this.articleBySlug(slug);
    const createdAt = now();
    const result = await this.db.prepare(`INSERT INTO comments(article_id,user_id,body,status,created_at) VALUES(?,?,?,'published',?)`).bind(article.id, userId, body, createdAt).run();
    return { id: result.meta.last_row_id || 0, articleId: article.id, articleSlug: slug, user, body, status: "published", createdAt };
  }
  async setCommentStatus(id, status) {
    if (status !== "published" && status !== "hidden") fail(400, "\u65E0\u6548\u72B6\u6001");
    const result = await this.db.prepare(`UPDATE comments SET status=? WHERE id=?`).bind(status, id).run();
    if (!result.meta.changes) fail(404, "\u8BB0\u5F55\u4E0D\u5B58\u5728");
  }
  async uploads() {
    const rows = await this.db.prepare(`SELECT id,name,stored_name,mime,size,url,storage,storage_name,created_at FROM uploads ORDER BY id DESC`).all();
    return rows.results.map(mapUpload);
  }
  async uploadByName(name) {
    const row = await this.db.prepare(`SELECT id,name,stored_name,mime,size,url,storage,storage_name,created_at FROM uploads WHERE stored_name=?`).bind(name).first();
    return row ? mapUpload(row) : null;
  }
  async uploadByHash(hash) {
    const row = await this.db.prepare(`SELECT id,name,stored_name,mime,size,url,storage,storage_name,created_at FROM uploads WHERE content_hash=? AND content_hash!=''`).bind(hash).first();
    return row ? mapUpload(row) : null;
  }
  async insertUpload(item) {
    const createdAt = now();
    const result = await this.db.prepare(`INSERT INTO uploads(name,stored_name,mime,size,content_hash,url,storage,storage_name,created_at) VALUES(?,?,?,?,?,?,?,?,?)`).bind(item.name, item.storedName, item.mime, item.size, item.hash, item.url, item.storage, item.storageName, createdAt).run();
    return mapUpload({
      id: result.meta.last_row_id || 0,
      name: item.name,
      stored_name: item.storedName,
      mime: item.mime,
      size: item.size,
      url: item.url,
      storage: item.storage,
      storage_name: item.storageName,
      created_at: createdAt
    });
  }
  async deleteUpload(id) {
    const row = await this.db.prepare(`SELECT stored_name,storage FROM uploads WHERE id=?`).bind(id).first();
    if (!row) fail(404, "\u6587\u4EF6\u4E0D\u5B58\u5728");
    await this.db.prepare(`DELETE FROM uploads WHERE id=?`).bind(id).run();
    return row;
  }
  async webdavConfig() {
    const [url, username, password, publicBase, storageName, target] = await Promise.all([
      this.settingValue("webdav_url"),
      this.settingValue("webdav_username"),
      this.settingValue("webdav_password"),
      this.settingValue("webdav_public_base"),
      this.settingValue("webdav_storage_name"),
      this.settingValue("upload_target")
    ]);
    return {
      url,
      username,
      password,
      publicBase,
      storageName: storageName || "WebDAV",
      target: target === "webdav" ? "webdav" : "local"
    };
  }
  async saveWebDAVConfig(cfg, updatePassword) {
    const values = [
      ["webdav_url", cfg.url.trim()],
      ["webdav_username", cfg.username.trim()],
      ["webdav_public_base", cfg.publicBase.trim().replace(/\/+$/, "")],
      ["webdav_storage_name", cfg.storageName.trim()],
      ["upload_target", cfg.target.trim() || "local"]
    ];
    if (updatePassword) values.push(["webdav_password", (cfg.password || "").trim()]);
    await this.db.batch(
      values.map(
        ([key, value]) => this.db.prepare(`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).bind(key, value)
      )
    );
  }
  async adminCredentials() {
    return this.db.prepare(`SELECT username, password_hash as passwordHash FROM admin_accounts WHERE id=1`).first();
  }
  async setAdminCredentials(username, passwordHash) {
    const result = await this.db.prepare(`UPDATE admin_accounts SET username=?, password_hash=?, updated_at=? WHERE id=1`).bind(username, passwordHash, now()).run();
    if (!result.meta.changes) fail(500, "\u7BA1\u7406\u5458\u8D26\u53F7\u4E0D\u5B58\u5728");
  }
  async dump() {
    const tables = ["articles", "categories", "tags", "projects", "settings", "users", "sessions", "comments", "uploads", "admin_accounts"];
    const dump = {};
    for (const table of tables) {
      dump[table] = (await this.db.prepare(`SELECT * FROM ${table}`).all()).results;
    }
    return dump;
  }
};
function mapArticle(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    markdown: row.markdown,
    category: row.category,
    tags: readStrings(row.tags_json),
    status: row.status,
    date: row.date,
    readingMinutes: row.reading_minutes,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
__name(mapArticle, "mapArticle");
function mapProject(row) {
  let links = [];
  try {
    const parsed = JSON.parse(row.links_json || "[]");
    if (Array.isArray(parsed)) links = parsed;
  } catch {
    links = [];
  }
  const screenshots = readStrings(row.screenshots_json);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    markdown: row.markdown,
    coverUrl: row.cover_url,
    logoUrl: row.logo_url,
    screenshots: screenshots.length || !row.cover_url ? screenshots : [row.cover_url],
    siteUrl: row.site_url,
    siteLabel: row.site_label,
    repoUrl: row.repo_url,
    repoLabel: row.repo_label,
    links,
    technologies: readStrings(row.technologies_json),
    status: row.status,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
__name(mapProject, "mapProject");
function mapComment(row) {
  return {
    id: row.id,
    articleId: row.article_id,
    articleSlug: row.article_slug,
    user: { id: row.user_id, githubId: row.github_id, login: row.login, name: row.name, avatarUrl: row.avatar_url, role: row.role },
    body: row.body,
    status: row.status,
    createdAt: row.created_at
  };
}
__name(mapComment, "mapComment");
function mapUpload(row) {
  const storage = row.storage === "webdav" ? "webdav" : "local";
  return {
    id: row.id,
    name: row.name,
    storedName: row.stored_name,
    url: row.url || `/api/uploads/${row.stored_name}`,
    mime: row.mime,
    size: row.size,
    storage,
    storageName: row.storage_name || (storage === "webdav" ? "WebDAV" : "\u672C\u5730"),
    createdAt: row.created_at
  };
}
__name(mapUpload, "mapUpload");
function runeLen(value) {
  return [...value].length;
}
__name(runeLen, "runeLen");

// worker/src/seed.ts
var articleWhy = `## \u4E00\u4E2A\u5C5E\u4E8E\u81EA\u5DF1\u7684\u7A7A\u95F4

\u793E\u4EA4\u5E73\u53F0\u9002\u5408\u5206\u4EAB\u5F53\u4E0B\uFF0C\u4F46\u4E00\u6761\u5185\u5BB9\u5F88\u5FEB\u5C31\u4F1A\u88AB\u4E0B\u4E00\u6761\u63A8\u8D70\u3002\u6211\u60F3\u8981\u4E00\u4E2A\u66F4\u5B89\u9759\u7684\u5730\u65B9\uFF0C\u628A\u5B66\u5230\u7684\u4E1C\u897F\u3001\u505A\u8FC7\u7684\u5C1D\u8BD5\u548C\u751F\u6D3B\u91CC\u7684\u89C2\u5BDF\u653E\u5728\u4E00\u8D77\u3002

\u4E2A\u4EBA\u7F51\u7AD9\u7684\u597D\u5904\u662F\u53EF\u4EE5\u81EA\u5DF1\u51B3\u5B9A\u987A\u5E8F\u3002\u4E00\u7BC7\u6587\u7AE0\u53EF\u4EE5\u4ECE\u95EE\u9898\u5199\u8D77\uFF0C\u63A5\u7740\u8BB0\u5F55\u5C1D\u8BD5\u3001\u7ED3\u679C\u548C\u540E\u6765\u6539\u53D8\u7684\u60F3\u6CD5\uFF1B\u4E00\u4E2A\u9879\u76EE\u4E5F\u80FD\u628A\u622A\u56FE\u3001\u4EE3\u7801\u548C\u8E29\u8FC7\u7684\u5751\u653E\u5728\u540C\u4E00\u5904\u3002\u8FC7\u4E00\u6BB5\u65F6\u95F4\u518D\u56DE\u5934\u770B\uFF0C\u4ECD\u7136\u80FD\u627E\u5230\u5F53\u65F6\u4E3A\u4EC0\u4E48\u90A3\u6837\u505A\u3002

## \u4ECE\u7B80\u5355\u7684\u7248\u672C\u5F00\u59CB

\u8FD9\u4E2A\u7F51\u7AD9\u4E0D\u9700\u8981\u4E00\u5F00\u59CB\u5C31\u5F88\u5B8C\u6574\u3002\u5148\u5199\u4E0B\u4E00\u7BC7\u77ED\u6587\uFF0C\u653E\u4E0A\u4E00\u4E2A\u5C0F\u9879\u76EE\uFF0C\u518D\u6162\u6162\u8C03\u6574\u6392\u7248\u548C\u4EA4\u4E92\u3002\u6BCF\u4E00\u6B21\u66F4\u65B0\uFF0C\u90FD\u4F1A\u8BA9\u5B83\u66F4\u50CF\u6211\u81EA\u5DF1\u3002

\u6700\u5F00\u59CB\u6211\u53EA\u9700\u8981\u51E0\u4E2A\u6E05\u695A\u7684\u5165\u53E3\uFF1A\u6587\u7AE0\u7528\u6765\u6574\u7406\u601D\u8DEF\uFF0C\u9879\u76EE\u7528\u6765\u5C55\u793A\u505A\u8FC7\u7684\u4E8B\uFF0C\u5173\u4E8E\u9875\u8BF4\u660E\u6211\u662F\u8C01\u3002\u6CA1\u6709\u5185\u5BB9\u7684\u529F\u80FD\u5148\u4E0D\u52A0\u3002\u8FD9\u6837\u6BCF\u4E2A\u9875\u9762\u90FD\u6709\u660E\u786E\u7528\u9014\uFF0C\u4E5F\u4E0D\u4F1A\u4E3A\u4E86\u586B\u6EE1\u7248\u9762\u5199\u4E00\u4E9B\u81EA\u5DF1\u4EE5\u540E\u4E0D\u4F1A\u518D\u8BFB\u7684\u6587\u5B57\u3002

\u5B8C\u6210\u7B2C\u4E00\u7248\u4E4B\u540E\uFF0C\u6211\u4F1A\u7528\u81EA\u5DF1\u7684\u7535\u8111\u548C\u624B\u673A\u91CD\u65B0\u8D70\u4E00\u904D\u9605\u8BFB\u6D41\u7A0B\uFF1A\u6807\u9898\u80FD\u4E0D\u80FD\u770B\u6E05\u3001\u957F\u6BB5\u843D\u4F1A\u4E0D\u4F1A\u592A\u6324\u3001\u4EE3\u7801\u80FD\u4E0D\u80FD\u65B9\u4FBF\u5730\u590D\u5236\u3002\u8FD9\u4E9B\u5C0F\u68C0\u67E5\u6BD4\u4E00\u6B21\u6027\u5806\u5F88\u591A\u6548\u679C\u66F4\u80FD\u6539\u5584\u5B9E\u9645\u4F53\u9A8C\u3002

## \u8BA9\u5185\u5BB9\u51B3\u5B9A\u4E0B\u4E00\u6B65

\u5982\u679C\u4F60\u4E5F\u6B63\u5728\u642D\u5EFA\u81EA\u5DF1\u7684\u7A7A\u95F4\uFF0C\u4E0D\u59A8\u5148\u53D1\u5E03\u4E00\u4E2A\u7B80\u5355\u7684\u7248\u672C\u3002\u771F\u5B9E\u7684\u5185\u5BB9\u4F1A\u544A\u8BC9\u4F60\uFF0C\u4E0B\u4E00\u6B65\u5E94\u8BE5\u6539\u54EA\u91CC\u3002

\u4E5F\u8BB8\u5199\u5230\u7B2C\u4E09\u7BC7\u7B14\u8BB0\u65F6\uFF0C\u624D\u53D1\u73B0\u9700\u8981\u5206\u7C7B\uFF1B\u4E5F\u8BB8\u9879\u76EE\u591A\u8D77\u6765\u4EE5\u540E\uFF0C\u624D\u9700\u8981\u7B5B\u9009\u3002\u5148\u8BA9\u5185\u5BB9\u957F\u51FA\u6765\uFF0C\u518D\u6309\u5B9E\u9645\u9700\u8981\u6574\u7406\u7ED3\u6784\uFF0C\u7F51\u7AD9\u5C31\u4F1A\u968F\u7740\u4F7F\u7528\u6162\u6162\u53D8\u5F97\u5B8C\u6574\u3002`;
var articleTheme = `## \u4E3A\u4EC0\u4E48\u4FDD\u5B58\u4E3B\u9898

\u65E5\u591C\u4E3B\u9898\u5207\u6362\u4E0D\u53EA\u662F\u6309\u94AE\u72B6\u6001\u3002\u7528\u6237\u9009\u8FC7\u4E00\u6B21\u4E4B\u540E\uFF0C\u4E0B\u6B21\u6253\u5F00\u9875\u9762\u65F6\uFF0C\u7F51\u7AD9\u5E94\u8BE5\u5C3D\u91CF\u6CBF\u7528\u8FD9\u4E2A\u9009\u62E9\u3002\u6D4F\u89C8\u5668\u7684 localStorage \u53EF\u4EE5\u5B8C\u6210\u8FD9\u4E2A\u7EAF\u524D\u7AEF\u9700\u6C42\u3002

\u4FDD\u5B58\u7684\u503C\u6700\u597D\u4FDD\u6301\u7B80\u5355\uFF0C\u4F8B\u5982\u53EA\u5B58 light \u6216 dark\u3002\u8BFB\u53D6\u65F6\u8981\u68C0\u67E5\u503C\u662F\u5426\u6709\u6548\uFF0C\u4E0D\u8981\u628A\u4EFB\u610F\u5B57\u7B26\u4E32\u76F4\u63A5\u5F53\u4F5C\u4E3B\u9898\u4F7F\u7528\uFF1B\u6CA1\u6709\u4FDD\u5B58\u8BB0\u5F55\u65F6\uFF0C\u518D\u51B3\u5B9A\u4F7F\u7528\u9ED8\u8BA4\u4E3B\u9898\u8FD8\u662F\u7CFB\u7EDF\u504F\u597D\u3002

## \u8BFB\u53D6\u548C\u4FDD\u5B58\u504F\u597D

\u4E0B\u9762\u628A\u8BFB\u53D6\u548C\u5199\u5165\u5206\u522B\u653E\u8FDB\u51FD\u6570\u91CC\u3002\u5207\u6362\u6309\u94AE\u53EA\u8D1F\u8D23\u8C03\u7528 saveTheme\uFF0C\u9875\u9762\u521D\u59CB\u5316\u65F6\u8C03\u7528 readTheme\uFF0C\u72B6\u6001\u6765\u6E90\u5C31\u6BD4\u8F83\u6E05\u695A\u3002

\`\`\`typescript
type Theme = "light" | "dark"

export function readTheme(): Theme {
  return localStorage.getItem("theme") === "dark" ? "dark" : "light"
}

export function saveTheme(theme: Theme) {
  localStorage.setItem("theme", theme)
  document.documentElement.classList.toggle("dark", theme === "dark")
}
\`\`\`

## \u907F\u514D\u5237\u65B0\u65F6\u95EA\u70C1

\u5982\u679C\u7B49 React \u5B8C\u6210\u6E32\u67D3\u540E\u624D\u8BBE\u7F6E dark class\uFF0C\u9875\u9762\u53EF\u80FD\u5148\u4EE5\u6D45\u8272\u51FA\u73B0\uFF0C\u518D\u8DF3\u5230\u6DF1\u8272\u3002\u521D\u59CB\u5316\u4E3B\u9898\u7684\u4EE3\u7801\u53EF\u4EE5\u5C3D\u91CF\u63D0\u524D\u6267\u884C\uFF0C\u5E76\u8BA9\u521D\u59CB\u754C\u9762\u4E0E\u6839\u5143\u7D20\u4E0A\u7684 class \u4FDD\u6301\u4E00\u81F4\u3002

## \u8BA9\u624B\u52A8\u9009\u62E9\u4F18\u5148

\u521D\u59CB\u5316\u65F6\u8BFB\u53D6\u504F\u597D\uFF0C\u5207\u6362\u65F6\u5199\u56DE\u5B58\u50A8\u5E76\u66F4\u65B0\u6839\u5143\u7D20\u7684 class\u3002\u82E5\u5E0C\u671B\u9996\u6B21\u8BBF\u95EE\u8DDF\u968F\u7CFB\u7EDF\u4E3B\u9898\uFF0C\u8FD8\u53EF\u4EE5\u7ED3\u5408 prefers-color-scheme\uFF1B\u8BB0\u5F97\u8BA9\u7528\u6237\u7684\u624B\u52A8\u9009\u62E9\u4F18\u5148\u3002

## \u591A\u4E2A\u6807\u7B7E\u9875\u540C\u6B65

\u5982\u679C\u540C\u4E00\u7AD9\u70B9\u5728\u4E24\u4E2A\u6807\u7B7E\u9875\u6253\u5F00\uFF0C\u5728\u5176\u4E2D\u4E00\u4E2A\u6807\u7B7E\u9875\u4FEE\u6539 localStorage\uFF0C\u53E6\u4E00\u4E2A\u6807\u7B7E\u9875\u4F1A\u6536\u5230 storage \u4E8B\u4EF6\u3002

\`\`\`typescript
window.addEventListener("storage", (event) => {
  if (event.key !== "theme") return
  document.documentElement.classList.toggle("dark", event.newValue === "dark")
})
\`\`\``;
async function ensureSeed(store) {
  await ensureUploadColumns(store);
  const settingsCount = await store.db.prepare(`SELECT count(*) as n FROM settings`).first();
  if (!settingsCount?.n) {
    await store.saveSettings({
      siteName: "QianQiu-MySelf",
      siteDescription: "\u5199\u4E0B\u601D\u8003\uFF0C\u7559\u4E0B\u4F5C\u54C1\u3002\u8BA9\u90A3\u4E9B\u503C\u5F97\u8BB0\u4F4F\u7684\u77AC\u95F4\uFF0C\u5728\u8FD9\u91CC\u6162\u6162\u751F\u957F\u3002",
      aboutIntro: "\u4F60\u597D\uFF0C\u8FD9\u91CC\u662F QianQiu-MySelf\u3002\u6211\u7528\u8FD9\u4E2A\u7A7A\u95F4\u8BB0\u5F55\u601D\u8003\u3001\u5206\u4EAB\u5B9E\u8DF5\uFF0C\u4E5F\u4FDD\u5B58\u4E00\u8DEF\u8D70\u6765\u7684\u53D8\u5316\u3002",
      githubUsername: "yyy887"
    });
  }
  const categoryCount = await store.db.prepare(`SELECT count(*) as n FROM categories`).first();
  if (!categoryCount?.n) {
    for (const item of [
      { slug: "essays", name: "\u968F\u7B14", description: "\u8BB0\u5F55\u65E5\u5E38\u91CC\u503C\u5F97\u505C\u4E0B\u6765\u60F3\u4E00\u60F3\u7684\u77AC\u95F4\u3002" },
      { slug: "notes", name: "\u7B14\u8BB0", description: "\u628A\u65B0\u7684\u53D1\u73B0\u6574\u7406\u6210\u6E05\u6670\u3001\u53EF\u56DE\u770B\u7684\u6587\u5B57\u3002" },
      { slug: "practice", name: "\u5B9E\u8DF5", description: "\u5206\u4EAB\u4ECE\u4E00\u4E2A\u60F3\u6CD5\u5230\u4E00\u6B21\u5C1D\u8BD5\u7684\u8FC7\u7A0B\u3002" }
    ]) {
      await store.saveCategory({ id: 0, ...item });
    }
  }
  const articleCount = await store.db.prepare(`SELECT count(*) as n FROM articles`).first();
  if (!articleCount?.n) {
    await store.saveArticle({
      id: 0,
      slug: "why-a-personal-site",
      category: "essays",
      title: "\u4E3A\u4EC0\u4E48\u60F3\u505A\u4E00\u4E2A\u4E2A\u4EBA\u7F51\u7AD9",
      summary: "\u7ED9\u60F3\u6CD5\u548C\u4F5C\u54C1\u7559\u4E00\u4E2A\u80FD\u6162\u6162\u751F\u957F\u7684\u5730\u65B9\u3002",
      date: "2026-10-22",
      readingMinutes: 4,
      status: "published",
      markdown: articleWhy,
      tags: [],
      sortOrder: 0,
      createdAt: "",
      updatedAt: ""
    });
    await store.saveArticle({
      id: 0,
      slug: "remember-theme-with-localstorage",
      category: "notes",
      title: "\u7528 localStorage \u8BB0\u4F4F\u65E5\u591C\u4E3B\u9898",
      summary: "\u4E00\u4E2A\u5C0F\u5C0F\u7684\u504F\u597D\uFF0C\u4E5F\u503C\u5F97\u5728\u4E0B\u6B21\u8BBF\u95EE\u65F6\u88AB\u4FDD\u7559\u3002",
      date: "2026-10-22",
      readingMinutes: 5,
      status: "published",
      markdown: articleTheme,
      tags: [],
      sortOrder: 0,
      createdAt: "",
      updatedAt: ""
    });
  }
  const projectCount = await store.db.prepare(`SELECT count(*) as n FROM projects`).first();
  if (!projectCount?.n) {
    await store.saveProject({
      id: 0,
      slug: "qianqiu-myself",
      title: "QianQiu-MySelf",
      summary: "\u4E00\u4E2A\u7528\u6765\u5199\u6587\u7AE0\u3001\u6574\u7406\u9879\u76EE\u548C\u8BB0\u5F55\u65E5\u5E38\u63A2\u7D22\u7684\u4E2A\u4EBA\u7A7A\u95F4\u3002",
      markdown: "\u4ECE\u9996\u5C4F\u7684\u70B9\u9635\u6D9F\u6F2A\uFF0C\u5230\u6587\u7AE0\u9605\u8BFB\u9875\u7684\u4FA7\u8FB9\u76EE\u5F55\uFF0C\u90FD\u56F4\u7ED5\u8F7B\u677E\u9605\u8BFB\u6765\u8BBE\u8BA1\u3002\n\n\u535A\u5BA2\u652F\u6301\u7AE0\u8282\u76EE\u5F55\u3001\u4EE3\u7801\u9AD8\u4EAE\u548C\u5206\u7C7B\u6D4F\u89C8\uFF0C\u8BA9\u6587\u5B57\u548C\u5B9E\u8DF5\u653E\u5728\u540C\u4E00\u4E2A\u5730\u65B9\u3002",
      coverUrl: "/projects/qianqiu-myself/home.png",
      logoUrl: "",
      screenshots: [],
      siteUrl: "/",
      siteLabel: "",
      repoUrl: "",
      repoLabel: "",
      links: [],
      technologies: ["React", "TypeScript", "Tailwind CSS", "shadcn/ui"],
      status: "published",
      sortOrder: 0,
      createdAt: "",
      updatedAt: ""
    });
  }
  const adminCount = await store.db.prepare(`SELECT count(*) as n FROM admin_accounts`).first();
  if (!adminCount?.n) {
    const stamp = now();
    await store.db.prepare(`INSERT INTO admin_accounts(id, username, password_hash, created_at, updated_at) VALUES(1, ?, ?, ?, ?)`).bind("admin", await hashPassword("qianqiu123"), stamp, stamp).run();
  }
  await store.db.prepare(`UPDATE users SET role='reader' WHERE github_id != -1`).run();
}
__name(ensureSeed, "ensureSeed");
async function ensureUploadColumns(store) {
  const cols = await store.db.prepare(`PRAGMA table_info(uploads)`).all();
  const names = new Set((cols.results || []).map((item) => item.name));
  for (const [name, definition] of [
    ["url", "TEXT NOT NULL DEFAULT ''"],
    ["storage", "TEXT NOT NULL DEFAULT 'local'"],
    ["storage_name", "TEXT NOT NULL DEFAULT ''"]
  ]) {
    if (!names.has(name)) await store.db.prepare(`ALTER TABLE uploads ADD COLUMN ${name} ${definition}`).run();
  }
}
__name(ensureUploadColumns, "ensureUploadColumns");

// worker/src/webdav.ts
function webdavReady(cfg) {
  return Boolean(cfg.url.trim() && cfg.username.trim() && cfg.password.trim());
}
__name(webdavReady, "webdavReady");
function webdavLabel(cfg) {
  return cfg.storageName.trim() || "WebDAV";
}
__name(webdavLabel, "webdavLabel");
function webdavObjectURL(cfg, stored) {
  return `${cfg.url.replace(/\/+$/, "")}/${stored}`;
}
__name(webdavObjectURL, "webdavObjectURL");
function webdavPublicURL(cfg, stored) {
  const base = cfg.publicBase.replace(/\/+$/, "");
  return base ? `${base}/${stored}` : `/api/uploads/${stored}`;
}
__name(webdavPublicURL, "webdavPublicURL");
function validWebDAVEndpoint(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.host) && !url.username;
  } catch {
    return false;
  }
}
__name(validWebDAVEndpoint, "validWebDAVEndpoint");
function authHeader(cfg) {
  return `Basic ${btoa(`${cfg.username}:${cfg.password}`)}`;
}
__name(authHeader, "authHeader");
async function webdavFetch(cfg, method, url, init) {
  return fetch(url, {
    ...init,
    method,
    headers: {
      Authorization: authHeader(cfg),
      "User-Agent": "QianQiu-MySelf",
      ...init?.headers || {}
    }
  });
}
__name(webdavFetch, "webdavFetch");
async function webdavPut(cfg, stored, contentType, data) {
  const url = webdavObjectURL(cfg, stored);
  let response = await webdavFetch(cfg, "PUT", url, { headers: { "Content-Type": contentType }, body: data });
  if (response.status === 401) fail(502, "WebDAV \u8D26\u53F7\u6216\u5BC6\u7801\u9519\u8BEF");
  if (response.status === 404 || response.status === 409) {
    await webdavMkcol(cfg);
    response = await webdavFetch(cfg, "PUT", url, { headers: { "Content-Type": contentType }, body: data });
  }
  if (response.status < 200 || response.status >= 300) fail(502, `WebDAV \u4E0A\u4F20\u5931\u8D25\uFF08${response.status}\uFF09`);
}
__name(webdavPut, "webdavPut");
async function webdavMkcol(cfg) {
  const response = await webdavFetch(cfg, "MKCOL", cfg.url.replace(/\/+$/, ""));
  if (response.status === 401) fail(502, "WebDAV \u8D26\u53F7\u6216\u5BC6\u7801\u9519\u8BEF");
}
__name(webdavMkcol, "webdavMkcol");
async function webdavDelete(cfg, stored) {
  const response = await webdavFetch(cfg, "DELETE", webdavObjectURL(cfg, stored));
  if (response.status === 404) return;
  if (response.status === 401) fail(502, "WebDAV \u8D26\u53F7\u6216\u5BC6\u7801\u9519\u8BEF");
  if (response.status < 200 || response.status >= 300) fail(502, `WebDAV \u5220\u9664\u5931\u8D25\uFF08${response.status}\uFF09`);
}
__name(webdavDelete, "webdavDelete");
async function webdavGet(cfg, stored) {
  const response = await webdavFetch(cfg, "GET", webdavObjectURL(cfg, stored));
  if (response.status === 404) return null;
  if (response.status === 401) fail(502, "WebDAV \u8D26\u53F7\u6216\u5BC6\u7801\u9519\u8BEF");
  if (!response.ok) fail(502, `WebDAV \u8BFB\u53D6\u5931\u8D25\uFF08${response.status}\uFF09`);
  return response;
}
__name(webdavGet, "webdavGet");
async function webdavProbe(cfg) {
  const response = await webdavFetch(cfg, "PROPFIND", cfg.url.replace(/\/+$/, ""), { headers: { Depth: "0" } });
  if (response.status === 401) fail(502, "WebDAV \u8D26\u53F7\u6216\u5BC6\u7801\u9519\u8BEF");
  if (response.status === 405 || response.status === 404) {
    await webdavPut(cfg, ".qianqiu-webdav-check", "text/plain", new TextEncoder().encode("ok"));
    await webdavDelete(cfg, ".qianqiu-webdav-check");
    return;
  }
  if (response.status < 200 || response.status >= 300) fail(502, `WebDAV \u63A2\u6D4B\u5931\u8D25\uFF08${response.status}\uFF09`);
}
__name(webdavProbe, "webdavProbe");

// worker/src/index.ts
var app = new Hono3();
var githubPathPart = /^[A-Za-z0-9_.-]{1,100}$/;
var backupName = /^site-\d{8}-\d{6}-[0-9a-f]{8}\.json$/;
var maxUpload = 50 * 1024 * 1024;
app.use("/api/*", async (c, next) => {
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  const method = c.req.method;
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS" && !sameOrigin(c.req.header("Origin"), publicURL(c), new URL(c.req.url).host)) {
    return c.text("invalid origin", 403);
  }
  await ensureSeed(Store.from(c.env));
  await next();
});
app.onError((error, c) => {
  const mapped = mapError(error);
  if (!(error instanceof HttpError)) console.error(error);
  return c.json({ error: mapped.message }, mapped.status);
});
app.get("/api/health", (c) => c.json({ ok: true }));
app.get("/api/content", async (c) => {
  const store = Store.from(c.env);
  const [articles, categories, tags, projects, settings] = await Promise.all([
    store.articles(false),
    store.categories(),
    store.tags(),
    store.projects(false),
    store.settings()
  ]);
  return c.json({ articles, categories, tags, projects, settings });
});
app.get("/api/articles/:slug", async (c) => c.json(await Store.from(c.env).articleBySlug(c.req.param("slug"))));
app.get("/api/github/profile", (c) => githubJSON(c, (name) => `https://api.github.com/users/${encodeURIComponent(name)}`, 15));
app.get("/api/github/repositories", (c) => githubJSON(c, (name) => `https://api.github.com/users/${encodeURIComponent(name)}/repos?sort=updated&per_page=4`, 15));
app.get("/api/github/contributions", (c) => githubJSON(c, (name) => `https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(name)}?y=last`, 60));
app.get("/api/github/repository", async (c) => {
  const owner = c.req.query("owner") || "";
  const repo = c.req.query("repo") || "";
  if (!githubPathPart.test(owner) || !githubPathPart.test(repo) || owner === "." || owner === ".." || repo === "." || repo === "..") fail(400, "\u65E0\u6548\u7684 GitHub \u4ED3\u5E93\u5730\u5740");
  return c.json(await githubGet(c, `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, 15));
});
app.get("/api/link-preview", async (c) => {
  const raw2 = (c.req.query("url") || "").trim();
  let target;
  try {
    target = new URL(raw2);
  } catch {
    fail(400, "\u65E0\u6548\u94FE\u63A5");
  }
  if (target.protocol !== "http:" && target.protocol !== "https:" || !target.hostname.includes(".")) fail(400, "\u65E0\u6548\u94FE\u63A5");
  if (blockedPreviewHost(target.hostname)) fail(400, "\u4E0D\u652F\u6301\u7684\u94FE\u63A5");
  return c.json(await fetchLinkPreview(target));
});
app.get("/api/comments", async (c) => {
  const slug = c.req.query("article") || "";
  if (!slug) fail(400, "\u7F3A\u5C11\u6587\u7AE0 slug");
  return c.json(await Store.from(c.env).comments(slug, false));
});
app.post("/api/comments", requireUser, async (c) => {
  const body = await c.req.json();
  const text = (body.body || "").trim();
  if (runeCount(text) < 2 || runeCount(text) > 2e3) fail(400, "\u8BC4\u8BBA\u9700\u4E3A 2\u20132000 \u5B57");
  const user = c.get("user");
  return c.json(await Store.from(c.env).addComment(body.articleSlug || "", user.id, text, user), 201);
});
app.get("/api/auth/me", async (c) => {
  const { clientId, clientSecret } = await resolvedOAuth(c);
  const user = await currentUser(c);
  return c.json({ user, oauthEnabled: Boolean(clientId && clientSecret) });
});
app.post("/api/auth/admin/login", async (c) => {
  const body = await c.req.json();
  const username = (body.username || "").trim();
  const store = Store.from(c.env);
  const account = await store.adminCredentials();
  if (!account || !username || !body.password || username.toLowerCase() !== account.username.toLowerCase() || !await verifyPassword(body.password, account.passwordHash)) {
    fail(401, "\u8D26\u53F7\u6216\u5BC6\u7801\u9519\u8BEF");
  }
  const user = await store.upsertUser({ githubId: PASSWORD_ADMIN_GITHUB_ID, login: account.username, name: account.username, avatarUrl: "", role: "admin" });
  await setSession(c, user.id);
  return c.json({ user });
});
app.get("/api/auth/github/start", async (c) => {
  const { clientId, clientSecret } = await resolvedOAuth(c);
  if (!clientId || !clientSecret || !publicURL(c)) fail(503, "\u5C1A\u672A\u914D\u7F6E GitHub OAuth");
  const state = await randomHex(32);
  const secure = publicURL(c).startsWith("https://");
  setCookie(c, "qianqiu_oauth_state", state, { path: "/api/auth/github/callback", maxAge: 600, httpOnly: true, secure, sameSite: "Lax" });
  setCookie(c, "qianqiu_oauth_return", encodeURIComponent(safeReturnTo(c.req.query("returnTo") || "/")), { path: "/api/auth/github/callback", maxAge: 600, httpOnly: true, secure, sameSite: "Lax" });
  const q = new URLSearchParams({ client_id: clientId, redirect_uri: callbackURL(c), state });
  return c.redirect(`https://github.com/login/oauth/authorize?${q}`);
});
app.get("/api/auth/github/callback", async (c) => {
  const cookie = getCookie(c, "qianqiu_oauth_state");
  const secure = publicURL(c).startsWith("https://");
  if (!cookie || cookie !== c.req.query("state")) fail(400, "GitHub \u767B\u5F55\u72B6\u6001\u65E0\u6548\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55");
  deleteCookie(c, "qianqiu_oauth_state", { path: "/api/auth/github/callback", secure, sameSite: "Lax" });
  let returnTo = "/";
  try {
    returnTo = safeReturnTo(decodeURIComponent(getCookie(c, "qianqiu_oauth_return") || "/"));
  } catch {
    returnTo = "/";
  }
  deleteCookie(c, "qianqiu_oauth_return", { path: "/api/auth/github/callback", secure, sameSite: "Lax" });
  if (c.req.query("error")) return c.redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}login=cancelled`);
  const code = c.req.query("code") || "";
  if (!code) fail(400, "GitHub \u672A\u8FD4\u56DE\u6388\u6743\u7801");
  const { clientId, clientSecret } = await resolvedOAuth(c);
  if (!clientId || !clientSecret) fail(503, "\u5C1A\u672A\u914D\u7F6E GitHub OAuth");
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackURL(c)
    })
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) fail(502, "GitHub \u6388\u6743\u5931\u8D25");
  const profileRes = await fetch("https://api.github.com/user", {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "QianQiu-MySelf" }
  });
  const profile = await profileRes.json();
  if (!profileRes.ok || !profile.id || !profile.login) fail(502, "GitHub \u7528\u6237\u8D44\u6599\u65E0\u6548");
  const user = await Store.from(c.env).upsertUser({
    githubId: profile.id,
    login: profile.login,
    name: profile.name || profile.login,
    avatarUrl: profile.avatar_url || "",
    role: "reader"
  });
  await setSession(c, user.id);
  return c.redirect(returnTo);
});
app.post("/api/auth/logout", requireUser, async (c) => {
  const token = getCookie(c, "qianqiu_session");
  if (token) await Store.from(c.env).deleteSession(await sha256Hex(token));
  deleteCookie(c, "qianqiu_session", { path: "/", secure: publicURL(c).startsWith("https://"), sameSite: "Lax" });
  return c.json({ ok: true });
});
app.get("/api/admin/content", requireAdmin, async (c) => {
  const store = Store.from(c.env);
  const [articles, categories, tags, projects, settings] = await Promise.all([
    store.articles(true),
    store.categories(),
    store.tags(),
    store.projects(true),
    store.settings()
  ]);
  return c.json({ articles, categories, tags, projects, settings });
});
app.put("/api/admin/articles/order", requireAdmin, async (c) => {
  const body = await c.req.json();
  await Store.from(c.env).reorder("articles", body.ids || []);
  return c.json({ ok: true });
});
app.put("/api/admin/projects/order", requireAdmin, async (c) => {
  const body = await c.req.json();
  await Store.from(c.env).reorder("projects", body.ids || []);
  return c.json({ ok: true });
});
app.put("/api/admin/articles", requireAdmin, async (c) => {
  const v = await c.req.json() || {};
  v.slug = cleanSlug(v.slug || "");
  if (!validSlug(v.slug) || (v.title || "").length > 200 || (v.markdown || "").length > 1e6) fail(400, "\u6587\u7AE0\u5B57\u6BB5\u65E0\u6548");
  return c.json(await Store.from(c.env).saveArticle(v));
});
app.put("/api/admin/projects", requireAdmin, async (c) => {
  const v = await c.req.json();
  v.slug = cleanSlug(v.slug || "");
  v.siteUrl = normalizeProjectURL(v.siteUrl);
  v.repoUrl = normalizeProjectURL(v.repoUrl);
  v.links = (v.links || []).map((link) => ({ label: (link.label || "").trim(), url: normalizeProjectURL(link.url) }));
  if ((v.screenshots || []).length > 30) fail(400, "\u9879\u76EE\u622A\u56FE\u8FC7\u591A");
  for (const url of v.screenshots || []) if (!validURL(url)) fail(400, "\u9879\u76EE\u622A\u56FE\u5730\u5740\u65E0\u6548");
  if ((v.videos || []).length > 20) fail(400, "\u9879\u76EE\u89C6\u9891\u8FC7\u591A");
  for (const url of v.videos || []) if (!validURL(url)) fail(400, "\u9879\u76EE\u89C6\u9891\u5730\u5740\u65E0\u6548");
  if (v.links.some((link) => !link.label || !link.url || !validURL(link.url))) fail(400, "\u9879\u76EE\u9644\u52A0\u94FE\u63A5\u65E0\u6548");
  if (!validSlug(v.slug) || (v.title || "").length > 200 || !validURL(v.coverUrl || "") || !validURL(v.logoUrl || "") || !validURL(v.siteUrl || "") || !validURL(v.repoUrl || "")) fail(400, "\u9879\u76EE\u5B57\u6BB5\u65E0\u6548");
  return c.json(await Store.from(c.env).saveProject(v));
});
app.put("/api/admin/categories", requireAdmin, async (c) => {
  const v = await c.req.json();
  v.slug = cleanSlug(v.slug || "");
  if (!validSlug(v.slug)) fail(400, "\u5206\u7C7B slug \u65E0\u6548");
  return c.json(await Store.from(c.env).saveCategory(v));
});
app.put("/api/admin/tags", requireAdmin, async (c) => {
  const v = await c.req.json();
  v.slug = cleanSlug(v.slug || "");
  if (!validSlug(v.slug)) fail(400, "\u6807\u7B7E slug \u65E0\u6548");
  return c.json(await Store.from(c.env).saveTag(v));
});
app.put("/api/admin/settings", requireAdmin, async (c) => {
  const v = await c.req.json();
  if ((v.siteName || "").length > 100 || (v.aboutIntro || "").length > 1e3 || !validGitHubLogin(v.githubUsername || "")) fail(400, "\u7AD9\u70B9\u914D\u7F6E\u65E0\u6548");
  await Store.from(c.env).saveSettings(v);
  return c.json(v);
});
app.get("/api/admin/github", requireAdmin, async (c) => c.json(await githubAuthView(c)));
app.put("/api/admin/github", requireAdmin, async (c) => {
  const body = await c.req.json();
  const clientId = (body.clientId || "").trim();
  if (clientId && !validOAuthClientID(clientId)) fail(400, "Client ID \u65E0\u6548");
  if ((body.clientSecret || "").length > 256 || (body.githubToken || "").length > 256) fail(400, "\u5BC6\u94A5\u8FC7\u957F");
  const updateSecret = Boolean(body.clearSecret) || Boolean((body.clientSecret || "").trim());
  const updateToken = Boolean(body.clearToken) || Boolean((body.githubToken || "").trim());
  await Store.from(c.env).saveGitHubAuth(
    clientId,
    body.clearSecret ? "" : body.clientSecret || "",
    body.clearToken ? "" : body.githubToken || "",
    updateSecret,
    updateToken
  );
  return c.json(await githubAuthView(c));
});
app.put("/api/admin/account", requireAdmin, async (c) => {
  const user = c.get("user");
  if (user.githubId !== PASSWORD_ADMIN_GITHUB_ID) fail(403, "\u8BF7\u4F7F\u7528\u7BA1\u7406\u5458\u8D26\u53F7\u5BC6\u7801\u767B\u5F55\u540E\u518D\u4FEE\u6539");
  const body = await c.req.json();
  const store = Store.from(c.env);
  const account = await store.adminCredentials();
  if (!account || !await verifyPassword(body.currentPassword || "", account.passwordHash)) fail(401, "\u5F53\u524D\u5BC6\u7801\u4E0D\u6B63\u786E");
  const nextUser = (body.username || "").trim() || account.username;
  if (!validAdminUsername(nextUser)) fail(400, "\u7528\u6237\u540D\u9700\u4E3A 2\u201332 \u4F4D\u5B57\u6BCD\u3001\u6570\u5B57\u3001\u4E0B\u5212\u7EBF\u6216\u77ED\u6A2A\u7EBF");
  let nextHash = account.passwordHash;
  if (body.newPassword) {
    if (runeCount(body.newPassword) < 8 || body.newPassword.length > 72) fail(400, "\u5BC6\u7801\u9700\u4E3A 8\u201372 \u4F4D");
    nextHash = await hashPassword(body.newPassword);
  }
  await store.setAdminCredentials(nextUser, nextHash);
  const saved = await store.upsertUser({ githubId: PASSWORD_ADMIN_GITHUB_ID, login: nextUser, name: nextUser, avatarUrl: "", role: "admin" });
  if (body.newPassword) {
    await store.deleteSessionsForUser(saved.id);
    await setSession(c, saved.id);
  }
  return c.json(saved);
});
for (const resource of ["articles", "projects", "categories", "tags", "comments"]) {
  app.delete(`/api/admin/${resource}/:id`, requireAdmin, async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id < 1) fail(400, "\u65E0\u6548 ID");
    await Store.from(c.env).delete(resource, id);
    return c.body(null, 204);
  });
}
app.post("/api/admin/articles/import", requireAdmin, async (c) => {
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) fail(400, "\u8BF7\u9009\u62E9 Markdown \u6587\u4EF6");
  if (!file.name.toLowerCase().endsWith(".md")) fail(400, "\u4EC5\u652F\u6301 .md \u6587\u4EF6");
  if (file.size > 1e6) fail(400, "Markdown \u6587\u4EF6\u8D85\u8FC7 1MB");
  const raw2 = await file.text();
  const item = parseMarkdownImport(raw2, file.name);
  if (!validSlug(item.slug)) item.slug = `post-${Date.now().toString(36)}`;
  return c.json(await Store.from(c.env).saveArticle(item), 201);
});
app.get("/api/admin/comments", requireAdmin, async (c) => c.json(await Store.from(c.env).allComments()));
app.put("/api/admin/comments/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) fail(400, "\u65E0\u6548 ID");
  const body = await c.req.json();
  await Store.from(c.env).setCommentStatus(id, body.status || "");
  return c.json({ ok: true });
});
app.get("/api/admin/webdav", requireAdmin, async (c) => c.json(await webdavView(c)));
app.put("/api/admin/webdav", requireAdmin, async (c) => {
  const body = await c.req.json();
  const url = (body.url || "").trim();
  const publicBase = (body.publicBase || "").trim();
  const username = (body.username || "").trim();
  const storageName = (body.storageName || "").trim();
  const target = (body.target || "local").trim();
  if (target !== "local" && target !== "webdav") fail(400, "\u5B58\u50A8\u4F4D\u7F6E\u65E0\u6548");
  if (!validWebDAVEndpoint(url) || !validWebDAVEndpoint(publicBase)) fail(400, "WebDAV \u5730\u5740\u9700\u4E3A http(s) URL");
  if (username.length > 128 || (body.password || "").length > 256 || [...storageName].length > 40) fail(400, "WebDAV \u914D\u7F6E\u65E0\u6548");
  const store = Store.from(c.env);
  const existing = await store.webdavConfig();
  const updatePassword = Boolean(body.clearPassword) || Boolean((body.password || "").trim());
  const password = body.clearPassword ? "" : (body.password || "").trim() || existing.password;
  const next = { url, username, password, publicBase, storageName, target };
  if (next.target === "webdav" && !webdavReady(next)) fail(400, "\u542F\u7528 WebDAV \u4E0A\u4F20\u524D\u8BF7\u586B\u5B8C\u6574\u5730\u5740\u3001\u7528\u6237\u540D\u548C\u5BC6\u7801");
  await store.saveWebDAVConfig(next, updatePassword);
  return c.json(await webdavView(c));
});
app.post("/api/admin/webdav/test", requireAdmin, async (c) => {
  const cfg = await Store.from(c.env).webdavConfig();
  if (!webdavReady(cfg)) fail(400, "\u8BF7\u5148\u4FDD\u5B58\u5B8C\u6574\u7684 WebDAV \u914D\u7F6E");
  await webdavProbe(cfg);
  return c.json({ ok: true, message: "WebDAV \u8FDE\u63A5\u6B63\u5E38" });
});
app.get("/api/admin/uploads", requireAdmin, async (c) => c.json(await Store.from(c.env).uploads()));
app.post("/api/admin/uploads", requireAdmin, async (c) => {
  const form = await c.req.parseBody({ all: true });
  const file = form.file;
  if (!(file instanceof File)) fail(400, "\u8BF7\u9009\u62E9\u6587\u4EF6");
  const name = file.name.split(/[/\\]/).pop() || "";
  if (!name || name === "." || name.length > 180) fail(400, "\u6587\u4EF6\u540D\u65E0\u6548");
  if (file.size > maxUpload) fail(413, "\u6587\u4EF6\u4E0D\u80FD\u8D85\u8FC7 50 MB");
  const data = new Uint8Array(await file.arrayBuffer());
  if (data.byteLength > maxUpload) fail(413, "\u6587\u4EF6\u4E0D\u80FD\u8D85\u8FC7 50 MB");
  const { mime, ext } = uploadFormat(data, name);
  const hash = await sha256Hex(data);
  const store = Store.from(c.env);
  const existing = await store.uploadByHash(hash);
  if (existing) return c.json({ ...existing, duplicate: true });
  const stored = `${await randomHex(12)}${ext}`;
  const dav = await store.webdavConfig();
  if (dav.target === "webdav" && !webdavReady(dav)) fail(503, "\u5C1A\u672A\u5B8C\u6210 WebDAV \u914D\u7F6E");
  let storage = "local";
  let storageName = "\u672C\u5730";
  let url = `/api/uploads/${stored}`;
  if (dav.target === "webdav" && webdavReady(dav)) {
    await webdavPut(dav, stored, mime, data);
    storage = "webdav";
    storageName = webdavLabel(dav);
    url = webdavPublicURL(dav, stored);
  } else {
    await c.env.UPLOADS.put(stored, data, { httpMetadata: { contentType: mime }, customMetadata: { hash, name } });
  }
  return c.json(await store.insertUpload({ name, storedName: stored, mime, size: data.byteLength, hash, url, storage, storageName }), 201);
});
app.delete("/api/admin/uploads/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id < 1) fail(400, "\u65E0\u6548\u6587\u4EF6 ID");
  const store = Store.from(c.env);
  const item = await store.deleteUpload(id);
  if (item.storage === "webdav") {
    const dav = await store.webdavConfig();
    if (webdavReady(dav)) await webdavDelete(dav, item.stored_name);
  } else {
    await c.env.UPLOADS.delete(item.stored_name);
  }
  return c.body(null, 204);
});
app.get("/api/uploads/:name", async (c) => {
  const name = c.req.param("name");
  if (name.includes("..") || name.includes("/") || name.includes("\\")) return c.notFound();
  const item = await Store.from(c.env).uploadByName(name);
  if (!item) return c.notFound();
  if (item.storage === "webdav" && /^https?:\/\//.test(item.url)) return c.redirect(item.url, 302);
  const headers = new Headers();
  headers.set("Content-Type", item.mime);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "public, max-age=3600");
  headers.set("Content-Security-Policy", item.mime === "image/svg+xml" ? "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:" : "default-src 'none'");
  if (!serveInline(item.mime)) {
    headers.set("Content-Disposition", `attachment; filename="${item.name.replace(/["\\\r\n]/g, "")}"`);
  }
  if (item.storage === "webdav") {
    const dav = await Store.from(c.env).webdavConfig();
    if (!webdavReady(dav)) return c.notFound();
    const remote = await webdavGet(dav, item.storedName);
    if (!remote?.body) return c.notFound();
    return new Response(remote.body, { headers });
  }
  const object = await c.env.UPLOADS.get(item.storedName, c.req.raw.headers.has("Range") ? { range: c.req.raw.headers } : void 0);
  if (!object) return c.notFound();
  if (object.range) {
    const size = object.size;
    let start = 0;
    let length = size;
    if ("suffix" in object.range) {
      length = object.range.suffix;
      start = Math.max(0, size - length);
    } else {
      start = object.range.offset ?? 0;
      length = object.range.length ?? Math.max(0, size - start);
    }
    const end = start + length - 1;
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    headers.set("Content-Length", String(length));
    return new Response(object.body, { status: 206, headers });
  }
  return new Response(object.body, { headers });
});
app.get("/api/admin/backups", requireAdmin, async (c) => c.json(await listBackups(c.env.UPLOADS)));
app.post("/api/admin/backups", requireAdmin, async (c) => {
  const dump = JSON.stringify(await Store.from(c.env).dump());
  const name = `site-${formatBackupStamp()}-${await randomHex(4)}.json`;
  const key = `backups/${name}`;
  await c.env.UPLOADS.put(key, dump, { httpMetadata: { contentType: "application/json" } });
  return c.json({ name, size: dump.length, createdAt: now() }, 201);
});
app.get("/api/admin/backups/:name", requireAdmin, async (c) => {
  const name = c.req.param("name");
  if (!backupName.test(name)) return c.notFound();
  const object = await c.env.UPLOADS.get(`backups/${name}`);
  if (!object) return c.notFound();
  return new Response(object.body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store"
    }
  });
});
var index_default = app;
async function requireUser(c, next) {
  const user = await currentUser(c);
  if (!user) fail(401, "\u8BF7\u5148\u4F7F\u7528 GitHub \u767B\u5F55");
  c.set("user", user);
  await next();
}
__name(requireUser, "requireUser");
async function requireAdmin(c, next) {
  const user = await currentUser(c);
  if (!user) fail(401, "\u8BF7\u5148\u767B\u5F55\u7BA1\u7406\u5458\u8D26\u53F7");
  if (user.role !== "admin" || user.githubId !== PASSWORD_ADMIN_GITHUB_ID) fail(403, "\u4EC5\u7BA1\u7406\u5458\u53EF\u4EE5\u64CD\u4F5C");
  c.set("user", user);
  await next();
}
__name(requireAdmin, "requireAdmin");
async function currentUser(c) {
  const token = getCookie(c, "qianqiu_session");
  if (!token) return null;
  return await Store.from(c.env).sessionUser(await sha256Hex(token)) || null;
}
__name(currentUser, "currentUser");
async function setSession(c, userId) {
  const secret = await randomHex(32);
  const expires = new Date(Date.now() + sessionDays(c) * 24 * 60 * 60 * 1e3);
  await Store.from(c.env).createSession(await sha256Hex(secret), userId, expires.toISOString());
  setCookie(c, "qianqiu_session", secret, { path: "/", expires, httpOnly: true, secure: publicURL(c).startsWith("https://"), sameSite: "Lax" });
}
__name(setSession, "setSession");
function safeReturnTo(value) {
  if (!value.startsWith("/") || value.startsWith("//") || /[\r\n\\]/.test(value)) return "/";
  return value;
}
__name(safeReturnTo, "safeReturnTo");
async function githubJSON(c, urlFor, minutes) {
  const settings = await Store.from(c.env).settings();
  if (!settings.githubUsername) fail(500, "\u8BFB\u53D6 GitHub \u914D\u7F6E\u5931\u8D25");
  return c.json(await githubGet(c, urlFor(settings.githubUsername), minutes));
}
__name(githubJSON, "githubJSON");
async function webdavView(c) {
  const cfg = await Store.from(c.env).webdavConfig();
  return {
    enabled: webdavReady(cfg),
    url: cfg.url,
    username: cfg.username,
    hasPassword: Boolean(cfg.password),
    publicBase: cfg.publicBase,
    storageName: webdavLabel(cfg),
    target: cfg.target
  };
}
__name(webdavView, "webdavView");
function callbackURL(c) {
  return `${publicURL(c).replace(/\/$/, "")}/api/auth/github/callback`;
}
__name(callbackURL, "callbackURL");
async function resolvedOAuth(c) {
  const stored = await Store.from(c.env).githubAuth();
  return {
    stored,
    clientId: stored.clientId || c.env.GITHUB_CLIENT_ID || "",
    clientSecret: stored.clientSecret || c.env.GITHUB_CLIENT_SECRET || "",
    token: stored.token || c.env.GITHUB_TOKEN || ""
  };
}
__name(resolvedOAuth, "resolvedOAuth");
async function githubAuthView(c) {
  const { stored, clientId, clientSecret, token } = await resolvedOAuth(c);
  return {
    clientId: stored.clientId || c.env.GITHUB_CLIENT_ID || "",
    hasSecret: Boolean(stored.clientSecret || c.env.GITHUB_CLIENT_SECRET),
    hasToken: Boolean(token),
    configured: Boolean(clientId && clientSecret),
    callbackUrl: callbackURL(c)
  };
}
__name(githubAuthView, "githubAuthView");
function validOAuthClientID(value) {
  return /^[A-Za-z0-9._-]{8,128}$/.test(value);
}
__name(validOAuthClientID, "validOAuthClientID");
async function githubGet(c, url, minutes) {
  const bust = (await Store.from(c.env).db.prepare(`SELECT value FROM settings WHERE key='github_cache_bust'`).first())?.value || "0";
  const cacheKey = new Request(`https://qianqiu.cache/${bust}/${url}`);
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached.json();
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "QianQiu-MySelf" };
  const token = (await resolvedOAuth(c)).token;
  if (token && url.startsWith("https://api.github.com/")) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { headers });
  if (!response.ok) fail(502, `GitHub \u670D\u52A1\u8FD4\u56DE ${response.status}`);
  const data = await response.json();
  const stored = new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${minutes * 60}` } });
  await caches.default.put(cacheKey, stored.clone());
  return data;
}
__name(githubGet, "githubGet");
function parseMarkdownImport(raw2, filename) {
  const item = {
    id: 0,
    slug: slugify(filename.replace(/\.md$/i, "")),
    title: "",
    summary: "",
    markdown: raw2.trim(),
    category: "",
    tags: [],
    status: "draft",
    date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
    readingMinutes: 1,
    sortOrder: 0,
    createdAt: "",
    updatedAt: ""
  };
  let lines = raw2.replace(/\r\n/g, "\n").split("\n");
  if (lines.length > 2 && lines[0].trim() === "---") {
    let end = -1;
    for (let i = 1; i < lines.length; i += 1) {
      if (lines[i].trim() === "---") {
        end = i;
        break;
      }
      const parts = lines[i].split(":");
      if (parts.length < 2) continue;
      const key = parts[0].trim();
      const value = parts.slice(1).join(":").trim().replace(/^['"]|['"]$/g, "");
      if (key === "title") item.title = value;
      if (key === "slug") item.slug = cleanSlug(value);
      if (key === "description" || key === "summary") item.summary = value;
      if (key === "category") item.category = value;
      if (key === "tags") item.tags = value.replace(/^\[|\]$/g, "").split(",").map((part) => part.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
    }
    if (end > 0) {
      lines = lines.slice(end + 1);
      item.markdown = lines.join("\n").trim();
    }
  }
  for (const line of lines) {
    const trimmed = line.trim();
    if (!item.title && trimmed.startsWith("# ")) item.title = trimmed.slice(2).trim();
    if (!item.summary && trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("```")) item.summary = trimmed;
  }
  if (!item.title) item.title = filename.replace(/\.md$/i, "");
  if (runeCount(item.summary) > 160) item.summary = [...item.summary].slice(0, 160).join("");
  return item;
}
__name(parseMarkdownImport, "parseMarkdownImport");
function originalExtension(name) {
  const match2 = name.match(/(\.[a-z0-9]{1,8})$/i);
  return match2 ? match2[1].toLowerCase() : "";
}
__name(originalExtension, "originalExtension");
function mimeFromExtension(ext) {
  const types = {
    ".html": "text/html",
    ".htm": "text/html",
    ".md": "text/plain",
    ".txt": "text/plain",
    ".json": "application/json",
    ".pdf": "application/pdf",
    ".zip": "application/zip",
    ".xml": "application/xml",
    ".css": "text/css",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".csv": "text/csv",
    ".mp4": "video/mp4",
    ".m4v": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".ogg": "audio/ogg",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  };
  return types[ext] || "";
}
__name(mimeFromExtension, "mimeFromExtension");
function serveInline(mime) {
  return mime.startsWith("image/") || mime.startsWith("video/") || mime.startsWith("audio/") || mime === "application/pdf";
}
__name(serveInline, "serveInline");
function uploadFormat(data, originalName) {
  const orig = originalExtension(originalName);
  let mime = "application/octet-stream";
  let sniffed = ".bin";
  if (isSVG(data)) {
    mime = "image/svg+xml";
    sniffed = ".svg";
  } else if (data.length >= 8 && data[0] === 137 && data[1] === 80 && data[2] === 78 && data[3] === 71) {
    mime = "image/png";
    sniffed = ".png";
  } else if (data.length >= 3 && data[0] === 255 && data[1] === 216 && data[2] === 255) {
    mime = "image/jpeg";
    sniffed = ".jpg";
  } else if (data.length >= 12 && data[0] === 82 && data[1] === 73 && data[2] === 70 && data[3] === 70 && data[8] === 87 && data[9] === 69 && data[10] === 66 && data[11] === 80) {
    mime = "image/webp";
    sniffed = ".webp";
  } else if (data.length >= 6 && data[0] === 71 && data[1] === 73 && data[2] === 70) {
    mime = "image/gif";
    sniffed = ".gif";
  } else if (data.length >= 4 && data[0] === 37 && data[1] === 80 && data[2] === 68 && data[3] === 70) {
    mime = "application/pdf";
    sniffed = ".pdf";
  } else if (data.length >= 12 && data[4] === 102 && data[5] === 116 && data[6] === 121 && data[7] === 112) {
    mime = "video/mp4";
    sniffed = ".mp4";
  } else if (isHTML(data)) {
    mime = "text/html";
    sniffed = ".html";
  } else if (isMostlyText(data)) {
    mime = "text/plain";
    sniffed = ".txt";
  }
  const ext = orig || sniffed;
  if (orig && (mime === "application/octet-stream" || mime === "text/plain")) {
    const mapped = mimeFromExtension(orig);
    if (mapped) mime = mapped;
  }
  return { mime, ext };
}
__name(uploadFormat, "uploadFormat");
function isHTML(data) {
  const text = new TextDecoder().decode(data.slice(0, 512)).replace(/^\uFEFF/, "").trim();
  return /^<!doctype html/i.test(text) || /^<html[\s>]/i.test(text);
}
__name(isHTML, "isHTML");
function isSVG(data) {
  const text = new TextDecoder().decode(data.slice(0, 2048)).replace(/^\uFEFF/, "").replace(/<\?xml[^?]*\?>/i, "").replace(/<!--[\s\S]*?-->/g, "").trim();
  return /^<svg[\s>]/i.test(text);
}
__name(isSVG, "isSVG");
function isMostlyText(data) {
  const sample = data.slice(0, 512);
  let odd = 0;
  for (const byte of sample) if (byte === 0 || byte < 9 && byte !== 10 && byte !== 13 || byte > 13 && byte < 32 && byte !== 9) odd += 1;
  return odd < sample.length / 10;
}
__name(isMostlyText, "isMostlyText");
var previewCache = /* @__PURE__ */ new Map();
function blockedPreviewHost(host) {
  const name = host.toLowerCase();
  if (name === "localhost" || name.endsWith(".localhost") || name.endsWith(".local") || name === "metadata.google.internal") return true;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.|::1$|fc|fd)/i.test(name)) return true;
  return false;
}
__name(blockedPreviewHost, "blockedPreviewHost");
function previewAttr(tag, name) {
  return new RegExp(`(?:^|\\s)${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(tag)?.[1] || "";
}
__name(previewAttr, "previewAttr");
function decodePreviewText(value) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
__name(decodePreviewText, "decodePreviewText");
function absPreviewURL(base, ref2) {
  const value = ref2.trim();
  if (!value || /^(javascript|data):/i.test(value)) return "";
  try {
    return new URL(value, base).href;
  } catch {
    return "";
  }
}
__name(absPreviewURL, "absPreviewURL");
function fallbackPreview(target) {
  const host = target.hostname.replace(/^www\./, "");
  return {
    url: target.href,
    title: target.pathname && target.pathname !== "/" ? `${host}${target.pathname}` : host,
    description: "",
    icon: `${target.origin}/favicon.ico`,
    image: "",
    siteName: target.hostname
  };
}
__name(fallbackPreview, "fallbackPreview");
async function fetchLinkPreview(target) {
  const cached = previewCache.get(target.href);
  if (cached && cached.until > Date.now()) return cached.value;
  const fallback = fallbackPreview(target);
  let preview = fallback;
  try {
    const response = await fetch(target.href, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; QianQiuPreview/1.0)", Accept: "text/html,application/xhtml+xml" }
    });
    const type = (response.headers.get("content-type") || "").toLowerCase();
    if (response.ok && (!type || type.includes("html") || type.includes("xml"))) {
      const html = (await response.text()).slice(0, 256 * 1024);
      const meta = {};
      for (const tag of html.match(/<meta\s+[^>]+>/gi) || []) {
        const key = (previewAttr(tag, "property") || previewAttr(tag, "name")).toLowerCase();
        const content = previewAttr(tag, "content");
        if (key && content) meta[key] = content;
      }
      const titleTag = decodePreviewText(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "");
      const title2 = decodePreviewText(meta["og:title"] || meta["twitter:title"] || titleTag) || fallback.title;
      let description = decodePreviewText(meta["og:description"] || meta["twitter:description"] || meta.description || "");
      if ([...description].length > 180) description = `${[...description].slice(0, 180).join("")}\u2026`;
      let icon = "";
      for (const tag of html.match(/<link\s+[^>]+>/gi) || []) {
        if (/icon|apple-touch-icon/i.test(previewAttr(tag, "rel"))) {
          icon = absPreviewURL(target, previewAttr(tag, "href"));
          if (icon) break;
        }
      }
      preview = {
        url: target.href,
        title: title2,
        description,
        icon: icon || fallback.icon,
        image: absPreviewURL(target, meta["og:image"] || meta["twitter:image"] || ""),
        siteName: decodePreviewText(meta["og:site_name"] || target.hostname)
      };
    }
  } catch {
    preview = fallback;
  }
  previewCache.set(target.href, { value: preview, until: Date.now() + 30 * 60 * 1e3 });
  return preview;
}
__name(fetchLinkPreview, "fetchLinkPreview");
async function listBackups(bucket) {
  const listed = await bucket.list({ prefix: "backups/" });
  return listed.objects.map((item) => ({ name: item.key.replace(/^backups\//, ""), size: item.size, createdAt: item.uploaded.toISOString() })).filter((item) => backupName.test(item.name)).sort((a, b) => a.name < b.name ? 1 : -1);
}
__name(listBackups, "listBackups");
function formatBackupStamp() {
  const d = /* @__PURE__ */ new Date();
  const pad = /* @__PURE__ */ __name((n) => String(n).padStart(2, "0"), "pad");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}
__name(formatBackupStamp, "formatBackupStamp");
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
