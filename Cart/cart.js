// Cart management using localStorage
let cart = [];
let productStocks = {};

// --- Initialization and Stock Management ---

async function ensureProductStocks() {
    const stored = localStorage.getItem('productStocks');
    if (stored) {
        productStocks = JSON.parse(stored);
        return;
    }
    try {
        const resp = await fetch('../shared/data/Product-list.json');
        const data = await resp.json();
        productStocks = {};
        data.products.forEach(p => productStocks[p.id] = p.stock);
        localStorage.setItem('productStocks', JSON.stringify(productStocks));
    } catch (e) {
        console.error('Failed to initialize productStocks:', e);
    }
}

async function initializeCart() {
    await ensureProductStocks();
    // Load cart from localStorage
    const savedCart = localStorage.getItem('ecommerceCart');
    cart = savedCart ? JSON.parse(savedCart) : [];
    renderCart();
    updateSummary();
}

async function resetProductStocks() {
    try {
        const resp = await fetch('../shared/data/Product-list.json');
        const data = await resp.json();

        // build base stocks from JSON
        const baseStocks = {};
        data.products.forEach(p => baseStocks[p.id] = p.stock);

        // subtract current cart quantities so productStocks represent remaining stock
        const savedCart = localStorage.getItem('ecommerceCart');
        const currentCart = savedCart ? JSON.parse(savedCart) : [];
        currentCart.forEach(item => {
            if (baseStocks[item.id] === undefined) baseStocks[item.id] = 0;
            baseStocks[item.id] = Math.max(0, baseStocks[item.id] - (item.quantity || 0));
        });

        // save and notify
        productStocks = baseStocks;
        localStorage.setItem('productStocks', JSON.stringify(productStocks));
        window.dispatchEvent(new Event('cartUpdated'));
        alert('Product stocks have been reset from Product-list.json (cart quantities preserved).');
    } catch (e) {
        console.error('Failed to reset product stocks:', e);
        alert('Failed to reset stocks. See console for details.');
    }
}

// --- Cart Modification and Saving ---

function addToCart(product, quantity) {
    const existingItem = cart.find(item => item.id === product.id);
    if (productStocks[product.id] === undefined) productStocks[product.id] = product.stock || 0;

    const available = productStocks[product.id];
    const qtyToAdd = Math.min(quantity, available);
    if (qtyToAdd <= 0) {
        alert('Product out of stock');
        return;
    }

    if (existingItem) {
        existingItem.quantity += qtyToAdd;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            imageUrl: product.imageUrl,
            quantity: qtyToAdd
        });
    }

    productStocks[product.id] = available - qtyToAdd;
    saveProductStocks();
    saveCart();
    renderCart();
    updateSummary();
}

function removeFromCart(productId) {
    const item = cart.find(i => i.id === productId);
    if (item) {
        // return stock
        productStocks[productId] = (productStocks[productId] || 0) + item.quantity;
    }
    cart = cart.filter(item => item.id !== productId);
    saveProductStocks();
    saveCart();
    renderCart();
    updateSummary();
}

function updateQuantity(productId, quantity) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;

    const newQty = Math.max(1, quantity);
    const diff = newQty - item.quantity;

    if (diff === 0) return;

    if (diff > 0) {
        const available = productStocks[productId] || 0;
        const allowed = Math.min(diff, available);
        if (allowed <= 0) {
            alert('No more stock available');
            return;
        }
        item.quantity += allowed;
        productStocks[productId] = available - allowed;
    } else {
        const returning = -diff;
        item.quantity = newQty;
        productStocks[productId] = (productStocks[productId] || 0) + returning;
    }

    saveProductStocks();
    saveCart();
    renderCart();
    updateSummary();
}

