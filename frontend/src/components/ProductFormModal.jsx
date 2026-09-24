import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { axiosInstance } from '../config/api';
import './ProductFormModal.scss';


const CATEGORIES = ['General', 'Fashion', 'Food & Drinks', 'Electronics', 'Beauty', 'Home & Living', 'Agriculture', 'Services'];

// ── Variant Builder ────────────────────────────────────────────────────────
function VariantBuilder({ variants, onChange }) {
  
  const addGroup = () => onChange([...variants, { 
    name: '', 
    options: [{ label: '', price: '', stock: 0, sku: '' }] 
  }]);
  
  const removeGroup = (gi) => onChange(variants.filter((_, i) => i !== gi));

  const updateGroup = (gi, field, val) => {
    const next = variants.map((g, i) => i === gi ? { ...g, [field]: val } : g);
    onChange(next);
  };

  const addOption = (gi) => {
    const next = variants.map((g, i) =>
      i === gi ? { ...g, options: [...g.options, { label: '', price: '', stock: 0, sku: '' }] } : g
    );
    onChange(next);
  };

  const removeOption = (gi, oi) => {
    const next = variants.map((g, i) =>
      i === gi ? { ...g, options: g.options.filter((_, j) => j !== oi) } : g
    );
    onChange(next);
  };

  const updateOption = (gi, oi, field, val) => {
    const next = variants.map((g, i) =>
      i === gi ? {
        ...g,
        options: g.options.map((o, j) => j === oi ? { ...o, [field]: val } : o)
      } : g
    );
    onChange(next);
  };

  return (
    <div className="variant-builder">
      {variants.map((group, gi) => (
        <div key={gi} className="variant-group">
          <div className="variant-group__header">
            <input
              className="variant-group__name"
              placeholder="Group name (e.g. Size, Colour)"
              value={group.name}
              onChange={e => updateGroup(gi, 'name', e.target.value)}
            />
            <button type="button" className="btn btn--danger btn--sm" onClick={() => removeGroup(gi)}>✕</button>
          </div>
          <div className="variant-options">
            <div className="variant-options__header">
              <span>Option</span><span>Price (₦)</span><span>Stock</span><span>SKU</span><span></span>
            </div>
            {group.options.map((opt, oi) => (
              <div key={oi} className="variant-option-row">
                <input placeholder="e.g. Red" value={opt.label} onChange={e => updateOption(gi, oi, 'label', e.target.value)} />
                <input type="number" placeholder="Price" value={opt.price} onChange={e => updateOption(gi, oi, 'price', e.target.value)} min="0" />
                <input type="number" placeholder="Stock" value={opt.stock} onChange={e => updateOption(gi, oi, 'stock', parseInt(e.target.value)||0)} min="0" />
                <input placeholder="SKU" value={opt.sku} onChange={e => updateOption(gi, oi, 'sku', e.target.value)} />
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeOption(gi, oi)} disabled={group.options.length === 1}>✕</button>
              </div>
            ))}
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => addOption(gi)} style={{marginTop:6}}>
              + Add Option
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn--outline btn--sm" onClick={addGroup}>+ Add Variant Group</button>
    </div>
  );
}

// MAIN PRODUCT FORM MODAL
export default function ProductFormModal({ product, onClose, onSuccess }) {
  const isEdit = !!product;
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    comparePrice: product?.comparePrice || '',
    category: product?.category || 'General',
    inStock: product?.inStock !== false,
    stockQuantity: product?.stockQuantity || '',
    lowStockThreshold: product?.lowStockThreshold || 5,
    hasVariants: product?.hasVariants || false,
    tags: (product?.tags || []).join(', '),
  });

  const [variants, setVariants] = useState(product?.variants || []);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState(product?.images || []);
  const [keepExistingImages, setKeepExistingImages] = useState(true);
  const fileRef = useRef();

  const IMG_BASE ='http://localhost:5000/api'.replace('/api','');

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleImages = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 4) return toast.error('Max 4 images');
    setImageFiles(files);
    setImagePreviews(files.map(f => URL.createObjectURL(f)));
    setKeepExistingImages(false);
  };

  const removeExistingImage = (idx) => {
    const updated = imagePreviews.filter((_, i) => i !== idx);
    setImagePreviews(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) return toast.error('Name and price are required');
    if (form.hasVariants && variants.length === 0) return toast.error('Add at least one variant group');

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'tags') fd.append('tags', JSON.stringify(v.split(',').map(t => t.trim()).filter(Boolean)));
      else fd.append(k, String(v));
    });
    if (form.hasVariants) fd.append('variants', JSON.stringify(variants));
    imageFiles.forEach(f => fd.append('images', f));
    if (isEdit) fd.append('keepImages', keepExistingImages && imageFiles.length === 0 ? 'true' : 'false');

    setLoading(true);
    try {
      let res;
      if (isEdit) {
        res = await axiosInstance.updateProduct(product._id, fd);
      } else {
        res = await axiosInstance.addProduct(fd);
      }
      toast.success(isEdit ? 'Product updated!' : 'Product added!');
      onSuccess(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const sections = ['basic', 'inventory', 'variants', 'media'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal product-modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3>{isEdit ? 'Edit Product' : 'Add New Product'}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Section tabs */}
        <div className="product-modal__tabs">
          {sections.map(s => (
            <button
              key={s}
              type="button"
              className={`product-modal__tab ${activeSection === s ? 'active' : ''}`}
              onClick={() => setActiveSection(s)}
            >
              {s === 'basic' ? '📝 Basic' : s === 'inventory' ? '📦 Stock' : s === 'variants' ? '🎨 Variants' : '🖼 Photos'}
            </button>
          ))}
        </div>

        <div className="modal__body">
          <form onSubmit={handleSubmit}>
            {/* BASIC */}
            {activeSection === 'basic' && (
              <div className="form-section fade-in">
                <div className="form-group">
                  <label>Product Name *</label>
                  <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Ankara Tote Bag" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Price (₦) *</label>
                    <input type="number" name="price" value={form.price} onChange={handleChange} placeholder="5000" min="0" />
                  </div>
                  <div className="form-group">
                    <label>Compare Price (₦)</label>
                    <input type="number" name="comparePrice" value={form.comparePrice} onChange={handleChange} placeholder="7000" min="0" />
                    <span style={{fontSize:'0.75rem',color:'var(--gray-400)'}}>Shown as strikethrough</span>
                  </div>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select name="category" value={form.category} onChange={handleChange}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea name="description" value={form.description} onChange={handleChange} placeholder="Describe the product..." rows={4} />
                </div>
                <div className="form-group">
                  <label>Tags (comma-separated)</label>
                  <input name="tags" value={form.tags} onChange={handleChange} placeholder="e.g. handmade, ankara, gift" />
                </div>
              </div>
            )}

            {/* INVENTORY */}
            {activeSection === 'inventory' && (
              <div className="form-section fade-in">
                <div className="form-check" style={{marginBottom:20}}>
                  <label>
                    <input type="checkbox" name="inStock" checked={form.inStock} onChange={handleChange} />
                    Item is in stock
                  </label>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Stock Quantity</label>
                    <input type="number" name="stockQuantity" value={form.stockQuantity} onChange={handleChange} placeholder="Leave blank = unlimited" min="0" />
                  </div>
                  <div className="form-group">
                    <label>Low Stock Alert At</label>
                    <input type="number" name="lowStockThreshold" value={form.lowStockThreshold} onChange={handleChange} min="1" />
                    <span style={{fontSize:'0.75rem',color:'var(--gray-400)'}}>Get email when stock hits this</span>
                  </div>
                </div>
                <div className="stock-info-box">
                  <span>💡</span>
                  <p>Set a stock quantity to track inventory. When it hits 0, the product will automatically show "Out of Stock" to customers.</p>
                </div>
              </div>
            )}

            {/* VARIANTS */}
            {activeSection === 'variants' && (
              <div className="form-section fade-in">
                <div className="form-check" style={{marginBottom:20}}>
                  <label>
                    <input type="checkbox" name="hasVariants" checked={form.hasVariants} onChange={handleChange} />
                    This product has variants (size, colour, etc.)
                  </label>
                </div>
                {form.hasVariants ? (
                  <VariantBuilder variants={variants} onChange={setVariants} />
                ) : (
                  <div className="stock-info-box">
                    <span>💡</span>
                    <p>Enable variants to offer different sizes, colours, or options — each with its own price and stock count.</p>
                  </div>
                )}
              </div>
            )}

            {/* MEDIA */}
            {activeSection === 'media' && (
              <div className="form-section fade-in">
                {/* Existing images */}
                {isEdit && imagePreviews.filter(p => p.startsWith('/')).length > 0 && (
                  <div style={{marginBottom:16}}>
                    <label style={{display:'block',marginBottom:8,fontSize:'0.88rem',fontWeight:500}}>Current Images</label>
                    <div className="img-previews">
                      {imagePreviews.filter(p => p.startsWith('/')).map((src, i) => (
                        <div key={i} className="img-preview-wrap">
                          <img src={`${IMG_BASE}${src}`} alt="" />
                          <button type="button" className="img-preview-remove" onClick={() => removeExistingImage(i)}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New uploads */}
                <div className="img-upload-area" onClick={() => fileRef.current.click()}>
                  {imageFiles.length > 0 ? (
                    <div className="img-previews">
                      {imagePreviews.filter(p => p.startsWith('blob:')).map((src, i) => (
                        <img key={i} src={src} alt="" />
                      ))}
                    </div>
                  ) : (
                    <div className="img-upload-placeholder">
                      <span>📷</span>
                      <p>Click to upload product images<br /><small>Up to 4 images · Auto-compressed to WebP</small></p>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={handleImages} />
                </div>
                {imageFiles.length > 0 && (
                  <button type="button" className="btn btn--ghost btn--sm" style={{marginTop:8}} onClick={() => { setImageFiles([]); setImagePreviews(product?.images||[]); setKeepExistingImages(true); }}>
                    ✕ Remove new uploads
                  </button>
                )}
              </div>
            )}

            {/* NAV + SUBMIT */}
            <div className="form-actions">
              {activeSection !== 'basic' && (
                <button type="button" className="btn btn--ghost" onClick={() => {
                  const idx = sections.indexOf(activeSection);
                  setActiveSection(sections[idx-1]);
                }}>← Back</button>
              )}
              <button
                type={activeSection === "media" ? "submit" : "button"}
                className="btn btn--primary"
                disabled={loading}
                onClick={(e) => {
                  if (activeSection !== "media") {
                    e.preventDefault();

                    const idx = sections.indexOf(activeSection);
                    setActiveSection(sections[idx + 1]);
                  }
                }}
              >
                {activeSection === "media"
                  ? loading
                    ? "Saving..."
                    : isEdit
                      ? "💾 Update Product"
                      : "✅ Add Product"
                  : "Next →"}
              </button>
              <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
