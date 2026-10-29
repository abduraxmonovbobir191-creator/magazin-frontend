"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
type User = { id: string; username: string; role: string };
type Product = { id: string; name: string; barcode?: string; unit: string; purchase_price: number; sale_price: number; stock_quantity: number; min_stock: number };
type Metrics = { sales: number; salesCount: number; expenses: number; grossProfit: number; estimatedOperatingProfit: number; productCount: number; lowStockCount: number; openDebt: number };
type Debt = { id: string; direction: string; party_name: string; original_amount: number; paid_amount: number; remaining_amount: number; status: string; due_date?: string };
type Expense = { id: string; title: string; category: string; amount: number; expense_date: string };
type Sale = { id: string; receipt_number: number; total_amount: number; gross_profit: number; payment_method: string; status: string; sold_at: string };
type CartItem = { productId: string; quantity: number };
type ProfitReport = { from: string; to: string; revenue: number; costOfGoodsSold: number; grossProfit: number; expenses: number; operatingProfitBeforeTax: number; salesCount: number; note: string };
type Employee = { id: string; username: string; full_name: string; role: string; is_active: boolean };

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
  const [sales, setSales] = useState<Sale[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saleProductId, setSaleProductId] = useState("");
  const [saleQuantity, setSaleQuantity] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customerName, setCustomerName] = useState("");
  const [purchaseForm, setPurchaseForm] = useState({ supplierName: "", productId: "", quantity: "1", unitCost: "", paidAmount: "" });
  const [cashSession, setCashSession] = useState<any>(null);
  const [openingAmount, setOpeningAmount] = useState("0");
  const [report, setReport] = useState<ProfitReport | null>(null);
  const [reportFrom, setReportFrom] = useState(new Date().toISOString().slice(0,10));
  const [reportTo, setReportTo] = useState(new Date().toISOString().slice(0,10));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeForm, setEmployeeForm] = useState({ username: "", fullName: "", password: "", role: "cashier" });
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
      const [dash, productData, debtData, expenseData, me, saleData] = await Promise.all([
        request("/api/dashboard"), request("/api/products"), request("/api/debts"), request("/api/expenses"), request("/api/me"), request("/api/sales")
      ]);
      setMetrics(dash); setProducts(productData.items || []); setDebts(debtData.items || []); setExpenses(expenseData.items || []); setUser(me.user); setSales(saleData.items || []);
      setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Ma’lumotlarni olishda xatolik"); }
  }, [token, request]);

  useEffect(() => {
    const saved = window.localStorage.getItem("magazin-token");
    if (saved) setToken(saved);
  }, []);
  useEffect(() => { if (token) void refresh(); }, [token, refresh]);
  useEffect(() => {
    if (!token) return;
    if (tab === "sales") {
      request("/api/cash-sessions/current")
        .then(data => setCashSession(data.session || null))
        .catch(error => setMessage(error instanceof Error ? error.message : "Kassa smenasini olishda xatolik"));
    }
    if (tab === "reports") {
      request("/api/reports/profit-loss?from=" + reportFrom + "&to=" + reportTo)
        .then(data => setReport(data as ProfitReport))
        .catch(error => setMessage(error instanceof Error ? error.message : "Hisobotni olishda xatolik"));
    }
    if (tab === "staff") {
      request("/api/users")
        .then(data => setEmployees(data.items || []))
        .catch(error => setMessage(error instanceof Error ? error.message : "Xodimlarni olishda xatolik"));
    }
  }, [tab, token, request]);

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

  function addToCart() {
    if (!saleProductId) { setMessage("Avval mahsulot tanlang."); return; }
    const quantity = Number(saleQuantity);
    const product = products.find(p => p.id === saleProductId);
    if (!product || !Number.isFinite(quantity) || quantity <= 0) { setMessage("Mahsulot yoki miqdor noto‘g‘ri."); return; }
    const already = cart.find(item => item.productId === saleProductId)?.quantity || 0;
    if (already + quantity > Number(product.stock_quantity)) { setMessage("Omborda bu miqdor yetarli emas."); return; }
    setCart(old => { const found = old.find(item => item.productId === saleProductId); return found ? old.map(item => item.productId === saleProductId ? { ...item, quantity: item.quantity + quantity } : item) : [...old, { productId: saleProductId, quantity }]; });
    setSaleProductId(""); setSaleQuantity("1"); setMessage("");
  }

  async function openCashSession() {
    setBusy(true);
    try {
      const data = await request("/api/cash-sessions/open", { method: "POST", body: JSON.stringify({ openingAmount: Number(openingAmount || 0) }) });
      setCashSession(data.session); setMessage("Kassa smenasi ochildi.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Smena ochilmadi"); }
    finally { setBusy(false); }
  }

  async function closeCashSession() {
    const raw = window.prompt("Kassadagi sanalgan yakuniy pul summasi (so‘m):");
    if (raw === null) return;
    const countedClosingAmount = Number(raw);
    if (!Number.isFinite(countedClosingAmount) || countedClosingAmount < 0) { setMessage("Yakuniy summa noto‘g‘ri."); return; }
    setBusy(true);
    try {
      const data = await request("/api/cash-sessions/close", { method: "POST", body: JSON.stringify({ countedClosingAmount }) });
      setCashSession(null); setMessage("Smena yopildi. Kassa farqi: " + money(data.session.difference_amount));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Smena yopilmadi"); }
    finally { setBusy(false); }
  }

  async function completeSale() {
    if (!cart.length) { setMessage("Savatchaga mahsulot qo‘shing."); return; }
    if (paymentMethod === "credit" && !customerName.trim()) { setMessage("Nasiya uchun mijoz ismini kiriting."); return; }
    setBusy(true);
    try {
      const result = await request("/api/sales", { method: "POST", body: JSON.stringify({ items: cart, paymentMethod, ...(paymentMethod === "credit" ? { customerName } : {}) }) });
      setCart([]); setCustomerName(""); setPaymentMethod("cash"); await refresh();
      setMessage("Savdo saqlandi. Chek № " + result.sale.receipt_number + " · " + money(result.sale.total_amount));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Savdo bajarilmadi"); }
    finally { setBusy(false); }
  }

  async function submitPurchase(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const result = await request("/api/purchases", { method: "POST", body: JSON.stringify({ supplierName: purchaseForm.supplierName, items: [{ productId: purchaseForm.productId, quantity: Number(purchaseForm.quantity), unitCost: Number(purchaseForm.unitCost) }], paidAmount: Number(purchaseForm.paidAmount || 0) }) });
      setPurchaseForm({ supplierName: "", productId: "", quantity: "1", unitCost: "", paidAmount: "" });
      await refresh();
      setMessage("Xarid kirim qilindi. Hujjat summasi: " + money(result.purchase.total_amount) + (Number(result.unpaid) > 0 ? " · Qarz: " + money(result.unpaid) : ""));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Xarid kirimi bajarilmadi"); }
    finally { setBusy(false); }
  }

  async function submitEmployee(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      await request("/api/users", { method: "POST", body: JSON.stringify(employeeForm) });
      setEmployeeForm({ username: "", fullName: "", password: "", role: "cashier" });
      const data = await request("/api/users"); setEmployees(data.items || []); setMessage("Xodim qo‘shildi.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Xodim saqlanmadi"); }
    finally { setBusy(false); }
  }

  async function toggleEmployee(employee: Employee) {
    try {
      await request("/api/users/" + employee.id + "/status", { method: "PATCH", body: JSON.stringify({ isActive: !employee.is_active }) });
      const data = await request("/api/users"); setEmployees(data.items || []); setMessage("Xodim holati yangilandi.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Xodim holati o‘zgarmadi"); }
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

  async function payDebt(id: string) {
    const raw = window.prompt("Qancha to‘lov qabul qilindi? (so‘m)");
    if (raw === null) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) { setMessage("To‘lov summasi noto‘g‘ri."); return; }
    setBusy(true);
    try { await request("/api/debts/" + id + "/payments", { method: "POST", body: JSON.stringify({ amount }) }); await refresh(); setMessage("Qarz to‘lovi saqlandi."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "To‘lov saqlanmadi"); }
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

  const nav = [{ id: "overview", label: "Umumiy ko‘rinish", icon: "▦" }, { id: "sales", label: "Kassa / savdo", icon: "＋" }, { id: "products", label: "Mahsulotlar va ombor", icon: "▤" }, { id: "purchases", label: "Xarid kirimi", icon: "↓" }, { id: "debts", label: "Qarzlar", icon: "↔" }, { id: "expenses", label: "Xarajatlar", icon: "−" }, { id: "reports", label: "Hisobotlar", icon: "∑" }, { id: "staff", label: "Xodimlar", icon: "♙" }];
  return <main className="app-shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark small">M</div><div><strong>Magazin</strong><span>Hisob-kitob tizimi</span></div></div><div className="nav-label">MENYU</div><nav>{nav.map(n => <button key={n.id} className={"nav-item " + (tab === n.id ? "active" : "")} onClick={() => setTab(n.id)}><span>{n.icon}</span>{n.label}</button>)}</nav><div className="sidebar-bottom"><div className="online-dot"/> Ma’lumotlar serverdan olinadi<button className="logout" onClick={logout}>↪ Chiqish</button></div></aside>
    <section className="main-area"><header className="topbar"><div><p className="eyebrow">BOSHQARUV PANELI</p><h1>{nav.find(n => n.id === tab)?.label}</h1></div><div className="profile"><div className="avatar">{(user?.username || "M").slice(0,1).toUpperCase()}</div><div><strong>{user?.username || "Foydalanuvchi"}</strong><span>{user?.role || "xodim"}</span></div><button className="icon-button" onClick={() => void refresh()} aria-label="Yangilash">↻</button></div></header>
      {message && <div className="notice inline-notice">{message}<button onClick={() => setMessage("")}>×</button></div>}
      {tab === "overview" && <><div className="welcome"><div><h2>Bugungi holat</h2><p>Magaziningizdagi asosiy ko‘rsatkichlar.</p></div><button className="secondary" onClick={() => void refresh()}>↻ Yangilash</button></div><div className="metrics-grid"><Metric title="Bugungi tushum" value={money(metrics?.sales || 0)} note={(metrics?.salesCount || 0) + " ta savdo"} icon="↗"/><Metric title="Yalpi foyda" value={money(metrics?.grossProfit || 0)} note="Sotuvdan tannarx ayirilgan" icon="＋"/><Metric title="Xarajatlar" value={money(metrics?.expenses || 0)} note="Bugun qayd qilingan" icon="−"/><Metric title="Operatsion natija" value={money(metrics?.estimatedOperatingProfit || 0)} note="Yalpi foyda − xarajatlar" icon="∑"/><Metric title="Ochiq qarzlar" value={money(metrics?.openDebt || 0)} note="Qolgan qarz summasi" icon="↔"/><Metric title="Kam qolgan mahsulot" value={String(metrics?.lowStockCount || 0)} note={(metrics?.productCount || 0) + " ta faol mahsulot"} icon="▤"/></div><div className="content-grid"><div className="panel"><div className="panel-heading"><div><h3>Ombor ogohlantirishlari</h3><p>Minimal qoldiq yoki undan past</p></div><button className="text-button" onClick={() => setTab("products")}>Barchasi →</button></div>{products.filter(p => Number(p.stock_quantity) <= Number(p.min_stock)).slice(0,6).map(p => <div className="list-row" key={p.id}><div className="product-icon">▤</div><div className="row-main"><strong>{p.name}</strong><span>{p.stock_quantity} {p.unit} qoldi</span></div><span className="pill warning">Kam qoldi</span></div>)}{products.filter(p => Number(p.stock_quantity) <= Number(p.min_stock)).length === 0 && <Empty text="Kam qolgan mahsulot yo‘q yoki ombor hali to‘ldirilmagan."/>}</div><div className="panel"><div className="panel-heading"><div><h3>Tezkor amallar</h3><p>Kundalik hisob-kitob</p></div></div><button className="action-card" onClick={() => setTab("products")}><span className="action-icon green">＋</span><span><strong>Mahsulot qo‘shish</strong><small>Yangi mahsulotni omborga kiriting</small></span><b>→</b></button><button className="action-card" onClick={() => setTab("expenses")}><span className="action-icon orange">−</span><span><strong>Xarajat kiritish</strong><small>Ijara, elektr va boshqa xarajatlar</small></span><b>→</b></button><button className="action-card" onClick={() => setTab("debts")}><span className="action-icon blue">↔</span><span><strong>Qarzlarni boshqarish</strong><small>Nasiya va yetkazib beruvchi qarzi</small></span><b>→</b></button><div className="profit-note"><strong>Foyda haqida</strong><p>To‘g‘ri sof foyda uchun sotuv va mahsulot tannarxi, qaytarishlar hamda xarajatlar to‘liq qayd etilishi kerak.</p></div></div></div></>}
      {tab === "reports" && <div className="panel reports-panel"><div className="panel-heading"><div><h3>Foyda va zarar hisoboti</h3><p>Tanlangan davr bo‘yicha savdo tannarxi va xarajatlar</p></div></div><div className="two-fields report-dates"><label>Boshlanish sanasi<input type="date" value={reportFrom} onChange={e=>setReportFrom(e.target.value)}/></label><label>Tugash sanasi<input type="date" value={reportTo} onChange={e=>setReportTo(e.target.value)}/></label></div><button className="primary report-button" onClick={()=>void request("/api/reports/profit-loss?from="+reportFrom+"&to="+reportTo).then(data=>setReport(data as ProfitReport)).catch(error=>setMessage(error instanceof Error?error.message:"Hisobot olinmadi"))}>Hisobotni hisoblash</button>{report&&<><div className="metrics-grid report-metrics"><Metric title="Sotuv tushumi" value={money(report.revenue)} note={report.salesCount+" ta savdo"} icon="↗"/><Metric title="Mahsulot tannarxi" value={money(report.costOfGoodsSold)} note="Sotilgan mahsulot qiymati" icon="▤"/><Metric title="Yalpi foyda" value={money(report.grossProfit)} note="Tushum − tannarx" icon="＋"/><Metric title="Xarajatlar" value={money(report.expenses)} note="Qayd qilingan xarajatlar" icon="−"/></div><div className="report-result"><span>Operatsion foyda (soliqdan oldin)</span><strong>{money(report.operatingProfitBeforeTax)}</strong></div><p className="hint">{report.note}</p></>}</div>}
      {tab === "staff" && <div className="content-grid products-layout"><div className="panel"><div className="panel-heading"><div><h3>Xodimlar</h3><p>Loginlar, rollar va hisob holati</p></div></div><div className="table-scroll"><table><thead><tr><th>Ism</th><th>Login</th><th>Rol</th><th>Holat</th><th></th></tr></thead><tbody>{employees.map(employee=><tr key={employee.id}><td>{employee.full_name}</td><td>{employee.username}</td><td>{employee.role}</td><td><span className={employee.is_active?"pill":"pill warning"}>{employee.is_active?"Faol":"O‘chirilgan"}</span></td><td>{user?.role==="owner"&&<button className="text-button" onClick={()=>void toggleEmployee(employee)}>{employee.is_active?"O‘chirish":"Faollashtirish"}</button>}</td></tr>)}</tbody></table>{employees.length===0&&<Empty text="Xodimlar ro‘yxati bo‘sh yoki ko‘rish uchun ruxsat yo‘q."/>}</div></div>{user?.role==="owner"&&<div className="panel"><div className="panel-heading"><div><h3>Xodim qo‘shish</h3><p>Parol kamida 14 belgidan iborat bo‘lsin</p></div></div><form className="stack" onSubmit={submitEmployee}><label>To‘liq ism<input value={employeeForm.fullName} onChange={e=>setEmployeeForm({...employeeForm,fullName:e.target.value})} required/></label><label>Login<input value={employeeForm.username} onChange={e=>setEmployeeForm({...employeeForm,username:e.target.value})} pattern="[a-zA-Z0-9._-]{3,100}" required/></label><label>Vaqtinchalik parol<input type="password" minLength={14} value={employeeForm.password} onChange={e=>setEmployeeForm({...employeeForm,password:e.target.value})} required/></label><label>Rol<select value={employeeForm.role} onChange={e=>setEmployeeForm({...employeeForm,role:e.target.value})}><option value="cashier">Kassir</option><option value="warehouse">Omborchi</option><option value="manager">Menejer</option><option value="accountant">Buxgalter</option><option value="auditor">Auditor</option></select></label><button className="primary" disabled={busy}>Xodimni saqlash</button></form></div>}</div>}
      {tab === "sales" && <div className="content-grid products-layout"><div className="panel"><div className="cash-session-panel">{cashSession ? <><div><strong>● Kassa smenasi ochiq</strong><p>Boshlang‘ich pul: {money(cashSession.opening_amount)} · Ochilgan: {new Date(cashSession.opened_at).toLocaleString("uz-UZ")}</p></div><button className="secondary" disabled={busy} onClick={()=>void closeCashSession()}>Smenani yopish</button></> : <><div><strong>Kassa smenasi yopiq</strong><p>Savdoni boshlashdan oldin smenani oching.</p></div><div className="cash-open-controls"><input aria-label="Boshlang‘ich pul" type="number" min="0" value={openingAmount} onChange={e=>setOpeningAmount(e.target.value)}/><button className="primary" disabled={busy} onClick={()=>void openCashSession()}>Smenani ochish</button></div></>}</div><div className="panel-heading"><div><h3>Kassa / yangi savdo</h3><p>Mahsulot tanlang va savatchaga qo‘shing</p></div></div><div className="stack"><label>Mahsulot<select value={saleProductId} onChange={e=>setSaleProductId(e.target.value)}><option value="">Mahsulot tanlang</option>{products.filter(p=>Number(p.stock_quantity)>0).map(p=><option key={p.id} value={p.id}>{p.name} · {money(p.sale_price)} · qoldiq {p.stock_quantity} {p.unit}</option>)}</select></label><div className="two-fields"><label>Miqdor<input type="number" min="0.001" step="0.001" value={saleQuantity} onChange={e=>setSaleQuantity(e.target.value)}/></label><div className="field-action"><span className="field-caption"> </span><button className="secondary" type="button" onClick={addToCart}>＋ Savatchaga</button></div></div></div><div className="panel-heading cart-heading"><div><h3>Savatcha</h3><p>{cart.length} turdagi mahsulot</p></div><button className="text-button" onClick={()=>setCart([])}>Tozalash</button></div><div className="table-scroll"><table><thead><tr><th>Mahsulot</th><th>Miqdor</th><th>Summa</th><th></th></tr></thead><tbody>{cart.map(item=>{const p=products.find(x=>x.id===item.productId);return p?<tr key={item.productId}><td>{p.name}</td><td>{item.quantity} {p.unit}</td><td>{money(Number(p.sale_price)*item.quantity)}</td><td><button className="remove-button" onClick={()=>setCart(old=>old.filter(x=>x.productId!==item.productId))}>×</button></td></tr>:null})}</tbody></table>{cart.length===0&&<Empty text="Savatcha bo‘sh."/>}</div><div className="cart-total"><span>Jami to‘lov</span><strong>{money(cart.reduce((sum,item)=>sum+Number(products.find(p=>p.id===item.productId)?.sale_price||0)*item.quantity,0))}</strong></div><div className="stack"><label>To‘lov usuli<select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}><option value="cash">Naqd pul</option><option value="card">Karta</option><option value="qr">QR to‘lov</option><option value="credit">Nasiya (qarz)</option></select></label>{paymentMethod==="credit"&&<label>Mijoz ismi<input value={customerName} onChange={e=>setCustomerName(e.target.value)} required/></label>}<button className="primary" disabled={busy||cart.length===0} onClick={()=>void completeSale()}>{busy?"Saqlanmoqda...":"✓ Savdoni yakunlash"}</button><p className="hint">Bu dastlabki POS. Fiskal chek hozircha ulanmagan; haqiqiy fiskallashtirish uchun ruxsatli onlayn/virtual kassa integratsiyasi kerak.</p></div></div><div className="panel"><div className="panel-heading"><div><h3>So‘nggi savdolar</h3><p>Oxirgi 200 ta savdo</p></div><button className="text-button" onClick={()=>void refresh()}>Yangilash</button></div><div className="table-scroll"><table><thead><tr><th>Chek</th><th>Vaqt</th><th>To‘lov</th><th>Jami</th></tr></thead><tbody>{sales.slice(0,25).map(s=><tr key={s.id}><td>#{s.receipt_number}</td><td>{new Date(s.sold_at).toLocaleString("uz-UZ")}</td><td>{({cash:"Naqd",card:"Karta",qr:"QR",credit:"Nasiya"} as Record<string,string>)[s.payment_method]||s.payment_method}</td><td>{money(s.total_amount)}</td></tr>)}</tbody></table>{sales.length===0&&<Empty text="Hozircha savdo yo‘q."/>}</div><div className="profit-note"><strong>Foyda nazorati</strong><p>Har bir savdoda mahsulotning o‘sha vaqtdagi tannarxi saqlanadi. Yalpi foyda savdo summasidan tannarx ayirilgach hisoblanadi.</p></div></div></div>}
      {tab === "purchases" && <div className="content-grid"><div className="panel"><div className="panel-heading"><div><h3>Omborga xarid kirimi</h3><p>Yetkazib beruvchidan kelgan mahsulotni kirim qiling</p></div></div><form className="stack" onSubmit={submitPurchase}><label>Yetkazib beruvchi<input value={purchaseForm.supplierName} onChange={e=>setPurchaseForm({...purchaseForm,supplierName:e.target.value})} placeholder="Masalan, Baraka distribyutor" required/></label><label>Mahsulot<select value={purchaseForm.productId} onChange={e=>setPurchaseForm({...purchaseForm,productId:e.target.value})} required><option value="">Mahsulot tanlang</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} · qoldiq {p.stock_quantity} {p.unit}</option>)}</select></label><div className="two-fields"><label>Miqdor<input type="number" min="0.001" step="0.001" value={purchaseForm.quantity} onChange={e=>setPurchaseForm({...purchaseForm,quantity:e.target.value})} required/></label><label>Birlik tannarxi<input type="number" min="0" step="0.01" value={purchaseForm.unitCost} onChange={e=>setPurchaseForm({...purchaseForm,unitCost:e.target.value})} required/></label></div><label>Hozir to‘langan summa (so‘m)<input type="number" min="0" step="0.01" value={purchaseForm.paidAmount} onChange={e=>setPurchaseForm({...purchaseForm,paidAmount:e.target.value})} required/><small>To‘lanmagan qism avtomatik ravishda yetkazib beruvchi qarzi sifatida qayd etiladi.</small></label><button className="primary" disabled={busy||!products.length}>Kirimni saqlash</button></form></div><div className="panel"><div className="panel-heading"><div><h3>Kirim qilish tartibi</h3><p>Har bir xarid ombor qoldig‘iga ta’sir qiladi</p></div></div><div className="list-row"><div className="product-icon">1</div><div className="row-main"><strong>Mahsulotni tanlang</strong><span>Avval mahsulot kartasi yaratilgan bo‘lishi kerak.</span></div></div><div className="list-row"><div className="product-icon">2</div><div className="row-main"><strong>Miqdor va tannarx</strong><span>Ombor miqdori oshadi, o‘rtacha tannarx yangilanadi.</span></div></div><div className="list-row"><div className="product-icon">3</div><div className="row-main"><strong>To‘lov yoki qarz</strong><span>Qisman to‘lovda qolgan summa qarzlar ro‘yxatiga tushadi.</span></div></div></div></div>}
      {tab === "products" && <div className="content-grid products-layout"><div className="panel"><div className="panel-heading"><div><h3>Mahsulotlar ombori</h3><p>{products.length} ta mahsulot</p></div></div><div className="table-scroll"><table><thead><tr><th>Mahsulot</th><th>Tannarx</th><th>Sotuv narxi</th><th>Qoldiq</th></tr></thead><tbody>{products.map(p => <tr key={p.id}><td><strong>{p.name}</strong><small>{p.barcode || "Shtrix-kod yo‘q"}</small></td><td>{money(p.purchase_price)}</td><td>{money(p.sale_price)}</td><td><span className={Number(p.stock_quantity) <= Number(p.min_stock) ? "pill warning" : "pill"}>{p.stock_quantity} {p.unit}</span></td></tr>)}</tbody></table>{products.length === 0 && <Empty text="Mahsulotlar hozircha yo‘q."/>}</div></div><div className="panel"><div className="panel-heading"><div><h3>Mahsulot qo‘shish</h3><p>Yangi mahsulot kartasi</p></div></div><form className="stack" onSubmit={submitProduct}><label>Mahsulot nomi<input value={productForm.name} onChange={e=>setProductForm({...productForm,name:e.target.value})} required/></label><label>Shtrix-kod<input value={productForm.barcode} onChange={e=>setProductForm({...productForm,barcode:e.target.value})}/></label><label>O‘lchov birligi<select value={productForm.unit} onChange={e=>setProductForm({...productForm,unit:e.target.value})}><option value="dona">Dona</option><option value="kg">Kilogramm</option><option value="l">Litr</option><option value="quti">Quti</option><option value="pachka">Pachka</option></select></label><div className="two-fields"><label>Olish narxi<input type="number" min="0" step="0.01" value={productForm.purchasePrice} onChange={e=>setProductForm({...productForm,purchasePrice:e.target.value})} required/></label><label>Sotish narxi<input type="number" min="0" step="0.01" value={productForm.salePrice} onChange={e=>setProductForm({...productForm,salePrice:e.target.value})} required/></label></div><div className="two-fields"><label>Boshlang‘ich qoldiq<input type="number" min="0" step="0.001" value={productForm.stockQuantity} onChange={e=>setProductForm({...productForm,stockQuantity:e.target.value})}/></label><label>Minimal qoldiq<input type="number" min="0" step="0.001" value={productForm.minStock} onChange={e=>setProductForm({...productForm,minStock:e.target.value})}/></label></div><button className="primary" disabled={busy}>Mahsulotni saqlash</button></form></div></div>}
      {tab === "expenses" && <div className="content-grid"><div className="panel"><div className="panel-heading"><div><h3>Xarajatlar tarixi</h3><p>Oxirgi 200 ta yozuv</p></div></div><div className="table-scroll"><table><thead><tr><th>Nomi</th><th>Kategoriya</th><th>Sana</th><th>Summa</th></tr></thead><tbody>{expenses.map(x=><tr key={x.id}><td>{x.title}</td><td>{x.category}</td><td>{String(x.expense_date).slice(0,10)}</td><td>{money(x.amount)}</td></tr>)}</tbody></table>{expenses.length===0&&<Empty text="Xarajatlar hali kiritilmagan."/>}</div></div><div className="panel"><div className="panel-heading"><div><h3>Xarajat kiritish</h3><p>Har bir xarajatni qayd eting</p></div></div><form className="stack" onSubmit={submitExpense}><label>Xarajat nomi<input value={expenseForm.title} onChange={e=>setExpenseForm({...expenseForm,title:e.target.value})} required placeholder="Masalan, elektr to‘lovi"/></label><label>Kategoriya<select value={expenseForm.category} onChange={e=>setExpenseForm({...expenseForm,category:e.target.value})}><option>Ijara</option><option>Elektr va kommunal</option><option>Ish haqi</option><option>Transport</option><option>Ta’mirlash</option><option>Boshqa</option></select></label><label>Summa (so‘m)<input type="number" min="1" step="1" value={expenseForm.amount} onChange={e=>setExpenseForm({...expenseForm,amount:e.target.value})} required/></label><button className="primary" disabled={busy}>Xarajatni saqlash</button></form></div></div>}
      {tab === "debts" && <div className="content-grid"><div className="panel"><div className="panel-heading"><div><h3>Qarzlar ro‘yxati</h3><p>Mijozlardan olinadigan va yetkazib beruvchilarga to‘lanadigan qarzlar</p></div></div><div className="table-scroll"><table><thead><tr><th>Tomon</th><th>Tur</th><th>Jami</th><th>Qolgan</th><th>Holat</th><th></th></tr></thead><tbody>{debts.map(d=><tr key={d.id}><td><strong>{d.party_name}</strong><small>{d.due_date ? "Muddat: "+String(d.due_date).slice(0,10) : "Muddat belgilanmagan"}</small></td><td>{d.direction==="receivable"?"Olinadi":"To‘lanadi"}</td><td>{money(d.original_amount)}</td><td>{money(d.remaining_amount)}</td><td><span className={d.status==="paid"?"pill":"pill warning"}>{d.status==="paid"?"Yopilgan":"Ochiq"}</span></td><td>{d.status==="open"&&<button className="text-button" disabled={busy} onClick={()=>void payDebt(d.id)}>To‘lov</button>}</td></tr>)}</tbody></table>{debts.length===0&&<Empty text="Qarzlar hali kiritilmagan."/>}</div></div><div className="panel"><div className="panel-heading"><div><h3>Qarz qo‘shish</h3><p>Qisman to‘lovlarni keyingi bosqichda qayd etish mumkin</p></div></div><form className="stack" onSubmit={submitDebt}><label>Qarz turi<select value={debtForm.direction} onChange={e=>setDebtForm({...debtForm,direction:e.target.value})}><option value="receivable">Mijozdan olinadi (nasiya)</option><option value="payable">Yetkazib beruvchiga to‘lanadi</option></select></label><label>Ism yoki tashkilot<input value={debtForm.partyName} onChange={e=>setDebtForm({...debtForm,partyName:e.target.value})} required/></label><label>Summa (so‘m)<input type="number" min="1" step="1" value={debtForm.amount} onChange={e=>setDebtForm({...debtForm,amount:e.target.value})} required/></label><button className="primary" disabled={busy}>Qarzni saqlash</button></form></div></div>}
      <footer className="footer">Magazin hisob-kitob tizimi · Dastlabki MVP · Ma’lumotlar API serveridan olinadi</footer>
    </section>
  </main>;
}

function Metric({ title, value, note, icon }: { title: string; value: string; note: string; icon: string }) {
  return <article className="metric-card"><div className="metric-top"><span>{title}</span><b>{icon}</b></div><strong>{value}</strong><small>{note}</small></article>;
}
function Empty({ text }: { text: string }) { return <div className="empty-state"><span>◌</span><p>{text}</p></div>; }
