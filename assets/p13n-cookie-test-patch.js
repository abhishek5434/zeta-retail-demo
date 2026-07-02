(function () {
    var publicSuffixHosts = [
        "github.io",
        "vercel.app",
        "vercel.dev",
        "vercel.run",
        "now.sh"
    ];

    var host = window.location.hostname;
    var blockedParentDomain = publicSuffixHosts.find(function (domain) {
        return host === domain || host.slice(-domain.length - 1) === "." + domain;
    });

    if (!blockedParentDomain) {
        return;
    }

    var cookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");

    if (!cookieDescriptor && typeof HTMLDocument !== "undefined") {
        cookieDescriptor = Object.getOwnPropertyDescriptor(HTMLDocument.prototype, "cookie");
    }

    if (!cookieDescriptor || !cookieDescriptor.configurable || !cookieDescriptor.get || !cookieDescriptor.set) {
        return;
    }

    var domainPattern = new RegExp(";\\s*domain=\\." + blockedParentDomain.replace(/\./g, "\\.") + "(?=;|$)", "i");

    Object.defineProperty(document, "cookie", {
        configurable: true,
        enumerable: cookieDescriptor.enumerable,
        get: function () {
            return cookieDescriptor.get.call(document);
        },
        set: function (value) {
            var nextValue = String(value || "");

            if (/^_bti=/i.test(nextValue) && domainPattern.test(nextValue)) {
                nextValue = nextValue.replace(domainPattern, "");
                console.info("[Zeta retail demo] Saved p13n _bti as host-only cookie for test domain.", blockedParentDomain);
            }

            cookieDescriptor.set.call(document, nextValue);
        }
    });
})();
