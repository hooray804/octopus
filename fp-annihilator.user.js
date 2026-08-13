// ==UserScript==
// @name         Fingerprint Annihilator
// @namespace    https://raw.githubusercontent.com/hooray804/octopus/refs/heads/main/fp-annihilator.user.js
// @version      1.0
// @description  Spoofs Hardware, Canvas, WebGL, Fonts, MediaDevices, and WebRTC securely.
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
        const spoofedLanguages = [...primaryLangs, ...shuffleArray([...foreignLangsPool]).slice(0, randomInt(1, 3))];

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

        const screenProfiles = [
            { w: 1920, h: 1080, ah: 1040, dpr: 1 },
            { w: 2560, h: 1440, ah: 1400, dpr: 1.25 },
            { w: 3840, h: 2160, ah: 2120, dpr: 1.5 },
            { w: 3440, h: 1440, ah: 1400, dpr: 1 }
        ];
        const screenRes = randomItem(screenProfiles);

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
            screen: screenRes
        };
    }

    win.__SPOOF_SESSION__ = generateSession();
    const S = () => win.__SPOOF_SESSION__;

    const originalToString = Function.prototype.toString;
    const proxyMap = new WeakMap();

    function mockNative(targetFn, mockFn, isGetter = false) {
        const name = targetFn ? (targetFn.name || '') : '';
        const fakeStr = isGetter ? `function get ${name}() { [native code] }` : `function ${name}() { [native code] }`;
        proxyMap.set(mockFn, fakeStr);
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

    const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
    Object.getOwnPropertyDescriptor = new Proxy(originalGetOwnPropertyDescriptor, {
        apply: function(target, thisArg, args) {
            try {
                const desc = Reflect.apply(target, thisArg, args);
                if (desc && desc.get && proxyMap.has(desc.get)) {
                    desc.configurable = true; 
                    return desc; 
                }
                return desc;
            } catch (e) {
                return undefined;
            }
        }
    });

    function overrideProtoProperty(obj, prop, getterFn) {
        try {
            const mockedGetter = mockNative(function () {}, getterFn, true);
            Object.defineProperty(obj, prop, { 
                get: mockedGetter, 
                configurable: true, 
                enumerable: true 
            });
        } catch (e) {}
    }

    function injectPayload(context) {
        if (!context || context.__INFECTED__) return;
        context.__INFECTED__ = true;

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
            overrideProtoProperty(NavProto, 'oscpu', () => S().osCpu); 
            overrideProtoProperty(NavProto, 'pdfViewerEnabled', () => true);
            overrideProtoProperty(NavProto, 'cookieEnabled', () => true);
            overrideProtoProperty(NavProto, 'doNotTrack', () => randomItem([null, "1"]));

            if (!context.chrome) {
                context.chrome = { app: { isInstalled: false }, runtime: {} };
            }

            if (context.navigator.userAgentData || !context.navigator.userAgentData) {
                const mockUAD = {
                    get brands() {
                        return [
                            { brand: "Chromium", version: `${S().chromeMajor}` },
                            { brand: "Google Chrome", version: `${S().chromeMajor}` },
                            { brand: "Not-A.Brand", version: "99" }
                        ];
                    },
                    mobile: false,
                    platform: "Windows",
                    getHighEntropyValues: mockNative(function getHighEntropyValues() {}, function (hints) {
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
                            const fakeDevice = Object.create(d.__proto__);
                            Object.assign(fakeDevice, d, {
                                deviceId: d.deviceId ? 'dev-' + S().bitNoise + '-' + d.deviceId.slice(-10) : d.deviceId,
                                groupId: d.groupId ? 'grp-' + S().bitNoise + '-' + d.groupId.slice(-10) : d.groupId
                            });
                            return fakeDevice;
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

        if (context.screen) {
            const ScreenProto = context.Screen.prototype;
            overrideProtoProperty(ScreenProto, 'width', () => S().screen.w);
            overrideProtoProperty(ScreenProto, 'height', () => S().screen.h);
            overrideProtoProperty(ScreenProto, 'availWidth', () => S().screen.w);
            overrideProtoProperty(ScreenProto, 'availHeight', () => S().screen.ah);
            overrideProtoProperty(ScreenProto, 'colorDepth', () => 24);
            overrideProtoProperty(ScreenProto, 'pixelDepth', () => 24);
            overrideProtoProperty(ScreenProto, 'availTop', () => 0);
            overrideProtoProperty(ScreenProto, 'availLeft', () => 0);
        }
        
        overrideProtoProperty(context, 'innerWidth', () => S().screen.w);
        overrideProtoProperty(context, 'innerHeight', () => S().screen.ah - 100);
        overrideProtoProperty(context, 'outerWidth', () => S().screen.w);
        overrideProtoProperty(context, 'outerHeight', () => S().screen.ah);
        overrideProtoProperty(context, 'devicePixelRatio', () => S().screen.dpr);

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
            const origResolvedOptions = context.Intl.DateTimeFormat.prototype.resolvedOptions;
            context.Intl.DateTimeFormat.prototype.resolvedOptions = mockNative(origResolvedOptions, function () {
                const options = Reflect.apply(origResolvedOptions, this, arguments);
                options.timeZone = S().timezone;
                options.locale = S().locale;
                return options;
            });
        }

        if (context.Date) {
            const origGetTimezoneOffset = context.Date.prototype.getTimezoneOffset;
            context.Date.prototype.getTimezoneOffset = mockNative(origGetTimezoneOffset, function () {
                const tz = S().timezone;
                if (tz.includes('Seoul') || tz.includes('Tokyo')) return -540;
                if (tz.includes('New_York')) return 240;
                if (tz.includes('Los_Angeles')) return 420;
                if (tz.includes('London')) return 0;
                if (tz.includes('Paris')) return -60;
                if (tz.includes('Sydney')) return -660;
                return -540; 
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
                        if (typeof res === 'number' && !isNaN(res) && isFinite(res) && res !== 0) {
                            return res + S().mathJitter;
                        }
                        return res;
                    });
                }
            });
        }

        const appleFonts = ['gill sans', 'helvetica neue', 'menlo', 'avenir', 'palatino', 'sf pro', 'system-ui', '-apple-system-body'];
        const windowsFonts = ['consolas', 'segoe ui', 'arial', 'calibri', 'cambria', 'tahoma', 'verdana', 'ms mincho', 'ms outlook'];
        const adBlockerSelectors = ['#Iklan-Melayang', '.quangcao', '.mainostila', '#adblock-honeypot', '.hs-sosyal', '.BetterJsPopOverlay', '.mobile_adhesion', '#mgid_iframe1', '.yb-floorad', '.ezmob-footer'];

        const manipulateFontDimension = (fontFamily, originalValue, isWidth, element) => {
            if (element && element.id && adBlockerSelectors.includes('#' + element.id)) return 0;
            if (element && element.className && adBlockerSelectors.some(cls => ('.' + element.className).includes(cls))) return 0;

            try {
                if (!fontFamily && element) fontFamily = context.getComputedStyle(element).fontFamily;
            } catch (e) {
                fontFamily = 'Arial';
            }
            if (!fontFamily) return originalValue + (S().seed * 0.1);
            
            const lowerFont = fontFamily.toLowerCase();
            if (appleFonts.some(f => lowerFont.includes(f))) {
                return originalValue * 0.75 + (S().seed * 0.1);
            }
            if (windowsFonts.some(f => lowerFont.includes(f))) {
                return originalValue * (isWidth ? 1.05 : 1.03) + (S().seed * 0.1);
            }
            return originalValue + (S().seed * 0.1);
        };

        if (context.HTMLElement) {
            const hookDOMSize = (prop, isWidth) => {
                const desc = Object.getOwnPropertyDescriptor(context.HTMLElement.prototype, prop);
                if (!desc) return;
                const origGet = desc.get;
                desc.get = mockNative(origGet, function () {
                    const origVal = Reflect.apply(origGet, this, arguments);
                    if (origVal === 0 && (!this.id && !this.className)) return 0; 
                    return manipulateFontDimension(this.style.fontFamily, origVal, isWidth, this);
                }, true);
                Object.defineProperty(context.HTMLElement.prototype, prop, desc);
            };
            hookDOMSize('offsetWidth', true);
            hookDOMSize('offsetHeight', false);

            const origGetRect = context.Element.prototype.getBoundingClientRect;
            context.Element.prototype.getBoundingClientRect = mockNative(origGetRect, function () {
                const rect = Reflect.apply(origGetRect, this, arguments);
                if (rect.width === 0 && rect.height === 0) return rect;
                
                const fakeWidth = manipulateFontDimension(this.style.fontFamily, rect.width, true, this);
                const fakeHeight = manipulateFontDimension(this.style.fontFamily, rect.height, false, this);
                return new DOMRect(rect.x + (S().mathJitter * 100), rect.y + (S().mathJitter * 100), fakeWidth, fakeHeight);
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
                if (data && data.length) {
                    for (let i = 0; i < data.length; i += 45) {
                        data[i] += S().audioJitter;
                    }
                }
                return data;
            });
        }

        function noiseCanvasBuffer(bufferArray) {
            if (!bufferArray || !bufferArray.length) return;
            const skip = 4 * Math.max(1, Math.floor(bufferArray.length / (512 * 4)));
            for (let i = 0; i < bufferArray.length; i += skip) {
                if (i % 4 !== 3) { 
                    bufferArray[i] = (bufferArray[i] ^ S().bitNoise) & 255;
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
                const fakeW = manipulateFontDimension(this.font, metrics.width, true, null);
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
                        offer.sdp = offer.sdp.replace(/a=ice-ufrag:.+/g, 'a=ice-ufrag:' + Math.random().toString(36).substring(2));
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
            });
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