function saveCart() {
    localStorage.setItem('ecommerceCart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
}

function saveProductStocks() {
    localStorage.setItem('productStocks', JSON.stringify(productStocks));
    window.dispatchEvent(new Event('cartUpdated'));
}

// --- UI Rendering and Event Handling ---

function renderCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart">
                <h3>Your cart is empty</h3>
                <p>Start shopping to add items to your cart!</p>
            </div>
        `;
        return;
    }

    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item" data-product-id="${item.id}">
            <img src="${item.imageUrl}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-details">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-description">${item.description.substring(0, 60)}...</div>
            </div>
            <div class="quantity-controls-cart">
                <button class="qty-btn-cart" data-action="decrease" data-id="${item.id}">−</button>
                <input type="number" class="qty-input-cart" value="${item.quantity}" readonly>
                <button class="qty-btn-cart" data-action="increase" data-id="${item.id}">+</button>
            </div>
            <div class="cart-item-total">₱${(item.price * item.quantity).toFixed(2)}</div>
            <button class="remove-btn" data-action="remove" data-id="${item.id}">Remove</button>
        </div>
    `).join('');

    attachCartEventListeners(); 
}

function attachCartEventListeners() {
    // 1. Quantity buttons
    document.querySelectorAll('.qty-btn-cart').forEach(button => {
        button.removeEventListener('click', handleCartAction);
        button.addEventListener('click', handleCartAction);
    });

    // 2. Remove buttons
    document.querySelectorAll('.remove-btn').forEach(button => {
        button.removeEventListener('click', handleCartAction);
        button.addEventListener('click', handleCartAction);
    });
}

function handleCartAction(e) {
    const productId = parseInt(e.target.dataset.id);
    const action = e.target.dataset.action;
    const item = cart.find(i => i.id === productId);

    if (action === 'remove') {
        removeFromCart(productId);
    } else if (item) {
        if (action === 'increase') {
            updateQuantity(productId, item.quantity + 1);
        } else if (action === 'decrease') {
            updateQuantity(productId, item.quantity - 1);
        }
    }
}

function updateSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = cart.length > 0 ? 50 : 0; // Fixed shipping fee
    const total = subtotal + shipping;

    document.getElementById('subtotal').textContent = `₱${subtotal.toFixed(2)}`;
    document.getElementById('shipping').textContent = `₱${shipping.toFixed(2)}`;
    document.getElementById('total').textContent = `₱${total.toFixed(2)}`;
}


// --- Payment and Checkout Logic (NEW/REPLACED) ---

// Opens the payment modal
function checkout() {
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    // Calculate totals for display
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = 50; 
    const total = subtotal + shipping;

    // Update the payment modal summary
    document.getElementById('modal-total-amount').textContent = `₱${total.toFixed(2)}`;
    
    // Show the payment modal
    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Simulates processing the payment
function processPayment() {
    const paymentMethod = document.querySelector('input[name="payment-option"]:checked')?.value;
    
    if (!paymentMethod) {
        alert('Please select a payment method.');
        return;
    }

    // 1. Hide the modal and show loading/processing (Simulated Delay)
    document.getElementById('payment-modal').style.display = 'none';
    const processingMessage = document.getElementById('processing-message');
    if (processingMessage) {
        processingMessage.style.display = 'block';
    }

    setTimeout(() => {
        if (processingMessage) {
            processingMessage.style.display = 'none';
        }
        
        // 2. Clear the cart and save state
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + 50;
        
        // Final confirmation and state reset
        alert(`Payment Successful! Your order has been placed via ${paymentMethod}. Total Paid: ₱${total.toFixed(2)}.`);
        
        cart = []; // Clear the cart
        saveCart(); // Save the empty cart to localStorage (includes event dispatch)
        renderCart(); // Re-render the empty cart UI
        updateSummary(); // Update totals to zero

    }, 2000); // 2 second simulated payment processing delay
}


function closeModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}


// --- Initialization ---

// Initialize cart on page load
window.addEventListener('DOMContentLoaded', initializeCart);
// wire reset button
window.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('reset-stocks-btn');
    if (btn) btn.addEventListener('click', () => {
        if (confirm('Reset product stocks from Product-list.json? This will preserve cart quantities and update remaining stock.')) {
            resetProductStocks();
        }
    });
});