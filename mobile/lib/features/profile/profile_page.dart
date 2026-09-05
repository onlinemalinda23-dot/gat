import 'package:flutter/material.dart';

import '../../core/utils/formatters.dart';

class ProfilePage extends StatelessWidget {
  final Map<String, dynamic> user;
  final VoidCallback logout;
  const ProfilePage({super.key, required this.user, required this.logout});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const SizedBox(height: 16),
        const CircleAvatar(
          radius: 40,
          child: Icon(Icons.person, size: 44),
        ),
        const SizedBox(height: 12),
        Text(user['full_name'] ?? '',
            textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineSmall),
        Text(roleLabel(user['role']?.toString() ?? ''),
            textAlign: TextAlign.center, style: const TextStyle(color: Colors.grey)),
        const SizedBox(height: 24),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.email),
                  title: const Text('Email'),
                  subtitle: Text(user['email'] ?? ''),
                ),
                ListTile(
                  leading: const Icon(Icons.phone),
                  title: const Text('Phone'),
                  subtitle: Text(user['phone'] ?? '-'),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: logout,
          icon: const Icon(Icons.logout),
          label: const Text('Sign out'),
          style: FilledButton.styleFrom(backgroundColor: Colors.red),
        ),
      ],
    );
  }
}