import React, { useState, useEffect } from 'react';  
import './App.css';  
import logo from './assets/traveluxe-logo.png';

const API_URL = 'http://localhost:5000/api/tours';
const AUTH_API_URL = 'http://localhost:5000/api/auth';
const CHECKOUT_API_URL = 'http://localhost:5000/api/orders/checkout';
const ORDERS_API_URL = 'http://localhost:5000/api/orders';
const REVIEWS_API_URL = 'http://localhost:5000/api/reviews';
const TOKEN_STORAGE_KEY = 'travelLuxeToken';
const USER_STORAGE_KEY = 'travelLuxeUser';
const ACCOUNT_DATA_PREFIX = 'travelLuxeAccountData';
const emptyTourForm = { title: '', price: '', category: '', img: '', description: '', images: '' };
const emptyReviewData = { averageRating: 0, reviewsCount: 0, reviews: [] };
const emptyReviewForm = { rating: 5, comment: '' };
const emptyPaymentForm = {
  paymentMethod: 'card',
  cardholderName: '',
  cardNumber: '',
  expirationDate: '',
  cvv: ''
};
const additionalServices = [
  { id: 'transfer', title: 'Трансфер до отеля', price: 35, categories: ['Пляж', 'Город', 'Природа', 'Горы', 'Экскурсия'] },
  { id: 'insurance', title: 'Расширенная страховка', price: 20, categories: ['Пляж', 'Город', 'Природа', 'Горы', 'Экскурсия'] },
  { id: 'guide', title: 'Персональный гид', price: 50, categories: ['Город', 'Природа', 'Горы', 'Экскурсия'] },
  { id: 'meal', title: 'Питание в дороге', price: 25, categories: ['Пляж', 'Природа', 'Горы'] }
];
const fallbackImages = {
  beach: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900',
  mountains: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900',
  city: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=900',
  nature: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900',
  default: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=900'
};

const getAccountDataKey = (userId) => {
  return `${ACCOUNT_DATA_PREFIX}:${userId}`;
};

const getSavedUser = () => {
  const savedUser = localStorage.getItem(USER_STORAGE_KEY);
  return savedUser ? JSON.parse(savedUser) : null;
};

const isTokenExpired = (jwt) => {
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1]));
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

const getSavedToken = () => {
  const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!savedToken || isTokenExpired(savedToken)) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }

  return savedToken;
};

const getSavedAccountData = (userId) => {
  if (!userId) return { favorites: [], cart: [] };
  const savedData = localStorage.getItem(getAccountDataKey(userId));
  return savedData ? JSON.parse(savedData) : { favorites: [], cart: [] };
};

const initialToken = getSavedToken();
const initialUser = initialToken ? getSavedUser() : null;
const initialAccountData = getSavedAccountData(initialUser?.id);

const parseTourImages = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).map(item => item.trim()).filter(Boolean);
  } catch {
    return String(value).split('\n').map(item => item.trim()).filter(Boolean);
  }

  return [];
};

const serializeTourImages = (value) => {
  return JSON.stringify(parseTourImages(value));
};

const formatCardNumber = (value) => {
  return value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
};

const formatExpirationDate = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);

  if (digits.length === 0) return '';
  if (digits.length === 1) {
    return Number(digits) > 1 ? `0${digits}/` : digits;
  }

  const monthNumber = Math.min(Math.max(Number(digits.slice(0, 2)), 1), 12);
  const month = String(monthNumber).padStart(2, '0');
  const year = digits.slice(2);

  return year ? `${month}/${year}` : `${month}/`;
};

const formatCvv = (value) => {
  return value.replace(/\D/g, '').slice(0, 3);
};

const normalizeCartItem = (item) => ({
  ...item,
  people: Math.max(1, Number(item.people) || 1),
  services: Array.isArray(item.services) ? item.services : []
});

const getAvailableServices = (tour) => {
  const category = tour.category || '';
  return additionalServices.filter(service => service.categories.some(item => category.includes(item)));
};

const getServiceSelectionMessage = (tour) => {
  const category = tour.category || '';
  if (!category.trim()) return 'Услуги недоступны: регион тура не найден';
  if (category.toLowerCase().includes('архив')) return 'Нет свободных гидов и услуг для выбранного региона';
  return '';
};

const getCartItemTotal = (item) => {
  const normalizedItem = normalizeCartItem(item);
  const servicesTotal = getAvailableServices(normalizedItem)
    .filter(service => normalizedItem.services.includes(service.id))
    .reduce((sum, service) => sum + service.price, 0);

  return (Number(normalizedItem.price) + servicesTotal) * normalizedItem.people;
};

const getServiceTitle = (serviceId) => {
  return additionalServices.find(service => service.id === serviceId)?.title || serviceId;
};

