import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';

class PartsPage extends StatefulWidget {
  final ApiClient api;
  final Map<String, dynamic> user;
  const PartsPage({super.key, required this.api, required this.user});

  @override
  State<PartsPage> createState() => _PartsPageState();
}

class _PartsPageState extends State<PartsPage> {
  List<dynamic> _parts = [];
  bool _loading = true;
  String? _error;
  final _search = TextEditingController();
  bool get _canManage => widget.user['role'] == 'admin' || widget.user['role'] == 'store_keeper';

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final query = <String, dynamic>{'limit': 200};
      if (_search.text.trim().isNotEmpty) query['search'] = _search.text.trim();
      final data = await widget.api.get('/parts', query);
      setState(() {
        _parts = (data as List).cast();
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

  Future<void> _adjust(Map<String, dynamic> part, bool add) async {
    final qty = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('${add ? 'Add' : 'Remove'} stock — ${part['name']}'),
        content: TextField(
          controller: qty,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Quantity'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Update')),
        ],
      ),
    );
    if (ok != true) return;
    final quantity = int.tryParse(qty.text.trim()) ?? 0;
    if (quantity <= 0) return;
    try {
      await widget.api.post('/parts/${part['id']}/${add ? 'add-stock' : 'remove-stock'}', {'quantity': quantity});
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Stock updated')));
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
                  decoration: const InputDecoration(hintText: 'Search parts', isDense: true),
                  onSubmitted: (_) => _load(),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: () async {
                  final low = await widget.api.get('/parts/low-stock');
                  if (!mounted) return;
                  showModalBottomSheet<void>(
                    context: context,
                    builder: (_) => ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        Text('Low stock parts', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 8),
                        for (final p in (low as List).cast<Map<String, dynamic>>())
                          ListTile(
                            dense: true,
                            title: Text(p['name'] ?? ''),
                            subtitle: Text('Stock: ${p['quantity']} (threshold ${p['low_stock_threshold']})'),
                            trailing: const Icon(Icons.warning_amber, color: Colors.orange),
                          ),
                      ],
                    ),
                  );
                },
                icon: const Icon(Icons.warning_amber),
                tooltip: 'Low stock',
              ),
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? Center(child: Text(_error!))
                  : _parts.isEmpty
                      ? const Center(child: Text('No parts'))
                      : RefreshIndicator(
                          onRefresh: () async => _load(),
                          child: ListView.builder(
                            itemCount: _parts.length,
                            itemBuilder: (context, i) {
                              final p = _parts[i] as Map<String, dynamic>;
                              final low = (p['quantity'] as num? ?? 0) <= (p['low_stock_threshold'] as num? ?? 5);
                              return Card(
                                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                child: ListTile(
                                  leading: CircleAvatar(
                                    backgroundColor: low ? Colors.orange.shade100 : null,
                                    child: Icon(low ? Icons.warning_amber : Icons.handyman,
                                        color: low ? Colors.orange : null),
                                  ),
                                  title: Text('${p['name']} — ${p['part_number']}'),
                                  subtitle: Text(
                                    'Stock: ${p['quantity']} · Sell ${p['selling_price']} · Buy ${p['purchase_price']}\n'
                                    'Supplier: ${p['supplier_name'] ?? '-'}',
                                  ),
                                  isThreeLine: true,
                                  trailing: _canManage
                                      ? Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            IconButton(
                                              icon: const Icon(Icons.add_circle_outline),
                                              onPressed: () => _adjust(p, true),
                                              tooltip: 'Add stock',
                                            ),
                                            IconButton(
                                              icon: const Icon(Icons.remove_circle_outline),
                                              onPressed: () => _adjust(p, false),
                                              tooltip: 'Remove stock',
                                            ),
                                          ],
                                        )
                                      : null,
                                ),
                              );
                            },
                          ),
                        ),
        ),
      ],
    );
  }
}