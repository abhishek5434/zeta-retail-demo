(function () {
    var SITE_ID = "client-services-sandbox";
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
    }

    if (["complete", "interactive"].indexOf(document.readyState) >= 0) {
        loadZyncOnce();
    } else {
        window.addEventListener("DOMContentLoaded", loadZyncOnce);
    }
}());
