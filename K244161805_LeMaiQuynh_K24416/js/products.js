(() => {
    window.productsReady = (async () => {
        const response = await fetch("https://fakestoreapi.com/products");

        if (!response.ok) {
            throw new Error(`Lỗi tải sản phẩm: HTTP ${response.status}`);
        }

        const apiProducts = await response.json();

        return apiProducts.map(product => ({
            id: String(product.id),
            title: product.title,
            price: Number(product.price) || 0,
            category: product.category || "",
            image: product.image || "",
            color: "Mặc định",
            stock: 10, // Tồn kho giả lập, API không cung cấp trường này
            rating: Number(product.rating?.rate) || 0,
            ratingCount: Number(product.rating?.count) || 0
        }));
    })();

    window.productsReady.catch(error => {
        console.error("Không thể tải sản phẩm:", error);
    });
})();