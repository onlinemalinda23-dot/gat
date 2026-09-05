import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/utils/formatters.dart';

class ReportsPage extends StatefulWidget {
  final ApiClient api;
  final Map<String, dynamic> user;
  const ReportsPage({super.key, required this.api, required this.user});

  @override
  State<ReportsPage> createState() => _ReportsPageState();
}

class _ReportsPageState extends State<ReportsPage> {
  Map<String, dynamic>? _monthly;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await widget.api.get('/reports/monthly') as Map<String, dynamic>;
      setState(() {
        _monthly = data;
        _error = null;
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) return Center(child: Text(_error!));
    final sales = (_monthly?['sales'] as Map<String, dynamic>?) ?? {};
    final topParts = (_monthly?['topUsedParts'] as List? ?? []).cast<Map<String, dynamic>>();
    final topModels = (_monthly?['topRepairedModels'] as List? ?? []).cast<Map<String, dynamic>>();

    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Monthly summary (${_monthly?['period']})',
                    style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                Text('Revenue: ${formatMoney(sales['total_revenue'] ?? 0)}'),
                Text('Invoices: ${sales['total_invoices'] ?? 0}'),
                Text('Expenses: ${formatMoney(_monthly?['expenses'] ?? 0)}'),
              ],
            ),
          ),
        ),
        _section(context, 'Most used parts', topParts,
            (p) => '${p['name']} — ${p['total_used']} used'),
        _section(context, 'Most repaired models', topModels,
            (m) => '${m['brand']} ${m['model']} — ${m['repair_count']} repairs'),
      ],
    );
  }

  Widget _section(BuildContext context, String title, List<Map<String, dynamic>> rows, String Function(Map<String, dynamic>) text) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            if (rows.isEmpty)
              const Text('No data yet', style: TextStyle(color: Colors.grey))
            else
              for (final r in rows) Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Text(text(r))),
          ],
        ),
      ),
    );
  }
}