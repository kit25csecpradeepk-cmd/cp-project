"use strict";

// DEMO LOGIN
const DEMO_USERNAME = "admin";
const DEMO_PASSWORD = "1234";

const $ = (id) => document.getElementById(id);
const money = (amount) =>
  "₹" + Number(amount || 0).toFixed(2);

let products = [
  { id: 1, name: "Electrical Wire", price: 50, unit: "metre" },
  { id: 2, name: "LED Bulb", price: 90, unit: "piece" },
  { id: 3, name: "Switch", price: 35, unit: "piece" },
  { id: 4, name: "Socket", price: 60, unit: "piece" },
  { id: 5, name: "PVC Pipe", price: 120, unit: "piece" }
];

let items = [];
let nextProductId = 6;
let currentBill = null;

let shop = {
  name: "Smart Electrical Shop",
  address: "Your Shop Address"
};

// LOGIN
$("loginBtn").addEventListener("click", () => {
  const username = $("username").value.trim();
  const password = $("password").value;

  if (username === DEMO_USERNAME && password === DEMO_PASSWORD) {
    $("loginSection").classList.add("hidden");
    $("appSection").classList.remove("hidden");
    $("logoutBtn").classList.remove("hidden");
    $("loginError").textContent = "";
    initializeApp();
  } else {
    $("loginError").textContent =
      "Wrong username or password. Try admin / 1234.";
  }
});

$("password").addEventListener("keydown", (event) => {
  if (event.key === "Enter") $("loginBtn").click();
});

$("logoutBtn").addEventListener("click", () => {
  $("appSection").classList.add("hidden");
  $("loginSection").classList.remove("hidden");
  $("logoutBtn").classList.add("hidden");
});

// INITIALIZE
function initializeApp() {
  $("shopName").value = shop.name;
  $("shopAddress").value = shop.address;
  renderProducts();
  renderProductPicker();
  renderItems();
  updateTotals();
}

// SHOP DETAILS
$("saveShopBtn").addEventListener("click", () => {
  shop.name = $("shopName").value.trim() || "Electrical Shop";
  shop.address = $("shopAddress").value.trim();

  alert("Shop details saved.");
});

// ADD NEW PRODUCT
$("productForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const name = $("newProductName").value.trim();
  const price = Number($("newProductPrice").value);
  const unit = $("newProductUnit").value;

  if (!name || !Number.isFinite(price) || price <= 0) {
    alert("Enter a valid product name and price.");
    return;
  }

  products.push({
    id: nextProductId++,
    name,
    price,
    unit
  });

  $("newProductName").value = "";
  $("newProductPrice").value = "";

  renderProducts();
  renderProductPicker();
  updateTotals();
});

// SHOW PRODUCTS IN MANAGEMENT LIST
function renderProducts() {
  $("productCount").textContent = products.length;

  const list = $("productList");

  if (products.length === 0) {
    list.innerHTML = "<p class='hint'>No products added yet.</p>";
    return;
  }

  list.innerHTML = products.map(product => `
    <div class="saved-product">
      <div>
        <strong>${escapeHTML(product.name)}</strong><br>
        <small>${money(product.price)} / ${escapeHTML(product.unit)}</small>
      </div>
      <button class="delete-product" data-delete="${product.id}">
        Delete
      </button>
    </div>
  `).join("");

  list.querySelectorAll("[data-delete]").forEach(button => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.delete);
      const product = products.find(p => p.id === id);

      if (!product) return;

      if (!confirm(`Delete ${product.name}?`)) return;

      products = products.filter(p => p.id !== id);
      items = items.filter(item => item.id !== id);

      renderProducts();
      renderProductPicker();
      renderItems();
      updateTotals();
    });
  });
}

// BLINKIT-STYLE PRODUCT PICKER
function renderProductPicker() {
  const picker = $("productPicker");

  if (products.length === 0) {
    picker.innerHTML = "<p class='hint'>Add products above to start billing.</p>";
    return;
  }

  picker.innerHTML = products.map(product => {
    const item = items.find(i => i.id === product.id);
    const quantity = item ? item.quantity : 0;

    return `
      <div class="product-option">
        <div>
          <div class="product-name">${escapeHTML(product.name)}</div>
          <p class="product-price">
            ${money(product.price)} / ${escapeHTML(product.unit)}
          </p>
        </div>
        <div class="quantity-control">
          <button type="button"
            data-product="${product.id}"
            data-change="-1"
            aria-label="Decrease ${escapeHTML(product.name)}">−</button>
          <span class="qty-value">${quantity}</span>
          <button type="button" class="plus"
            data-product="${product.id}"
            data-change="1"
            aria-label="Increase ${escapeHTML(product.name)}">+</button>
        </div>
      </div>
    `;
  }).join("");

  picker.querySelectorAll("button[data-product]").forEach(button => {
    button.addEventListener("click", () => {
      adjustProduct(
        Number(button.dataset.product),
        Number(button.dataset.change)
      );
    });
  });
}

