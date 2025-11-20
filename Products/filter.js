// --- CATEGORY FILTER ---
function getSelectedCategories() {
    const checkboxes = document.querySelectorAll(".filter-group input[type='checkbox']");
    let selected = [];

    checkboxes.forEach((cb, index) => {
        if (cb.checked) {
            // Map checkboxes to real categories
            if (index === 0) selected.push("Oral Care");
            if (index === 1) selected.push("Kitchen");
            if (index === 2) selected.push("Bath");
            if (index === 3) selected.push("Cleaning");
        }
    });

    return selected;
}

// --- PRICE RANGE FILTER ---
function getPriceRange() {
    let min = document.querySelector(".price-inputs input:nth-child(2)").value;
    let max = document.querySelector(".price-inputs input:nth-child(3)").value;

    min = min ? parseFloat(min) : 0;
    max = max ? parseFloat(max) : Infinity;

    return { min, max };
}

// --- APPLYING FILTERS ---
function applyFilters() {
    const categories = getSelectedCategories();
    const priceRange = getPriceRange();

    filteredProducts = allProducts.filter(product => {
        const inCategory = categories.length === 0 || categories.includes(product.category);
        const inPrice = product.price >= priceRange.min && product.price <= priceRange.max;

        return inCategory && inPrice;
    });

    renderProducts(filteredProducts);
}

// --- EVENT LISTENERS ---
document.querySelectorAll(".filter-group input").forEach(cb => {
    cb.addEventListener("change", applyFilters);
});

document.querySelector(".apply-btn").addEventListener("click", applyFilters);
