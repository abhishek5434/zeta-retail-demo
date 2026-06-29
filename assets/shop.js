(function () {
    var PRODUCTS = [
        {
            id: "nova-sneaker",
            name: "Nova Knit Sneaker",
            category: "Footwear",
            price: 84,
            color: "Sky / White",
            image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
            description: "A lightweight everyday sneaker for commutes, travel, and weekend errands."
        },
        {
            id: "metro-pack",
            name: "Metro Day Pack",
            category: "Bags",
            price: 68,
            color: "Graphite",
            image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80",
            description: "A compact backpack with a padded laptop sleeve and quick-access pockets."
        },
        {
            id: "summit-jacket",
            name: "Summit Light Jacket",
            category: "Outerwear",
            price: 112,
            color: "Evergreen",
            image: "https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=900&q=80",
            description: "A breathable layer made for changing weather and daily city movement."
        },
        {
            id: "field-watch",
            name: "Field Classic Watch",
            category: "Accessories",
            price: 96,
            color: "Tan Leather",
            image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80",
            description: "A clean analog watch with a warm leather strap and polished steel case."
        }
    ];

    var CART_KEY = "zetaRetailDemoCart";
    var EVENTS_KEY = "zetaRetailDemoEvents";
    var ORDER_KEY = "zetaRetailDemoLastOrder";
    var USER_KEY = "zetaRetailDemoUser";

    document.addEventListener("DOMContentLoaded", function () {
        renderFeaturedProducts();
        renderProductGrid();
        renderProductDetail();
        renderCartPage();
        renderCheckoutPage();
        renderConfirmationPage();
        renderLoginMenu();
        bindAddButtons();
        updateCartCount();
        recordPageScenario();
        renderEventLog();
    });

    function money(value) {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD"
        }).format(value);
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, function (char) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "\"": "&quot;",
                "'": "&#039;"
            }[char];
        });
    }

    function readJson(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function writeJson(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn("Unable to save demo state.", error);
        }
    }

    function getCart() {
        return readJson(CART_KEY, []);
    }

    function setCart(cart) {
        writeJson(CART_KEY, cart.filter(function (item) {
            return item.qty > 0;
        }));
        updateCartCount();
    }

    function findProduct(id) {
        return PRODUCTS.find(function (product) {
            return product.id === id;
        }) || PRODUCTS[0];
    }

    function getProductFromUrl() {
        var params = new URLSearchParams(window.location.search);
        return findProduct(params.get("id") || PRODUCTS[0].id);
    }

    function getLineItems(cart) {
        return cart.map(function (item) {
            var product = findProduct(item.id);
            return {
                id: product.id,
                name: product.name,
                resourceType: "product",
                image: product.image,
                category: product.category,
                price: product.price,
                qty: item.qty,
                lineTotal: product.price * item.qty
            };
        });
    }

    function cartTotal(cart) {
        return getLineItems(cart).reduce(function (sum, item) {
            return sum + item.lineTotal;
        }, 0);
    }

    function itemCount(cart) {
        return cart.reduce(function (sum, item) {
            return sum + item.qty;
        }, 0);
    }

    function compactObject(value) {
        var result = {};
        Object.keys(value).forEach(function (key) {
            if (value[key] !== "" && value[key] !== null && typeof value[key] !== "undefined") {
                result[key] = value[key];
            }
        });
        return result;
    }

    function zetaCartItems(cart) {
        return getLineItems(cart).map(function (item) {
            return {
                id: item.id,
                resourceType: item.resourceType,
                price: item.price,
                quantity: item.qty,
                name: item.name,
                category: item.category,
                line_total: item.lineTotal
            };
        });
    }

    function getUser() {
        return readJson(USER_KEY, {
            email: "",
            firstName: "",
            lastName: ""
        });
    }

    function setUser(user) {
        writeJson(USER_KEY, compactObject(user));
        updateLoginDisplay();
    }

    function normalizeEmail(email) {
        return String(email || "").trim().toLowerCase();
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function userDisplayName(user) {
        var name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
        return name || user.email || "Sign in";
    }

    function trackEvent(eventName, payload) {
        payload = compactObject(payload || {});
        console.info("[Zeta retail demo] bt('track', '" + eventName + "', payload)", payload);
        if (typeof window.bt === "function") {
            window.bt("track", eventName, payload);
        } else {
            console.warn("[Zeta retail demo] bt is not available for track.", eventName, payload);
        }
    }

    function trackUpdatedCart(cart, action, product) {
        trackEvent("updated_cart", {
            shoppingCartItems: zetaCartItems(cart),
            action_type: action,
            product_id: product && product.id,
            product_name: product && product.name,
            cart_value: cartTotal(cart),
            item_count: itemCount(cart),
            currency: "USD"
        });
    }

    function trackPurchased(order) {
        trackEvent("purchased", {
            shoppingCartItems: order.items.map(function (item) {
                return {
                    id: item.id,
                    resourceType: item.resourceType,
                    price: item.price,
                    quantity: item.qty,
                    name: item.name,
                    category: item.category,
                    line_total: item.lineTotal
                };
            }),
            order_id: order.id,
            subtotal: order.subtotal,
            shipping: order.shipping,
            order_total: order.total,
            item_count: order.items.reduce(function (sum, item) {
                return sum + item.qty;
            }, 0),
            customer_email: order.customer.email,
            currency: "USD"
        });
    }

    function trackViewedResource(detail) {
        trackEvent("viewed", {
            id: detail.id,
            resourceType: detail.resourceType || "page",
            url: window.location.href,
            page_name: detail.pageName || document.title,
            product_name: detail.productName,
            value: detail.value
        });
    }

    function updateUser(user, source) {
        var email = normalizeEmail(user.email);
        if (!isValidEmail(email)) {
            return false;
        }

        var firstName = String(user.firstName || "").trim();
        var lastName = String(user.lastName || "").trim();
        var name = [firstName, lastName].filter(Boolean).join(" ");
        var properties = compactObject({
            email: email,
            user_id: email,
            first_name: firstName,
            last_name: lastName,
            name: name,
            source: source
        });

        console.info("[Zeta retail demo] bt('updateUser', payload)", properties);
        if (typeof window.bt === "function") {
            window.bt("updateUser", properties);
        } else {
            console.warn("[Zeta retail demo] bt is not available for updateUser.", properties);
        }
        return true;
    }

    function identifyUser(user, source) {
        var email = normalizeEmail(user.email);
        if (!isValidEmail(email)) {
            return false;
        }

        var profile = {
            email: email,
            firstName: String(user.firstName || "").trim(),
            lastName: String(user.lastName || "").trim()
        };

        setUser(profile);
        updateUser(profile, source);
        recordScenario("user_identified", {
            email: profile.email,
            source: source
        });
        renderEventLog();
        return true;
    }

    function renderLoginMenu() {
        var navLinks = document.querySelector(".nav-links");
        if (!navLinks || navLinks.querySelector("[data-login-menu]")) {
            return;
        }

        var cartLink = navLinks.querySelector(".cart-pill");
        var holder = document.createElement("div");
        holder.className = "login-menu";
        holder.setAttribute("data-login-menu", "");
        holder.innerHTML = [
            "<button class=\"nav-button\" type=\"button\" data-login-toggle aria-expanded=\"false\">Sign in</button>",
            "<div class=\"login-panel\" data-login-panel hidden>",
            "  <form data-login-form>",
            "    <label>Email<input name=\"email\" type=\"email\" autocomplete=\"email\" required></label>",
            "    <div class=\"field-grid compact\">",
            "      <label>First name<input name=\"firstName\" autocomplete=\"given-name\"></label>",
            "      <label>Last name<input name=\"lastName\" autocomplete=\"family-name\"></label>",
            "    </div>",
            "    <button class=\"button primary\" type=\"submit\">Save login</button>",
            "  </form>",
            "</div>"
        ].join("");

        navLinks.insertBefore(holder, cartLink);
        updateLoginDisplay();

        holder.querySelector("[data-login-toggle]").addEventListener("click", function () {
            var panel = holder.querySelector("[data-login-panel]");
            var isOpen = !panel.hidden;
            panel.hidden = isOpen;
            holder.querySelector("[data-login-toggle]").setAttribute("aria-expanded", String(!isOpen));
        });

        holder.querySelector("[data-login-form]").addEventListener("submit", function (event) {
            event.preventDefault();
            var formData = new FormData(event.currentTarget);
            var profile = {
                email: normalizeEmail(formData.get("email")),
                firstName: String(formData.get("firstName") || "").trim(),
                lastName: String(formData.get("lastName") || "").trim()
            };

            if (isValidEmail(profile.email)) {
                identifyUser(profile, "login_menu");
                holder.querySelector("[data-login-panel]").hidden = true;
                holder.querySelector("[data-login-toggle]").setAttribute("aria-expanded", "false");
            }
        });
    }

    function updateLoginDisplay() {
        var user = getUser();
        var button = document.querySelector("[data-login-toggle]");
        var form = document.querySelector("[data-login-form]");

        if (button) {
            button.textContent = user.email ? userDisplayName(user) : "Sign in";
            button.classList.toggle("is-signed-in", Boolean(user.email));
        }

        if (form) {
            form.elements.email.value = user.email || "";
            form.elements.firstName.value = user.firstName || "";
            form.elements.lastName.value = user.lastName || "";
        }
    }

    function productCard(product) {
        return [
            "<article class=\"product-card\">",
            "  <a href=\"product.html?id=" + encodeURIComponent(product.id) + "\">",
            "    <img src=\"" + product.image + "\" alt=\"" + escapeHtml(product.name) + "\">",
            "  </a>",
            "  <div class=\"product-card-body\">",
            "    <p class=\"product-meta\">" + escapeHtml(product.category) + "</p>",
            "    <h3>" + escapeHtml(product.name) + "</h3>",
            "    <p>" + escapeHtml(product.description) + "</p>",
            "    <div class=\"actions\">",
            "      <span class=\"price\">" + money(product.price) + "</span>",
            "      <button class=\"button small primary\" type=\"button\" data-add-product=\"" + escapeHtml(product.id) + "\">Add to cart</button>",
            "    </div>",
            "  </div>",
            "</article>"
        ].join("");
    }

    function renderFeaturedProducts() {
        var target = document.querySelector("[data-featured-products]");
        if (!target) {
            return;
        }
        target.innerHTML = PRODUCTS.slice(0, 3).map(productCard).join("");
    }

    function renderProductGrid() {
        var target = document.querySelector("[data-product-grid]");
        if (!target) {
            return;
        }
        target.innerHTML = PRODUCTS.map(productCard).join("");
    }

    function renderProductDetail() {
        var target = document.querySelector("[data-product-detail]");
        if (!target) {
            return;
        }

        var product = getProductFromUrl();
        document.title = product.name + " | Zeta Retail Demo";
        target.innerHTML = [
            "<div>",
            "  <img src=\"" + product.image + "\" alt=\"" + escapeHtml(product.name) + "\">",
            "</div>",
            "<div class=\"detail-panel\">",
            "  <p class=\"eyebrow\">" + escapeHtml(product.category) + "</p>",
            "  <h1>" + escapeHtml(product.name) + "</h1>",
            "  <p class=\"lead\">" + escapeHtml(product.description) + "</p>",
            "  <div class=\"option-row\"><span>Color</span><span>" + escapeHtml(product.color) + "</span></div>",
            "  <div class=\"option-row\"><span>Price</span><span class=\"price\">" + money(product.price) + "</span></div>",
            "  <div class=\"actions\">",
            "    <button class=\"button primary\" type=\"button\" data-add-product=\"" + escapeHtml(product.id) + "\">Add to cart</button>",
            "    <a class=\"button secondary\" href=\"cart.html\">View cart</a>",
            "  </div>",
            "  <div class=\"notice\" data-add-notice aria-live=\"polite\"></div>",
            "</div>"
        ].join("");
    }

    function bindAddButtons() {
        document.querySelectorAll("[data-add-product]").forEach(function (button) {
            button.addEventListener("click", function () {
                addToCart(button.getAttribute("data-add-product"));
            });
        });
    }

    function addToCart(productId) {
        var product = findProduct(productId);
        var cart = getCart();
        var existing = cart.find(function (item) {
            return item.id === product.id;
        });

        if (existing) {
            existing.qty += 1;
        } else {
            cart.push({
                id: product.id,
                qty: 1
            });
        }

        setCart(cart);
        trackUpdatedCart(cart, "add", product);
        recordScenario("cart_updated", {
            action: "add",
            product: product.name,
            items: itemCount(cart),
            value: cartTotal(cart)
        });

        var notice = document.querySelector("[data-add-notice]");
        if (notice) {
            notice.textContent = product.name + " added to cart.";
        }

        renderEventLog();
    }

    function renderCartPage() {
        var target = document.querySelector("[data-cart-page]");
        if (!target) {
            return;
        }

        var cart = getCart();
        var items = getLineItems(cart);

        if (!items.length) {
            target.innerHTML = [
                "<div class=\"empty-state\">",
                "  <h1>Your cart is empty</h1>",
                "  <p class=\"lead\">Browse the collection to create a cart update scenario.</p>",
                "  <a class=\"button primary\" href=\"category.html\">Shop products</a>",
                "</div>"
            ].join("");
            return;
        }

        var rows = items.map(function (item) {
            return [
                "<div class=\"cart-row\">",
                "  <img src=\"" + item.image + "\" alt=\"" + escapeHtml(item.name) + "\">",
                "  <div>",
                "    <h3>" + escapeHtml(item.name) + "</h3>",
                "    <p class=\"product-meta\">" + escapeHtml(item.category) + "</p>",
                "  </div>",
                "  <input type=\"number\" min=\"0\" max=\"9\" value=\"" + item.qty + "\" data-cart-qty=\"" + escapeHtml(item.id) + "\" aria-label=\"Quantity for " + escapeHtml(item.name) + "\">",
                "  <strong class=\"price\">" + money(item.lineTotal) + "</strong>",
                "</div>"
            ].join("");
        }).join("");

        target.innerHTML = [
            "<div class=\"cart-layout\">",
            "  <section class=\"cart-list\">" + rows + "</section>",
            "  <aside class=\"summary\">",
            "    <h2>Cart summary</h2>",
            summaryRows(cart),
            "    <div class=\"actions\">",
            "      <button class=\"button secondary\" type=\"button\" data-update-cart>Update cart</button>",
            "      <a class=\"button primary\" href=\"checkout.html\">Checkout</a>",
            "    </div>",
            "  </aside>",
            "</div>"
        ].join("");

        var updateButton = document.querySelector("[data-update-cart]");
        updateButton.addEventListener("click", function () {
            var nextCart = [];
            document.querySelectorAll("[data-cart-qty]").forEach(function (input) {
                var qty = Math.max(0, Math.min(9, Number(input.value) || 0));
                if (qty > 0) {
                    nextCart.push({
                        id: input.getAttribute("data-cart-qty"),
                        qty: qty
                    });
                }
            });
            setCart(nextCart);
            trackUpdatedCart(nextCart, "quantity_change");
            recordScenario("cart_updated", {
                action: "quantity change",
                items: itemCount(nextCart),
                value: cartTotal(nextCart)
            });
            renderCartPage();
            renderEventLog();
        });
    }

    function summaryRows(cart) {
        var subtotal = cartTotal(cart);
        var shipping = subtotal > 0 ? 6 : 0;
        var total = subtotal + shipping;

        return [
            "<div class=\"summary-row\"><span>Subtotal</span><strong>" + money(subtotal) + "</strong></div>",
            "<div class=\"summary-row\"><span>Shipping</span><strong>" + money(shipping) + "</strong></div>",
            "<div class=\"summary-row total\"><span>Total</span><strong>" + money(total) + "</strong></div>"
        ].join("");
    }

    function renderCheckoutPage() {
        var target = document.querySelector("[data-checkout-page]");
        if (!target) {
            return;
        }

        var cart = getCart();
        var items = getLineItems(cart);

        if (!items.length) {
            target.innerHTML = [
                "<div class=\"empty-state\">",
                "  <h1>No items to checkout</h1>",
                "  <p class=\"lead\">Add a product before creating the purchase scenario.</p>",
                "  <a class=\"button primary\" href=\"category.html\">Shop products</a>",
                "</div>"
            ].join("");
            return;
        }

        var user = getUser();

        target.innerHTML = [
            "<div class=\"checkout-layout\">",
            "  <form class=\"checkout-form\" data-checkout-form>",
            "    <h1>Checkout</h1>",
            "    <div class=\"field-grid\">",
            "      <label>First name<input name=\"firstName\" autocomplete=\"given-name\" required value=\"" + escapeHtml(user.firstName || "Alex") + "\"></label>",
            "      <label>Last name<input name=\"lastName\" autocomplete=\"family-name\" required value=\"" + escapeHtml(user.lastName || "Morgan") + "\"></label>",
            "    </div>",
            "    <label>Email<input name=\"email\" type=\"email\" autocomplete=\"email\" required value=\"" + escapeHtml(user.email || "alex@example.com") + "\"></label>",
            "    <label>Shipping ZIP<input name=\"zip\" autocomplete=\"postal-code\" required value=\"10001\"></label>",
            "    <button class=\"button primary\" type=\"submit\">Place order</button>",
            "  </form>",
            "  <aside class=\"summary\">",
            "    <h2>Order summary</h2>",
            items.map(function (item) {
                return "<div class=\"summary-row\"><span>" + escapeHtml(item.name) + " x " + item.qty + "</span><strong>" + money(item.lineTotal) + "</strong></div>";
            }).join(""),
            summaryRows(cart),
            "  </aside>",
            "</div>"
        ].join("");

        document.querySelector("[data-checkout-form]").addEventListener("submit", function (event) {
            event.preventDefault();
            placeOrder(event.currentTarget);
        });
    }

    function placeOrder(form) {
        var cart = getCart();
        if (!cart.length) {
            return;
        }

        var formData = new FormData(form);
        var customer = {
            email: formData.get("email"),
            firstName: formData.get("firstName"),
            lastName: formData.get("lastName"),
            zip: formData.get("zip")
        };
        var subtotal = cartTotal(cart);

        identifyUser(customer, "checkout");

        var order = {
            id: "ZR-" + String(Date.now()).slice(-7),
            placedAt: new Date().toISOString(),
            items: getLineItems(cart),
            customer: getUser(),
            subtotal: subtotal,
            shipping: 6,
            total: subtotal + 6
        };

        writeJson(ORDER_KEY, order);
        trackPurchased(order);
        setCart([]);
        recordScenario("purchased", {
            order: order.id,
            email: order.customer.email,
            items: itemCount(cart),
            value: order.total
        });
        window.location.href = "confirmation.html?order=" + encodeURIComponent(order.id);
    }

    function renderConfirmationPage() {
        var target = document.querySelector("[data-confirmation-page]");
        if (!target) {
            return;
        }

        var order = readJson(ORDER_KEY, null);
        if (!order) {
            target.innerHTML = [
                "<div class=\"empty-state\">",
                "  <h1>No recent order</h1>",
                "  <p class=\"lead\">Complete checkout to create a purchase event.</p>",
                "  <a class=\"button primary\" href=\"category.html\">Shop products</a>",
                "</div>"
            ].join("");
            return;
        }

        target.innerHTML = [
            "<section class=\"receipt\">",
            "  <p class=\"eyebrow\">Order " + escapeHtml(order.id) + "</p>",
            "  <h1>Purchase complete</h1>",
            "  <p class=\"lead\">The demo order has been placed and the cart has been cleared.</p>",
            "  <h2>Items</h2>",
            order.items.map(function (item) {
                return "<div class=\"summary-row\"><span>" + escapeHtml(item.name) + " x " + item.qty + "</span><strong>" + money(item.lineTotal) + "</strong></div>";
            }).join(""),
            "  <div class=\"summary-row total\"><span>Total</span><strong>" + money(order.total) + "</strong></div>",
            "  <div class=\"actions\"><a class=\"button primary\" href=\"category.html\">Start another visit</a><a class=\"button secondary\" href=\"index.html\">Home</a></div>",
            "</section>"
        ].join("");
    }

    function updateCartCount() {
        var count = itemCount(getCart());
        document.querySelectorAll("[data-cart-count]").forEach(function (target) {
            target.textContent = count;
        });
    }

    function recordPageScenario() {
        var page = document.body.getAttribute("data-page") || "home";
        var order = readJson(ORDER_KEY, null);

        if (page === "product") {
            var product = getProductFromUrl();
            trackViewedResource({
                id: product.id,
                resourceType: "product",
                pageName: product.name,
                productName: product.name,
                value: product.price
            });
            recordScenario("viewed_product", {
                product: product.name,
                value: product.price
            });
            return;
        }

        if (page === "cart") {
            trackViewedResource({
                id: "cart",
                resourceType: "cart",
                pageName: "Cart"
            });
            recordScenario("cart_viewed", {
                items: itemCount(getCart()),
                value: cartTotal(getCart())
            });
            return;
        }

        if (page === "checkout") {
            trackViewedResource({
                id: "checkout",
                resourceType: "checkout",
                pageName: "Checkout"
            });
            recordScenario("checkout_viewed", {
                items: itemCount(getCart()),
                value: cartTotal(getCart())
            });
            return;
        }

        if (page === "confirmation") {
            trackViewedResource({
                id: order ? order.id : "confirmation",
                resourceType: "order",
                pageName: "Purchase confirmation",
                value: order ? order.total : ""
            });
            recordScenario("purchase_confirmation_viewed", {
                order: order ? order.id : "none",
                value: order ? order.total : 0
            });
            return;
        }

        trackViewedResource({
            id: page,
            resourceType: "page",
            pageName: page
        });
        recordScenario(page === "category" ? "collection_viewed" : "page_viewed", {
            page: page
        });
    }

    function labelFor(type) {
        return {
            page_viewed: "Page viewed",
            collection_viewed: "Collection viewed",
            viewed_product: "Product page viewed",
            cart_viewed: "Cart viewed",
            checkout_viewed: "Checkout viewed",
            cart_updated: "Cart updated",
            purchased: "Purchase completed",
            user_identified: "User identified",
            purchase_confirmation_viewed: "Confirmation viewed"
        }[type] || type;
    }

    function detailText(detail) {
        var parts = [];
        if (detail.product) {
            parts.push(detail.product);
        }
        if (detail.order) {
            parts.push("Order " + detail.order);
        }
        if (detail.email) {
            parts.push(detail.email);
        }
        if (typeof detail.items === "number") {
            parts.push(detail.items + " item" + (detail.items === 1 ? "" : "s"));
        }
        if (typeof detail.value === "number") {
            parts.push(money(detail.value));
        }
        if (detail.page) {
            parts.push(detail.page);
        }
        if (detail.action) {
            parts.push(detail.action);
        }
        if (detail.source) {
            parts.push(detail.source);
        }
        return parts.join(" | ");
    }

    function recordScenario(type, detail) {
        var event = {
            type: type,
            label: labelFor(type),
            detail: detail || {},
            page: document.body.getAttribute("data-page") || "home",
            timestamp: new Date().toISOString()
        };

        var events = readJson(EVENTS_KEY, []);
        events.unshift(event);
        writeJson(EVENTS_KEY, events.slice(0, 8));

        window.zetaRetailDemo = window.zetaRetailDemo || {
            events: []
        };
        window.zetaRetailDemo.events.push(event);
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: "zeta_retail_" + type,
            zeta_demo_type: type,
            zeta_demo_page: event.page,
            zeta_demo_detail: detailText(event.detail),
            zeta_demo_value: typeof event.detail.value === "number" ? event.detail.value : null,
            zeta_demo_order: event.detail.order || null
        });

        var scenario = document.querySelector("[data-scenario]");
        var detailTarget = document.querySelector("[data-scenario-detail]");
        if (scenario) {
            scenario.textContent = event.label;
        }
        if (detailTarget) {
            detailTarget.textContent = detailText(event.detail) || "Retail demo";
        }
        console.info("[Zeta retail demo]", event);
    }

    function renderEventLog() {
        var target = document.querySelector("[data-event-log]");
        if (!target) {
            return;
        }

        var events = readJson(EVENTS_KEY, []);
        if (!events.length) {
            target.innerHTML = "<p>Events will appear as you browse, update the cart, and place an order.</p>";
            return;
        }

        target.innerHTML = "<div class=\"event-list\">" + events.map(function (event) {
            return [
                "<div class=\"event-item\">",
                "  <strong>" + escapeHtml(event.label || labelFor(event.type)) + "</strong>",
                "  <small>" + escapeHtml(detailText(event.detail || {})) + "</small>",
                "</div>"
            ].join("");
        }).join("") + "</div>";
    }
}());
