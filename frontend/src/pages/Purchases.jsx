import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Eye,
  Barcode,
  Printer,
  Calendar,
  CheckCircle2,
  Trash2,
  Package,
  Store,
  Warehouse,
  Sparkles,
  Tag,
  Check,
  Layers,
  ArrowRight
} from 'lucide-react';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import BarcodeLabel from '../components/barcode/BarcodeLabelViewer';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export const Purchases = () => {
  const { success, error, warning } = useToast();
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isBarcodePrintModalOpen, setIsBarcodePrintModalOpen] = useState(false);
  const [isQuickProductModalOpen, setIsQuickProductModalOpen] = useState(false);

  const [currentPurchase, setCurrentPurchase] = useState(null);
  const [currentPurchaseItems, setCurrentPurchaseItems] = useState([]);
  const [generatedBarcodeUnits, setGeneratedBarcodeUnits] = useState([]);

  // Target row index for inline product creation (-1 means general creation from header)
  const [quickProductTargetRow, setQuickProductTargetRow] = useState(-1);

  // Quick Product Form State
  const [quickProductForm, setQuickProductForm] = useState({
    name: '',
    sku: '',
    category_id: '',
    brand_id: '',
    purchase_price: '',
    selling_price: '',
    tax_percent: '12.00',
    reorder_level: 5,
    description: ''
  });
  const [creatingProduct, setCreatingProduct] = useState(false);

  // New Purchase Form state
  const [formData, setFormData] = useState({
    supplier_id: '',
    supplier_invoice_no: '',
    purchase_date: new Date().toISOString().slice(0, 10),
    initial_location_id: 1, // Default: 1 = Showroom, 2 = Warehouse
    paid_amount: 0,
    payment_method: 'OTHER',
    notes: '',
    items: [
      { product_id: '', quantity: 10, purchase_price: 0, selling_price: 0, tax_percent: 12, discount_percent: 0, location_id: 1 }
    ]
  });

  useEffect(() => {
    fetchMetadata();
    fetchPurchases();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [supRes, prodRes, catRes, brandRes] = await Promise.all([
        api.get('/suppliers?status=ACTIVE'),
        api.get('/products?status=ACTIVE'),
        api.get('/products/categories'),
        api.get('/products/brands')
      ]);
      const supList = supRes.data?.suppliers || [];
      const prodList = prodRes.data?.products || [];
      const catList = catRes.data?.categories || [];
      const brandList = brandRes.data?.brands || [];

      setSuppliers(supList);
      setProducts(prodList);
      setCategories(catList);
      setBrands(brandList);

      if (supList.length > 0) {
        setFormData(prev => ({ ...prev, supplier_id: supList[0].id }));
      }
    } catch (e) {
      console.error('Failed to load purchase metadata:', e);
    }
  };

  const fetchPurchases = async (search = searchTerm) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const res = await api.get(`/purchases?${params.toString()}`);
      setPurchases(res.data?.purchases || []);
    } catch (err) {
      error(err.message || 'Failed to fetch purchase orders.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPurchases(searchTerm);
  };

  // Change destination location for whole purchase and sync to all rows
  const handleSelectDestinationLocation = (locId) => {
    setFormData(prev => ({
      ...prev,
      initial_location_id: locId,
      items: prev.items.map(item => ({ ...item, location_id: locId }))
    }));
  };

  const handleAddItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: products[0]?.id || '',
          quantity: 10,
          purchase_price: products[0]?.purchase_price || 0,
          selling_price: products[0]?.selling_price || 0,
          tax_percent: products[0]?.tax_percent || 12,
          discount_percent: 0,
          location_id: prev.initial_location_id
        }
      ]
    }));
  };

  const handleRemoveItemRow = (index) => {
    if (formData.items.length === 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...formData.items];
    updated[index][field] = value;

    // Auto-fill prices if product selected
    if (field === 'product_id') {
      const prod = products.find(p => String(p.id) === String(value));
      if (prod) {
        updated[index].purchase_price = prod.purchase_price || 0;
        updated[index].selling_price = prod.selling_price || 0;
        updated[index].tax_percent = prod.tax_percent || 0;
      }
    }

    setFormData(prev => ({ ...prev, items: updated }));
  };

  // Quick Product Creation handlers
  const handleOpenQuickProductModal = (rowIndex = -1) => {
    setQuickProductTargetRow(rowIndex);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setQuickProductForm({
      name: '',
      sku: `VIP-${randomSuffix}`,
      category_id: categories[0]?.id || '',
      brand_id: brands[0]?.id || '',
      purchase_price: '',
      selling_price: '',
      tax_percent: '12.00',
      reorder_level: 5,
      description: ''
    });
    setIsQuickProductModalOpen(true);
  };

  const handleAutoGenerateSku = () => {
    const prefix = quickProductForm.name
      ? quickProductForm.name.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'VIP')
      : 'VIP';
    const random = Math.floor(1000 + Math.random() * 9000);
    setQuickProductForm(prev => ({ ...prev, sku: `${prefix}-${random}` }));
  };

  const handleCreateProductSubmit = async (e) => {
    e.preventDefault();
    if (!quickProductForm.name || !quickProductForm.sku || !quickProductForm.selling_price) {
      warning('Please enter Product Name, SKU, and Selling Price.');
      return;
    }

    setCreatingProduct(true);
    try {
      const res = await api.post('/products', quickProductForm);
      const newProductId = res.data?.data?.id || res.data?.id;

      // Refresh product list
      const prodRes = await api.get('/products?status=ACTIVE');
      const updatedProducts = prodRes.data?.products || [];
      setProducts(updatedProducts);

      const createdProd = updatedProducts.find(p => p.id === newProductId) || {
        id: newProductId,
        name: quickProductForm.name,
        sku: quickProductForm.sku.toUpperCase(),
        purchase_price: parseFloat(quickProductForm.purchase_price) || 0,
        selling_price: parseFloat(quickProductForm.selling_price) || 0,
        tax_percent: parseFloat(quickProductForm.tax_percent) || 0
      };

      // If triggered from a purchase row, automatically select it!
      if (quickProductTargetRow >= 0 && formData.items[quickProductTargetRow]) {
        const updated = [...formData.items];
        updated[quickProductTargetRow].product_id = createdProd.id;
        updated[quickProductTargetRow].purchase_price = createdProd.purchase_price;
        updated[quickProductTargetRow].selling_price = createdProd.selling_price;
        updated[quickProductTargetRow].tax_percent = createdProd.tax_percent;
        setFormData(prev => ({ ...prev, items: updated }));
      } else if (!isCreateModalOpen) {
        // If opened from the main page, offer to start a purchase for it
        setFormData(prev => ({
          ...prev,
          items: [
            {
              product_id: createdProd.id,
              quantity: 10,
              purchase_price: createdProd.purchase_price,
              selling_price: createdProd.selling_price,
              tax_percent: createdProd.tax_percent,
              discount_percent: 0,
              location_id: prev.initial_location_id
            }
          ]
        }));
        setIsCreateModalOpen(true);
      }

      success(`Product "${quickProductForm.name}" created and ready for stock-in!`);
      setIsQuickProductModalOpen(false);
    } catch (err) {
      error(err.message || 'Failed to create product.');
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleCreatePurchase = async (e) => {
    e.preventDefault();
    if (!formData.supplier_id || formData.items.length === 0) {
      warning('Please select a supplier and at least one item.');
      return;
    }

    // Check that each item has a product
    const missingProduct = formData.items.some(item => !item.product_id);
    if (missingProduct) {
      warning('Please select or create a product for all purchase items.');
      return;
    }

    try {
      const res = await api.post('/purchases', formData);
      const targetName = formData.initial_location_id === 1 ? 'Showroom Floor' : 'Central Warehouse';
      success(res.message || `Purchase completed! Barcodes added to ${targetName}.`);
      setIsCreateModalOpen(false);

      if (res.data?.createdUnits && res.data.createdUnits.length > 0) {
        setGeneratedBarcodeUnits(res.data.createdUnits);
        setIsBarcodePrintModalOpen(true);
      }

      fetchPurchases();
    } catch (err) {
      error(err.message || 'Purchase creation failed.');
    }
  };

  const handleViewPurchase = async (p) => {
    try {
      const res = await api.get(`/purchases/${p.id}`);
      setCurrentPurchase(res.data?.purchase);
      setCurrentPurchaseItems(res.data?.items || []);
      setGeneratedBarcodeUnits(res.data?.units || []);
      setIsViewModalOpen(true);
    } catch (err) {
      error(err.message || 'Failed to load purchase details.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-blue-400" />
            <span>PURCHASE & STOCK ENTRY</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Receive goods &bull; Select direct storage into <strong className="text-emerald-400">Showroom</strong> (for POS sale) or <strong className="text-indigo-400">Warehouse</strong> &bull; Auto-generate physical barcodes
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenQuickProductModal(-1)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 shadow-md transition-all active:scale-95 cursor-pointer"
            title="Create product master record"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>+ Create Product</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 border border-blue-400/30 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Purchase (Stock In)</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-3 p-3 rounded-2xl bg-[#090d16] border border-slate-800 shadow-lg">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Purchase #, Supplier Bill #, Supplier Name, or Product Name..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 active:scale-95 transition-all cursor-pointer"
        >
          Search
        </button>
      </form>

      {/* Purchases History Table */}
      <div className="rounded-3xl bg-[#090d16] border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-[#06090e]/80">
                <th className="py-3 px-4">Purchase #</th>
                <th className="py-3 px-4">Supplier Name</th>
                <th className="py-3 px-4">Products Received</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-center">Destination</th>
                <th className="py-3 px-4 text-center">Total Units</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-center">Payment</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">Loading purchase orders...</td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-3">
                      <Package className="w-10 h-10 text-slate-600" />
                      <p>No purchase records found.</p>
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                      >
                        Record First Purchase & Stock In
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-400">{p.purchase_number}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{p.supplier_name}</div>
                      {p.supplier_invoice_no && (
                        <div className="text-[10px] font-mono text-slate-500">Bill: {p.supplier_invoice_no}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="truncate font-semibold text-slate-200" title={p.product_names || 'N/A'}>
                        {p.product_names ? (
                          <span className="flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                            <span className="truncate">{p.product_names}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">No products linked</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">{p.purchase_date}</td>
                    <td className="py-3 px-4 text-center">
                      {p.initial_location_id === 1 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Store className="w-3 h-3" />
                          <span>Showroom</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          <Warehouse className="w-3 h-3" />
                          <span>Warehouse</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-300 font-mono">
                      {p.total_units || 0} Units
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      ₹{parseFloat(p.grand_total || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge status={p.payment_status} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleViewPurchase(p)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors active:scale-95 cursor-pointer"
                        title="View Purchase Details & Barcodes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Purchase Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Record New Supplier Purchase & Stock In"
        subtitle="Generates unique barcode per physical product unit with destination storage"
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleCreatePurchase} className="space-y-6">
          {/* Destination Location Selector: Showroom vs Warehouse */}
          <div className="space-y-2 p-4 rounded-2xl bg-[#06090e] border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>Select Stock Destination Floor *</span>
              </label>
              <span className="text-[10px] text-slate-400 font-semibold">
                Where should new physical barcode units be stored?
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Option 1: Showroom Floor */}
              <button
                type="button"
                onClick={() => handleSelectDestinationLocation(1)}
                className={`flex items-start gap-3.5 p-3.5 rounded-2xl border-2 transition-all text-left cursor-pointer active:scale-[0.99] ${
                  formData.initial_location_id === 1
                    ? 'bg-emerald-950/30 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/20'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400 opacity-70 hover:opacity-100'
                }`}
              >
                <div className={`p-2.5 rounded-xl mt-0.5 ${
                  formData.initial_location_id === 1 ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'bg-slate-900 text-slate-400'
                }`}>
                  <Store className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-white">
                      Showroom Floor (Location 1)
                    </span>
                    {formData.initial_location_id === 1 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[9px] uppercase">
                        <Check className="w-3 h-3" /> Selected
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 font-medium">
                    Store directly on the retail display floor.
                  </p>
                  <p className="text-[10px] text-emerald-400 font-bold mt-0.5">
                    ✓ Immediately active for POS counter barcode billing
                  </p>
                </div>
              </button>

              {/* Option 2: Central Warehouse */}
              <button
                type="button"
                onClick={() => handleSelectDestinationLocation(2)}
                className={`flex items-start gap-3.5 p-3.5 rounded-2xl border-2 transition-all text-left cursor-pointer active:scale-[0.99] ${
                  formData.initial_location_id === 2
                    ? 'bg-indigo-950/30 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/20'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400 opacity-70 hover:opacity-100'
                }`}
              >
                <div className={`p-2.5 rounded-xl mt-0.5 ${
                  formData.initial_location_id === 2 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'bg-slate-900 text-slate-400'
                }`}>
                  <Warehouse className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-white">
                      Central Warehouse (Location 2)
                    </span>
                    {formData.initial_location_id === 2 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-[9px] uppercase">
                        <Check className="w-3 h-3" /> Selected
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 font-medium">
                    Store in central backstock inventory.
                  </p>
                  <p className="text-[10px] text-indigo-400 font-bold mt-0.5">
                    🔒 Blocked from POS billing until transferred to showroom
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Supplier & Bill Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Supplier *
              </label>
              <select
                required
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                {suppliers.length === 0 ? (
                  <option value="">No suppliers configured</option>
                ) : (
                  suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Supplier Bill / Invoice #
              </label>
              <input
                type="text"
                value={formData.supplier_invoice_no}
                onChange={(e) => setFormData({ ...formData, supplier_invoice_no: e.target.value })}
                placeholder="e.g. VIP-BILL-1049"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Purchase Date *
              </label>
              <input
                type="date"
                required
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-400" />
                <span>Purchase Products & Quantity</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenQuickProductModal(formData.items.length)}
                  className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 active:scale-95 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+ Create Product</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 active:scale-95 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Row</span>
                </button>
              </div>
            </div>

            {/* Products List empty alert */}
            {products.length === 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <div className="text-xs text-amber-300 font-medium">
                  <strong>Catalog is empty:</strong> You need to create a product before recording purchase stock.
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenQuickProductModal(0)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold shadow-md hover:bg-amber-400 active:scale-95 cursor-pointer"
                >
                  + Create First Product
                </button>
              </div>
            )}

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {formData.items.map((row, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2.5 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  {/* Product Selector with inline Create button */}
                  <div className="flex-1 min-w-[220px]">
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="text-[10px] text-slate-400 font-bold">Product Name *</label>
                      <button
                        type="button"
                        onClick={() => handleOpenQuickProductModal(idx)}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>+ New Product</span>
                      </button>
                    </div>
                    <select
                      required
                      value={row.product_id}
                      onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">-- Select Product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="w-20">
                    <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Units Qty</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={row.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-center font-mono font-bold text-blue-400"
                    />
                  </div>

                  {/* Cost Price */}
                  <div className="w-24">
                    <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Cost Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={row.purchase_price}
                      onChange={(e) => handleItemChange(idx, 'purchase_price', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-right font-mono text-white"
                    />
                  </div>

                  {/* Selling Price */}
                  <div className="w-24">
                    <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Sale Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={row.selling_price}
                      onChange={(e) => handleItemChange(idx, 'selling_price', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg bg-slate-900 border border-blue-500/40 px-2 py-1.5 text-xs text-right font-mono font-bold text-blue-400"
                    />
                  </div>

                  {/* Per-item Location Badge/Selector */}
                  <div className="w-28">
                    <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Destination</label>
                    <select
                      value={row.location_id || formData.initial_location_id}
                      onChange={(e) => handleItemChange(idx, 'location_id', parseInt(e.target.value, 10))}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2 py-1.5 text-[11px] font-bold text-white focus:border-blue-500"
                    >
                      <option value={1}>🏬 Showroom</option>
                      <option value={2}>🏢 Warehouse</option>
                    </select>
                  </div>

                  {/* Remove row */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItemRow(idx)}
                    disabled={formData.items.length === 1}
                    className="p-2 rounded-xl text-slate-500 hover:text-red-400 disabled:opacity-30 mt-3 active:scale-95 cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <span>Storing units into:</span>
              <strong className={formData.initial_location_id === 1 ? 'text-emerald-400' : 'text-indigo-400'}>
                {formData.initial_location_id === 1 ? '🏬 Showroom (Display Floor)' : '🏢 Central Warehouse'}
              </strong>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 border border-blue-400/30 active:scale-95 transition-all cursor-pointer"
              >
                Confirm Stock In & Generate Barcodes
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Quick Create Product Modal */}
      <Modal
        isOpen={isQuickProductModalOpen}
        onClose={() => setIsQuickProductModalOpen(false)}
        title="Create New Product Master"
        subtitle="Quickly register product name, SKU and retail prices"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateProductSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
              Product Name *
            </label>
            <input
              type="text"
              required
              value={quickProductForm.name}
              onChange={(e) => setQuickProductForm({ ...quickProductForm, name: e.target.value })}
              placeholder="e.g. VIP Luxury Leather Steering Cover"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  SKU Code *
                </label>
                <button
                  type="button"
                  onClick={handleAutoGenerateSku}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-bold cursor-pointer"
                >
                  Auto Generate
                </button>
              </div>
              <input
                type="text"
                required
                value={quickProductForm.sku}
                onChange={(e) => setQuickProductForm({ ...quickProductForm, sku: e.target.value.toUpperCase() })}
                placeholder="VIP-STR-01"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                Category
              </label>
              <select
                value={quickProductForm.category_id}
                onChange={(e) => setQuickProductForm({ ...quickProductForm, category_id: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                Brand
              </label>
              <select
                value={quickProductForm.brand_id}
                onChange={(e) => setQuickProductForm({ ...quickProductForm, brand_id: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                GST / Tax %
              </label>
              <input
                type="number"
                step="0.01"
                value={quickProductForm.tax_percent}
                onChange={(e) => setQuickProductForm({ ...quickProductForm, tax_percent: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                Purchase / Cost Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={quickProductForm.purchase_price}
                onChange={(e) => setQuickProductForm({ ...quickProductForm, purchase_price: e.target.value })}
                placeholder="450.00"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                Selling / Retail Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={quickProductForm.selling_price}
                onChange={(e) => setQuickProductForm({ ...quickProductForm, selling_price: e.target.value })}
                placeholder="899.00"
                className="w-full rounded-xl bg-slate-950 border border-blue-500/50 px-3 py-2 text-xs font-mono font-bold text-blue-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsQuickProductModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingProduct}
              className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 border border-blue-400/30 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{creatingProduct ? 'Creating...' : 'Save Product'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Generated Barcode Batch Print Modal */}
      <Modal
        isOpen={isBarcodePrintModalOpen}
        onClose={() => setIsBarcodePrintModalOpen(false)}
        title="Newly Generated Barcode Tags"
        subtitle={`Generated ${generatedBarcodeUnits.length} physical barcodes (Destination: ${formData.initial_location_id === 1 ? 'Showroom Floor' : 'Central Warehouse'})`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-xs text-slate-300">
              <span className="font-bold text-white block">Stock successfully received!</span>
              <span className="text-[11px] text-slate-400">
                Units stored in {formData.initial_location_id === 1 ? (
                  <strong className="text-emerald-400">Showroom</strong>
                ) : (
                  <strong className="text-indigo-400">Warehouse</strong>
                )}. Print adhesive barcode stickers to attach to physical items.
              </span>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 border border-blue-400/30 active:scale-95 transition-all whitespace-nowrap cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print All Barcode Stickers</span>
            </button>
          </div>

          <div id="printable-barcodes" className="max-h-96 overflow-y-auto p-4 bg-slate-950 rounded-2xl border border-slate-800 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {generatedBarcodeUnits.map((u) => (
              <BarcodeLabel key={u.barcode} unit={u} />
            ))}
          </div>
        </div>
      </Modal>

      {/* View Purchase Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Purchase Order: ${currentPurchase?.purchase_number}`}
        subtitle={`Supplier: ${currentPurchase?.supplier_name} | Total: ₹${parseFloat(currentPurchase?.grand_total || 0).toFixed(2)}`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 block">Purchase Date:</span>
              <span className="font-mono font-bold text-white">{currentPurchase?.purchase_date}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Destination Storage:</span>
              <span className="font-bold text-slate-200 flex items-center gap-1 mt-0.5">
                {currentPurchase?.initial_location_id === 1 ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-bold">
                    <Store className="w-3.5 h-3.5" /> Showroom Floor
                  </span>
                ) : (
                  <span className="text-indigo-400 flex items-center gap-1 font-bold">
                    <Warehouse className="w-3.5 h-3.5" /> Central Warehouse
                  </span>
                )}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Payment Status:</span>
              <Badge status={currentPurchase?.payment_status} />
            </div>
          </div>

          {/* Purchased Line Items List with Product Name */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Purchased Products ({currentPurchaseItems.length})</h4>
            <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase font-bold bg-slate-900/50">
                    <th className="p-2.5">Product Name</th>
                    <th className="p-2.5">SKU</th>
                    <th className="p-2.5 text-center">Quantity</th>
                    <th className="p-2.5 text-right">Cost (₹)</th>
                    <th className="p-2.5 text-right">Retail (₹)</th>
                    <th className="p-2.5 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 font-medium">
                  {currentPurchaseItems.map((item) => (
                    <tr key={item.id}>
                      <td className="p-2.5 font-bold text-white">{item.product_name}</td>
                      <td className="p-2.5 font-mono text-slate-400">{item.sku}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-blue-400">{item.quantity}</td>
                      <td className="p-2.5 text-right font-mono">₹{parseFloat(item.purchase_price).toFixed(2)}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-400">₹{parseFloat(item.selling_price).toFixed(2)}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-white">₹{parseFloat(item.line_total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Physical Barcodes Generated */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tracked Physical Barcodes ({generatedBarcodeUnits.length})</h4>
            <div className="max-h-52 overflow-y-auto rounded-2xl bg-slate-950 border border-slate-800 p-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase font-bold">
                    <th className="p-2">Barcode</th>
                    <th className="p-2">Product Name</th>
                    <th className="p-2">Current Location</th>
                    <th className="p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 font-medium">
                  {generatedBarcodeUnits.map((u) => (
                    <tr key={u.id}>
                      <td className="p-2 font-mono font-bold text-blue-400">{u.barcode}</td>
                      <td className="p-2 text-white">{u.product_name}</td>
                      <td className="p-2 text-slate-300">{u.current_location_name}</td>
                      <td className="p-2 text-center"><Badge status={u.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Purchases;
