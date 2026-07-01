(function () {
    var SITE_ID = "client-services-sandbox";
    var BTI_COOKIE_NAME = "_bti";
    var BTI_BACKUP_KEY = "zetaRetailDemoBtiBackup";
    var ZYNC_ID_KEY = "zetaRetailDemoZyncExternalId";
    var ZYNC_COOKIE_NAME = "zetaRetailDemoZyncExternalId";
    var P13N_SRC = "https://cdn.boomtrain.com/p13n/" + SITE_ID + "/p13n.min.js";
    var SYNC_SRC = "https://live.rezync.com/sync?c=16b6410431b6374e780104abb0443ca8&p=5de2162ee882e78cdc9a8f4cfa6cb5b6&k=client-services-sandbox-pixel-9154&zmpID=" + SITE_ID;

    function readCookie(name) {
        return document.cookie.split(";").map(function (item) {
            return item.trim();
        }).filter(function (item) {
            return item.indexOf(name + "=") === 0;
        }).map(function (item) {
            return decodeURIComponent(item.slice(name.length + 1));
        })[0] || "";
    }

    function writeCookie(name, value) {
        document.cookie = name + "=" + encodeURIComponent(value) + "; path=/; SameSite=Lax";
    }

    function getStoredZyncId() {
        try {
            return window.sessionStorage.getItem(ZYNC_ID_KEY) || readCookie(ZYNC_COOKIE_NAME);
        } catch (error) {
            return readCookie(ZYNC_COOKIE_NAME);
        }
    }

    function storeZyncId(zyncId) {
        if (!zyncId) {
            return;
        }

        try {
            window.sessionStorage.setItem(ZYNC_ID_KEY, zyncId);
        } catch (error) {
            console.warn("[Zeta retail demo] Unable to write Zync ID to sessionStorage.", error);
        }

        writeCookie(ZYNC_COOKIE_NAME, zyncId);
    }

    function readSessionValue(key) {
        try {
            return window.sessionStorage.getItem(key) || "";
        } catch (error) {
            return "";
        }
    }

    function writeSessionValue(key, value) {
        try {
            window.sessionStorage.setItem(key, value);
        } catch (error) {
            console.warn("[Zeta retail demo] Unable to write session value.", error);
        }
    }

    function parseBti(value) {
        if (!value) {
            return null;
        }

        try {
            return JSON.parse(value);
        } catch (error) {
            return null;
        }
    }

    function hasValidBsin(value) {
        var bti = parseBti(value);
        var bsin = bti && bti.bsin;
        return Boolean(bsin && String(bsin).toLowerCase() !== "null");
    }

    function getStoredBti() {
        return readSessionValue(BTI_BACKUP_KEY) || readCookie(BTI_BACKUP_KEY);
    }

    function storeBti(value) {
        if (!hasValidBsin(value)) {
            return;
        }

        writeSessionValue(BTI_BACKUP_KEY, value);
        writeCookie(BTI_BACKUP_KEY, value);
    }

    function stabilizeBtiCookie() {
        var currentBti = readCookie(BTI_COOKIE_NAME);

        if (hasValidBsin(currentBti)) {
            storeBti(currentBti);
            return;
        }

        var storedBti = getStoredBti();
        if (hasValidBsin(storedBti)) {
            console.info("[Zeta retail demo] Restoring _bti cookie with existing bsin.");
            writeCookie(BTI_COOKIE_NAME, storedBti);
        }
    }

    function watchBtiCookie() {
        var attempts = 0;
        stabilizeBtiCookie();

        var timer = window.setInterval(function () {
            attempts += 1;
            stabilizeBtiCookie();

            if (attempts >= 40) {
                window.clearInterval(timer);
            }
        }, 500);
    }

    function ensureBtQueue() {
        window.bt = window.bt || function () {
            (window._bt = window._bt || []).push(arguments);
        };
    }

    function loadP13nWithZyncId(zyncId) {
        if (window.zetaRetailDemoP13nLoaded) {
            return;
        }

        window.zetaRetailDemoP13nLoaded = true;
        ensureBtQueue();

        var script = document.createElement("script");
        var firstScript = document.getElementsByTagName("script")[0];
        script.async = true;
        script.src = P13N_SRC;
        firstScript.parentNode.insertBefore(script, firstScript);

        window.bt("initialize", SITE_ID, {
            externalIds: {
                zync: zyncId
            }
        });
        watchBtiCookie();
    }

    function captureZyncInitialize() {
        var originalBt = window.bt;
        window.bt = function () {
            var settings = arguments[2];

            if (arguments[0] === "initialize" && settings && settings.externalIds && settings.externalIds.zync) {
                storeZyncId(settings.externalIds.zync);
            }

            if (typeof originalBt === "function") {
                return originalBt.apply(window, arguments);
            }

            (window._bt = window._bt || []).push(arguments);
            return null;
        };
    }

    function loadZyncOnce() {
        if (window.zetaRetailDemoZyncLoaderStarted) {
            return;
        }

        window.zetaRetailDemoZyncLoaderStarted = true;
        stabilizeBtiCookie();

        var storedZyncId = getStoredZyncId();
        if (storedZyncId) {
            console.info("[Zeta retail demo] Reusing Zync ID for p13n.", storedZyncId);
            loadP13nWithZyncId(storedZyncId);
            return;
        }

        captureZyncInitialize();

        var script = document.createElement("script");
        script.src = SYNC_SRC;
        document.body.appendChild(script);
        watchBtiCookie();
    }

    if (["complete", "interactive"].indexOf(document.readyState) >= 0) {
        loadZyncOnce();
    } else {
        window.addEventListener("DOMContentLoaded", loadZyncOnce);
    }
}());
