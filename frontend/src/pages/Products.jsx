import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Filter,
  Eye,
  CheckCircle,
  AlertTriangle,
  Store,
  Warehouse
} from 'lucide-react';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Badge from '../components/common/Badge';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export const Products = () => {
  const { success, error, warning } = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ACTIVE');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewUnitsModalOpen, setIsViewUnitsModalOpen] = useState(false);
  const [isConfirmDeactivateOpen, setIsConfirmDeactivateOpen] = useState(false);

  // Selected product states
  const [currentProduct, setCurrentProduct] = useState(null);
  const [productUnits, setProductUnits] = useState([]);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category_id: '',
    brand_id: '',
    description: '',
    size: '',
    color: '',
    purchase_price: 0,
    selling_price: 0,
    tax_percent: 12,
    discount_percent: 0,
    reorder_level: 5,
    status: 'ACTIVE'
  });

  useEffect(() => {
    fetchMetadata();
    fetchProducts();
  }, [search, selectedCategory, selectedBrand, selectedStatus]);

  const fetchMetadata = async () => {
    try {
      const [catRes, brandRes] = await Promise.all([
        api.get('/products/categories'),
        api.get('/products/brands')
      ]);
      setCategories(catRes.data?.categories || []);
      setBrands(brandRes.data?.brands || []);
    } catch (e) {}
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory) params.append('category_id', selectedCategory);
      if (selectedBrand) params.append('brand_id', selectedBrand);
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await api.get(`/products?${params.toString()}`);
      setProducts(res.data?.products || []);
    } catch (err) {
      error(err.message || 'Failed to load product catalog.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setFormData({
      sku: '',
      name: '',
      category_id: categories[0]?.id || '',
      brand_id: brands[0]?.id || '',
      description: '',
      size: '',
      color: '',
      purchase_price: 0,
      selling_price: 0,
      tax_percent: 12,
      discount_percent: 0,
      reorder_level: 5,
      status: 'ACTIVE'
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (prod) => {
    setCurrentProduct(prod);
    setFormData({
      sku: prod.sku,
      name: prod.name,
      category_id: prod.category_id || '',
      brand_id: prod.brand_id || '',
      description: prod.description || '',
      size: prod.size || '',
      color: prod.color || '',
      purchase_price: prod.purchase_price,
      selling_price: prod.selling_price,
      tax_percent: prod.tax_percent,
      discount_percent: prod.discount_percent,
      reorder_level: prod.reorder_level,
      status: prod.status
    });
    setIsEditModalOpen(true);
  };

  const handleViewUnits = async (prod) => {
    try {
      const res = await api.get(`/products/${prod.id}`);
      setCurrentProduct(res.data?.product);
      setProductUnits(res.data?.units || []);
      setIsViewUnitsModalOpen(true);
    } catch (err) {
      error(err.message || 'Failed to load product physical units.');
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      if (isEditModalOpen && currentProduct) {
        await api.put(`/products/${currentProduct.id}`, formData);
        success('Product updated successfully.');
        setIsEditModalOpen(false);
      } else {
        await api.post('/products', formData);
        success('New product created successfully.');
        setIsCreateModalOpen(false);
      }
      fetchProducts();
    } catch (err) {
      error(err.message || 'Failed to save product.');
    }
  };

  const handleDeactivate = async () => {
    if (!currentProduct) return;
    try {
      await api.delete(`/products/${currentProduct.id}`);
      success(`Product "${currentProduct.name}" deactivated.`);
      setIsConfirmDeactivateOpen(false);
      fetchProducts();
    } catch (err) {
      error(err.message || 'Failed to deactivate product.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide">PRODUCTS CATALOG</h2>
          <p className="text-xs text-slate-400 mt-1">Manage showroom inventory master catalog and prices</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 border border-blue-400/30 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-2xl bg-[#090d16] border border-slate-800">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU or Name..."
            className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="ACTIVE">Status: ACTIVE</option>
          <option value="INACTIVE">Status: INACTIVE</option>
          <option value="">All Statuses</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="rounded-3xl bg-[#090d16] border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-[#06090e]/80">
                <th className="py-3 px-4">SKU / Code</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category & Brand</th>
                <th className="py-3 px-4 text-right">Cost (₹)</th>
                <th className="py-3 px-4 text-right">Selling (₹)</th>
                <th className="py-3 px-4 text-center">Showroom</th>
                <th className="py-3 px-4 text-center">Warehouse</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">Loading catalog...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">No matching products found.</td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-400">{p.sku}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-xs">{p.name}</div>
                      {(p.size || p.color) && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {p.size && <span>Size: {p.size} </span>}
                          {p.color && <span>Color: {p.color}</span>}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-300 font-semibold">{p.category_name || '-'}</div>
                      <div className="text-[10px] text-slate-500">{p.brand_name || '-'}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      ₹{parseFloat(p.purchase_price || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      ₹{parseFloat(p.selling_price || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        p.showroom_stock <= p.reorder_level ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {p.showroom_stock || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-300">
                      {p.warehouse_stock || 0}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge status={p.status} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleViewUnits(p)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors active:scale-95"
                          title="View Barcode Units"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors active:scale-95"
                          title="Edit Product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {p.status === 'ACTIVE' && (
                          <button
                            onClick={() => {
                              setCurrentProduct(p);
                              setIsConfirmDeactivateOpen(true);
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors active:scale-95"
                            title="Deactivate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
        }}
        title={isEditModalOpen ? `Edit Product: ${currentProduct?.name}` : 'Create New Product Master'}
        subtitle="Catalog definition and selling price structure"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">SKU / Item Code *</label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g. CAR-SEAT-01"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs font-mono text-white focus:border-blue-500 focus:outline-none uppercase"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Product Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Premium Leather Seat Cover Set"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Category</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Brand</label>
              <select
                value={formData.brand_id}
                onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select Brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Size / Fit</label>
              <input
                type="text"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                placeholder="e.g. XL or Universal"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Color / Variant</label>
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="e.g. Midnight Black"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Purchase Price (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Selling Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-blue-500/50 px-3 py-2 text-xs font-mono font-bold text-blue-400 focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">GST Tax (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.tax_percent}
                onChange={(e) => setFormData({ ...formData, tax_percent: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Reorder Threshold</label>
              <input
                type="number"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Product Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed specifications or features..."
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 border border-blue-400/30 active:scale-95 transition-all"
            >
              {isEditModalOpen ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Individual Physical Units Drawer */}
      <Modal
        isOpen={isViewUnitsModalOpen}
        onClose={() => setIsViewUnitsModalOpen(false)}
        title={`Physical Product Units: ${currentProduct?.name}`}
        subtitle={`SKU: ${currentProduct?.sku} | Total Traceable Units: ${productUnits.length}`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-[#06090e]/80">
                  <th className="py-2.5 px-3">Unit Barcode</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Selling Price</th>
                  <th className="py-2.5 px-3 text-right">Added Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {productUnits.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/60">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-400">{u.barcode}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-300">
                      {u.location_id === 1 ? (
                        <span className="text-blue-400 flex items-center gap-1 font-bold"><Store className="w-3.5 h-3.5" /> Showroom</span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1 font-bold"><Warehouse className="w-3.5 h-3.5" /> Warehouse</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge status={u.status} />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-white font-bold">₹{parseFloat(u.selling_price || 0).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500 text-[10px]">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Confirm Deactivation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmDeactivateOpen}
        onClose={() => setIsConfirmDeactivateOpen(false)}
        onConfirm={handleDeactivate}
        title="Deactivate Product"
        message={`Are you sure you want to deactivate "${currentProduct?.name}"? It will no longer appear in POS search, but past transaction history and unit records will be safely preserved.`}
        confirmText="Deactivate"
        danger={true}
      />
    </div>
  );
};

export default Products;