// PLUS / MINUS QUANTITY
function adjustProduct(productId, change) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  let item = items.find(i => i.id === productId);

  if (!item && change > 0) {
    items.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
      unit: product.unit
    });
  } else if (item) {
    item.quantity += change;

    if (item.quantity <= 0) {
      items = items.filter(i => i.id !== productId);
    }
  }

  // A change to the bill means the previous generated bill is no longer current.
  currentBill = null;
  $("billPreview").classList.add("hidden");
  $("shareNote").textContent = "";

  renderProductPicker();
  renderItems();
  updateTotals();
}

// SHOW BILL ITEMS
function renderItems() {
  const tbody = $("billItems");

  if (items.length === 0) {
    tbody.innerHTML =
      "<tr><td colspan='4'>No products selected yet.</td></tr>";
    return;
  }

  tbody.innerHTML = items.map(item => `
    <tr>
      <td>${escapeHTML(item.name)}</td>
      <td>${item.quantity} ${escapeHTML(item.unit)}</td>
      <td>${money(item.price)}</td>
      <td>${money(item.price * item.quantity)}</td>
    </tr>
  `).join("");
}

// CALCULATE TOTALS
function calculateTotals() {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity, 0
  );

  // Demo rule: GST amount is capped at ₹5.
  // This is not a substitute for legally applicable GST calculation.
  const gst = Math.min(subtotal * 0.18, 5);
  const total = subtotal + gst;

  return { subtotal, gst, total };
}

function updateTotals() {
  const totals = calculateTotals();

  $("subtotal").textContent = money(totals.subtotal);
  $("gstAmount").textContent = money(totals.gst);
  $("grandTotal").textContent = money(totals.total);
  $("dashboardTotal").textContent = money(totals.total);

  $("billItemCount").textContent = items.reduce(
    (sum, item) => sum + item.quantity, 0
  );

  renderProducts();
}

// GENERATE BILL
$("generateBillBtn").addEventListener("click", () => {
  if (items.length === 0) {
    alert("Please select at least one product.");
    return;
  }

  shop.name = $("shopName").value.trim() || "Electrical Shop";
  shop.address = $("shopAddress").value.trim();

  const totals = calculateTotals();
  const now = new Date();

  currentBill = {
    number: "BILL-" + now.getTime(),
    date: now.toLocaleString(),
    customer: $("customerName").value.trim() || "Walk-in Customer",
    phone: $("customerPhone").value.trim(),
    shop: { ...shop },
    items: items.map(item => ({ ...item })),
    subtotal: totals.subtotal,
    gst: totals.gst,
    total: totals.total
  };

  $("billPreview").innerHTML = `
    <h2>${escapeHTML(currentBill.shop.name)}</h2>
    <p>${escapeHTML(currentBill.shop.address)}</p>
    <hr>
    <p><strong>Bill No:</strong> ${currentBill.number}</p>
    <p><strong>Date:</strong> ${escapeHTML(currentBill.date)}</p>
    <p><strong>Customer:</strong> ${escapeHTML(currentBill.customer)}</p>
    <hr>
    ${currentBill.items.map(item => `
      <p>${escapeHTML(item.name)} × ${item.quantity}
      — ${money(item.price * item.quantity)}</p>
    `).join("")}
    <hr>
    <p>Subtotal: <strong>${money(currentBill.subtotal)}</strong></p>
    <p>GST: <strong>${money(currentBill.gst)}</strong></p>
    <h3>Grand Total: ${money(currentBill.total)}</h3>
    <p>Thank you for shopping with us!</p>
  `;

  $("billPreview").classList.remove("hidden");
  $("shareNote").textContent = "Bill generated successfully.";
});

