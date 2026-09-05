import 'package:flutter/material.dart';

import '../../core/utils/session_store.dart';
import 'login_page.dart';
import 'home_page.dart';
import 'version_check.dart';

/// Startup screen: checks stored session and app version against the backend.
class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final token = await SessionStore.token();
    if (token == null) {
      _go(const LoginPage());
      return;
    }

    try {
      final needsUpdate = await VersionCheck.check(context);
      if (!mounted) return;
      if (needsUpdate) return; // update dialog shown, blocks until updated
    } catch (_) {
      // Offline / backend unavailable — allow cached session to proceed.
    }

    if (!mounted) return;
    final user = await SessionStore.user();
    if (user != null) {
      _go(HomePage(user: user));
    } else {
      _go(const LoginPage());
    }
  }

  void _go(Widget page) {
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => page),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.build_circle, size: 72, color: Color(0xFF1E3A8A)),
            const SizedBox(height: 12),
            Text('Repair Workshop', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 24),
            const CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}