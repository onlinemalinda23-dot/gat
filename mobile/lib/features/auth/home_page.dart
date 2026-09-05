import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/constants/app_config.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/session_store.dart';
import 'login_page.dart';
import '../jobcards/job_cards_page.dart';
import '../customers/customers_page.dart';
import '../vehicles/vehicles_page.dart';
import '../inventory/parts_page.dart';
import '../notifications/notifications_page.dart';
import '../reports/reports_page.dart';
import '../profile/profile_page.dart';

/// Role-aware home with a bottom navigation.
class HomePage extends StatefulWidget {
  final Map<String, dynamic> user;
  const HomePage({super.key, required this.user});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  late final ApiClient _api = ApiClient(AppConfig.apiBaseUrl);
  int _index = 0;

  @override
  void initState() {
    super.initState();
    SessionStore.token().then((t) {
      if (t != null) _api.setToken(t);
      if (mounted) setState(() {});
    });
  }

  List<(IconData, String)> get _tabs {
    final role = widget.user['role']?.toString() ?? 'mechanic';
    final tabs = <(IconData, String)>[
      (Icons.assignment, 'Jobs'),
      (Icons.person, 'Customers'),
      (Icons.directions_car, 'Vehicles'),
      (Icons.notifications, 'Alerts'),
    ];
    if (role == 'admin' || role == 'store_keeper') {
      tabs.insert(3, (Icons.inventory_2, 'Parts'));
    }
    if (role == 'admin') tabs.add((Icons.analytics, 'Reports'));
    tabs.add((Icons.person_outline, 'Me'));
    return tabs;
  }

  @override
  Widget build(BuildContext context) {
    final role = widget.user['role']?.toString() ?? 'mechanic';
    final tabs = _tabs;
    final screens = <Widget>[];
    for (final (icon, label) in tabs) {
      switch (label) {
        case 'Jobs': screens.add(JobCardsPage(api: _api, user: widget.user)); break;
        case 'Customers': screens.add(CustomersPage(api: _api, user: widget.user)); break;
        case 'Vehicles': screens.add(VehiclesPage(api: _api, user: widget.user)); break;
        case 'Parts': screens.add(PartsPage(api: _api, user: widget.user)); break;
        case 'Alerts': screens.add(NotificationsPage(api: _api, user: widget.user)); break;
        case 'Reports': screens.add(ReportsPage(api: _api, user: widget.user)); break;
        case 'Me': screens.add(ProfilePage(user: widget.user, logout: _logout)); break;
        default: screens.add(JobCardsPage(api: _api, user: widget.user));
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Repair Workshop · ${roleLabel(role)}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _logout,
            tooltip: 'Sign out',
          ),
        ],
      ),
      body: IndexedStack(index: _index, children: screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        destinations: [
          for (final (icon, label) in tabs) NavigationDestination(icon: Icon(icon), label: label),
        ],
        onDestinationSelected: (i) => setState(() => _index = i),
      ),
    );
  }

  Future<void> _logout() async {
    await SessionStore.clear();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginPage()),
      (r) => false,
    );
  }
}