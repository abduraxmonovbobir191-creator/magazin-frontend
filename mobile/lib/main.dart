import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:4000',
);

void main() => runApp(const MagazinApp());

class MagazinApp extends StatelessWidget {
  const MagazinApp({super.key});

  @override
  Widget build(BuildContext context) {
    const green = Color(0xFF176B4D);
    return MaterialApp(
      title: 'Magazin',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: green),
        scaffoldBackgroundColor: const Color(0xFFF5F7F8),
        appBarTheme: const AppBarTheme(backgroundColor: Color(0xFFF5F7F8)),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFFE2E9E5)),
          ),
        ),
      ),
      home: const AuthGate(),
    );
  }
}

class Api {
  static Future<Map<String, dynamic>> request(
    String path, {
    String? token,
    String method = 'GET',
    Map<String, dynamic>? body,
  }) async {
    final uri = Uri.parse('$apiBaseUrl$path');
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (token != null) headers['Authorization'] = 'Bearer $token';
    final response = method == 'POST'
        ? await http.post(uri, headers: headers, body: jsonEncode(body ?? {}))
        : await http.get(uri, headers: headers);
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(data['error'] ?? 'Server bilan aloqa xatosi');
    }
    return data;
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  String? token;
  bool loading = true;
  bool demoMode = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('magazin_token');
    if (saved != null) {
      try {
        await Api.request('/api/me', token: saved);
        token = saved;
      } catch (_) {
        await prefs.remove('magazin_token');
      }
    }
    if (mounted) setState(() => loading = false);
  }

  Future<void> _login(String username, String password) async {
    final data = await Api.request(
      '/api/auth/login',
      method: 'POST',
      body: {'username': username, 'password': password},
    );
    final savedToken = data['token'] as String;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('magazin_token', savedToken);
    if (mounted) setState(() => token = savedToken);
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('magazin_token');
    if (mounted) setState(() => token = null);
  }

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (demoMode) return DashboardScreen(token: '', onLogout: _logout, demoMode: true);
    if (token == null) return LoginScreen(onLogin: _login, onDemo: () => setState(() => demoMode = true));
    return DashboardScreen(token: token!, onLogout: _logout);
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.onLogin, required this.onDemo});
  final Future<void> Function(String, String) onLogin;
  final VoidCallback onDemo;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final username = TextEditingController();
  final password = TextEditingController();
  String? error;
  bool busy = false;

  @override
  void dispose() {
    username.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    setState(() { busy = true; error = null; });
    try {
      await widget.onLogin(username.text.trim(), password.text);
    } catch (e) {
      setState(() => error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Card(
              elevation: 0,
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(
                      width: 56, height: 56,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(color: const Color(0xFFD8F7A7), borderRadius: BorderRadius.circular(16)),
                      child: const Text('M', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: Color(0xFF164B35))),
                    ),
                    const SizedBox(height: 22),
                    const Text('MAGAZIN BOSHQARUVI', style: TextStyle(letterSpacing: 1.2, color: Color(0xFF176B4D), fontWeight: FontWeight.bold, fontSize: 11)),
                    const SizedBox(height: 8),
                    const Text('Tizimga kirish', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 8),
                    const Text('Savdo, ombor va hisob-kitob bir joyda.'),
                    const SizedBox(height: 24),
                    TextField(controller: username, textInputAction: TextInputAction.next, decoration: const InputDecoration(labelText: 'Login')),
                    const SizedBox(height: 14),
                    TextField(controller: password, obscureText: true, onSubmitted: (_) => submit(), decoration: const InputDecoration(labelText: 'Parol')),
                    if (error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(error!, style: const TextStyle(color: Colors.red))),
                    const SizedBox(height: 18),
                    FilledButton(onPressed: busy ? null : submit, child: Padding(padding: const EdgeInsets.all(12), child: Text(busy ? 'Tekshirilmoqda...' : 'Kirish'))),
                    const SizedBox(height: 10),
                    OutlinedButton.icon(onPressed: widget.onDemo, icon: const Icon(Icons.visibility_outlined), label: const Padding(padding: EdgeInsets.all(10), child: Text('Dizaynni demo rejimida ko‘rish'))),
                    const SizedBox(height: 12),
                    const Text('Demo rejimi serverga ulanmaydi; ma’lumotlar namunaviy.', textAlign: TextAlign.center, style: TextStyle(fontSize: 11, color: Colors.grey)),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key, required this.token, required this.onLogout, this.demoMode = false});
  final String token;
  final Future<void> Function() onLogout;
  final bool demoMode;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? dashboard;
  List<dynamic> products = [];
  String? error;
  bool busy = true;
  int selectedTab = 0;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    if (demoMode) {
      setState(() {
        busy = false;
        error = null;
        dashboard = {'sales': 1285000, 'grossProfit': 286000, 'expenses': 75000, 'openDebt': 420000, 'lowStockCount': 3};
        products = [
          {'name': 'Non', 'sale_price': 4000, 'purchase_price': 3000, 'stock_quantity': 24, 'min_stock': 10, 'unit': 'dona'},
          {'name': 'Sut 1L', 'sale_price': 12000, 'purchase_price': 9500, 'stock_quantity': 8, 'min_stock': 10, 'unit': 'dona'},
          {'name': 'Shakar', 'sale_price': 15000, 'purchase_price': 12500, 'stock_quantity': 18, 'min_stock': 5, 'unit': 'kg'},
          {'name': 'Tuxum', 'sale_price': 1800, 'purchase_price': 1400, 'stock_quantity': 6, 'min_stock': 12, 'unit': 'dona'},
        ];
      });
      return;
    }
    setState(() { busy = true; error = null; });
    try {
      final values = await Future.wait([
        Api.request('/api/dashboard', token: widget.token),
        Api.request('/api/products', token: widget.token),
      ]);
      if (mounted) setState(() { dashboard = values[0]; products = values[1]['items'] as List<dynamic>; });
    } catch (e) {
      if (mounted) setState(() => error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  String money(dynamic value) => '${(num.tryParse('$value') ?? 0).toStringAsFixed(0)} so‘m';

  @override
  Widget build(BuildContext context) {
    final metrics = dashboard ?? {};
    return Scaffold(
      appBar: AppBar(
        title: const Row(children: [Icon(Icons.storefront_rounded, color: Color(0xFF176B4D)), SizedBox(width: 9), Text('Magazin', style: TextStyle(fontWeight: FontWeight.w800))]),
        actions: [
          IconButton(onPressed: load, icon: const Icon(Icons.refresh_rounded), tooltip: 'Yangilash'),
          IconButton(onPressed: () => widget.onLogout(), icon: const Icon(Icons.logout_rounded), tooltip: 'Chiqish'),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
          children: [
            Text(selectedTab == 0 ? (demoMode ? 'Bugungi holat · DEMO' : 'Bugungi holat') : 'Mahsulotlar ombori', style: const TextStyle(fontSize: 23, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            Text(demoMode ? 'Namuna ma’lumotlar — haqiqiy savdo emas' : 'Oziq-ovqat do‘koni hisob-kitob paneli', style: TextStyle(color: demoMode ? Colors.deepOrange : Colors.black54)),
            if (error != null) Padding(padding: const EdgeInsets.only(top: 14), child: Card(child: Padding(padding: const EdgeInsets.all(14), child: Text(error!, style: const TextStyle(color: Colors.red))))),
            if (busy) const Padding(padding: EdgeInsets.all(32), child: Center(child: CircularProgressIndicator())),
            if (!busy && error == null && selectedTab == 0) ...[
              const SizedBox(height: 18),
              MetricCard(title: 'Bugungi tushum', value: money(metrics['sales']), icon: Icons.trending_up_rounded, tint: const Color(0xFFE7F6ED)),
              MetricCard(title: 'Yalpi foyda', value: money(metrics['grossProfit']), icon: Icons.account_balance_wallet_outlined, tint: const Color(0xFFEAF2FC)),
              MetricCard(title: 'Bugungi xarajat', value: money(metrics['expenses']), icon: Icons.receipt_long_rounded, tint: const Color(0xFFFFF1E3)),
              MetricCard(title: 'Ochiq qarzlar', value: money(metrics['openDebt']), icon: Icons.swap_horiz_rounded, tint: const Color(0xFFF2ECFF)),
              MetricCard(title: 'Kam qolgan mahsulotlar', value: '${metrics['lowStockCount'] ?? 0}', icon: Icons.inventory_2_outlined, tint: const Color(0xFFFFF2DF)),
              const SizedBox(height: 8),
              const Text('Hisob-kitob eslatmasi', style: TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              const Text('Yalpi foyda mahsulot tannarxini hisobga oladi. Soliq va boshqa xarajatlar sof foyda hisobida alohida tekshiriladi.', style: TextStyle(color: Colors.black54, height: 1.5)),
            ],
            if (!busy && error == null && selectedTab == 1) ...[
              const SizedBox(height: 14),
              if (products.isEmpty) const Card(child: Padding(padding: EdgeInsets.all(20), child: Text('Mahsulotlar hali kiritilmagan.'))),
              ...products.map((raw) {
                final p = raw as Map<String, dynamic>;
                final low = (num.tryParse('${p['stock_quantity']}') ?? 0) <= (num.tryParse('${p['min_stock']}') ?? 0);
                return Card(
                  elevation: 0,
                  margin: const EdgeInsets.only(bottom: 9),
                  child: ListTile(
                    leading: const CircleAvatar(backgroundColor: Color(0xFFE7F6ED), child: Icon(Icons.inventory_2_outlined, color: Color(0xFF176B4D))),
                    title: Text('${p['name']}', style: const TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: Text('Sotuv: ${money(p['sale_price'])} · Tannarx: ${money(p['purchase_price'])}'),
                    trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                      Text('${p['stock_quantity']} ${p['unit']}', style: const TextStyle(fontWeight: FontWeight.w800)),
                      if (low) const Text('Kam qoldi', style: TextStyle(color: Colors.deepOrange, fontSize: 10)),
                    ]),
                  ),
                );
              }),
            ],
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedTab,
        onDestinationSelected: (value) => setState(() => selectedTab = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard_rounded), label: 'Bosh sahifa'),
          NavigationDestination(icon: Icon(Icons.inventory_2_outlined), selectedIcon: Icon(Icons.inventory_2_rounded), label: 'Ombor'),
        ],
      ),
    );
  }
}

class MetricCard extends StatelessWidget {
  const MetricCard({super.key, required this.title, required this.value, required this.icon, required this.tint});
  final String title;
  final String value;
  final IconData icon;
  final Color tint;

  @override
  Widget build(BuildContext context) => Card(
    elevation: 0,
    margin: const EdgeInsets.only(bottom: 10),
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Row(children: [
        Container(width: 44, height: 44, decoration: BoxDecoration(color: tint, borderRadius: BorderRadius.circular(13)), child: Icon(icon, color: const Color(0xFF176B4D))),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(color: Colors.black54, fontSize: 12)),
          const SizedBox(height: 5),
          Text(value, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
        ])),
      ]),
    ),
  );
}
