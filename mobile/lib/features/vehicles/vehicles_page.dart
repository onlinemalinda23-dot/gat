import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';

class VehiclesPage extends StatefulWidget {
  final ApiClient api;
  final Map<String, dynamic> user;
  const VehiclesPage({super.key, required this.api, required this.user});

  @override
  State<VehiclesPage> createState() => _VehiclesPageState();
}

class _VehiclesPageState extends State<VehiclesPage> {
  List<dynamic> _vehicles = [];
  bool _loading = true;
  String? _error;
  final _search = TextEditingController();

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final query = <String, dynamic>{'limit': 100};
      if (_search.text.trim().isNotEmpty) query['search'] = _search.text.trim();
      final data = await widget.api.get('/vehicles', query);
      setState(() {
        _vehicles = (data as List).cast();
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

  Future<void> _showHistory(Map<String, dynamic> v) async {
    try {
      final detail = await widget.api.get('/vehicles/${v['id']}') as Map<String, dynamic>;
      if (!mounted) return;
      final history = (detail['repairHistory'] as List? ?? []).cast<Map<String, dynamic>>();
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        builder: (_) => DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.7,
          builder: (context, scrollController) => ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(16),
            children: [
              Text('${detail['brand']} ${detail['model']} (${detail['year'] ?? '-'})',
                  style: Theme.of(context).textTheme.titleLarge),
              Text('${detail['vehicle_number']} · Owner: ${detail['owner_name']}'),
              const SizedBox(height: 12),
              Text('Repair history', style: Theme.of(context).textTheme.titleMedium),
              if (history.isEmpty) const Text('No repairs on record yet'),
              for (final h in history)
                Card(
                  child: ListTile(
                    title: Text(h['repair_date']?.toString().substring(0, 10) ?? ''),
                    subtitle: Text(
                      'Parts: ${(h['parts_used'] as List? ?? []).join(', ') || '-'}\n'
                      'Suppliers: ${(h['suppliers_used'] as List? ?? []).join(', ') || '-'}',
                    ),
                  ),
                ),
            ],
          ),
        ),
      );
    } on ApiException catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  Future<void> _addVehicle() async {
    final customers = await widget.api.get('/customers', {'limit': 200});
    final list = (customers as List).cast<Map<String, dynamic>>();
    if (list.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Add a customer first')));
      return;
    }
    String? custId;
    final number = TextEditingController();
    final brand = TextEditingController();
    final model = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Add vehicle'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                hint: const Text('Owner'),
                items: [for (final c in list) DropdownMenuItem(value: c['id'] as String, child: Text(c['name']))],
                onChanged: (v) => setState(() => custId = v),
              ),
              TextField(controller: number, decoration: const InputDecoration(labelText: 'Vehicle number')),
              TextField(controller: brand, decoration: const InputDecoration(labelText: 'Brand')),
              TextField(controller: model, decoration: const InputDecoration(labelText: 'Model')),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Save')),
          ],
        ),
      ),
    );
    if (ok != true || custId == null) return;
    try {
      await widget.api.post('/vehicles', {
        'customer_id': custId,
        'vehicle_number': number.text.trim(),
        'brand': brand.text.trim(),
        'model': model.text.trim(),
      });
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Vehicle added')));
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
                  decoration: const InputDecoration(hintText: 'Search vehicles', isDense: true),
                  onSubmitted: (_) => _load(),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(onPressed: _addVehicle, icon: const Icon(Icons.add), tooltip: 'Add vehicle'),
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? Center(child: Text(_error!))
                  : _vehicles.isEmpty
                      ? const Center(child: Text('No vehicles'))
                      : RefreshIndicator(
                          onRefresh: () async => _load(),
                          child: ListView.builder(
                            itemCount: _vehicles.length,
                            itemBuilder: (context, i) {
                              final v = _vehicles[i] as Map<String, dynamic>;
                              return Card(
                                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                child: ListTile(
                                  leading: const CircleAvatar(child: Icon(Icons.directions_car)),
                                  title: Text('${v['vehicle_number']} — ${v['brand']} ${v['model']}'),
                                  subtitle: Text(
                                    'Owner: ${v['owner_name']}\n'
                                    'Mileage: ${v['mileage'] ?? '-'} · Fuel: ${v['fuel_type'] ?? '-'}',
                                  ),
                                  isThreeLine: true,
                                  trailing: IconButton(
                                    icon: const Icon(Icons.history),
                                    onPressed: () => _showHistory(v),
                                  ),
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