function App() {  
  const [view, setView] = useState('catalog');  
  const [tours, setTours] = useState([]);  
  const [loading, setLoading] = useState(true);  
  const [error, setError] = useState(null);  
  
  const [cart, setCart] = useState(initialAccountData.cart.map(normalizeCartItem));  
  const [favorites, setFavorites] = useState(initialAccountData.favorites);  
  
  const [search, setSearch] = useState('');  
  const [category, setCategory] = useState('Все');  

  const [user, setUser] = useState(initialUser);
  const [token, setToken] = useState(initialToken);
  const [isLoginMode, setIsLoginMode] = useState(true); // true for login, false for register
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [tourForm, setTourForm] = useState(emptyTourForm);
  const [editingTourId, setEditingTourId] = useState(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [selectedTour, setSelectedTour] = useState(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [reviewData, setReviewData] = useState(emptyReviewData);
  const [reviewForm, setReviewForm] = useState(emptyReviewForm);
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [pendingReviewsLoading, setPendingReviewsLoading] = useState(false);

  const categories = ['Все', 'Пляж', 'Горы', 'Город', 'Природа'];  
  const cartTotal = cart.reduce((sum, item) => sum + getCartItemTotal(item), 0);

  const getAuthHeader = () => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  const getImageForCategory = (value) => {
    const normalized = value.toLowerCase();
    if (normalized.includes('пляж') || normalized.includes('море')) return fallbackImages.beach;
    if (normalized.includes('гор')) return fallbackImages.mountains;
    if (normalized.includes('город')) return fallbackImages.city;
    if (normalized.includes('природ')) return fallbackImages.nature;
    return fallbackImages.default;
  };

  const getTourImages = (tour) => {
    const mainImage = tour.img || getImageForCategory(tour.category || tour.title || '');
    const galleryImages = parseTourImages(tour.images);
    return [mainImage, ...galleryImages.filter(image => image && image !== mainImage)];
  };

  const getTourImage = (tour) => {
    return getTourImages(tour)[0];
  };

  const fetchTours = () => {
    setLoading(true);
    setError(null);
    fetch(API_URL)  
      .then(res => {  
        if (!res.ok) throw new Error('Сервер C# не отвечает');  
        return res.json();  
      })  
      .then(data => {  
        setTours(data);  
        setLoading(false);  
      })  
      .catch(err => {  
        setError(err.message);  
        setLoading(false);  
      });
  };

  useEffect(() => {  
    fetchTours();
  }, []);  

  useEffect(() => {
    if (!user) return;

    localStorage.setItem(getAccountDataKey(user.id), JSON.stringify({
      favorites,
      cart
    }));
  }, [favorites, cart, user]);

  useEffect(() => {
    if (view === 'orders' && user) {
      fetchOrders();
    }
  }, [view, user]);

  useEffect(() => {
    if (selectedTour) {
      fetchTourReviews(selectedTour.id);
    }
  }, [selectedTour?.id]);

  useEffect(() => {
    if (view === 'admin' && user?.role === 'admin') {
      fetchPendingReviews();
    }
  }, [view, user]);

  const handleActionWithAuth = (action) => {
    if (!user) {
      alert("Для этого действия необходимо авторизоваться!");
      setView('auth');
      return;
    }
    action();
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    setOrdersError('');

    try {
      const response = await fetch(ORDERS_API_URL, {
        headers: getAuthHeader()
      });

      if (response.status === 401) {
        handleAuthExpired();
        return;
      }

      if (!response.ok) {
        setOrdersError(`Ошибка загрузки заказов: ${response.status}`);
        return;
      }

      setOrders(await response.json());
    } catch {
      setOrdersError('Сервер C# не отвечает');
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchTourReviews = async (tourId) => {
    setReviewMessage('');
    setReviewData(emptyReviewData);

    try {
      const response = await fetch(`${REVIEWS_API_URL}/tour/${tourId}`);

      if (!response.ok) {
        setReviewMessage(`Ошибка загрузки отзывов: ${response.status}`);
        return;
      }

      setReviewData(await response.json());
    } catch {
      setReviewMessage('Сервер C# не отвечает');
    }
  };

  const fetchPendingReviews = async () => {
    setPendingReviewsLoading(true);

    try {
      const response = await fetch(`${REVIEWS_API_URL}/pending`, {
        headers: getAuthHeader()
      });

      if (response.status === 401) {
        handleAuthExpired();
        return;
      }

      if (response.status === 403) {
        handleAdminAccessDenied();
        return;
      }

      if (!response.ok) {
        setAdminMessage(`Ошибка загрузки отзывов: ${response.status}`);
        return;
      }

      setPendingReviews(await response.json());
    } catch {
      setAdminMessage('Сервер C# не отвечает');
    } finally {
      setPendingReviewsLoading(false);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();

    handleActionWithAuth(async () => {
      if (!selectedTour) return;
      setReviewLoading(true);
      setReviewMessage('');

      try {
        const response = await fetch(REVIEWS_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          },
          body: JSON.stringify({
            tourId: selectedTour.id,
            rating: Number(reviewForm.rating),
            comment: reviewForm.comment.trim()
          })
        });

        const responseText = await response.text();
        const data = responseText ? JSON.parse(responseText) : {};

        if (response.status === 401) {
          handleAuthExpired();
          return;
        }

        if (!response.ok) {
          setReviewMessage(data.message || `Ошибка отправки отзыва: ${response.status}`);
          return;
        }

        setReviewForm(emptyReviewForm);
        setReviewMessage('Отзыв отправлен');
        if (user?.role === 'admin') fetchPendingReviews();
      } catch {
        setReviewMessage('Сервер C# не отвечает');
      } finally {
        setReviewLoading(false);
      }
    });
  };

  const moderateReview = async (reviewId, status) => {
    try {
      const response = await fetch(`${REVIEWS_API_URL}/${reviewId}/moderate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ status })
      });

      const responseText = await response.text();
      const data = responseText ? JSON.parse(responseText) : {};

      if (response.status === 401) {
        handleAuthExpired();
        return;
      }

      if (response.status === 403) {
        handleAdminAccessDenied();
        return;
      }

      if (!response.ok) {
        alert(data.message || `Ошибка модерации: ${response.status}`);
        return;
      }

      setPendingReviews(pendingReviews.filter(review => review.id !== reviewId));
      if (selectedTour) fetchTourReviews(selectedTour.id);
    } catch {
      alert('Сервер C# не отвечает');
    }
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm('Отменить тур и оформить возврат?')) return;

    try {
      const response = await fetch(`${ORDERS_API_URL}/${orderId}/cancel`, {
        method: 'POST',
        headers: getAuthHeader()
      });

      const responseText = await response.text();
      const data = responseText ? JSON.parse(responseText) : {};

      if (response.status === 401) {
        handleAuthExpired();
        return;
      }

      if (!response.ok) {
        alert(data.message || `Ошибка отмены: ${response.status}`);
        return;
      }

      alert(`Тур отменён. Сумма возврата: $${data.refundAmount}`);
      fetchOrders();
    } catch {
      alert('Сервер C# не отвечает');
    }
  };

  const toggleFavorite = (item) => {
    handleActionWithAuth(() => {
      if (favorites.some(f => f.id === item.id)) {
        setFavorites(favorites.filter(f => f.id !== item.id));
      } else {
        setFavorites([...favorites, item]);
      }
    });
  };

  const addToCart = (item) => {
    handleActionWithAuth(() => {
      if (cart.some(cartItem => cartItem.id === item.id)) {
        alert('Этот тур уже есть в корзине. Можно изменить количество людей и услуги внутри корзины.');
        setView('cart');
        return;
      }

      setCart([...cart, normalizeCartItem(item)]);
    });
  };

  const removeFromCart = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const updateCartItemPeople = (id, nextPeople) => {
    setCart(cart.map(item => (
      item.id === id ? { ...normalizeCartItem(item), people: Math.max(1, Math.min(20, nextPeople)) } : item
    )));
  };

  const toggleCartItemService = (id, serviceId) => {
    setCart(cart.map(item => {
      if (item.id !== id) return item;

      const normalizedItem = normalizeCartItem(item);
      const nextServices = normalizedItem.services.includes(serviceId)
        ? normalizedItem.services.filter(itemServiceId => itemServiceId !== serviceId)
        : [...normalizedItem.services, serviceId];

      return { ...normalizedItem, services: nextServices };
    }));
  };

  const clearCart = () => {
    if (window.confirm("Очистить корзину?")) setCart([]);
  };

  const openCheckout = () => {
    if (cart.length === 0) return;
    setCheckoutError('');
    setPaymentForm(emptyPaymentForm);
    setIsCheckoutOpen(true);
  };

  const closeCheckout = () => {
    if (checkoutLoading) return;
    setIsCheckoutOpen(false);
    setCheckoutError('');
  };

  const handlePaymentFormChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;

    if (name === 'cardNumber') nextValue = formatCardNumber(value);
    if (name === 'expirationDate') nextValue = formatExpirationDate(value);
    if (name === 'cvv') nextValue = formatCvv(value);

    setPaymentForm({ ...paymentForm, [name]: nextValue });
  };

  const submitCheckout = async (e) => {
    e.preventDefault();
    setCheckoutError('');
    setCheckoutLoading(true);

    try {
      const response = await fetch(CHECKOUT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          tourIds: cart.flatMap(item => Array.from({ length: normalizeCartItem(item).people }, () => item.id)),
          items: cart.map(item => ({
            tourId: item.id,
            people: normalizeCartItem(item).people,
            services: normalizeCartItem(item).services,
            totalPrice: getCartItemTotal(item)
          })),
          totalPrice: cartTotal,
          ...paymentForm
        })
      });

      if (response.status === 401) {
        handleAuthExpired();
        return;
      }

      if (response.status === 403) {
        setCheckoutError('Для оформления заказа нужно войти как пользователь.');
        return;
      }

      const responseText = await response.text();
      const data = responseText ? JSON.parse(responseText) : {};

      if (!response.ok) {
        setCheckoutError(data.message || `Ошибка оплаты: ${response.status}`);
        return;
      }

      setCart([]);
      setIsCheckoutOpen(false);
      setPaymentForm(emptyPaymentForm);
      alert(`Заказ #${data.orderId} успешно оплачен`);
      fetchOrders();
    } catch (err) {
      setCheckoutError(err instanceof SyntaxError ? 'Сервер вернул неверный ответ' : 'Сервер C# не отвечает');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleAuthExpired = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setView('auth');
    alert('Сессия истекла. Войдите снова.');
  };

  const handleAdminAccessDenied = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setView('auth');
    alert('Нет доступа администратора. Войдите в аккаунт админа заново.');
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setFavorites([]);
    setCart([]);
    setView('catalog');
  };

  const deleteTour = (id) => {
    if (window.confirm("Вы уверены, что хотите удалить этот тур?")) {
      fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      })
      .then(res => {
        if (res.ok) {
          setTours(tours.filter(t => t.id !== id));
          setFavorites(favorites.filter(t => t.id !== id));
          setCart(cart.filter(t => t.id !== id));
          if (selectedTour?.id === id) closeTour();
          setAdminMessage('Тур удалён');
        } else if (res.status === 401) {
          handleAuthExpired();
        } else if (res.status === 403) {
          handleAdminAccessDenied();
        } else {
          alert(`Ошибка при удалении: ${res.status}`);
        }
      })
      .catch(() => alert("Сервер C# не отвечает"));
    }
  };

  const resetTourForm = () => {
    setTourForm(emptyTourForm);
    setEditingTourId(null);
    setAdminMessage('');
  };

  const handleTourFormChange = (e) => {
    const { name, value } = e.target;
    setTourForm({ ...tourForm, [name]: value });
  };

  const openTour = (tour) => {
    setSelectedTour(tour);
    setGalleryIndex(0);
  };

  const closeTour = () => {
    setSelectedTour(null);
    setGalleryIndex(0);
  };

  const startEditTour = (tour) => {
    setTourForm({
      title: tour.title,
      price: String(tour.price),
      category: tour.category,
      img: tour.img,
      description: tour.description || '',
      images: parseTourImages(tour.images).join('\n')
    });
    setEditingTourId(tour.id);
    setAdminMessage('');
    setView('admin');
  };

  const saveTour = (e) => {
    e.preventDefault();
    const tourData = {
      title: tourForm.title.trim(),
      price: Number(tourForm.price),
      category: tourForm.category.trim(),
      img: tourForm.img.trim() || getImageForCategory(tourForm.category || tourForm.title),
      description: tourForm.description.trim(),
      images: serializeTourImages(tourForm.images)
    };

    if (!tourData.title || !tourData.price || !tourData.category) {
      setAdminMessage('Заполните название, цену и категорию');
      return;
    }

    const url = editingTourId ? `${API_URL}/${editingTourId}` : API_URL;
    const method = editingTourId ? 'PUT' : 'POST';

    fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(tourData)
    })
    .then(res => {
      if (res.status === 401) {
        handleAuthExpired();
        throw new Error('Сессия истекла');
      }
      if (res.status === 403) {
        handleAdminAccessDenied();
        throw new Error('Нет доступа администратора');
      }
      if (!res.ok) throw new Error(`Ошибка сохранения: ${res.status}`);
      return res.json();
    })
    .then(savedTour => {
      if (editingTourId) {
        setTours(tours.map(t => t.id === editingTourId ? savedTour : t));
        setFavorites(favorites.map(t => t.id === editingTourId ? savedTour : t));
        setCart(cart.map(t => t.id === editingTourId ? normalizeCartItem({ ...savedTour, people: t.people, services: t.services }) : t));
        if (selectedTour?.id === editingTourId) {
          setSelectedTour(savedTour);
          setGalleryIndex(0);
        }
        setAdminMessage('Тур обновлён');
      } else {
        setTours([...tours, savedTour]);
        setAdminMessage('Тур добавлен');
      }
      setTourForm(emptyTourForm);
      setEditingTourId(null);
      fetchTours();
    })
    .catch(err => setAdminMessage(err.message));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const response = await fetch(`${AUTH_API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthError(data.message || 'Ошибка при входе');
        setAuthLoading(false);
        return;
      }

      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));

      setToken(data.token);
      setUser(data.user);
      
      const accountData = getSavedAccountData(data.user.id);
      setFavorites(accountData.favorites);
      setCart(accountData.cart.map(normalizeCartItem));

      setUsername('');
      setPassword('');
      setView('catalog');
    } catch (err) {
      setAuthError('Ошибка подключения к серверу');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    if (password !== confirmPassword) {
      setAuthError('Пароли не совпадают');
      setAuthLoading(false);
      return;
    }

    try {
      const response = await fetch(`${AUTH_API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthError(data.message || 'Ошибка при регистрации');
        setAuthLoading(false);
        return;
      }

      // Save token and user data
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));

      setToken(data.token);
      setUser(data.user);

      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setView('catalog');
    } catch (err) {
      setAuthError('Ошибка подключения к серверу');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setFavorites([]);
    setCart([]);
    setView('catalog');
  };

  const filtered = tours.filter(item =>  
    item.title.toLowerCase().includes(search.toLowerCase()) &&  
    (category === 'Все' || item.category === category)  
  );  

  return (  
    <div className="app-container">  
      <header className="header">  
<div className="logo" onClick={() => setView('catalog')}>
  <img src={logo} alt="TRAVELuxe" className="logo-img" />
</div> 
        <nav className="nav-menu">  
          <span className={`nav-link ${view === 'catalog' ? 'active' : ''}`} onClick={() => setView('catalog')}>Каталог</span>  
          <span className={`nav-link ${view === 'favorites' ? 'active' : ''}`} onClick={() => handleActionWithAuth(() => setView('favorites'))}>Избранное ({user ? favorites.length : 0})</span>  
          <span className={`nav-link ${view === 'orders' ? 'active' : ''}`} onClick={() => handleActionWithAuth(() => setView('orders'))}>Заказы</span>
          {user?.role === 'admin' && (
            <span className={`nav-link ${view === 'admin' ? 'active' : ''}`} onClick={() => setView('admin')}>Админ</span>
          )}
          <span className={`nav-link ${view === 'about' ? 'active' : ''}`} onClick={() => setView('about')}>О нас</span>  
          
          {!user ? (
            <span className={`nav-link ${view === 'auth' ? 'active' : ''}`} onClick={() => setView('auth')}>Войти</span>
          ) : (
            <span className="user-badge" onClick={handleLogout}>
              Выйти ({user.role === 'admin' ? 'Админ' : user.username})
            </span>
          )}
          <button className="cart-btn-main" onClick={() => handleActionWithAuth(() => setView('cart'))}>🛒 ({user ? cart.length : 0})</button>  
        </nav>  
      </header>  

      {view === 'auth' && (
        <div className="page-content auth-page">
          <div className="auth-box large-box">
            <h2 className="page-title">{isLoginMode ? 'Вход' : 'Регистрация'}</h2>
            <form onSubmit={isLoginMode ? handleLogin : handleRegister} className="auth-form">
              <div className="input-group">
                <label>Имя пользователя</label>
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  required 
                  disabled={authLoading}
                />
              </div>
              {!isLoginMode && (
                <div className="input-group">
                  <label>Email</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    disabled={authLoading}
                  />
                </div>
              )}
              <div className="input-group">
                <label>Пароль</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  disabled={authLoading}
                />
              </div>
              {!isLoginMode && (
                <div className="input-group">
                  <label>Повторите пароль</label>
                  <input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    required 
                    disabled={authLoading}
                  />
                </div>
              )}
              {authError && <p className="auth-error-msg">{authError}</p>}
              <button type="submit" className="login-submit-btn" disabled={authLoading}>
                {authLoading ? 'Загрузка...' : (isLoginMode ? 'Войти' : 'Зарегистрироваться')}
              </button>
              <div className="auth-toggle">
                <p>
                  {isLoginMode ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
                  <button 
                    type="button" 
                    className="auth-toggle-btn"
                    onClick={() => {
                      setIsLoginMode(!isLoginMode);
                      setAuthError('');
                      setUsername('');
                      setEmail('');
                      setPassword('');
                      setConfirmPassword('');
                    }}
                  >
                    {isLoginMode ? 'Зарегистрируйтесь' : 'Войдите'}
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {view === 'catalog' && (  
        <>  
          <section className="hero">
            <h1 className="hero-title">Мир ждет тебя</h1>
          </section>  

          <div className="controls-section">  
            {user?.role === 'admin' && (
              <div className="admin-panel-info">
                <button className="add-btn admin-theme" onClick={() => { resetTourForm(); setView('admin'); }}>Панель администратора</button>
                <p>Режим Администратора</p>
              </div>
            )}
            <div className="search-box-container">
              <input type="text" className="modern-search" placeholder="Поиск туров..." onChange={(e) => setSearch(e.target.value)} />  
            </div>

            <div className="filter-chips">  
              {categories.map(cat => (  
                <button key={cat} className={`chip ${category === cat ? 'active' : ''}`} onClick={() => setCategory(cat)}>{cat}</button>  
              ))}  
            </div>  
          </div>  

          <main className="main-grid">  
            {loading ? <div className="state-msg">Загрузка данных...</div> :
              error ? <div className="state-msg">{error}</div> :
              filtered.map(item => (  
                <TourCard 
                  key={item.id} 
                  item={item} 
                  isAdmin={user?.role === 'admin'} 
                  isFavorite={favorites.some(f => f.id === item.id)}
                  onDelete={() => deleteTour(item.id)}
                  onEdit={() => startEditTour(item)}
                  onOpen={() => openTour(item)}
                  getTourImage={getTourImage}
                  onAdd={() => addToCart(item)} 
                  onFavorite={() => toggleFavorite(item)}
                />  
              ))
            }  
          </main>  
        </>  
      )}  

      {view === 'favorites' && (
        <div className="page-content">
          <h2 className="page-title">Избранное</h2>
          <main className="main-grid">
            {favorites.length > 0 ? (
              favorites.map(item => (
                <TourCard 
                  key={item.id} 
                  item={item} 
                  isAdmin={false}
                  isFavorite={true}
                  getTourImage={getTourImage}
                  onOpen={() => openTour(item)}
                  onAdd={() => addToCart(item)}
                  onFavorite={() => toggleFavorite(item)}
                />
              ))
            ) : (
              <div className="empty-state"><p>В избранном пока ничего нет</p></div>
            )}
          </main>
        </div>
      )}

      {view === 'admin' && user?.role === 'admin' && (
        <div className="page-content admin-page">
          <div className="admin-header">
            <h2 className="page-title">Панель администратора</h2>
            <button className="admin-secondary-btn" onClick={resetTourForm}>Новый тур</button>
          </div>

          <div className="admin-layout">
            <form className="admin-form" onSubmit={saveTour}>
              <h3>{editingTourId ? 'Редактирование тура' : 'Добавление тура'}</h3>
              <div className="input-group">
                <label>Название</label>
                <input name="title" type="text" value={tourForm.title} onChange={handleTourFormChange} />
              </div>
              <div className="input-group">
                <label>Цена</label>
                <input name="price" type="number" min="1" value={tourForm.price} onChange={handleTourFormChange} />
              </div>
              <div className="input-group">
                <label>Категория</label>
                <input name="category" type="text" value={tourForm.category} onChange={handleTourFormChange} />
              </div>
              <div className="input-group">
                <label>Ссылка на изображение</label>
                <input name="img" type="text" value={tourForm.img} onChange={handleTourFormChange} placeholder="Можно оставить пустым" />
              </div>
              <div className="input-group">
                <label>Описание</label>
                <textarea name="description" value={tourForm.description} onChange={handleTourFormChange} rows="5" placeholder="Что входит в тур, куда едем, чем он интересен" />
              </div>
              <div className="input-group">
                <label>Дополнительные фотографии</label>
                <textarea name="images" value={tourForm.images} onChange={handleTourFormChange} rows="5" placeholder="Каждая ссылка с новой строки" />
              </div>
              <p className="admin-form-hint">Главное изображение можно оставить пустым. Дополнительные фото вставляйте прямыми ссылками на изображения.</p>
              {adminMessage && <p className="admin-message">{adminMessage}</p>}
              <div className="admin-form-actions">
                <button type="submit" className="login-submit-btn">{editingTourId ? 'Сохранить' : 'Добавить'}</button>
                {editingTourId && <button type="button" className="admin-secondary-btn" onClick={resetTourForm}>Отмена</button>}
              </div>
            </form>

            <div className="admin-table">
              <div className="admin-table-head">
                <span>Тур</span>
                <span>Категория</span>
                <span>Цена</span>
                <span></span>
              </div>
              {tours.map(tour => (
                <div className="admin-table-row" key={tour.id}>
                  <div className="admin-tour-cell">
                    <img src={getTourImage(tour)} alt={tour.title} />
                    <strong>{tour.title}</strong>
                  </div>
                  <span>{tour.category}</span>
                  <span>${tour.price}</span>
                  <div className="admin-row-actions">
                    <button onClick={() => startEditTour(tour)}>Редактировать</button>
                    <button className="danger-action" onClick={() => deleteTour(tour.id)}>Удалить</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <section className="review-moderation">
            <div className="review-moderation-head">
              <div>
                <h3>Модерация отзывов</h3>
                <p>Проверяйте отзывы пользователей перед публикацией на странице тура.</p>
              </div>
              <button className="admin-secondary-btn" onClick={fetchPendingReviews}>Обновить</button>
            </div>

            {pendingReviewsLoading ? (
              <div className="state-msg compact-state">Загрузка отзывов...</div>
            ) : pendingReviews.length > 0 ? (
              <div className="pending-review-list">
                {pendingReviews.map(review => (
                  <div className="pending-review-card" key={review.id}>
                    <div>
                      <span className="review-tour-name">{review.tourTitle}</span>
                      <h4>{review.username}</h4>
                      <div className="review-stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                      <p>{review.comment}</p>
                    </div>
                    <div className="review-actions">
                      <button onClick={() => moderateReview(review.id, 'Approved')}>Одобрить</button>
                      <button className="danger-action" onClick={() => moderateReview(review.id, 'Rejected')}>Отклонить</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state review-empty"><p>Новых отзывов на проверку нет</p></div>
            )}
          </section>
        </div>
      )}

      {view === 'cart' && (
        <div className="page-content">
          <h2 className="page-title">Ваша корзина</h2>
          <div className="cart-wrapper">
            {cart.length > 0 ? (
              <div className="cart-main-layout">
                <div className="cart-items-list">
                  <div className="cart-list-header">
                    <button className="clear-cart-btn-minimal" onClick={clearCart}>Очистить всё</button>
                  </div>
                  {cart.map((item, i) => {
                    const normalizedItem = normalizeCartItem(item);
                    const availableServices = getAvailableServices(normalizedItem);
                    const servicesMessage = getServiceSelectionMessage(normalizedItem);
                    const selectedServicesTotal = availableServices
                      .filter(service => normalizedItem.services.includes(service.id))
                      .reduce((sum, service) => sum + service.price, 0);

                    return (
                    <div key={normalizedItem.id} className="cart-item-card">
                      <img src={getTourImage(item)} alt={item.title} className="cart-item-img" />
                      <div className="cart-item-info">
                        <h4>{item.title}</h4>
                        <p>{item.category}</p>

                        <div className="cart-config">
                          <div className="people-control">
                            <span>Людей</span>
                            <div className="stepper">
                              <button onClick={() => updateCartItemPeople(normalizedItem.id, normalizedItem.people - 1)} disabled={normalizedItem.people <= 1}>−</button>
                              <strong>{normalizedItem.people}</strong>
                              <button onClick={() => updateCartItemPeople(normalizedItem.id, normalizedItem.people + 1)}>+</button>
                            </div>
                          </div>

                          <div className="service-picker">
                            <span>Доп. услуги</span>
                            {servicesMessage ? (
                              <p className="service-message">{servicesMessage}</p>
                            ) : (
                              <div className="service-list">
                                {availableServices.map(service => (
                                  <label key={service.id} className="service-option">
                                    <input
                                      type="checkbox"
                                      checked={normalizedItem.services.includes(service.id)}
                                      onChange={() => toggleCartItemService(normalizedItem.id, service.id)}
                                    />
                                    <span>{service.title}</span>
                                    <strong>+${service.price}</strong>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="cart-item-price">
                        <small>Тур: ${item.price} × {normalizedItem.people}</small>
                        {selectedServicesTotal > 0 && <small>Услуги: ${selectedServicesTotal} × {normalizedItem.people}</small>}
                        <strong>${getCartItemTotal(normalizedItem)}</strong>
                      </div>
                      <button className="remove-item-btn" onClick={() => removeFromCart(i)}>✕</button>
                    </div>
                    );
                  })}
                </div>
                <div className="cart-summary-panel">
                  <h3>Итог заказа</h3>
                  <div className="summary-row"><span>Туров:</span><span>{cart.length}</span></div>
                  <div className="summary-row"><span>Людей:</span><span>{cart.reduce((sum, item) => sum + normalizeCartItem(item).people, 0)}</span></div>
                  <div className="summary-total"><span>К оплате:</span><span>${cartTotal}</span></div>
                  <button className="checkout-btn" onClick={openCheckout}>Оформить заказ</button>
                </div>
              </div>
            ) : (
              <div className="empty-cart-state">
                <div className="empty-icon">🛒</div>
                <p>В корзине пока ничего нет</p>
                <button className="back-to-catalog" onClick={() => setView('catalog')}>Вернуться к турам</button>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'orders' && (
        <div className="page-content orders-page">
          <h2 className="page-title">Мои заказы</h2>
          {ordersLoading ? (
            <div className="state-msg">Загрузка заказов...</div>
          ) : ordersError ? (
            <div className="state-msg">{ordersError}</div>
          ) : orders.length > 0 ? (
            <div className="orders-list">
              {orders.map(order => (
                <div className="order-card" key={order.id}>
                  <div className="order-card-head">
                    <div>
                      <span className={`order-status ${order.status === 'Cancelled' ? 'cancelled' : ''}`}>
                        {order.status === 'Cancelled' ? 'Отменён' : 'Оплачен'}
                      </span>
                      <h3>Заказ #{order.id}</h3>
                      <p>{new Date(order.createdAt).toLocaleDateString('ru-RU')}</p>
                    </div>
                    <strong>${order.totalPrice}</strong>
                  </div>

                  <div className="order-items">
                    {order.items.map((item, index) => (
                      <div className="order-item-row" key={`${order.id}-${index}`}>
                        <span>{item.tourTitle}</span>
                        <span>{item.people} чел.</span>
                        <span>
                          {item.services
                            ? item.services.split(',').filter(Boolean).map(getServiceTitle).join(', ')
                            : 'Без услуг'}
                        </span>
                        <strong>${item.totalPrice}</strong>
                      </div>
                    ))}
                  </div>

                  {order.status !== 'Cancelled' && (
                    <button className="cancel-order-btn" onClick={() => cancelOrder(order.id)}>
                      Отменить тур
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state"><p>У вас пока нет оформленных заказов</p></div>
          )}
        </div>
      )}

      {view === 'about' && (  
        <div className="page-content about-page">  
          <h2 className="page-title">О нас</h2>  
          <div className="about-hero"><p className="about-lead">Мы предлагаем уникальные путешествия по всему миру с 2020 года.</p></div>
          <div className="about-grid">
            <div className="about-card-modern">
              <div className="about-icon">🌍</div>
              <h3>100+ Направлений</h3>
              <p>От заснеженных вершин гор до лазурных берегов океана.</p>
            </div>
            <div className="about-card-modern">
              <div className="about-icon">⭐</div>
              <h3>Лучший сервис</h3>
              <p>Заботимся о вашем комфорте на каждом этапе путешествия.</p>
            </div>
            <div className="about-card-modern">
              <div className="about-icon">🛡️</div>
              <h3>Надежность</h3>
              <p>Ваша безопасность и страхование — наш главный приоритет.</p>
            </div>
          </div>
        </div>  
      )}

      {selectedTour && (
        <TourDetailsModal
          tour={selectedTour}
          images={getTourImages(selectedTour)}
          galleryIndex={galleryIndex}
          setGalleryIndex={setGalleryIndex}
          onClose={closeTour}
          onAdd={() => addToCart(selectedTour)}
          isFavorite={favorites.some(f => f.id === selectedTour.id)}
          onFavorite={() => toggleFavorite(selectedTour)}
          user={user}
          reviewData={reviewData}
          reviewForm={reviewForm}
          reviewMessage={reviewMessage}
          reviewLoading={reviewLoading}
          onReviewChange={(e) => setReviewForm({ ...reviewForm, [e.target.name]: e.target.value })}
          onReviewSubmit={submitReview}
        />
      )}

      {isCheckoutOpen && (
        <CheckoutModal
          cart={cart}
          total={cartTotal}
          peopleCount={cart.reduce((sum, item) => sum + normalizeCartItem(item).people, 0)}
          paymentForm={paymentForm}
          checkoutLoading={checkoutLoading}
          checkoutError={checkoutError}
          onChange={handlePaymentFormChange}
          onClose={closeCheckout}
          onSubmit={submitCheckout}
        />
      )}
    </div>  
  );  
}  

function TourCard({ item, onAdd, isAdmin, onDelete, onEdit, isFavorite, onFavorite, getTourImage, onOpen }) {  
  const handleButtonClick = (e, action) => {
    e.stopPropagation();
    action();
  };

  return (  
    <div className="modern-card" onClick={onOpen}>  
      <div className="card-image-h">
        <img src={getTourImage ? getTourImage(item) : item.img} alt={item.title} />
        <button className={`fav-btn-overlay ${isFavorite ? 'active' : ''}`} onClick={(e) => handleButtonClick(e, onFavorite)}>
          {isFavorite ? '❤️' : '🤍'}
        </button>
      </div>  
      <div className="card-content">  
        <h3>{item.title}</h3>  
        <p className="card-description">{item.description || 'Откройте тур, чтобы посмотреть подробности путешествия.'}</p>
        <div className="card-footer-row">  
          <span className="price">${item.price}</span>  
          <div className="card-buttons">
            <button className="add-btn" onClick={(e) => handleButtonClick(e, onAdd)}>В корзину</button>
            {isAdmin && <button className="edit-btn-admin" onClick={(e) => handleButtonClick(e, onEdit)}>✎</button>}
            {isAdmin && <button className="delete-btn-admin" onClick={(e) => handleButtonClick(e, onDelete)}>🗑️</button>}
          </div>
        </div>  
      </div>  
    </div>  
  );  
}  

function TourDetailsModal({
  tour,
  images,
  galleryIndex,
  setGalleryIndex,
  onClose,
  onAdd,
  isFavorite,
  onFavorite,
  user,
  reviewData,
  reviewForm,
  reviewMessage,
  reviewLoading,
  onReviewChange,
  onReviewSubmit
}) {
  const currentImage = images[galleryIndex] || tour.img;
  const hasGallery = images.length > 1;

  const showPreviousImage = () => {
    setGalleryIndex((galleryIndex - 1 + images.length) % images.length);
  };

  const showNextImage = () => {
    setGalleryIndex((galleryIndex + 1) % images.length);
  };

  return (
    <div className="tour-modal-backdrop" onClick={onClose}>
      <div className="tour-modal" onClick={(e) => e.stopPropagation()}>
        <button className="tour-modal-close" onClick={onClose}>Закрыть</button>
        <div className="tour-gallery">
          <img src={currentImage} alt={tour.title} />
          {hasGallery && (
            <>
              <button className="gallery-btn gallery-prev" onClick={showPreviousImage}>‹</button>
              <button className="gallery-btn gallery-next" onClick={showNextImage}>›</button>
              <div className="gallery-counter">{galleryIndex + 1} / {images.length}</div>
            </>
          )}
        </div>

        <div className="tour-detail-content">
          <div className="tour-detail-heading">
            <div>
              <span className="tour-category">{tour.category}</span>
              <h2>{tour.title}</h2>
              <div className="tour-rating-summary">
                <span>{reviewData.averageRating > 0 ? reviewData.averageRating.toFixed(1) : '0.0'}</span>
                <div>
                  <strong>{'★'.repeat(Math.round(reviewData.averageRating))}{'☆'.repeat(5 - Math.round(reviewData.averageRating))}</strong>
                  <small>{reviewData.reviewsCount} отзывов</small>
                </div>
              </div>
            </div>
            <span className="tour-detail-price">${tour.price}</span>
          </div>

          <p className="tour-detail-description">
            {tour.description || 'Описание тура скоро появится. Администратор сможет добавить маршрут, детали проживания и особенности поездки.'}
          </p>

          <div className="tour-detail-actions">
            <button className="add-btn" onClick={onAdd}>В корзину</button>
            <button className={`favorite-detail-btn ${isFavorite ? 'active' : ''}`} onClick={onFavorite}>
              {isFavorite ? 'В избранном' : 'В избранное'}
            </button>
          </div>

          <div className="tour-reviews">
            <div className="tour-reviews-head">
              <h3>Отзывы и рейтинг</h3>
              <span>{reviewData.averageRating > 0 ? `${reviewData.averageRating.toFixed(1)} из 5` : 'Пока нет оценок'}</span>
            </div>

            {user ? (
              <form className="review-form" onSubmit={onReviewSubmit}>
                <div className="review-form-row">
                  <div className="input-group">
                    <label>Оценка</label>
                    <div className="rating-picker" role="radiogroup" aria-label="Оценка тура">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          className={Number(reviewForm.rating) >= star ? 'active' : ''}
                          onClick={() => onReviewChange({ target: { name: 'rating', value: star } })}
                          aria-label={`${star} из 5`}
                          aria-checked={Number(reviewForm.rating) === star}
                          role="radio"
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="input-group">
                  <label>Ваш отзыв</label>
                  <textarea
                    name="comment"
                    value={reviewForm.comment}
                    onChange={onReviewChange}
                    placeholder="Что понравилось в туре?"
                    minLength="5"
                    required
                  />
                </div>
                {reviewMessage && <p className="review-message">{reviewMessage}</p>}
                <button type="submit" className="add-btn" disabled={reviewLoading}>
                  {reviewLoading ? 'Отправка...' : 'Отправить'}
                </button>
              </form>
            ) : (
              <p className="review-login-note">Войдите в аккаунт, чтобы оставить отзыв.</p>
            )}

            <div className="approved-review-list">
              {reviewData.reviews.length > 0 ? (
                reviewData.reviews.map(review => (
                  <div className="approved-review-card" key={review.id}>
                    <div className="approved-review-head">
                      <strong>{review.username}</strong>
                      <span>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                    </div>
                    <p>{review.comment}</p>
                  </div>
                ))
              ) : (
                <p className="review-login-note">Одобренных отзывов пока нет.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckoutModal({ cart, total, peopleCount, paymentForm, checkoutLoading, checkoutError, onChange, onClose, onSubmit }) {
  const isCardPayment = paymentForm.paymentMethod === 'card';

  return (
    <div className="checkout-backdrop" onClick={onClose}>
      <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
        <button className="tour-modal-close" onClick={onClose}>Закрыть</button>
        <h2>Оплата заказа</h2>

        <div className="checkout-summary">
          <span>Туров: {cart.length} · Людей: {peopleCount}</span>
          <strong>${total}</strong>
        </div>

        <form className="checkout-form" onSubmit={onSubmit}>
          <div className="input-group">
            <label>Способ оплаты</label>
            <select name="paymentMethod" value={paymentForm.paymentMethod} onChange={onChange}>
              <option value="card">Банковская карта</option>
              <option value="paypal">PayPal</option>
              <option value="cash">Наличные в офисе</option>
            </select>
          </div>

          {isCardPayment && (
            <>
              <div className="input-group">
                <label>Имя владельца карты</label>
                <input name="cardholderName" type="text" value={paymentForm.cardholderName} onChange={onChange} required />
              </div>
              <div className="input-group">
                <label>Номер карты</label>
                <input name="cardNumber" type="text" inputMode="numeric" value={paymentForm.cardNumber} onChange={onChange} placeholder="4111 1111 1111 1111" maxLength="19" required />
              </div>
              <div className="payment-row">
                <div className="input-group">
                  <label>Срок</label>
                  <input name="expirationDate" type="text" inputMode="numeric" value={paymentForm.expirationDate} onChange={onChange} placeholder="12/28" maxLength="5" required />
                </div>
                <div className="input-group">
                  <label>CVV</label>
                  <input name="cvv" type="password" inputMode="numeric" value={paymentForm.cvv} onChange={onChange} maxLength="3" required />
                </div>
              </div>
            </>
          )}

          {!isCardPayment && (
            <p className="payment-note">
              Это учебная имитация оплаты. После подтверждения заказ будет сохранён со статусом оплаты.
            </p>
          )}

          {checkoutError && <p className="auth-error-msg">{checkoutError}</p>}

          <button type="submit" className="checkout-submit-btn" disabled={checkoutLoading}>
            {checkoutLoading ? 'Оплата...' : 'Оплатить'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
