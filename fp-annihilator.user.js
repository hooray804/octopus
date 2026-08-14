// ==UserScript==
// @name         Fingerprint Annihilator
// @namespace    https://raw.githubusercontent.com/hooray804/octopus/refs/heads/main/fp-annihilator.user.js
// @version      1.2.0
// @description  많은 웹사이트와 충돌할 수 있습니다. Spoofs Hardware, Canvas, WebGL, Fonts, MediaDevices, and WebRTC securely.
// @author       hooray804 and Gemini
// @match        *://*/*
// @homepage     https://github.com/hooray804/
// @downloadURL  https://raw.githubusercontent.com/hooray804/octopus/refs/heads/main/fp-annihilator.user.js
// @updateURL    https://raw.githubusercontent.com/hooray804/octopus/refs/heads/main/fp-annihilator.user.js
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const shuffleArray = (arr) => arr.sort(() => 0.5 - Math.random());
    const randomItem = (arr) => arr[randomInt(0, arr.length - 1)];

    function generateSession() {
        const sessionSeed = Math.random();
        const chromeMajor = randomInt(120, 128);
        const chromeMinor = randomInt(6000, 6500);
        
        const primaryLang = 'ko-KR';
        const primaryLangs = ['ko-KR', 'ko'];
        const foreignLangsPool = ['en-US', 'en', 'ja-JP', 'ja', 'zh-CN', 'zh', 'es-ES', 'es', 'fr-FR', 'fr', 'de-DE', 'de'];
        const spoofedLanguages = Object.freeze([...primaryLangs, ...shuffleArray([...foreignLangsPool]).slice(0, randomInt(1, 3))]);

        const timezones = ['Asia/Seoul', 'Asia/Tokyo', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Singapore', 'Australia/Sydney'];
        const locales = ['ko-KR', 'ja-JP', 'en-US', 'en-GB', 'fr-FR', 'de-DE'];
        const selectedTimezone = randomItem(timezones);
        const selectedLocale = randomItem(locales);

        const osCpuList = ['Windows NT 10.0; Win64; x64', 'Windows NT 10.0; WOW64', 'Windows NT 10.0'];
        const selectedOsCpu = randomItem(osCpuList);

        const cores = randomItem([4, 6, 8, 12, 16, 24, 32]);
        const ram = randomItem([8, 16, 32, 64]);

        const gpuProfiles = [
            { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
            { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
            { vendor: "Google Inc. (AMD)", renderer: "ANGLE (AMD, AMD Radeon RX 7900 XTX Direct3D11 vs_5_0 ps_5_0, D3D11)" },
            { vendor: "Google Inc. (Intel)", renderer: "ANGLE (Intel, Intel(R) UHD Graphics 770 Direct3D11 vs_5_0 ps_5_0, D3D11)" }
        ];
        const selectedGPU = randomItem(gpuProfiles);

        return {
            seed: sessionSeed,
            bitNoise: Math.floor(sessionSeed * 255) + 1,
            mathJitter: (sessionSeed - 0.5) * 1e-14, 
            audioJitter: (sessionSeed - 0.5) * 0.0001,
            audioLatency: 0.0026666666666666666 + (sessionSeed * 0.001),
            chromeMajor: chromeMajor,
            userAgent: `Mozilla/5.0 (${selectedOsCpu}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeMajor}.0.${chromeMinor}.60 Safari/537.36`,
            osCpu: selectedOsCpu,
            timezone: selectedTimezone,
            locale: selectedLocale,
            cores: cores,
            ram: ram,
            languages: spoofedLanguages,
            language: primaryLang,
            gpu: selectedGPU,
            webrtcUfrag: Math.random().toString(36).substring(2, 14),
            layoutOffset: {
                w: randomInt(-30, 30),
                h: randomInt(-30, 30),
                dpr: (sessionSeed - 0.5) * 0.1,
                fontScale: 0.98 + (sessionSeed * 0.04)
            }
        };
    }

    const SESSION = generateSession();
    const S = () => SESSION;
    const infectedContexts = new WeakSet();

    const originalToString = Function.prototype.toString;
    const proxyMap = new WeakMap();

    function mockNative(targetFn, mockFn, propName = '') {
        const name = targetFn ? (targetFn.name || propName) : propName;
        const fakeStr = propName ? `function get ${name}() { [native code] }` : `function ${name}() { [native code] }`;
        proxyMap.set(mockFn, fakeStr);
        try {
            Object.defineProperty(mockFn, 'name', { value: propName ? `get ${name}` : name, configurable: true });
        } catch (e) {}
        return mockFn;
    }

    win.Function.prototype.toString = new Proxy(originalToString, {
        apply: function (target, thisArg, args) {
            try {
                if (typeof thisArg !== 'function') return Reflect.apply(target, thisArg, args);
                if (proxyMap.has(thisArg)) return proxyMap.get(thisArg);
                if (thisArg === win.Function.prototype.toString) return `function toString() { [native code] }`;
                return Reflect.apply(target, thisArg, args);
            } catch (e) {
                return `function () { [native code] }`;
            }
        }
    });
    proxyMap.set(win.Function.prototype.toString, `function toString() { [native code] }`);

    const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
    Object.getOwnPropertyDescriptor = new Proxy(originalGetOwnPropertyDescriptor, {
        apply: function(target, thisArg, args) {
            try {
                const desc = Reflect.apply(target, thisArg, args);
                if (desc && desc.get && proxyMap.has(desc.get)) {
                    desc.configurable = true; 
                    return desc; 
                }
                if (desc && desc.value && proxyMap.has(desc.value)) {
                    desc.configurable = true;
                    return desc;
                }
                return desc;
            } catch (e) {
                return undefined;
            }
        }
    });
    proxyMap.set(Object.getOwnPropertyDescriptor, `function getOwnPropertyDescriptor() { [native code] }`);

    function overrideProtoProperty(obj, prop, getterFn) {
        try {
            const mockedGetter = mockNative(function () {}, getterFn, prop);
            Object.defineProperty(obj, prop, { 
                get: mockedGetter, 
                configurable: true, 
                enumerable: true 
            });
        } catch (e) {}
    }

    function injectPayload(context) {
        if (!context || infectedContexts.has(context)) return;
        infectedContexts.add(context);

        if (context.navigator) {
            const NavProto = context.Navigator.prototype;
            
            overrideProtoProperty(NavProto, 'userAgent', () => S().userAgent);
            overrideProtoProperty(NavProto, 'appVersion', () => S().userAgent.replace("Mozilla/", ""));
            overrideProtoProperty(NavProto, 'platform', () => "Win32");
            overrideProtoProperty(NavProto, 'vendor', () => "Google Inc.");
            overrideProtoProperty(NavProto, 'maxTouchPoints', () => 0);
            overrideProtoProperty(NavProto, 'hardwareConcurrency', () => S().cores);
            overrideProtoProperty(NavProto, 'deviceMemory', () => S().ram);
            overrideProtoProperty(NavProto, 'language', () => S().language);
            overrideProtoProperty(NavProto, 'languages', () => S().languages);
            overrideProtoProperty(NavProto, 'pdfViewerEnabled', () => true);
            overrideProtoProperty(NavProto, 'cookieEnabled', () => true);
            overrideProtoProperty(NavProto, 'doNotTrack', () => randomItem([null, "1"]));
            overrideProtoProperty(NavProto, 'webdriver', () => false);

            if (!context.chrome) {
                context.chrome = { app: { isInstalled: false }, runtime: {} };
            }

            if (context.navigator.userAgentData || !context.navigator.userAgentData) {
                const realUAD = context.navigator.userAgentData;
                let mockUAD;
                
                if (realUAD && realUAD.constructor && realUAD.constructor.prototype) {
                    mockUAD = Object.create(realUAD.constructor.prototype);
                    Object.defineProperties(mockUAD, {
                        brands: { get: mockNative(function get() {}, () => [{ brand: "Chromium", version: `${S().chromeMajor}` }, { brand: "Google Chrome", version: `${S().chromeMajor}` }, { brand: "Not-A.Brand", version: "99" }], 'brands'), enumerable: true },
                        mobile: { get: mockNative(function get() {}, () => false, 'mobile'), enumerable: true },
                        platform: { get: mockNative(function get() {}, () => "Windows", 'platform'), enumerable: true }
                    });
                    mockUAD.getHighEntropyValues = mockNative(realUAD.constructor.prototype.getHighEntropyValues, function () {
                        return Promise.resolve({
                            architecture: "x86",
                            bitness: "64",
                            brands: mockUAD.brands,
                            mobile: false,
                            model: "",
                            platform: "Windows",
                            platformVersion: "15.0.0",
                            uaFullVersion: `${S().chromeMajor}.0.6367.60`
                        });
                    });
                    mockUAD.toJSON = mockNative(realUAD.constructor.prototype.toJSON, function () {
                        return { brands: mockUAD.brands, mobile: false, platform: "Windows" };
                    });
                } else {
                    mockUAD = {
                        get brands() {
                            return [
                                { brand: "Chromium", version: `${S().chromeMajor}` },
                                { brand: "Google Chrome", version: `${S().chromeMajor}` },
                                { brand: "Not-A.Brand", version: "99" }
                            ];
                        },
                        mobile: false,
                        platform: "Windows",
                        getHighEntropyValues: mockNative(function getHighEntropyValues() {}, function () {
                            return Promise.resolve({
                                architecture: "x86",
                                bitness: "64",
                                brands: this.brands,
                                mobile: false,
                                model: "",
                                platform: "Windows",
                                platformVersion: "15.0.0",
                                uaFullVersion: `${S().chromeMajor}.0.6367.60`
                            });
                        }),
                        toJSON: mockNative(function toJSON() {}, function () {
                            return { brands: this.brands, mobile: false, platform: "Windows" };
                        })
                    };
                }
                overrideProtoProperty(NavProto, 'userAgentData', () => mockUAD);
            }

            const generatePlugins = () => {
                const mimeArr = [
                    { type: "application/pdf", suffixes: "pdf", description: "Portable Document Format" },
                    { type: "text/pdf", suffixes: "pdf", description: "Portable Document Format" }
                ];
                const pluginArr = [
                    { name: "PDF Viewer", description: "Portable Document Format", filename: "internal-pdf-viewer" },
                    { name: "Chrome PDF Viewer", description: "Portable Document Format", filename: "internal-pdf-viewer" },
                    { name: "Chromium PDF Viewer", description: "Portable Document Format", filename: "internal-pdf-viewer" },
                    { name: "Microsoft Edge PDF Viewer", description: "Portable Document Format", filename: "internal-pdf-viewer" },
                    { name: "WebKit built-in PDF", description: "Portable Document Format", filename: "internal-pdf-viewer" }
                ];
                const fakePlugins = pluginArr.map(p => {
                    const plg = Object.create(context.Plugin.prototype || Object.prototype);
                    Object.assign(plg, p);
                    plg.length = mimeArr.length;
                    mimeArr.forEach((m, i) => {
                        const mime = Object.create(context.MimeType.prototype || Object.prototype);
                        Object.assign(mime, m, { enabledPlugin: plg });
                        plg[i] = mime;
                        plg[m.type] = mime;
                    });
                    return plg;
                });
                fakePlugins.item = function (i) { return this[i]; };
                fakePlugins.namedItem = function (n) { return this.find(p => p.name === n); };
                fakePlugins.refresh = function () {};
                fakePlugins[Symbol.iterator] = function* () {
                    for (let i = 0; i < this.length; i++) yield this[i];
                };
                if (context.PluginArray) Object.setPrototypeOf(fakePlugins, context.PluginArray.prototype);
                return fakePlugins;
            };
            overrideProtoProperty(NavProto, 'plugins', generatePlugins);
            overrideProtoProperty(NavProto, 'mimeTypes', () => generatePlugins()[0]);

            if (context.navigator.permissions) {
                const origQuery = context.navigator.permissions.query;
                context.navigator.permissions.query = mockNative(origQuery, function (desc) {
                    return Reflect.apply(origQuery, this, arguments).then(res => {
                        return new Proxy(res, {
                            get(target, prop) {
                                if (prop === 'state' && (desc.name === 'notifications' || desc.name === 'geolocation')) {
                                    return S().seed > 0.5 ? 'prompt' : 'denied';
                                }
                                if (typeof target[prop] === 'function') {
                                    return target[prop].bind(target);
                                }
                                return Reflect.get(target, prop);
                            }
                        });
                    });
                });
            }

            if (context.navigator.mediaDevices && context.navigator.mediaDevices.enumerateDevices) {
                const origEnum = context.navigator.mediaDevices.enumerateDevices;
                context.navigator.mediaDevices.enumerateDevices = mockNative(origEnum, function () {
                    return Reflect.apply(origEnum, this, arguments).then(devices => {
                        return devices.map(d => {
                            return new Proxy(d, {
                                get(target, prop) {
                                    if (prop === 'deviceId' && target.deviceId) {
                                        return 'dev-' + S().bitNoise + '-' + target.deviceId.slice(-10);
                                    }
                                    if (prop === 'groupId' && target.groupId) {
                                        return 'grp-' + S().bitNoise + '-' + target.groupId.slice(-10);
                                    }
                                    if (typeof target[prop] === 'function') {
                                        return target[prop].bind(target);
                                    }
                                    return Reflect.get(target, prop);
                                }
                            });
                        });
                    });
                });
            }

            if (context.navigator.getBattery) {
                const origBattery = context.navigator.getBattery;
                context.navigator.getBattery = mockNative(origBattery, function() {
                    return Reflect.apply(origBattery, this, arguments).then(b => {
                        return new Proxy(b, {
                            get(t, p) {
                                if (p === 'level') return 0.5 + (S().seed * 0.4);
                                if (p === 'charging') return S().seed > 0.5;
                                if (p === 'chargingTime') return S().seed > 0.5 ? 3600 : Infinity;
                                if (p === 'dischargingTime') return S().seed > 0.5 ? Infinity : 7200;
                                if (typeof t[p] === 'function') return t[p].bind(t);
                                return Reflect.get(t, p);
                            }
                        });
                    });
                });
            }

            if (context.navigator.bluetooth && context.navigator.bluetooth.requestDevice) {
                const origBT = context.navigator.bluetooth.requestDevice;
                context.navigator.bluetooth.requestDevice = mockNative(origBT, function() {
                    return Promise.reject(new Error("Bluetooth access denied"));
                });
            }
        }

        if (context.Screen) {
            const ScreenProto = context.Screen.prototype;
            ['width', 'height', 'availWidth', 'availHeight'].forEach(prop => {
                const desc = Object.getOwnPropertyDescriptor(ScreenProto, prop);
                if (desc && desc.get) {
                    const origGet = desc.get;
                    desc.get = mockNative(origGet, function () {
                        const realVal = Reflect.apply(origGet, this, arguments);
                        return realVal + S().layoutOffset[prop.toLowerCase().includes('width') ? 'w' : 'h'];
                    }, prop);
                    Object.defineProperty(ScreenProto, prop, desc);
                }
            });
            
            const colorDesc = Object.getOwnPropertyDescriptor(ScreenProto, 'colorDepth');
            if (colorDesc && colorDesc.get) {
                const origColorGet = colorDesc.get;
                colorDesc.get = mockNative(origColorGet, function () {
                    return 24;
                }, 'colorDepth');
                Object.defineProperty(ScreenProto, 'colorDepth', colorDesc);
                Object.defineProperty(ScreenProto, 'pixelDepth', colorDesc);
            }
        }

        ['innerWidth', 'innerHeight', 'outerWidth', 'outerHeight', 'devicePixelRatio'].forEach(prop => {
            let target = context;
            let desc = Object.getOwnPropertyDescriptor(target, prop);
            if (!desc && context.Window) {
                target = context.Window.prototype;
                desc = Object.getOwnPropertyDescriptor(target, prop);
            }
            if (desc && desc.get) {
                const origGet = desc.get;
                desc.get = mockNative(origGet, function () {
                    const val = Reflect.apply(origGet, this, arguments);
                    if (prop === 'devicePixelRatio') return val + S().layoutOffset.dpr;
                    return val + S().layoutOffset[prop.toLowerCase().includes('width') ? 'w' : 'h'];
                }, prop);
                Object.defineProperty(target, prop, desc);
            }
        });

        if (context.document && context.document.fonts) {
            const origCheck = context.document.fonts.check;
            if (origCheck) {
                context.document.fonts.check = mockNative(origCheck, function (font, text) {
                    const lowerFont = font.toLowerCase();
                    if (lowerFont.includes('arial') || lowerFont.includes('segoe') || lowerFont.includes('calibri')) return true;
                    return Reflect.apply(origCheck, this, arguments);
                });
            }
        }

        if (context.Intl && context.Intl.DateTimeFormat) {
            let realTZ = 'UTC';
            let realLocale = 'en-US';
            try {
                realTZ = new context.Intl.DateTimeFormat().resolvedOptions().timeZone;
                realLocale = new context.Intl.DateTimeFormat().resolvedOptions().locale;
            } catch (e) {}

            const origResolvedOptions = context.Intl.DateTimeFormat.prototype.resolvedOptions;
            context.Intl.DateTimeFormat.prototype.resolvedOptions = mockNative(origResolvedOptions, function () {
                const options = Reflect.apply(origResolvedOptions, this, arguments);
                if (options.timeZone === realTZ) options.timeZone = S().timezone;
                if (options.locale === realLocale) options.locale = S().locale;
                return options;
            });
        }

        if (context.Date) {
            const origGetTimezoneOffset = context.Date.prototype.getTimezoneOffset;
            context.Date.prototype.getTimezoneOffset = mockNative(origGetTimezoneOffset, function () {
                try {
                    const dateStr = new Intl.DateTimeFormat('en-US', {
                        timeZone: S().timezone,
                        timeZoneName: 'shortOffset'
                    }).format(this);
                    if (dateStr.includes('GMT') && !dateStr.includes('+') && !dateStr.includes('-')) {
                        return 0;
                    }
                    const match = dateStr.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
                    if (match) {
                        const sign = match[1] === '+' ? -1 : 1;
                        const hours = parseInt(match[2], 10);
                        const mins = match[3] ? parseInt(match[3], 10) : 0;
                        return sign * (hours * 60 + mins);
                    }
                } catch(e) {}
                return Reflect.apply(origGetTimezoneOffset, this, arguments);
            });
        }

        if (context.matchMedia) {
            const origMatchMedia = context.matchMedia;
            context.matchMedia = mockNative(origMatchMedia, function (query) {
                const q = query.toLowerCase();
                const fakeMatch = (m) => ({
                    matches: m, media: query, onchange: null,
                    addListener: () => {}, removeListener: () => {},
                    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false
                });

                if (q.includes('color-gamut: p3') || q.includes('color-gamut: rec2020')) return fakeMatch(false);
                if (q.includes('color-gamut: srgb')) return fakeMatch(true);
                if (q.includes('pointer: coarse') || q.includes('hover: none') || q.includes('any-pointer: coarse')) return fakeMatch(false);
                if (q.includes('pointer: fine') || q.includes('hover: hover') || q.includes('any-pointer: fine')) return fakeMatch(true);
                if (q.includes('inverted-colors: inverted')) return fakeMatch(false);
                if (q.includes('forced-colors: active')) return fakeMatch(false);
                if (q.includes('prefers-reduced-motion: reduce')) return fakeMatch(false);
                if (q.includes('prefers-reduced-transparency: reduce')) return fakeMatch(false);
                if (q.includes('dynamic-range: high')) return fakeMatch(true);

                return Reflect.apply(origMatchMedia, this, arguments);
            });
        }

        if (context.Math) {
            const mathFns = ['acos', 'acosh', 'asin', 'asinh', 'atan', 'atanh', 'atan2', 'cos', 'cosh', 'exp', 'expm1', 'log', 'log1p', 'log10', 'log2', 'pow', 'sin', 'sinh', 'sqrt', 'tan', 'tanh'];
            mathFns.forEach(fn => {
                if (context.Math[fn]) {
                    const origFn = context.Math[fn];
                    context.Math[fn] = mockNative(origFn, function (...args) {
                        const res = Reflect.apply(origFn, this, args);
                        if (typeof res === 'number' && !isNaN(res) && isFinite(res) && res !== 0 && res % 1 !== 0) {
                            return res + S().mathJitter;
                        }
                        return res;
                    });
                }
            });
        }

        const adBlockerSelectors = ['#Iklan-Melayang', '.quangcao', '.mainostila', '#adblock-honeypot', '.hs-sosyal', '.BetterJsPopOverlay', '.mobile_adhesion', '#mgid_iframe1', '.yb-floorad', '.ezmob-footer'];

        const manipulateFontDimension = (originalValue, isWidth, element) => {
            if (originalValue === 0) return 0;
            if (element) {
                try {
                    const id = element.id || element.getAttribute('id');
                    if (id && typeof id === 'string' && adBlockerSelectors.includes('#' + id)) return originalValue;
                    const cls = element.className || element.getAttribute('class');
                    if (cls && typeof cls === 'string' && adBlockerSelectors.some(c => ('.' + cls).includes(c))) return originalValue;
                } catch(e) {}
            }
            return originalValue * S().layoutOffset.fontScale + (isWidth ? S().mathJitter * 20 : S().mathJitter * 10);
        };

        if (context.HTMLElement) {
            const hookDOMSize = (prop, isWidth) => {
                const desc = Object.getOwnPropertyDescriptor(context.HTMLElement.prototype, prop);
                if (!desc) return;
                const origGet = desc.get;
                desc.get = mockNative(origGet, function () {
                    const origVal = Reflect.apply(origGet, this, arguments);
                    const fakeVal = manipulateFontDimension(origVal, isWidth, this);
                    return fakeVal === 0 ? 0 : Math.round(fakeVal);
                }, prop);
                Object.defineProperty(context.HTMLElement.prototype, prop, desc);
            };
            hookDOMSize('offsetWidth', true);
            hookDOMSize('offsetHeight', false);

            const origGetRect = context.Element.prototype.getBoundingClientRect;
            context.Element.prototype.getBoundingClientRect = mockNative(origGetRect, function () {
                const rect = Reflect.apply(origGetRect, this, arguments);
                if (rect.width === 0 && rect.height === 0) return rect;
                
                const fakeWidth = manipulateFontDimension(rect.width, true, this);
                const fakeHeight = manipulateFontDimension(rect.height, false, this);
                const TargetDOMRect = context.DOMRect || DOMRect;
                return new TargetDOMRect(rect.x + (S().mathJitter * 100), rect.y + (S().mathJitter * 100), fakeWidth, fakeHeight);
            });
        }

        if (context.AudioContext || context.webkitAudioContext) {
            const AudioCtx = context.AudioContext || context.webkitAudioContext;
            overrideProtoProperty(AudioCtx.prototype, 'baseLatency', () => S().audioLatency);
            overrideProtoProperty(AudioCtx.prototype, 'outputLatency', () => S().audioLatency * 2);
        }

        if (context.OfflineAudioContext || context.webkitOfflineAudioContext) {
            const OfflineCtx = context.OfflineAudioContext || context.webkitOfflineAudioContext;

            const origCreateOscillator = OfflineCtx.prototype.createOscillator;
            OfflineCtx.prototype.createOscillator = mockNative(origCreateOscillator, function () {
                const osc = Reflect.apply(origCreateOscillator, this, arguments);
                if (osc.frequency) {
                    const origSetter = Object.getOwnPropertyDescriptor(context.AudioParam.prototype, 'value').set;
                    Object.defineProperty(osc.frequency, 'value', {
                        set: function (val) { return Reflect.apply(origSetter, this, [val + (S().seed * 0.2)]); },
                        get: function () { return 10000 + (S().seed * 0.2); }
                    });
                }
                return osc;
            });

            const origCreateCompressor = OfflineCtx.prototype.createDynamicsCompressor;
            OfflineCtx.prototype.createDynamicsCompressor = mockNative(origCreateCompressor, function () {
                const comp = Reflect.apply(origCreateCompressor, this, arguments);
                if (comp.threshold) comp.threshold.value += (S().seed * 0.5); 
                if (comp.ratio) comp.ratio.value -= (S().seed * 0.2);
                return comp;
            });
        }

        if (context.AudioBuffer) {
            const origGetChannelData = context.AudioBuffer.prototype.getChannelData;
            context.AudioBuffer.prototype.getChannelData = mockNative(origGetChannelData, function () {
                const data = Reflect.apply(origGetChannelData, this, arguments);
                if (data && data.length && !data.__spoofed) {
                    for (let i = 0; i < data.length; i += 45) {
                        data[i] += S().audioJitter;
                    }
                    Object.defineProperty(data, '__spoofed', { value: true, enumerable: false, configurable: true });
                }
                return data;
            });
        }

        function noiseCanvasBuffer(bufferArray) {
            if (!bufferArray || !bufferArray.length) return;
            const skip = 4 * Math.max(1, Math.floor(bufferArray.length / (512 * 4)));
            const bit = (S().bitNoise % 2) === 0 ? 1 : 2;
            for (let i = 0; i < bufferArray.length; i += skip) {
                if (i % 4 !== 3) { 
                    if (bit === 1) {
                        bufferArray[i] = (bufferArray[i] & 254) | 1;
                    } else {
                        bufferArray[i] = (bufferArray[i] & 253) | 2;
                    }
                }
            }
        }

        if (context.CanvasRenderingContext2D) {
            const C2D = context.CanvasRenderingContext2D.prototype;

            const origIsPointInPath = C2D.isPointInPath;
            C2D.isPointInPath = mockNative(origIsPointInPath, function () {
                const res = Reflect.apply(origIsPointInPath, this, arguments);
                if (arguments[0] === 5 && arguments[1] === 5 && S().seed > 0.5) return !res;
                return res;
            });

            const origFillText = C2D.fillText;
            C2D.fillText = mockNative(origFillText, function (text, x, y, maxWidth) {
                const sX = x + (S().seed * 0.001);
                const sY = y + (S().seed * 0.001);
                return maxWidth !== undefined 
                    ? Reflect.apply(origFillText, this, [text, sX, sY, maxWidth])
                    : Reflect.apply(origFillText, this, [text, sX, sY]);
            });

            const origGetImageData = C2D.getImageData;
            C2D.getImageData = mockNative(origGetImageData, function () {
                const img = Reflect.apply(origGetImageData, this, arguments);
                noiseCanvasBuffer(img.data);
                return img;
            });

            const origMeasureText = C2D.measureText;
            C2D.measureText = mockNative(origMeasureText, function (text) {
                const metrics = Reflect.apply(origMeasureText, this, arguments);
                const fakeW = manipulateFontDimension(metrics.width, true, null);
                Object.defineProperties(metrics, {
                    width: { value: fakeW },
                    actualBoundingBoxRight: { value: (metrics.actualBoundingBoxRight || 0) + (S().seed * 0.1) }
                });
                return metrics;
            });
        }

        if (context.HTMLCanvasElement) {
            const CanvasProto = context.HTMLCanvasElement.prototype;

            const injectExportNoise = (canvas) => {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    try {
                        const img = Reflect.apply(context.CanvasRenderingContext2D.prototype.getImageData, ctx, [0, 0, Math.min(20, canvas.width || 1), Math.min(20, canvas.height || 1)]);
                        noiseCanvasBuffer(img.data);
                        Reflect.apply(context.CanvasRenderingContext2D.prototype.putImageData, ctx, [img, 0, 0]);
                    } catch (e) {}
                }
            };

            const origToDataURL = CanvasProto.toDataURL;
            CanvasProto.toDataURL = mockNative(origToDataURL, function () {
                injectExportNoise(this);
                return Reflect.apply(origToDataURL, this, arguments);
            });

            const origToBlob = CanvasProto.toBlob;
            CanvasProto.toBlob = mockNative(origToBlob, function () {
                injectExportNoise(this);
                return Reflect.apply(origToBlob, this, arguments);
            });
        }

        const spoofWebGL = (proto) => {
            if (!proto) return;
            
            const origGetParam = proto.getParameter;
            proto.getParameter = mockNative(origGetParam, function (param) {
                if (param === 37445) return S().gpu.vendor;
                if (param === 37446) return S().gpu.renderer;
                if (param === 7936) return "WebKit";
                if (param === 7937) return "WebKit WebGL";
                if (param === 34930) return 32;
                if (param === 34921) return 16;
                if (param === 35660) return 32;
                if (param === 35661) return 32;
                if (param === 3379) return 16384;
                if (param === 34076) return 16384;
                if (param === 34024) return 16384;
                if (param === 36349) return 1024;
                if (param === 36347) return 1024;
                if (param === 3386) return new Int32Array([16384, 16384]);
                if (param === 3415) return 0;
                if (param === 3414) return 24;
                
                return Reflect.apply(origGetParam, this, arguments);
            });

            if (proto.getShaderPrecisionFormat) {
                const origGetPrecision = proto.getShaderPrecisionFormat;
                proto.getShaderPrecisionFormat = mockNative(origGetPrecision, function (shaderType, precisionType) {
                    const precision = Reflect.apply(origGetPrecision, this, arguments);
                    if (precision) {
                        const isFloat = precisionType === 36336 || precisionType === 36337 || precisionType === 36338;
                        return { rangeMin: isFloat ? 127 : 31, rangeMax: isFloat ? 127 : 30, precision: isFloat ? 23 : 0 };
                    }
                    return precision;
                });
            }

            if (proto.getExtension) {
                const origGetExt = proto.getExtension;
                proto.getExtension = mockNative(origGetExt, function (name) {
                    if (name === 'WEBGL_debug_renderer_info') return { UNMASKED_VENDOR_WEBGL: 37445, UNMASKED_RENDERER_WEBGL: 37446 };
                    return Reflect.apply(origGetExt, this, arguments);
                });
            }

            if (proto.getSupportedExtensions) {
                const origGetSupportedExtensions = proto.getSupportedExtensions;
                proto.getSupportedExtensions = mockNative(origGetSupportedExtensions, function () {
                    const exts = Reflect.apply(origGetSupportedExtensions, this, arguments);
                    if (exts && Array.isArray(exts)) {
                        const blocked = ['WEBGL_polygon_mode', 'WEBGL_debug_renderer_info'];
                        if (S().seed > 0.5) blocked.push('EXT_color_buffer_half_float');
                        return exts.filter(e => !blocked.includes(e)); 
                    }
                    return exts;
                });
            }

            if (proto.readPixels) {
                const origReadPixels = proto.readPixels;
                proto.readPixels = mockNative(origReadPixels, function () {
                    Reflect.apply(origReadPixels, this, arguments);
                    const pixels = arguments[6];
                    if (pixels && pixels.length) noiseCanvasBuffer(pixels);
                });
            }
        };
        spoofWebGL(context.WebGLRenderingContext?.prototype);
        spoofWebGL(context.WebGL2RenderingContext?.prototype);

        if (context.speechSynthesis) {
            const origGetVoices = context.speechSynthesis.getVoices;
            context.speechSynthesis.getVoices = mockNative(origGetVoices, function () {
                const voices = Reflect.apply(origGetVoices, this, arguments);
                if (!voices || voices.length === 0) return voices;
                return [...voices].reverse();
            });
        }

        if (context.RTCPeerConnection) {
            const origCreateOffer = context.RTCPeerConnection.prototype.createOffer;
            context.RTCPeerConnection.prototype.createOffer = mockNative(origCreateOffer, function () {
                return Reflect.apply(origCreateOffer, this, arguments).then(offer => {
                    if (offer && offer.sdp) {
                        offer.sdp = offer.sdp.replace(/a=ice-ufrag:.+/g, 'a=ice-ufrag:' + S().webrtcUfrag);
                    }
                    return offer;
                });
            });
        }

        if (context.performance && context.performance.memory) {
            const origMemory = Object.getOwnPropertyDescriptor(context.performance.__proto__, 'memory');
            if (origMemory) {
                overrideProtoProperty(context.performance.__proto__, 'memory', () => {
                    return {
                        jsHeapSizeLimit: 4294705152 + (S().bitNoise * 1024),
                        totalJSHeapSize: 10000000,
                        usedJSHeapSize: 5000000
                    };
                });
            }
        }

        const iosPurgeList = ['ApplePaySession', 'GestureEvent', 'TouchEvent', 'DeviceMotionEvent', 'DeviceOrientationEvent', 'webkitAudioContext', 'webkitOfflineAudioContext'];
        iosPurgeList.forEach(prop => {
            if (prop in context) { try { delete context[prop]; } catch (e) {} }
        });
        ['ontouchstart', 'ontouchend', 'ontouchmove', 'ontouchcancel'].forEach(attr => {
            if (attr in context) delete context[attr];
            if (context.document && attr in context.document) delete context.document[attr];
        });
    }

    injectPayload(win);

    const origCreateElement = win.document.createElement;
    win.document.createElement = mockNative(origCreateElement, function (tagName) {
        const el = Reflect.apply(origCreateElement, this, arguments);
        if (tagName && tagName.toLowerCase() === 'iframe') {
            el.addEventListener('load', function () {
                try { if (this.contentWindow) injectPayload(this.contentWindow); } catch (e) {}
            });
        }
        return el;
    });

    if (win.HTMLIFrameElement) {
        const iframeDesc = Object.getOwnPropertyDescriptor(win.HTMLIFrameElement.prototype, 'contentWindow');
        if (iframeDesc && iframeDesc.get) {
            const origIframeGet = iframeDesc.get;
            iframeDesc.get = mockNative(origIframeGet, function () {
                const cw = Reflect.apply(origIframeGet, this, arguments);
                if (cw) {
                    try {
                        const _ = cw.document; 
                        injectPayload(cw);
                    } catch (e) {}
                }
                return cw;
            }, 'contentWindow');
            Object.defineProperty(win.HTMLIFrameElement.prototype, 'contentWindow', iframeDesc);
        }
    }

    const interceptIframeInsertion = (origMethod) => {
        return mockNative(origMethod, function (child) {
            const res = Reflect.apply(origMethod, this, arguments);
            if (child && child.tagName === 'IFRAME') {
                try {
                    if (child.contentWindow) {
                        const _ = child.contentWindow.document;
                        injectPayload(child.contentWindow);
                    }
                } catch (e) {}
            }
            return res;
        });
    };

    try {
        win.Element.prototype.appendChild = interceptIframeInsertion(win.Element.prototype.appendChild);
        win.Element.prototype.insertBefore = interceptIframeInsertion(win.Element.prototype.insertBefore);
        if (win.Node) {
            win.Node.prototype.appendChild = interceptIframeInsertion(win.Node.prototype.appendChild);
            win.Node.prototype.insertBefore = interceptIframeInsertion(win.Node.prototype.insertBefore);
        }
    } catch (e) {}
})();
