import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:magazin_mobile/main.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('shows login form when no saved session exists', (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const MagazinApp());
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Tizimga kirish'), findsOneWidget);
  });
}
