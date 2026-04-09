import React, { useState, useEffect } from 'react';  
import './App.css';  

function App() {  
  // Состояния навигации и данных
  const [view, setView] = useState('catalog');  
  const [tours, setTours] = useState([]);  
  const [loading, setLoading] = useState(true);  
  const [error, setError] = useState(null);  
  
  // Состояния корзины и избранного
  const [cart, setCart] = useState([]);  
  const [favorites, setFavorites] = useState([]);  
  
  // Фильтры
  const [search, setSearch] = useState('');  
  const [category, setCategory] = useState('Все');  

  // Авторизация
  const [user, setUser] = useState(null); 
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  const categories = ['Все', 'Пляж', 'Горы', 'Город', 'Природа'];  

  // Загрузка данных с сервера
  const fetchTours = () => {
    setLoading(true);
    fetch('http://localhost:5000/api/tours')  
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

  // --- ЛОГИКА ЗАЩИТЫ (Новое) ---
  const handleActionWithAuth = (action) => {
    if (!user) {
      alert("Для этого действия необходимо авторизоваться!");
      setView('auth');
      return;
    }
    action();
  };

  // --- ИЗБРАННОЕ ---
  const toggleFavorite = (item) => {
    handleActionWithAuth(() => {
      if (favorites.some(f => f.id === item.id)) {
        setFavorites(favorites.filter(f => f.id !== item.id));
      } else {
        setFavorites([...favorites, item]);
      }
    });
  };

  // --- КОРЗИНА ---
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

  // --- АДМИН-ФУНКЦИИ ---
  const deleteTour = (id) => {
    if (window.confirm("Вы уверены, что хотите удалить этот тур?")) {
      fetch(`http://localhost:5000/api/tours/${id}`, { method: 'DELETE' })
      .then(res => {
        if (res.ok) {
          setTours(tours.filter(t => t.id !== id));
        } else {
          alert("Ошибка при удалении");
        }
      })
      .catch(err => console.error(err));
    }
  };

  const addTour = () => {
    const title = prompt("Название тура:");
    const price = prompt("Цена:");
    const img = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500"; 

    if (title && price) {
      const newTour = { title, price: Number(price), img, category: "Пляж" };
      fetch('http://localhost:5000/api/tours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTour)
      })
      .then(res => res.json())
      .then(data => {
        setTours([...tours, data]); 
      })
      .catch(err => alert("Ошибка добавления"));
    }
  };

  // --- АВТОРИЗАЦИЯ ---
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
                <button className="add-btn admin-theme" onClick={addTour}>+ Добавить новый тур</button>
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
              filtered.map(item => (  
                <TourCard 
                  key={item.id} 
                  item={item} 
                  isAdmin={user?.role === 'admin'} 
                  isFavorite={favorites.some(f => f.id === item.id)}
                  onDelete={() => deleteTour(item.id)}
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
                      <img src={item.img} alt={item.title} className="cart-item-img" />
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

function TourCard({ item, onAdd, isAdmin, onDelete, isFavorite, onFavorite }) {  
  return (  
    <div className="modern-card">  
      <div className="card-image-h">
        <img src={item.img} alt="" />
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
            {isAdmin && <button className="delete-btn-admin" onClick={onDelete}>🗑️</button>}
          </div>
        </div>  
      </div>  
    </div>  
  );  
}  

export default App;