"use strict";

const PRODUCTS_URL = "data/products.xml";
const CART_STORAGE_KEY = "minishop-cart";

let products = [];

const cartState = {
    items: loadCart()
};

const productContainer = document.getElementById("productContainer");
const productResult = document.getElementById("productResult");
const advancedSearchForm = document.getElementById("advancedSearchForm");

function loadCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "{}");
    } catch {
        return {};
    }
}

function saveCart() {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartState.items));
}

function xmlValue(node, tagName) {
    return node.getElementsByTagName(tagName)[0]?.textContent?.trim() || "";
}

function parseProducts(xmlText) {
    const xml = new DOMParser().parseFromString(xmlText, "application/xml");

    if (xml.querySelector("parsererror")) {
        throw new Error("products.xml không đúng định dạng XML.");
    }

    return [...xml.getElementsByTagName("product")].map(node => {
        const rate = xmlValue(node, "rate") || xmlValue(node, "rating");

        return {
            id: node.getAttribute("id") || xmlValue(node, "id"),
            title: xmlValue(node, "title"),
            price: Number(xmlValue(node, "price")) || 0,
            category: xmlValue(node, "category"),
            image: xmlValue(node, "image"),
            color: xmlValue(node, "color") || "Mặc định",
            stock: Number.parseInt(xmlValue(node, "stock"), 10) || 0,
            rating: Number.parseFloat(rate) || 0
        };
    });
}

function createProductCard(product) {
    const card = document.createElement("article");
    card.className = "product-card";

    const image = document.createElement("img");
    image.className = "product-image";
    image.src = product.image;
    image.alt = product.title;
    image.loading = "lazy";

    const category = document.createElement("p");
    category.className = "product-category";
    category.textContent = product.category;

    const title = document.createElement("h3");
    title.className = "product-title";
    title.textContent = product.title;

    const price = document.createElement("p");
    price.className = "product-price";
    price.textContent = `$${product.price.toFixed(2)}`;

    const details = document.createElement("p");
    details.className = "product-details";
    details.textContent =
        `Màu: ${product.color} · Đánh giá: ${product.rating}/5 · Tồn kho: ${product.stock}`;

    const variantRow = document.createElement("div");
    variantRow.className = "product-variants";

    const colorSelect = document.createElement("select");
    colorSelect.dataset.variantColor = "";
    colorSelect.setAttribute("aria-label", `Màu của ${product.title}`);

    const colorOption = document.createElement("option");
    colorOption.value = product.color;
    colorOption.textContent = product.color;
    colorSelect.append(colorOption);

    const sizeSelect = document.createElement("select");
    sizeSelect.dataset.variantSize = "";
    sizeSelect.setAttribute("aria-label", `Kích cỡ của ${product.title}`);

    ["S", "M", "L"].forEach(size => {
        const option = document.createElement("option");
        option.value = size;
        option.textContent = `Size ${size}`;
        sizeSelect.append(option);
    });

    variantRow.append(colorSelect, sizeSelect);

    const actions = document.createElement("div");
    actions.className = "product-actions";

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "product-action";
    addButton.dataset.action = "add";
    addButton.dataset.id = product.id;
    addButton.textContent = "Thêm vào giỏ hàng";
    addButton.disabled = product.stock <= 0;

    const quickButton = document.createElement("button");
    quickButton.type = "button";
    quickButton.className = "product-action secondary";
    quickButton.dataset.action = "quick";
    quickButton.dataset.id = product.id;
    quickButton.textContent = "Xem nhanh";

    actions.append(addButton, quickButton);
    card.append(image, category, title, price, details, variantRow, actions);

    return card;
}

function renderProducts(list) {
    productContainer.replaceChildren();

    if (list.length === 0) {
        productContainer.textContent = "Không tìm thấy sản phẩm phù hợp.";
        productResult.textContent = "Tìm thấy 0 sản phẩm.";
        return;
    }

    const fragment = document.createDocumentFragment();
    list.forEach(product => fragment.append(createProductCard(product)));
    productContainer.append(fragment);
    productResult.textContent = `Tìm thấy ${list.length} sản phẩm.`;
}

function populateFilters() {
    const colors = [...new Set(products.map(product => product.color))];
    const categories = [...new Set(products.map(product => product.category))];

    const colorSelect = document.getElementById("filterColor");
    const categorySelect = document.getElementById("filterCategory");

    colors.forEach(color => {
        const option = document.createElement("option");
        option.value = color;
        option.textContent = color;
        colorSelect.append(option);
    });

    categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categorySelect.append(option);
    });

    const categoryFilters = document.getElementById("categoryFilters");
    categoryFilters.replaceChildren();

    ["Tất cả", ...categories].forEach((category, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `category-button${index === 0 ? " active" : ""}`;
        button.dataset.category = index === 0 ? "all" : category;
        button.textContent = category;
        categoryFilters.append(button);
    });
}

