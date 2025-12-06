import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AuthContext, API } from '@/App';
import { Plus, Edit, Trash2, Package, DollarSign, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default function SellerDashboard() {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    product_type: 'key',
    images: '',
    category_id: '',
    stock: '10'
  });

  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    if (!user || user.role === 'buyer') {
      navigate('/auth');
      return;
    }
    fetchMyProducts();
    fetchCategories();
  }, []);

  const fetchMyProducts = async () => {
    try {
      const response = await axios.get(`${API}/sellers/${user.id}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrls = [];
      
      // Upload new images if any
      if (imageFiles.length > 0) {
        setUploadingImages(true);
        const formDataUpload = new FormData();
        imageFiles.forEach(file => {
          formDataUpload.append('files', file);
        });
        
        const uploadResponse = await axios.post(`${API}/upload/images`, formDataUpload, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        
        imageUrls = uploadResponse.data.urls;
        setUploadingImages(false);
      }
      
      // If editing and no new images, keep existing ones
      if (editingProduct && imageUrls.length === 0) {
        imageUrls = formData.images.split(',').map(url => url.trim()).filter(url => url);
      }
      
      // If no uploaded images, try to use URLs from text input
      if (imageUrls.length === 0 && formData.images) {
        imageUrls = formData.images.split(',').map(url => url.trim()).filter(url => url);
      }

      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        images: imageUrls
      };

      if (editingProduct) {
        await axios.put(`${API}/products/${editingProduct.id}`, productData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Товар обновлен!');
      } else {
        await axios.post(`${API}/products`, productData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Товар добавлен!');
      }

      setShowAddDialog(false);
      setEditingProduct(null);
      resetForm();
      fetchMyProducts();
    } catch (error) {
      toast.error('Ошибка: ' + (error.response?.data?.detail || 'Не удалось сохранить товар'));
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      title: product.title,
      description: product.description,
      price: product.price.toString(),
      product_type: product.product_type,
      images: product.images.join(', '),
      category_id: product.category_id,
      stock: product.stock.toString()
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Удалить этот товар?')) return;

    try {
      await axios.delete(`${API}/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Товар удален');
      fetchMyProducts();
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: '',
      product_type: 'key',
      images: '',
      category_id: '',
      stock: '10'
    });
    setImageFiles([]);
    setImagePreview([]);
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles(files);
    
    // Create preview URLs
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreview(previews);
  };

  const removeImagePreview = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreview(prev => prev.filter((_, i) => i !== index));
  };

  const totalSales = products.reduce((sum, p) => sum + p.sales_count, 0);
  const totalRevenue = products.reduce((sum, p) => sum + (p.price * p.sales_count), 0);
  const totalViews = products.reduce((sum, p) => sum + p.views_count, 0);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold" style={{ fontFamily: 'Unbounded' }} data-testid="seller-dashboard-heading">
            Мои товары
          </h1>
          <Dialog open={showAddDialog} onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) {
              setEditingProduct(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="skew-button bg-primary hover:bg-primary-hover text-black" data-testid="add-product-button">
                <span className="flex items-center">
                  <Plus className="w-5 h-5 mr-2" />
                  Добавить товар
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0d1117] border-[#30363d] max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold" style={{ fontFamily: 'Unbounded' }}>
                  {editingProduct ? 'Редактировать товар' : 'Добавить товар'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="product-form">
                <div>
                  <Label htmlFor="title">Название</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    data-testid="product-title-input"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={3}
                    data-testid="product-description-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Цена ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                      data-testid="product-price-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="stock">Количество</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      required
                      data-testid="product-stock-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="product_type">Тип товара</Label>
                    <Select value={formData.product_type} onValueChange={(val) => setFormData({ ...formData, product_type: val })}>
                      <SelectTrigger data-testid="product-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="key">Ключ активации</SelectItem>
                        <SelectItem value="item">Внутриигровой предмет</SelectItem>
                        <SelectItem value="account">Аккаунт</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="category">Категория</Label>
                    <Select value={formData.category_id} onValueChange={(val) => setFormData({ ...formData, category_id: val })}>
                      <SelectTrigger data-testid="product-category-select">
                        <SelectValue placeholder="Выберите категорию" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="images">Изображения товара</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Input
                        id="images"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageSelect}
                        className="flex-1"
                        data-testid="product-images-file-input"
                      />
                      <span className="text-xs text-[#8b949e]">или</span>
                    </div>
                    <Input
                      value={formData.images}
                      onChange={(e) => setFormData({ ...formData, images: e.target.value })}
                      placeholder="URL изображений через запятую"
                      data-testid="product-images-url-input"
                    />
                    
                    {imagePreview.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {imagePreview.map((preview, index) => (
                          <div key={index} className="relative group">
                            <img 
                              src={preview} 
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-[#30363d]"
                            />
                            <button
                              type="button"
                              onClick={() => removeImagePreview(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddDialog(false);
                      setEditingProduct(null);
                      resetForm();
                    }}
                    className="border-[#30363d]"
                  >
                    Отмена
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-primary hover:bg-primary-hover text-black"
                    data-testid="submit-product-button"
                  >
                    {loading ? 'Сохранение...' : editingProduct ? 'Обновить' : 'Добавить'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8" data-testid="seller-stats">
          <div className="glass-panel rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#8b949e]">Товаров</span>
              <Package className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-bold" data-testid="total-products">{products.length}</p>
          </div>
          <div className="glass-panel rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#8b949e]">Продаж</span>
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-bold" data-testid="total-sales">{totalSales}</p>
          </div>
          <div className="glass-panel rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#8b949e]">Доход</span>
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-bold text-primary" data-testid="total-revenue">${totalRevenue.toFixed(2)}</p>
          </div>
          <div className="glass-panel rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#8b949e]">Просмотры</span>
              <Eye className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-bold" data-testid="total-views">{totalViews}</p>
          </div>
        </div>

        {/* Products List */}
        {products.length === 0 ? (
          <div className="text-center py-16 glass-panel rounded-xl" data-testid="no-products-message">
            <Package className="w-16 h-16 text-[#8b949e] mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">У вас пока нет товаров</h3>
            <p className="text-[#8b949e] mb-6">Добавьте свой первый товар для продажи</p>
          </div>
        ) : (
          <div className="glass-panel rounded-xl overflow-hidden" data-testid="products-table">
            <table className="w-full">
              <thead className="bg-[#0d1117]">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Товар</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Цена</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Склад</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Продано</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Просмотры</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Действия</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id} className="border-t border-[#30363d]" data-testid={`product-row-${product.id}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={product.images[0] || 'https://images.unsplash.com/photo-1605433887450-490fcd8c0c17?crop=entropy&cs=srgb&fm=jpg&q=85'}
                          alt={product.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <div>
                          <p className="font-semibold">{product.title}</p>
                          <span className="inline-flex items-center rounded-full border border-primary bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            {product.product_type}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-primary font-bold">${product.price}</td>
                    <td className="px-6 py-4 text-[#8b949e]">{product.stock}</td>
                    <td className="px-6 py-4 text-[#8b949e]">{product.sales_count}</td>
                    <td className="px-6 py-4 text-[#8b949e]">{product.views_count}</td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 hover:bg-[#161b22] rounded-lg transition-colors"
                          data-testid={`edit-product-${product.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 hover:bg-[#ff003c] hover:text-white rounded-lg transition-colors"
                          data-testid={`delete-product-${product.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}