import React, { useState, useEffect } from 'react';  
import './App.css';  

const API_URL = 'http://localhost:5001/api/tours';
const emptyTourForm = { title: '', price: '', category: '', img: '' };
const fallbackImages = {
  beach: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900',
  mountains: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900',
  city: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=900',
  nature: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900',
  default: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=900'
};

function App() {  
  const [view, setView] = useState('catalog');  
  const [tours, setTours] = useState([]);  
  const [loading, setLoading] = useState(true);  
  const [error, setError] = useState(null);  
  
  const [cart, setCart] = useState([]);  
  const [favorites, setFavorites] = useState([]);  
  
  const [search, setSearch] = useState('');  
  const [category, setCategory] = useState('Все');  

  const [user, setUser] = useState(null); 
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [tourForm, setTourForm] = useState(emptyTourForm);
  const [editingTourId, setEditingTourId] = useState(null);
  const [adminMessage, setAdminMessage] = useState('');

  const categories = ['Все', 'Пляж', 'Горы', 'Город', 'Природа'];  

  const getRoleHeader = () => {
    if (user?.role === 'admin') return 'Admin';
    if (user?.role === 'user') return 'User';
    return '';
  };

  const getImageForCategory = (value) => {
    const normalized = value.toLowerCase();
    if (normalized.includes('пляж') || normalized.includes('море')) return fallbackImages.beach;
    if (normalized.includes('гор')) return fallbackImages.mountains;
    if (normalized.includes('город')) return fallbackImages.city;
    if (normalized.includes('природ')) return fallbackImages.nature;
    return fallbackImages.default;
  };

  const getTourImage = (tour) => {
    return tour.img || getImageForCategory(tour.category || tour.title || '');
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

  const handleActionWithAuth = (action) => {
    if (!user) {
      alert("Для этого действия необходимо авторизоваться!");
      setView('auth');
      return;
    }
    action();
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
      setCart([...cart, item]);
    });
  };

  const removeFromCart = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const clearCart = () => {
    if (window.confirm("Очистить корзину?")) setCart([]);
  };

  const deleteTour = (id) => {
    if (window.confirm("Вы уверены, что хотите удалить этот тур?")) {
      fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: { Role: getRoleHeader() }
      })
      .then(res => {
        if (res.ok) {
          setTours(tours.filter(t => t.id !== id));
          setFavorites(favorites.filter(t => t.id !== id));
          setCart(cart.filter(t => t.id !== id));
          setAdminMessage('Тур удалён');
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

  const startEditTour = (tour) => {
    setTourForm({
      title: tour.title,
      price: String(tour.price),
      category: tour.category,
      img: tour.img
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
      img: tourForm.img.trim() || getImageForCategory(tourForm.category || tourForm.title)
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
        Role: getRoleHeader()
      },
      body: JSON.stringify(tourData)
    })
    .then(res => {
      if (!res.ok) throw new Error(`Ошибка сохранения: ${res.status}`);
      return res.json();
    })
    .then(savedTour => {
      if (editingTourId) {
        setTours(tours.map(t => t.id === editingTourId ? savedTour : t));
        setFavorites(favorites.map(t => t.id === editingTourId ? savedTour : t));
        setCart(cart.map(t => t.id === editingTourId ? savedTour : t));
        setAdminMessage('Тур обновлён');
      } else {
        setTours([...tours, savedTour]);
        setAdminMessage('Тур добавлен');
      }
      setTourForm(emptyTourForm);
      setEditingTourId(null);
    })
    .catch(err => setAdminMessage(err.message));
  };

  const handleAuth = (e) => {
    e.preventDefault();
    setAuthError('');
    if (loginInput === 'admin' && passwordInput === '1234') {
      setUser({ name: 'Администратор', role: 'admin' });
      setView('catalog');
    } else if (loginInput === 'user' && passwordInput === '1111') {
      setUser({ name: 'Алексей', role: 'user' });
      setView('catalog');
    } else {
      setAuthError('Неверный логин или пароль!');
    }
    setLoginInput('');
    setPasswordInput('');
  };

  const filtered = tours.filter(item =>  
    item.title.toLowerCase().includes(search.toLowerCase()) &&  
    (category === 'Все' || item.category === category)  
  );  

  return (  
    <div className="app-container">  
      <header className="header">  
        <div className="logo" onClick={() => setView('catalog')}>TRAVEL<span>Luxe</span></div>  
        <nav className="nav-menu">  
          <span className={`nav-link ${view === 'catalog' ? 'active' : ''}`} onClick={() => setView('catalog')}>Каталог</span>  
          <span className={`nav-link ${view === 'favorites' ? 'active' : ''}`} onClick={() => setView('favorites')}>Избранное ({favorites.length})</span>  
          {user?.role === 'admin' && (
            <span className={`nav-link ${view === 'admin' ? 'active' : ''}`} onClick={() => setView('admin')}>Админ</span>
          )}
          <span className={`nav-link ${view === 'about' ? 'active' : ''}`} onClick={() => setView('about')}>О нас</span>  
          
          {!user ? (
            <span className={`nav-link ${view === 'auth' ? 'active' : ''}`} onClick={() => setView('auth')}>Войти</span>
          ) : (
            <span className="user-badge" onClick={() => {setUser(null); setView('catalog');}}>
              Выйти ({user.role === 'admin' ? 'Админ' : user.name})
            </span>
          )}
          <button className="cart-btn-main" onClick={() => setView('cart')}>🛒 ({cart.length})</button>  
        </nav>  
      </header>  

      {view === 'auth' && (
        <div className="page-content auth-page">
          <div className="auth-box large-box">
            <h2 className="page-title">Вход</h2>
            <form onSubmit={handleAuth} className="auth-form">
              <div className="input-group">
                <label>Логин</label>
                <input type="text" value={loginInput} onChange={(e) => setLoginInput(e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Пароль</label>
                <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} required />
              </div>
              {authError && <p className="auth-error-msg">{authError}</p>}
              <button type="submit" className="login-submit-btn">Войти</button>
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
              <p className="admin-form-hint">Если поле пустое, изображение подберётся автоматически по категории.</p>
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
                  {cart.map((item, i) => (
                    <div key={i} className="cart-item-card">
                      <img src={getTourImage(item)} alt={item.title} className="cart-item-img" />
                      <div className="cart-item-info">
                        <h4>{item.title}</h4>
                        <p>{item.category}</p>
                      </div>
                      <div className="cart-item-price">${item.price}</div>
                      <button className="remove-item-btn" onClick={() => removeFromCart(i)}>✕</button>
                    </div>
                  ))}
                </div>
                <div className="cart-summary-panel">
                  <h3>Итог заказа</h3>
                  <div className="summary-row"><span>Туров:</span><span>{cart.length}</span></div>
                  <div className="summary-total"><span>К оплате:</span><span>${cart.reduce((s, i) => s + i.price, 0)}</span></div>
                  <button className="checkout-btn">Оформить заказ</button>
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
    </div>  
  );  
}  

function TourCard({ item, onAdd, isAdmin, onDelete, onEdit, isFavorite, onFavorite, getTourImage }) {  
  return (  
    <div className="modern-card">  
      <div className="card-image-h">
        <img src={getTourImage ? getTourImage(item) : item.img} alt="" />
        <button className={`fav-btn-overlay ${isFavorite ? 'active' : ''}`} onClick={onFavorite}>
          {isFavorite ? '❤️' : '🤍'}
        </button>
      </div>  
      <div className="card-content">  
        <h3>{item.title}</h3>  
        <div className="card-footer-row">  
          <span className="price">${item.price}</span>  
          <div className="card-buttons">
            <button className="add-btn" onClick={onAdd}>В корзину</button>
            {isAdmin && <button className="edit-btn-admin" onClick={onEdit}>✎</button>}
            {isAdmin && <button className="delete-btn-admin" onClick={onDelete}>🗑️</button>}
          </div>
        </div>  
      </div>  
    </div>  
  );  
}  

export default App;