function applyFilters() {
    const minPrice = Number(document.getElementById("minPrice").value);
    const maxPrice = Number(document.getElementById("maxPrice").value);
    const color = document.getElementById("filterColor").value;
    const minRating = Number(document.getElementById("filterRating").value);
    const category = document.getElementById("filterCategory").value;
    const keyword = document.getElementById("searchInput").value.trim().toLowerCase();

    if (minPrice && maxPrice && minPrice > maxPrice) {
        productResult.textContent = "Giá từ không được lớn hơn giá đến.";
        return;
    }

    const filtered = products.filter(product =>
        (!minPrice || product.price >= minPrice) &&
        (!maxPrice || product.price <= maxPrice) &&
        (!color || product.color === color) &&
        (!minRating || product.rating >= minRating) &&
        (!category || product.category === category) &&
        (!keyword || product.title.toLowerCase().includes(keyword))
    );

    renderProducts(filtered);
}

function getVariant(button) {
    const card = button.closest(".product-card");
    const color = card.querySelector("[data-variant-color]").value;
    const size = card.querySelector("[data-variant-size]").value;
    return { color, size };
}

function addToCart(product, variant) {
    const key = `${product.id}|${variant.color}|${variant.size}`;
    const currentQuantity = cartState.items[key]?.quantity || 0;

    if (currentQuantity >= product.stock) {
        productResult.textContent = "Sản phẩm này không còn đủ tồn kho.";
        return;
    }

    if (cartState.items[key]) {
        cartState.items[key].quantity += 1;
    } else {
        cartState.items[key] = {
            id: product.id,
            title: product.title,
            price: product.price,
            image: product.image,
            color: variant.color,
            size: variant.size,
            quantity: 1
        };
    }

    saveCart();
    renderCart();
    productResult.textContent = `Đã thêm ${product.title} vào giỏ hàng.`;
}

const checkoutOverlay = document.getElementById("checkoutOverlay");
const checkoutForm = document.getElementById("checkoutForm");
const phoneInput = document.getElementById("customerPhone");
const emailInput = document.getElementById("customerEmail");

const phoneRegex = /^(?:(?:\+|00)84|0)(?:3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])\d{7}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateCheckoutField(input, regex, errorId, message) {
    const errorElement = document.getElementById(errorId);
    const valid = regex.test(input.value.trim());

    errorElement.textContent = input.value && !valid ? message : "";
    input.setCustomValidity(input.value && !valid ? message : "");

    return valid;
}

function validatePhone() {
    return validateCheckoutField(
        phoneInput,
        phoneRegex,
        "phoneError",
        "Nhập số điện thoại Việt Nam hợp lệ, ví dụ 0912345678 hoặc +84912345678."
    );
}

function validateEmail() {
    return validateCheckoutField(
        emailInput,
        emailRegex,
        "emailError",
        "Vui lòng nhập email hợp lệ."
    );
}

phoneInput.addEventListener("keyup", validatePhone);
phoneInput.addEventListener("blur", validatePhone);
emailInput.addEventListener("keyup", validateEmail);
emailInput.addEventListener("blur", validateEmail);

document.getElementById("checkoutButton").addEventListener("click", () => {
    if (Object.keys(cartState.items).length === 0) {
        productResult.textContent = "Giỏ hàng đang trống.";
        return;
    }

    document.getElementById("cartOverlay").hidden = true;
    checkoutOverlay.hidden = false;
});

document.getElementById("closeCheckoutButton").addEventListener("click", () => {
    checkoutOverlay.hidden = true;
});

checkoutForm.addEventListener("submit", event => {
    event.preventDefault();

    const phoneValid = validatePhone();
    const emailValid = validateEmail();

    if (!phoneValid || !emailValid || !checkoutForm.reportValidity()) return;

    const items = Object.values(cartState.items);
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = {
        id: `ORD-${Date.now()}`,
        createdAt: new Date().toISOString(),
        customer: {
            name: document.getElementById("customerName").value.trim(),
            email: emailInput.value.trim(),
            phone: phoneInput.value.trim(),
            address: document.getElementById("shippingAddress").value.trim()
        },
        items,
        total
    };

    try {
        const orders = JSON.parse(localStorage.getItem("minishop-orders") || "[]");
        orders.push(order);
        localStorage.setItem("minishop-orders", JSON.stringify(orders));

        cartState.items = {};
        saveCart();
        renderCart();
        checkoutForm.reset();
        document.getElementById("checkoutMessage").textContent =
            `Thanh toán thành công! Mã đơn hàng: ${order.id}`;
        productResult.textContent = "Đặt hàng thành công.";
    } catch (error) {
        console.error("Không thể lưu đơn hàng:", error);
        document.getElementById("checkoutMessage").textContent =
            "Không lưu được đơn hàng vào LocalStorage.";
    }
});

