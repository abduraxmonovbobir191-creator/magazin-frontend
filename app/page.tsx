"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
type User = { id: string; username: string; role: string };
type Product = { id: string; name: string; barcode?: string; unit: string; purchase_price: number; sale_price: number; stock_quantity: number; min_stock: number };
type Metrics = { sales: number; salesCount: number; expenses: number; productCount: number; lowStockCount: number; openDebt: number; netOperatingBeforeCogs: number };
type Debt = { id: string; direction: string; party_name: string; original_amount: number; paid_amount: number; remaining_amount: number; status: string; due_date?: string };
type Expense = { id: string; title: string; category: string; amount: number; expense_date: string };

const money = (value: number) => new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(Number(value || 0)) + " so‘m";

export default function Home() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tab, setTab] = useState("overview");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [productForm, setProductForm] = useState({ name: "", barcode: "", unit: "dona", purchasePrice: "", salePrice: "", stockQuantity: "0", minStock: "0" });
  const [expenseForm, setExpenseForm] = useState({ title: "", category: "Boshqa", amount: "" });
  const [debtForm, setDebtForm] = useState({ direction: "receivable", partyName: "", amount: "" });

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const response = await fetch(API + path, { ...init, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}), ...(init.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "So‘rov bajarilmadi");
    return data;
  }, [token]);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const [dash, productData, debtData, expenseData, me] = await Promise.all([
        request("/api/dashboard"), request("/api/products"), request("/api/debts"), request("/api/expenses"), request("/api/me")
      ]);
      setMetrics(dash); setProducts(productData.items || []); setDebts(debtData.items || []); setExpenses(expenseData.items || []); setUser(me.user);
      setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Ma’lumotlarni olishda xatolik"); }
  }, [token, request]);

  useEffect(() => {
    const saved = window.localStorage.getItem("magazin-token");
    if (saved) setToken(saved);
  }, []);
  useEffect(() => { if (token) void refresh(); }, [token, refresh]);

  async function login(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch(API + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kirish amalga oshmadi");
      window.localStorage.setItem("magazin-token", data.token); setToken(data.token); setUser(data.user); setPassword("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Server bilan aloqa yo‘q"); }
    finally { setBusy(false); }
  }

  async function submitProduct(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      await request("/api/products", { method: "POST", body: JSON.stringify({ name: productForm.name, barcode: productForm.barcode || null, unit: productForm.unit, purchasePrice: Number(productForm.purchasePrice), salePrice: Number(productForm.salePrice), stockQuantity: Number(productForm.stockQuantity), minStock: Number(productForm.minStock) }) });
      setProductForm({ name: "", barcode: "", unit: "dona", purchasePrice: "", salePrice: "", stockQuantity: "0", minStock: "0" }); await refresh(); setMessage("Mahsulot saqlandi.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Mahsulot saqlanmadi"); }
    finally { setBusy(false); }
  }

  async function submitExpense(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    try { await request("/api/expenses", { method: "POST", body: JSON.stringify({ ...expenseForm, amount: Number(expenseForm.amount) }) }); setExpenseForm({ title: "", category: "Boshqa", amount: "" }); await refresh(); setMessage("Xarajat saqlandi."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Xarajat saqlanmadi"); }
    finally { setBusy(false); }
  }

  async function submitDebt(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    try { await request("/api/debts", { method: "POST", body: JSON.stringify({ ...debtForm, amount: Number(debtForm.amount) }) }); setDebtForm({ direction: "receivable", partyName: "", amount: "" }); await refresh(); setMessage("Qarz saqlandi."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Qarz saqlanmadi"); }
    finally { setBusy(false); }
  }

  function logout() { window.localStorage.removeItem("magazin-token"); setToken(""); setUser(null); setMetrics(null); setMessage("Tizimdan chiqildi."); }

  if (!token) return <main className="login-wrap"><div className="login-card"><div className="brand-mark">M</div><p className="eyebrow">MAGAZIN BOSHQARUVI</p><h1>Tizimga kirish</h1><p className="muted">Savdo, ombor va moliyaviy hisob bir joyda.</p><form onSubmit={login} className="stack"><label>Login<input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required placeholder="admin"/></label><label>Parol<input autoComplete="current-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Parolingiz"/></label><button className="primary full" disabled={busy}>{busy ? "Tekshirilmoqda..." : "Kirish"}</button></form>{message && <p className="notice">{message}</p>}<p className="hint">Backend: {API}</p></div></main>;

  const nav = [{ id: "overview", label: "Umumiy ko‘rinish", icon: "▦" }, { id: "products", label: "Mahsulotlar va ombor", icon: "▤" }, { id: "debts", label: "Qarzlar", icon: "↔" }, { id: "expenses", label: "Xarajatlar", icon: "−" }];
  return <main className="app-shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark small">M</div><div><strong>Magazin</strong><span>Hisob-kitob tizimi</span></div></div><div className="nav-label">MENYU</div><nav>{nav.map(n => <button key={n.id} className={"nav-item " + (tab === n.id ? "active" : "")} onClick={() => setTab(n.id)}><span>{n.icon}</span>{n.label}</button>)}</nav><div className="sidebar-bottom"><div className="online-dot"/> Ma’lumotlar serverdan olinadi<button className="logout" onClick={logout}>↪ Chiqish</button></div></aside>
    <section className="main-area"><header className="topbar"><div><p className="eyebrow">BOSHQARUV PANELI</p><h1>{nav.find(n => n.id === tab)?.label}</h1></div><div className="profile"><div className="avatar">{(user?.username || "M").slice(0,1).toUpperCase()}</div><div><strong>{user?.username || "Foydalanuvchi"}</strong><span>{user?.role || "xodim"}</span></div><button className="icon-button" onClick={() => void refresh()} aria-label="Yangilash">↻</button></div></header>
      {message && <div className="notice inline-notice">{message}<button onClick={() => setMessage("")}>×</button></div>}
      {tab === "overview" && <><div className="welcome"><div><h2>Bugungi holat</h2><p>Magaziningizdagi asosiy ko‘rsatkichlar.</p></div><button className="secondary" onClick={() => void refresh()}>↻ Yangilash</button></div><div className="metrics-grid"><Metric title="Bugungi tushum" value={money(metrics?.sales || 0)} note={(metrics?.salesCount || 0) + " ta savdo"} icon="↗"/><Metric title="Bugungi xarajat" value={money(metrics?.expenses || 0)} note="Qayd qilingan xarajatlar" icon="−"/><Metric title="Ochiq qarzlar" value={money(metrics?.openDebt || 0)} note="Qolgan qarz summasi" icon="↔"/><Metric title="Kam qolgan mahsulot" value={String(metrics?.lowStockCount || 0)} note={(metrics?.productCount || 0) + " ta faol mahsulot"} icon="▤"/></div><div className="content-grid"><div className="panel"><div className="panel-heading"><div><h3>Ombor ogohlantirishlari</h3><p>Minimal qoldiq yoki undan past</p></div><button className="text-button" onClick={() => setTab("products")}>Barchasi →</button></div>{products.filter(p => Number(p.stock_quantity) <= Number(p.min_stock)).slice(0,6).map(p => <div className="list-row" key={p.id}><div className="product-icon">▤</div><div className="row-main"><strong>{p.name}</strong><span>{p.stock_quantity} {p.unit} qoldi</span></div><span className="pill warning">Kam qoldi</span></div>)}{products.filter(p => Number(p.stock_quantity) <= Number(p.min_stock)).length === 0 && <Empty text="Kam qolgan mahsulot yo‘q yoki ombor hali to‘ldirilmagan."/>}</div><div className="panel"><div className="panel-heading"><div><h3>Tezkor amallar</h3><p>Kundalik hisob-kitob</p></div></div><button className="action-card" onClick={() => setTab("products")}><span className="action-icon green">＋</span><span><strong>Mahsulot qo‘shish</strong><small>Yangi mahsulotni omborga kiriting</small></span><b>→</b></button><button className="action-card" onClick={() => setTab("expenses")}><span className="action-icon orange">−</span><span><strong>Xarajat kiritish</strong><small>Ijara, elektr va boshqa xarajatlar</small></span><b>→</b></button><button className="action-card" onClick={() => setTab("debts")}><span className="action-icon blue">↔</span><span><strong>Qarzlarni boshqarish</strong><small>Nasiya va yetkazib beruvchi qarzi</small></span><b>→</b></button><div className="profit-note"><strong>Foyda haqida</strong><p>To‘g‘ri sof foyda uchun sotuv va mahsulot tannarxi, qaytarishlar hamda xarajatlar to‘liq qayd etilishi kerak.</p></div></div></div></>}
      {tab === "products" && <div className="content-grid products-layout"><div className="panel"><div className="panel-heading"><div><h3>Mahsulotlar ombori</h3><p>{products.length} ta mahsulot</p></div></div><div className="table-scroll"><table><thead><tr><th>Mahsulot</th><th>Tannarx</th><th>Sotuv narxi</th><th>Qoldiq</th></tr></thead><tbody>{products.map(p => <tr key={p.id}><td><strong>{p.name}</strong><small>{p.barcode || "Shtrix-kod yo‘q"}</small></td><td>{money(p.purchase_price)}</td><td>{money(p.sale_price)}</td><td><span className={Number(p.stock_quantity) <= Number(p.min_stock) ? "pill warning" : "pill"}>{p.stock_quantity} {p.unit}</span></td></tr>)}</tbody></table>{products.length === 0 && <Empty text="Mahsulotlar hozircha yo‘q."/>}</div></div><div className="panel"><div className="panel-heading"><div><h3>Mahsulot qo‘shish</h3><p>Yangi mahsulot kartasi</p></div></div><form className="stack" onSubmit={submitProduct}><label>Mahsulot nomi<input value={productForm.name} onChange={e=>setProductForm({...productForm,name:e.target.value})} required/></label><label>Shtrix-kod<input value={productForm.barcode} onChange={e=>setProductForm({...productForm,barcode:e.target.value})}/></label><label>O‘lchov birligi<select value={productForm.unit} onChange={e=>setProductForm({...productForm,unit:e.target.value})}><option value="dona">Dona</option><option value="kg">Kilogramm</option><option value="l">Litr</option><option value="quti">Quti</option><option value="pachka">Pachka</option></select></label><div className="two-fields"><label>Olish narxi<input type="number" min="0" step="0.01" value={productForm.purchasePrice} onChange={e=>setProductForm({...productForm,purchasePrice:e.target.value})} required/></label><label>Sotish narxi<input type="number" min="0" step="0.01" value={productForm.salePrice} onChange={e=>setProductForm({...productForm,salePrice:e.target.value})} required/></label></div><div className="two-fields"><label>Boshlang‘ich qoldiq<input type="number" min="0" step="0.001" value={productForm.stockQuantity} onChange={e=>setProductForm({...productForm,stockQuantity:e.target.value})}/></label><label>Minimal qoldiq<input type="number" min="0" step="0.001" value={productForm.minStock} onChange={e=>setProductForm({...productForm,minStock:e.target.value})}/></label></div><button className="primary" disabled={busy}>Mahsulotni saqlash</button></form></div></div>}
      {tab === "expenses" && <div className="content-grid"><div className="panel"><div className="panel-heading"><div><h3>Xarajatlar tarixi</h3><p>Oxirgi 200 ta yozuv</p></div></div><div className="table-scroll"><table><thead><tr><th>Nomi</th><th>Kategoriya</th><th>Sana</th><th>Summa</th></tr></thead><tbody>{expenses.map(x=><tr key={x.id}><td>{x.title}</td><td>{x.category}</td><td>{String(x.expense_date).slice(0,10)}</td><td>{money(x.amount)}</td></tr>)}</tbody></table>{expenses.length===0&&<Empty text="Xarajatlar hali kiritilmagan."/>}</div></div><div className="panel"><div className="panel-heading"><div><h3>Xarajat kiritish</h3><p>Har bir xarajatni qayd eting</p></div></div><form className="stack" onSubmit={submitExpense}><label>Xarajat nomi<input value={expenseForm.title} onChange={e=>setExpenseForm({...expenseForm,title:e.target.value})} required placeholder="Masalan, elektr to‘lovi"/></label><label>Kategoriya<select value={expenseForm.category} onChange={e=>setExpenseForm({...expenseForm,category:e.target.value})}><option>Ijara</option><option>Elektr va kommunal</option><option>Ish haqi</option><option>Transport</option><option>Ta’mirlash</option><option>Boshqa</option></select></label><label>Summa (so‘m)<input type="number" min="1" step="1" value={expenseForm.amount} onChange={e=>setExpenseForm({...expenseForm,amount:e.target.value})} required/></label><button className="primary" disabled={busy}>Xarajatni saqlash</button></form></div></div>}
      {tab === "debts" && <div className="content-grid"><div className="panel"><div className="panel-heading"><div><h3>Qarzlar ro‘yxati</h3><p>Mijozlardan olinadigan va yetkazib beruvchilarga to‘lanadigan qarzlar</p></div></div><div className="table-scroll"><table><thead><tr><th>Tomon</th><th>Tur</th><th>Jami</th><th>Qolgan</th><th>Holat</th></tr></thead><tbody>{debts.map(d=><tr key={d.id}><td><strong>{d.party_name}</strong><small>{d.due_date ? "Muddat: "+String(d.due_date).slice(0,10) : "Muddat belgilanmagan"}</small></td><td>{d.direction==="receivable"?"Olinadi":"To‘lanadi"}</td><td>{money(d.original_amount)}</td><td>{money(d.remaining_amount)}</td><td><span className={d.status==="paid"?"pill":"pill warning"}>{d.status==="paid"?"Yopilgan":"Ochiq"}</span></td></tr>)}</tbody></table>{debts.length===0&&<Empty text="Qarzlar hali kiritilmagan."/>}</div></div><div className="panel"><div className="panel-heading"><div><h3>Qarz qo‘shish</h3><p>Qisman to‘lovlarni keyingi bosqichda qayd etish mumkin</p></div></div><form className="stack" onSubmit={submitDebt}><label>Qarz turi<select value={debtForm.direction} onChange={e=>setDebtForm({...debtForm,direction:e.target.value})}><option value="receivable">Mijozdan olinadi (nasiya)</option><option value="payable">Yetkazib beruvchiga to‘lanadi</option></select></label><label>Ism yoki tashkilot<input value={debtForm.partyName} onChange={e=>setDebtForm({...debtForm,partyName:e.target.value})} required/></label><label>Summa (so‘m)<input type="number" min="1" step="1" value={debtForm.amount} onChange={e=>setDebtForm({...debtForm,amount:e.target.value})} required/></label><button className="primary" disabled={busy}>Qarzni saqlash</button></form></div></div>}
      <footer className="footer">Magazin hisob-kitob tizimi · Dastlabki MVP · Ma’lumotlar API serveridan olinadi</footer>
    </section>
  </main>;
}

function Metric({ title, value, note, icon }: { title: string; value: string; note: string; icon: string }) {
  return <article className="metric-card"><div className="metric-top"><span>{title}</span><b>{icon}</b></div><strong>{value}</strong><small>{note}</small></article>;
}
function Empty({ text }: { text: string }) { return <div className="empty-state"><span>◌</span><p>{text}</p></div>; }
