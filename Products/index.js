// Load products JSON and render them
let allProducts = [];
let filteredProducts = [];
let productStocks = {};

// Update cart count on page load and when cart changes
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('ecommerceCart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartBadge = document.getElementById('cart-count');
    if (cartBadge) {
        cartBadge.textContent = totalItems;
    }
}

async function loadProducts() {
    try {
        const response = await fetch("../shared/data/Product-list.json");
        const data = await response.json();
        allProducts = data.products;
        filteredProducts = allProducts;
        // initialize productStocks if not present
        const stored = localStorage.getItem('productStocks');
        if (stored) {
            productStocks = JSON.parse(stored);
        } else {
            productStocks = {};
            allProducts.forEach(p => productStocks[p.id] = p.stock);
            localStorage.setItem('productStocks', JSON.stringify(productStocks));
        }
        renderProducts(filteredProducts);
    } catch (error) {
        console.error("Error loading products:", error);
    }
}

function renderProducts(products) {
    const container = document.querySelector(".content-area");
    container.innerHTML = ""; // clear previous list

    products.forEach(product => {
        const card = document.createElement("div");
        card.classList.add("card");

        const availableStock = (productStocks && productStocks[product.id] !== undefined) ? productStocks[product.id] : product.stock;

        card.innerHTML = `
    <div class="img-placeholder">
        <img src="${product.imageUrl}" alt="${product.name}" style="max-width:100%; max-height:100%; object-fit:cover;">
    </div>
    <h4>${product.name}</h4>
    <p><strong>₱${product.price}</strong></p>
    <p>Stock: ${availableStock}</p>
`;

card.addEventListener("click", () => {
    window.location.href = `../Product-details/index.html?id=${product.id}`;
});

        container.appendChild(card);
    });
}

loadProducts();
updateCartCount();

function refreshUI() {
    updateCartCount();
    // re-render current filtered products to reflect stock changes
    renderProducts(filteredProducts);
}

// Listen for storage changes (when cart is updated in another tab/window)
window.addEventListener('storage', refreshUI);
window.addEventListener('cartUpdated', refreshUI);