function renderCart() {
    const cartItems = document.getElementById("cartItems");
    const entries = Object.entries(cartState.items);
    const table = document.createElement("table");
    table.className = "mini-cart-table";

    const head = document.createElement("thead");
    head.innerHTML = "<tr><th>Sản phẩm</th><th>SL</th><th>Giá</th><th></th></tr>";

    const body = document.createElement("tbody");
    let total = 0;
    let count = 0;

    entries.forEach(([key, item]) => {
        total += item.price * item.quantity;
        count += item.quantity;

        const row = document.createElement("tr");

        const name = document.createElement("td");
        name.textContent = `${item.title} (${item.color}, ${item.size})`;

        const quantity = document.createElement("td");
        quantity.textContent = String(item.quantity);

        const price = document.createElement("td");
        price.textContent = `$${(item.price * item.quantity).toFixed(2)}`;

        const removeCell = document.createElement("td");
        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.textContent = "Xóa";
        removeButton.dataset.removeCartItem = key;
        removeButton.setAttribute("aria-label", `Xóa ${item.title} khỏi giỏ`);
        removeCell.append(removeButton);

        row.append(name, quantity, price, removeCell);
        body.append(row);
    });

    table.append(head, body);
    cartItems.replaceChildren();

    if (entries.length) {
        cartItems.append(table);
    } else {
        cartItems.textContent = "Giỏ hàng đang trống.";
    }

    document.getElementById("cartTotal").textContent = `$${total.toFixed(2)}`;
    document.getElementById("cartCount").textContent = String(count);
}

async function loadProducts() {
    try {
        productResult.textContent = "Đang tải sản phẩm...";
        products = await window.productsReady;
        populateFilters();
        renderProducts(products);
    } catch (error) {
        console.error("Không thể tải sản phẩm:", error);
        productResult.textContent =
            "Không tải được sản phẩm. Kiểm tra kết nối mạng hoặc API.";
        productContainer.replaceChildren();
    }
}

// Duy nhất một listener trên container để xử lý thao tác của các sản phẩm.
productContainer.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button || !productContainer.contains(button)) return;

    const product = products.find(item => String(item.id) === button.dataset.id);
    if (!product) return;

    if (button.dataset.action === "add") {
        addToCart(product, getVariant(button));
    } else if (button.dataset.action === "quick") {
        const overlay = document.getElementById("reviewOverlay");
        document.getElementById("reviewTitle").textContent = "Xem nhanh sản phẩm";
        document.getElementById("reviewContent").textContent =
            `${product.title} — $${product.price.toFixed(2)}. ${product.category}. Màu: ${product.color}. Còn ${product.stock} sản phẩm.`;
        overlay.hidden = false;
    }
});

advancedSearchForm.addEventListener("submit", event => {
    event.preventDefault();
    applyFilters();
});

advancedSearchForm.addEventListener("reset", () => {
    setTimeout(applyFilters);
});

document.getElementById("searchForm").addEventListener("submit", event => {
    event.preventDefault();
    applyFilters();
});

document.getElementById("categoryFilters").addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;

    document.querySelectorAll(".category-button").forEach(item => {
        item.classList.toggle("active", item === button);
    });

    document.getElementById("filterCategory").value =
        button.dataset.category === "all" ? "" : button.dataset.category;

    applyFilters();
});

document.getElementById("cartButton").addEventListener("click", () => {
    document.getElementById("cartOverlay").hidden = false;
});

document.getElementById("closeCartButton").addEventListener("click", () => {
    document.getElementById("cartOverlay").hidden = true;
});

document.getElementById("closeReviewButton").addEventListener("click", () => {
    document.getElementById("reviewOverlay").hidden = true;
});

document.getElementById("cartItems").addEventListener("click", event => {
    const button = event.target.closest("[data-remove-cart-item]");
    if (!button) return;

    delete cartState.items[button.dataset.removeCartItem];
    saveCart();
    renderCart();
});

renderCart();
loadProducts();