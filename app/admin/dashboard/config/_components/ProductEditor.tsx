'use client';
import React, { useState, useEffect } from 'react';

interface Product {
    id: number;
    name: string;
    price: number;
}

interface ProductEditorProps {
    category: string;
    categoryDisplayName: string;
}

export default function ProductEditor({ category, categoryDisplayName }: ProductEditorProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editPrice, setEditPrice] = useState('');
    const [newProductName, setNewProductName] = useState('');
    const [newProductPrice, setNewProductPrice] = useState('');

    useEffect(() => {
        // 从 localStorage 加载产品数据
        const savedProducts = localStorage.getItem(`products_${category}`);
        if (savedProducts) {
            setProducts(JSON.parse(savedProducts));
        }
    }, [category]);

    const saveProducts = (newProducts: Product[]) => {
        localStorage.setItem(`products_${category}`, JSON.stringify(newProducts));
        setProducts(newProducts);
    };

    const handleAddProduct = () => {
        if (!newProductName || !newProductPrice) {
            alert('请填写完整的产品信息');
            return;
        }

        const newProduct: Product = {
            id: Date.now(),
            name: newProductName,
            price: parseFloat(newProductPrice),
        };

        saveProducts([...products, newProduct]);
        setNewProductName('');
        setNewProductPrice('');
    };

    const handleEditClick = (product: Product) => {
        setEditingId(product.id);
        setEditName(product.name);
        setEditPrice(product.price.toString());
    };

    const handleSaveEdit = () => {
        if (!editName || !editPrice) {
            alert('请填写完整的产品信息');
            return;
        }

        const updatedProducts = products.map((p) =>
            p.id === editingId ? { ...p, name: editName, price: parseFloat(editPrice) } : p
        );

        saveProducts(updatedProducts);
        setEditingId(null);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditName('');
        setEditPrice('');
    };

    const handleDelete = (id: number) => {
        if (confirm('确定要删除这个产品吗?')) {
            const updatedProducts = products.filter((p) => p.id !== id);
            saveProducts(updatedProducts);
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">{categoryDisplayName} 配置</h2>

            {/* 添加新产品 */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">添加新产品</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            产品名称
                        </label>
                        <input
                            type="text"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newProductName}
                            onChange={(e) => setNewProductName(e.target.value)}
                            placeholder="输入产品名称"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            价格 ($)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newProductPrice}
                            onChange={(e) => setNewProductPrice(e.target.value)}
                            placeholder="输入价格"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={handleAddProduct}
                            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline w-full"
                        >
                            添加
                        </button>
                    </div>
                </div>
            </div>

            {/* 产品列表 */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">
                                ID
                            </th>
                            <th scope="col" className="px-6 py-3">
                                产品名称
                            </th>
                            <th scope="col" className="px-6 py-3">
                                价格 ($)
                            </th>
                            <th scope="col" className="px-6 py-3">
                                操作
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                    暂无产品数据,请添加产品
                                </td>
                            </tr>
                        ) : (
                            products.map((product) => (
                                <tr key={product.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4">{product.id}</td>
                                    <td className="px-6 py-4">
                                        {editingId === product.id ? (
                                            <input
                                                type="text"
                                                className="border rounded py-1 px-2 w-full"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                            />
                                        ) : (
                                            product.name
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingId === product.id ? (
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="border rounded py-1 px-2 w-24"
                                                value={editPrice}
                                                onChange={(e) => setEditPrice(e.target.value)}
                                            />
                                        ) : (
                                            `$${product.price.toFixed(2)}`
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingId === product.id ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleSaveEdit}
                                                    className="text-green-600 hover:text-green-800 font-medium"
                                                >
                                                    保存
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="text-gray-600 hover:text-gray-800 font-medium"
                                                >
                                                    取消
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEditClick(product)}
                                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                                >
                                                    编辑
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="text-red-600 hover:text-red-800 font-medium"
                                                >
                                                    删除
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
