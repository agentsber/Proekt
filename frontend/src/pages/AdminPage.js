import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AuthContext, API, SiteSettingsContext } from '@/App';
import { Users, Package, ShoppingBag, DollarSign, Plus, Edit, Trash2, FolderTree, Palette } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPage() {
  const { token } = useContext(AuthContext);
  const { fetchSiteSettings } = useContext(SiteSettingsContext);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [siteSettings, setSiteSettings] = useState(null);
  
  // Dialogs
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  // Forms
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    parent_id: '',
    description: '',
    image: ''
  });

  const [productForm, setProductForm] = useState({
    title: '',
    description: '',
    price: '',
    product_type: 'key',
    images: '',
    category_id: '',
    stock: '10',
    seller_id: ''
  });

  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [settingsForm, setSettingsForm] = useState({
    primary_color: '#00ff9d',
    secondary_color: '#0d1117',
    accent_color: '#00cc7d',
    background_color: '#02040a',
    text_color: '#ffffff',
    site_name: 'GameHub',
    site_description: 'Маркетплейс игровых товаров',
    logo_url: '',
    hero_image: '',
    footer_navigation: [
      { title: 'Каталог', url: '/catalog' },
      { title: 'Раздачи', url: '/giveaways' },
      { title: 'Блог', url: '/blog' }
    ],
    footer_support: [
      { title: 'FAQ', url: '#' },
      { title: 'Контакты', url: '#' }
    ],
    footer_legal: [
      { title: 'Условия использования', url: '#' },
      { title: 'Политика конфиденциальности', url: '#' }
    ]
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = () => {
    fetchStats();
    fetchUsers();
    fetchProducts();
    fetchOrders();
    fetchCategories();
    fetchSettings();
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/admin/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
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

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSiteSettings(response.data);
      setSettingsForm(response.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  // Category Management
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await axios.put(`${API}/categories/${editingCategory.id}`, categoryForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Категория обновлена!');
      } else {
        await axios.post(`${API}/categories`, categoryForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Категория создана!');
      }
      setShowCategoryDialog(false);
      setEditingCategory(null);
      resetCategoryForm();
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка сохранения');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Удалить эту категорию?')) return;
    try {
      await axios.delete(`${API}/categories/${categoryId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Категория удалена');
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка удаления');
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      parent_id: category.parent_id || '',
      description: category.description || '',
      image: category.image || ''
    });
    setShowCategoryDialog(true);
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      slug: '',
      parent_id: '',
      description: '',
      image: ''
    });
  };

  // Product Management (Admin)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
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
        imageUrls = productForm.images.split(',').map(url => url.trim()).filter(url => url);
      }
      
      // If no uploaded images, try to use URLs from text input
      if (imageUrls.length === 0 && productForm.images) {
        imageUrls = productForm.images.split(',').map(url => url.trim()).filter(url => url);
      }

      const productData = {
        ...productForm,
        price: parseFloat(productForm.price),
        stock: parseInt(productForm.stock),
        images: imageUrls
      };

      if (editingProduct) {
        await axios.put(`${API}/products/${editingProduct.id}`, productData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Товар обновлен!');
      } else {
        // For admin, we need seller_id
        if (!productData.seller_id) {
          toast.error('Выберите продавца');
          return;
        }
        await axios.post(`${API}/products`, productData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Товар создан!');
      }
      setShowProductDialog(false);
      setEditingProduct(null);
      resetProductForm();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка сохранения');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Удалить этот товар?')) return;
    try {
      await axios.delete(`${API}/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Товар удален');
      fetchProducts();
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      title: product.title,
      description: product.description,
      price: product.price.toString(),
      product_type: product.product_type,
      images: product.images.join(', '),
      category_id: product.category_id,
      stock: product.stock.toString(),
      seller_id: product.seller_id
    });
    setShowProductDialog(true);
  };

  const resetProductForm = () => {
    setProductForm({
      title: '',
      description: '',
      price: '',
      product_type: 'key',
      images: '',
      category_id: '',
      stock: '10',
      seller_id: ''
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

  // Navigation links management
  const addNavigationLink = (section) => {
    setSettingsForm(prev => ({
      ...prev,
      [section]: [...prev[section], { title: '', url: '' }]
    }));
  };

  const updateNavigationLink = (section, index, field, value) => {
    setSettingsForm(prev => ({
      ...prev,
      [section]: prev[section].map((link, i) => 
        i === index ? { ...link, [field]: value } : link
      )
    }));
  };

  const removeNavigationLink = (section, index) => {
    setSettingsForm(prev => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index)
    }));
  };

  // Site Settings Management
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/admin/settings`, settingsForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Apply settings immediately
      document.documentElement.style.setProperty('--primary-color', settingsForm.primary_color);
      document.documentElement.style.setProperty('--accent-color', settingsForm.accent_color);
      
      // Refresh site settings in context
      if (fetchSiteSettings) {
        await fetchSiteSettings();
      }
      
      toast.success('Настройки сохранены и применены!');
    } catch (error) {
      toast.error('Ошибка сохранения настроек');
    }
  };

  // Helper: Get category tree structure
  const getCategoryTree = () => {
    const tree = [];
    const categoryMap = {};
    
    categories.forEach(cat => {
      categoryMap[cat.id] = { ...cat, children: [] };
    });
    
    categories.forEach(cat => {
      if (cat.parent_id && categoryMap[cat.parent_id]) {
        categoryMap[cat.parent_id].children.push(categoryMap[cat.id]);
      } else if (!cat.parent_id) {
        tree.push(categoryMap[cat.id]);
      }
    });
    
    return tree;
  };

  const renderCategoryTree = (cats, level = 0) => {
    return cats.map(cat => (
      <div key={cat.id} style={{ marginLeft: `${level * 20}px` }}>
        <div className="flex items-center justify-between py-3 border-b border-[#30363d]" data-testid={`category-${cat.id}`}>
          <div className="flex items-center space-x-2">
            <FolderTree className="w-4 h-4 text-[#00ff9d]" />
            <span className="font-semibold">{cat.name}</span>
            <span className="text-xs text-[#8b949e]">({cat.slug})</span>
            {level > 0 && <span className="text-xs text-[#8b949e]">- Подкатегория</span>}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleEditCategory(cat)}
              className="p-2 hover:bg-[#161b22] rounded-lg transition-colors"
              data-testid={`edit-category-${cat.id}`}
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteCategory(cat.id)}
              className="p-2 hover:bg-[#ff003c] hover:text-white rounded-lg transition-colors"
              data-testid={`delete-category-${cat.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {cat.children && cat.children.length > 0 && renderCategoryTree(cat.children, level + 1)}
      </div>
    ));
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8" style={{ fontFamily: 'Unbounded' }} data-testid="admin-heading">
          Админ-панель
        </h1>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8" data-testid="admin-stats">
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8b949e]">Пользователи</span>
                <Users className="w-5 h-5 text-[#00ff9d]" />
              </div>
              <p className="text-3xl font-bold" data-testid="total-users">{stats.total_users}</p>
            </div>
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8b949e]">Товары</span>
                <Package className="w-5 h-5 text-[#00ff9d]" />
              </div>
              <p className="text-3xl font-bold" data-testid="total-products">{stats.total_products}</p>
            </div>
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8b949e]">Заказы</span>
                <ShoppingBag className="w-5 h-5 text-[#00ff9d]" />
              </div>
              <p className="text-3xl font-bold" data-testid="total-orders">{stats.total_orders}</p>
            </div>
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8b949e]">Доход</span>
                <DollarSign className="w-5 h-5 text-[#00ff9d]" />
              </div>
              <p className="text-3xl font-bold" data-testid="total-revenue">${stats.total_revenue.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="users" data-testid="users-tab">Пользователи</TabsTrigger>
            <TabsTrigger value="categories" data-testid="categories-tab">Категории</TabsTrigger>
            <TabsTrigger value="products" data-testid="products-tab">Товары</TabsTrigger>
            <TabsTrigger value="orders" data-testid="orders-tab">Заказы</TabsTrigger>
            <TabsTrigger value="design" data-testid="design-tab">Дизайн</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="glass-panel rounded-xl overflow-hidden">
              <table className="w-full" data-testid="users-table">
                <thead className="bg-[#0d1117]">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Имя</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Роль</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-t border-[#30363d]">
                      <td className="px-6 py-4">{user.full_name}</td>
                      <td className="px-6 py-4 text-[#8b949e]">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full border border-[#00ff9d] bg-[#00ff9d]/10 px-2.5 py-0.5 text-xs font-semibold text-[#00ff9d]">
                          {user.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Categories Tab - Adding Category Management */}
          <TabsContent value="categories">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold" style={{ fontFamily: 'Unbounded' }}>
                Управление категориями
              </h2>
              <Dialog open={showCategoryDialog} onOpenChange={(open) => {
                setShowCategoryDialog(open);
                if (!open) {
                  setEditingCategory(null);
                  resetCategoryForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="skew-button bg-[#00ff9d] hover:bg-[#00cc7d] text-black" data-testid="add-category-button">
                    <span className="flex items-center">
                      <Plus className="w-5 h-5 mr-2" />
                      Добавить категорию
                    </span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0d1117] border-[#30363d] max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold" style={{ fontFamily: 'Unbounded' }}>
                      {editingCategory ? 'Редактировать категорию' : 'Добавить категорию'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSaveCategory} className="space-y-4" data-testid="category-form">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cat-name">Название</Label>
                        <Input
                          id="cat-name"
                          value={categoryForm.name}
                          onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                          required
                          data-testid="category-name-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cat-slug">Slug</Label>
                        <Input
                          id="cat-slug"
                          value={categoryForm.slug}
                          onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                          required
                          data-testid="category-slug-input"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="cat-parent">Родительская категория</Label>
                      <select
                        id="cat-parent"
                        value={categoryForm.parent_id}
                        onChange={(e) => setCategoryForm({ ...categoryForm, parent_id: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white"
                        data-testid="category-parent-select"
                      >
                        <option value="">Нет (корневая категория)</option>
                        {categories.filter(c => c.level === 0).map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="cat-desc">Описание</Label>
                      <Textarea
                        id="cat-desc"
                        value={categoryForm.description}
                        onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cat-image">URL изображения</Label>
                      <Input
                        id="cat-image"
                        value={categoryForm.image}
                        onChange={(e) => setCategoryForm({ ...categoryForm, image: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowCategoryDialog(false);
                          setEditingCategory(null);
                          resetCategoryForm();
                        }}
                        className="border-[#30363d]"
                      >
                        Отмена
                      </Button>
                      <Button
                        type="submit"
                        className="bg-[#00ff9d] hover:bg-[#00cc7d] text-black"
                        data-testid="submit-category-button"
                      >
                        {editingCategory ? 'Обновить' : 'Создать'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="glass-panel rounded-xl p-6" data-testid="categories-tree">
              {getCategoryTree().length === 0 ? (
                <div className="text-center py-12 text-[#8b949e]">
                  Категорий пока нет
                </div>
              ) : (
                renderCategoryTree(getCategoryTree())
              )}
            </div>
          </TabsContent>

          {/* Products Tab - continue with next message due to token limit */}
          <TabsContent value="products">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold" style={{ fontFamily: 'Unbounded' }}>
                Управление товарами
              </h2>
              <Dialog open={showProductDialog} onOpenChange={(open) => {
                setShowProductDialog(open);
                if (!open) {
                  setEditingProduct(null);
                  resetProductForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="skew-button bg-[#00ff9d] hover:bg-[#00cc7d] text-black" data-testid="add-product-button-admin">
                    <span className="flex items-center">
                      <Plus className="w-5 h-5 mr-2" />
                      Добавить товар
                    </span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0d1117] border-[#30363d] max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold" style={{ fontFamily: 'Unbounded' }}>
                      {editingProduct ? 'Редактировать товар' : 'Добавить товар'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSaveProduct} className="space-y-4" data-testid="product-form-admin">
                    <div>
                      <Label>Название</Label>
                      <Input
                        value={productForm.title}
                        onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Описание</Label>
                      <Textarea
                        value={productForm.description}
                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                        required
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Цена ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={productForm.price}
                          onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label>Количество</Label>
                        <Input
                          type="number"
                          value={productForm.stock}
                          onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Тип товара</Label>
                        <select
                          value={productForm.product_type}
                          onChange={(e) => setProductForm({ ...productForm, product_type: e.target.value })}
                          className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white"
                        >
                          <option value="key">Ключ активации</option>
                          <option value="item">Внутриигровой предмет</option>
                          <option value="account">Аккаунт</option>
                        </select>
                      </div>
                      <div>
                        <Label>Категория</Label>
                        <select
                          value={productForm.category_id}
                          onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                          className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white"
                          required
                        >
                          <option value="">Выберите категорию</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label>Продавец (ID)</Label>
                      <select
                        value={productForm.seller_id}
                        onChange={(e) => setProductForm({ ...productForm, seller_id: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white"
                        required
                      >
                        <option value="">Выберите продавца</option>
                        {users.filter(u => u.role === 'seller' || u.role === 'admin').map(user => (
                          <option key={user.id} value={user.id}>{user.full_name} ({user.email})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Изображения товара</Label>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <Input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageSelect}
                            className="flex-1"
                          />
                          <span className="text-xs text-[#8b949e]">или</span>
                        </div>
                        <Input
                          value={productForm.images}
                          onChange={(e) => setProductForm({ ...productForm, images: e.target.value })}
                          placeholder="URL изображений через запятую"
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
                        {uploadingImages && (
                          <p className="text-xs text-[#00ff9d]">Загрузка изображений...</p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowProductDialog(false);
                          setEditingProduct(null);
                          resetProductForm();
                        }}
                        className="border-[#30363d]"
                      >
                        Отмена
                      </Button>
                      <Button
                        type="submit"
                        className="bg-[#00ff9d] hover:bg-[#00cc7d] text-black"
                      >
                        {editingProduct ? 'Обновить' : 'Создать'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="glass-panel rounded-xl overflow-hidden">
              <table className="w-full" data-testid="products-table">
                <thead className="bg-[#0d1117]">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Товар</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Цена</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Склад</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Продажи</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product.id} className="border-t border-[#30363d]">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={product.images?.[0] || 'https://images.unsplash.com/photo-1605433887450-490fcd8c0c17?crop=entropy&cs=srgb&fm=jpg&q=85'}
                            alt={product.title}
                            className="w-12 h-12 rounded object-cover"
                          />
                          <span>{product.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#00ff9d]">${product.price}</td>
                      <td className="px-6 py-4 text-[#8b949e]">{product.stock}</td>
                      <td className="px-6 py-4 text-[#8b949e]">{product.sales_count}</td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="p-2 hover:bg-[#161b22] rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-2 hover:bg-[#ff003c] hover:text-white rounded-lg transition-colors"
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
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="glass-panel rounded-xl overflow-hidden">
              <table className="w-full" data-testid="orders-table">
                <thead className="bg-[#0d1117]">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Заказ</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Сумма</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Статус</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id} className="border-t border-[#30363d]">
                      <td className="px-6 py-4">#{order.id.slice(0, 8)}</td>
                      <td className="px-6 py-4 text-[#00ff9d]">${order.total.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          order.status === 'paid' ? 'bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]' :
                          'bg-[#8b949e]/10 text-[#8b949e] border border-[#8b949e]'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#8b949e]">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Design Tab */}
          <TabsContent value="design">
            <div className="glass-panel rounded-xl p-8">
              <div className="flex items-center mb-6">
                <Palette className="w-8 h-8 text-[#00ff9d] mr-3" />
                <h2 className="text-2xl font-bold" style={{ fontFamily: 'Unbounded' }}>
                  Настройки дизайна сайта
                </h2>
              </div>
              
              <form onSubmit={handleSaveSettings} className="space-y-6" data-testid="design-settings-form">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Branding */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-4">Брендинг</h3>
                    <div>
                      <Label htmlFor="site-name">Название сайта</Label>
                      <Input
                        id="site-name"
                        value={settingsForm.site_name}
                        onChange={(e) => setSettingsForm({ ...settingsForm, site_name: e.target.value })}
                        data-testid="site-name-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="site-desc">Описание</Label>
                      <Textarea
                        id="site-desc"
                        value={settingsForm.site_description}
                        onChange={(e) => setSettingsForm({ ...settingsForm, site_description: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="logo-url">URL логотипа</Label>
                      <Input
                        id="logo-url"
                        value={settingsForm.logo_url || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, logo_url: e.target.value })}
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                    <div>
                      <Label htmlFor="hero-image">Hero изображение</Label>
                      <Input
                        id="hero-image"
                        value={settingsForm.hero_image || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, hero_image: e.target.value })}
                        placeholder="https://example.com/hero.jpg"
                      />
                    </div>
                  </div>

                  {/* Colors */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-4">Цветовая схема</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="primary-color">Основной цвет</Label>
                        <div className="flex space-x-2">
                          <Input
                            id="primary-color"
                            type="color"
                            value={settingsForm.primary_color}
                            onChange={(e) => setSettingsForm({ ...settingsForm, primary_color: e.target.value })}
                            className="w-16 h-10"
                            data-testid="primary-color-input"
                          />
                          <Input
                            value={settingsForm.primary_color}
                            onChange={(e) => setSettingsForm({ ...settingsForm, primary_color: e.target.value })}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="accent-color">Акцентный цвет</Label>
                        <div className="flex space-x-2">
                          <Input
                            id="accent-color"
                            type="color"
                            value={settingsForm.accent_color}
                            onChange={(e) => setSettingsForm({ ...settingsForm, accent_color: e.target.value })}
                            className="w-16 h-10"
                          />
                          <Input
                            value={settingsForm.accent_color}
                            onChange={(e) => setSettingsForm({ ...settingsForm, accent_color: e.target.value })}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="bg-color">Цвет фона</Label>
                        <div className="flex space-x-2">
                          <Input
                            id="bg-color"
                            type="color"
                            value={settingsForm.background_color}
                            onChange={(e) => setSettingsForm({ ...settingsForm, background_color: e.target.value })}
                            className="w-16 h-10"
                          />
                          <Input
                            value={settingsForm.background_color}
                            onChange={(e) => setSettingsForm({ ...settingsForm, background_color: e.target.value })}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="secondary-color">Вторичный цвет</Label>
                        <div className="flex space-x-2">
                          <Input
                            id="secondary-color"
                            type="color"
                            value={settingsForm.secondary_color}
                            onChange={(e) => setSettingsForm({ ...settingsForm, secondary_color: e.target.value })}
                            className="w-16 h-10"
                          />
                          <Input
                            value={settingsForm.secondary_color}
                            onChange={(e) => setSettingsForm({ ...settingsForm, secondary_color: e.target.value })}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="text-color">Цвет текста</Label>
                        <div className="flex space-x-2">
                          <Input
                            id="text-color"
                            type="color"
                            value={settingsForm.text_color}
                            onChange={(e) => setSettingsForm({ ...settingsForm, text_color: e.target.value })}
                            className="w-16 h-10"
                          />
                          <Input
                            value={settingsForm.text_color}
                            onChange={(e) => setSettingsForm({ ...settingsForm, text_color: e.target.value })}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="border-t border-[#30363d] pt-6">
                  <h3 className="text-lg font-semibold mb-4">Предпросмотр</h3>
                  <div 
                    className="rounded-xl p-6" 
                    style={{ 
                      backgroundColor: settingsForm.background_color,
                      color: settingsForm.text_color 
                    }}
                  >
                    <div className="space-y-4">
                      <h4 className="text-2xl font-bold" style={{ fontFamily: 'Unbounded' }}>
                        {settingsForm.site_name}
                      </h4>
                      <p className="text-sm opacity-70">{settingsForm.site_description}</p>
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          className="px-6 py-2 rounded-lg font-semibold"
                          style={{ 
                            backgroundColor: settingsForm.primary_color,
                            color: '#000000'
                          }}
                        >
                          Основная кнопка
                        </button>
                        <button
                          type="button"
                          className="px-6 py-2 rounded-lg font-semibold"
                          style={{ 
                            backgroundColor: settingsForm.accent_color,
                            color: '#000000'
                          }}
                        >
                          Акцентная кнопка
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    className="skew-button bg-[#00ff9d] hover:bg-[#00cc7d] text-black px-8"
                    data-testid="save-settings-button"
                  >
                    <span>Сохранить настройки</span>
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