// CREATE BILL IMAGE
function makeBillBlob(bill) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Canvas is not supported."));
        return;
      }

      const width = 800;
      const rowHeight = 42;
      const height = 390 + bill.items.length * rowHeight;

      canvas.width = width;
      canvas.height = height;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      let y = 55;

      ctx.fillStyle = "#123b66";
      ctx.font = "bold 30px Arial";
      ctx.fillText(bill.shop.name.slice(0, 38), 40, y);

      y += 35;
      ctx.fillStyle = "#333333";
      ctx.font = "18px Arial";
      ctx.fillText(bill.shop.address.slice(0, 60), 40, y);

      y += 38;
      ctx.fillText("Bill No: " + bill.number, 40, y);
      y += 28;
      ctx.fillText("Date: " + bill.date, 40, y);
      y += 28;
      ctx.fillText("Customer: " + bill.customer.slice(0, 40), 40, y);

      y += 35;
      ctx.strokeStyle = "#cbd5e1";
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(760, y);
      ctx.stroke();

      y += 30;
      ctx.font = "bold 18px Arial";
      ctx.fillText("Product", 40, y);
      ctx.fillText("Qty", 430, y);
      ctx.fillText("Price", 520, y);
      ctx.fillText("Amount", 650, y);

      y += 20;
      ctx.font = "17px Arial";

      bill.items.forEach(item => {
        y += rowHeight;
        ctx.fillText(item.name.slice(0, 30), 40, y);
        ctx.fillText(String(item.quantity), 430, y);
        ctx.fillText(money(item.price), 520, y);
        ctx.fillText(money(item.price * item.quantity), 650, y);
      });

      y += 25;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(760, y);
      ctx.stroke();

      y += 35;
      ctx.font = "18px Arial";
      ctx.fillText("Subtotal: " + money(bill.subtotal), 500, y);
      y += 30;
      ctx.fillText("GST: " + money(bill.gst), 500, y);

      y += 38;
      ctx.fillStyle = "#123b66";
      ctx.font = "bold 25px Arial";
      ctx.fillText("Grand Total: " + money(bill.total), 430, y);

      y += 45;
      ctx.fillStyle = "#333333";
      ctx.font = "18px Arial";
      ctx.fillText("Thank you for shopping with us!", 40, y);

      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error("Could not create bill image."));
      }, "image/png");
    } catch (error) {
      reject(error);
    }
  });
}

// DOWNLOAD BILL IMAGE
$("downloadBtn").addEventListener("click", async () => {
  if (!currentBill) {
    alert("First click Generate Bill.");
    return;
  }

  try {
    const blob = await makeBillBlob(currentBill);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = currentBill.number + ".png";
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (error) {
    alert("Could not download the bill image.");
  }
});

// SHARE BILL THROUGH WHATSAPP
$("shareBtn").addEventListener("click", async () => {
  if (!currentBill) {
    alert("First click Generate Bill.");
    return;
  }

  let phone = $("customerPhone").value.replace(/\D/g, "");

  // If 10 digits are entered, assume India country code +91.
  if (phone.length === 10) {
    phone = "91" + phone;
  }

  if (phone.length < 11 || phone.length > 15) {
    alert("Enter a valid customer mobile number with country code if needed.");
    return;
  }

  const bill = currentBill;
  const message =
    `${bill.shop.name}\n` +
    `Bill No: ${bill.number}\n` +
    `Customer: ${bill.customer}\n` +
    `Total: ${money(bill.total)}\n` +
    `Thank you for shopping with us!`;

  const whatsappURL =
    "https://wa.me/" + phone + "?text=" + encodeURIComponent(message);

  // Open WhatsApp from the button click, then prepare the image.
  window.open(whatsappURL, "_blank");

  try {
    const blob = await makeBillBlob(bill);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = bill.number + ".png";
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 3000);

    $("shareNote").textContent =
      "Bill image downloaded and WhatsApp chat opened. " +
      "Attach the downloaded PNG in WhatsApp and tap Send.";
  } catch (error) {
    $("shareNote").textContent =
      "WhatsApp chat opened, but bill image could not be created.";
  }
});

// CLEAR CURRENT BILL
$("clearBillBtn").addEventListener("click", () => {
  if (!confirm("Clear all selected items from this bill?")) return;

  items = [];
  currentBill = null;

  $("customerName").value = "";
  $("customerPhone").value = "";
  $("billPreview").innerHTML = "";
  $("billPreview").classList.add("hidden");
  $("shareNote").textContent = "";

  renderProductPicker();
  renderItems();
  updateTotals();
});

// BASIC HTML ESCAPING FOR PRODUCT / SHOP TEXT
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}
