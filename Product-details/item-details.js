let currentQuantity = 1;
let currentProduct = null;
let currentAvailableStock = 0; // NEW: Tracks the current stock for dynamic updates

// --- Utility Functions ---

// Update cart count display in the header
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('ecommerceCart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartBadge = document.getElementById('cart-count-details');
    if (cartBadge) {
        cartBadge.textContent = totalItems;
    }
}

// ⭐ NEW: Updates the Quantity Controls, Stock Text, and Buy Button based on current state
function updateDetailsUI() {
    if (!currentProduct) return;
    
    const stockElement = document.getElementById('product-stock-text');
    const qtyInputElement = document.getElementById('qtyInput');
    const buyButton = document.getElementById('buyButton');
    const increaseBtn = document.getElementById('qtyIncreaseBtn');
    const decreaseBtn = document.getElementById('qtyDecreaseBtn');

    // 1. Recalculate stock availability (always pull fresh data)
    const productStocks = JSON.parse(localStorage.getItem('productStocks') || '{}');
    currentAvailableStock = (productStocks[currentProduct.id] !== undefined) ? productStocks[currentProduct.id] : currentProduct.stock;
    
    const stockText = currentAvailableStock > 0 ? `In Stock: ${currentAvailableStock} items` : "Out of Stock";
    const stockStatus = currentAvailableStock > 0 ? "in-stock" : "out-of-stock";

    // 2. Update stock display
    if (stockElement) {
        stockElement.textContent = stockText;
        stockElement.className = `product-stock ${stockStatus}`; // Apply class for coloring
    }
    
    // 3. Update Buy Button and Quantity Input logic
    if (currentAvailableStock === 0) {
        if (buyButton) {
            buyButton.disabled = true;
            buyButton.textContent = 'Out of Stock';
        }
        currentQuantity = 0;
    } else {
        if (buyButton) {
            buyButton.disabled = false;
            buyButton.textContent = 'Add to cart';
        }
        // Ensure quantity is >= 1 and <= available stock
        currentQuantity = Math.min(Math.max(1, currentQuantity), currentAvailableStock); 
    }

    if (qtyInputElement) qtyInputElement.value = currentQuantity;
    
    // 4. Update quantity buttons for better UX
    if (increaseBtn) increaseBtn.disabled = currentQuantity >= currentAvailableStock;
    if (decreaseBtn) decreaseBtn.disabled = currentQuantity <= 1;

    updateCartCount();
}

// --- Core Loading Function (Modified) ---

async function loadProductDetails() {
    const container = document.getElementById("details-container");
    const params = new URLSearchParams(window.location.search);
    const productId = parseInt(params.get("id"));

    try {
        const response = await fetch("../shared/data/Product-list.json");
        const data = await response.json();
        const products = data.products;
        const product = products.find(p => p.id === productId);

        if (!product) {
            container.innerHTML = "<h2>Product not found.</h2>";
            return;
        }

        currentProduct = product;
        currentQuantity = 1;

        // Ensure productStocks is initialized/loaded (same logic as before)
        let productStocks = JSON.parse(localStorage.getItem('productStocks') || '{}');
        if (!productStocks || Object.keys(productStocks).length === 0) {
            productStocks = {};
            products.forEach(p => productStocks[p.id] = p.stock);
            localStorage.setItem('productStocks', JSON.stringify(productStocks));
        }

        // Set initial stock value
        currentAvailableStock = (productStocks[product.id] !== undefined) ? productStocks[product.id] : product.stock;

        // Update breadcrumb and title
        const breadcrumb = document.getElementById("product-breadcrumb");
        if (breadcrumb) {
            breadcrumb.textContent = product.name;
        }
        document.title = `${product.name} - Product Details`;

        // Render INITIAL HTML structure with IDs for dynamic updates
        container.innerHTML = `
            <div class="product-wrapper">
                <div class="product-image-section">
                    <img src="${product.imageUrl}" alt="${product.name}">
                </div>
                <div class="product-info-section">
                    <h1>${product.name}</h1>
                    <p class="product-description">${product.description}</p>
                    <p class="product-price">₱${product.price.toFixed(2)}</p>
                    <p class="product-stock" id="product-stock-text"></p>
                    
                    <div class="quantity-selector">
                        <label>Quantity:</label>
                        <div class="quantity-controls">
                            <button class="qty-btn" id="qtyDecreaseBtn" onclick="decreaseQuantity()">−</button>
                            <input type="number" class="qty-input" id="qtyInput" value="1" min="1" readonly>
                            <button class="qty-btn" id="qtyIncreaseBtn" onclick="increaseQuantity()">+</button>
                        </div>
                    </div>
                    
                    <button class="buy-btn" id="buyButton" onclick="buyNow()">
                        Add to cart
                    </button>
                </div>
            </div>
        `;
        
        // After rendering the structure, initialize the UI state
        updateDetailsUI();

    } catch (error) {
        container.innerHTML = "<h2>Error loading product data.</h2>";
        console.error(error);
    }
}

// --- Action Functions (Modified to use currentAvailableStock and updateDetailsUI) ---

function increaseQuantity() {
    // Uses the global currentAvailableStock
    if (currentQuantity < currentAvailableStock) {
        currentQuantity++;
        updateDetailsUI();
    }
}

function decreaseQuantity() {
    if (currentQuantity > 1) {
        currentQuantity--;
        updateDetailsUI();
    }
}

function buyNow() {
    if (currentProduct && currentQuantity > 0 && currentAvailableStock >= currentQuantity) {
        
        // 1. Perform stock deduction and save
        let productStocks = JSON.parse(localStorage.getItem('productStocks') || '{}');
        productStocks[currentProduct.id] = currentAvailableStock - currentQuantity;
        localStorage.setItem('productStocks', JSON.stringify(productStocks));

        // 2. Add to cart and save
        let cart = JSON.parse(localStorage.getItem('ecommerceCart')) || [];
        const existingItem = cart.find(item => item.id === currentProduct.id);

        if (existingItem) {
            existingItem.quantity += currentQuantity;
        } else {
            cart.push({
                ...currentProduct, // Simplified addition using spread syntax
                quantity: currentQuantity
            });
        }
        localStorage.setItem('ecommerceCart', JSON.stringify(cart));

        // 3. User Feedback (NEW)
        alert(`Successfully added ${currentQuantity} x ${currentProduct.name} to your cart!`);

        // 4. Reset quantity and trigger UI update
        currentQuantity = 1; 
        window.dispatchEvent(new Event('cartUpdated')); // Triggers updateDetailsUI via listener

        // OPTIONAL: Uncomment this line if you want to redirect the user immediately
        // window.location.href = '../Cart/index.html';
        
    } else if (currentAvailableStock === 0) {
        alert('This product is out of stock.');
    } else if (currentAvailableStock < currentQuantity) {
        alert(`Not enough stock available. Only ${currentAvailableStock} items left.`);
    }
}

// --- Event Listeners and Initialization ---

// Initialize cart and load details on page load
window.addEventListener('DOMContentLoaded', loadProductDetails);
// Note: We don't call updateCartCount() here anymore, as it's called inside loadProductDetails / updateDetailsUI.

// Listen for storage changes and updates from the cart page
window.addEventListener('storage', updateCartCount);
window.addEventListener('cartUpdated', () => {
    // Re-run the UI update logic to reflect stock changes made on other pages (like the cart page)
    updateDetailsUI(); 
    updateCartCount();
});