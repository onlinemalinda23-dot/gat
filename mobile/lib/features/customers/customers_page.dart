import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';

class CustomersPage extends StatefulWidget {
  final ApiClient api;
  final Map<String, dynamic> user;
  const CustomersPage({super.key, required this.api, required this.user});

  @override
  State<CustomersPage> createState() => _CustomersPageState();
}

class _CustomersPageState extends State<CustomersPage> {
  List<dynamic> _customers = [];
  bool _loading = true;
  String? _error;
  final _search = TextEditingController();

  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _address = TextEditingController();

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final query = <String, dynamic>{'limit': 100};
      if (_search.text.trim().isNotEmpty) query['search'] = _search.text.trim();
      final data = await widget.api.get('/customers', query);
      setState(() {
        _customers = (data as List).cast();
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

  Future<void> _addCustomer() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Add customer'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: _name, decoration: const InputDecoration(labelText: 'Name')),
            TextField(controller: _phone, decoration: const InputDecoration(labelText: 'Phone')),
            TextField(controller: _email, decoration: const InputDecoration(labelText: 'Email')),
            TextField(controller: _address, decoration: const InputDecoration(labelText: 'Address')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Save')),
        ],
      ),
    );
    if (ok != true || _name.text.trim().isEmpty) return;
    try {
      await widget.api.post('/customers', {
        'name': _name.text.trim(),
        'phone': _phone.text.trim(),
        'email': _email.text.trim().isEmpty ? null : _email.text.trim(),
        'address': _address.text.trim().isEmpty ? null : _address.text.trim(),
      });
      _name.clear(); _phone.clear(); _email.clear(); _address.clear();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Customer added')));
      _load();
    } on ApiException catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _search,
                  decoration: const InputDecoration(hintText: 'Search customers', isDense: true),
                  onSubmitted: (_) => _load(),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: _addCustomer,
                icon: const Icon(Icons.add),
                tooltip: 'Add customer',
              ),
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? Center(child: Text(_error!))
                  : _customers.isEmpty
                      ? const Center(child: Text('No customers'))
                      : RefreshIndicator(
                          onRefresh: () async => _load(),
                          child: ListView.builder(
                            itemCount: _customers.length,
                            itemBuilder: (context, i) {
                              final c = _customers[i] as Map<String, dynamic>;
                              return ListTile(
                                leading: const CircleAvatar(child: Icon(Icons.person)),
                                title: Text(c['name'] ?? ''),
                                subtitle: Text('${c['phone'] ?? ''}\n${c['email'] ?? ''}'),
                                isThreeLine: true,
                              );
                            },
                          ),
                        ),
        ),
      ],
    );
  }
}