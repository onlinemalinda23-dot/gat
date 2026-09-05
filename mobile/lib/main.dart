import 'package:flutter/material.dart';

import 'core/constants/app_config.dart';
import 'features/auth/splash_page.dart';

void main() {
  runApp(const RepairApp());
}

class RepairApp extends StatelessWidget {
  const RepairApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Repair Workshop',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1E3A8A)),
        useMaterial3: true,
        inputDecorationTheme: const InputDecorationTheme(
          border: OutlineInputBorder(),
        ),
      ),
      home: const SplashPage(),
    );
  }
}