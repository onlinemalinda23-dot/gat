import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/utils/formatters.dart';

class NotificationsPage extends StatefulWidget {
  final ApiClient api;
  final Map<String, dynamic> user;
  const NotificationsPage({super.key, required this.api, required this.user});

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  String? _error;

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await widget.api.get('/notifications', {'limit': 100});
      setState(() {
        _items = (data as List).cast();
        _error = null;
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) return Center(child: Text(_error!));
    if (_items.isEmpty) {
      return const Center(child: Text('No notifications'));
    }
    return RefreshIndicator(
      onRefresh: () async => _load(),
      child: ListView.builder(
        itemCount: _items.length,
        itemBuilder: (context, i) {
          final n = _items[i] as Map<String, dynamic>;
          return ListTile(
            leading: const CircleAvatar(child: Icon(Icons.notifications_active)),
            title: Text(n['title'] ?? ''),
            subtitle: Text('${n['message']}\n${formatDateTime(n['created_at']?.toString())}'),
            isThreeLine: true,
          );
        },
      ),
    );
  }
}