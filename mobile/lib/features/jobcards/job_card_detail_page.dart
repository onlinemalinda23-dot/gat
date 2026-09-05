import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/utils/formatters.dart';

const _statuses = ['checking', 'waiting_parts', 'repairing', 'completed', 'delivered'];

class JobCardDetailPage extends StatefulWidget {
  final ApiClient api;
  final String jobCardId;
  final Map<String, dynamic> user;
  const JobCardDetailPage({super.key, required this.api, required this.jobCardId, required this.user});

  @override
  State<JobCardDetailPage> createState() => _JobCardDetailPageState();
}

class _JobCardDetailPageState extends State<JobCardDetailPage> {
  Map<String, dynamic>? _job;
  bool _loading = true;
  String? _error;

  // part issue dialog state
  List<dynamic> _parts = [];
  String? _selectedPart;
  int _partQty = 1;

  @override
  void initState() {
    super.initState();
    _load();
    widget.api.get('/parts', {'limit': 500}).then((d) {
      setState(() => _parts = (d as List).cast());
    }).catchError((_) {});
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await widget.api.get('/job-cards/${widget.jobCardId}');
      setState(() {
        _job = data as Map<String, dynamic>;
        _error = null;
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Failed to load job card');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _changeStatus(String status) async {
    try {
      await widget.api.put('/job-cards/${widget.jobCardId}/status', {'status': status});
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Status → ${statusLabel(status)}')));
      _load();
    } on ApiException catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  Future<void> _addNote() async {
    final controller = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Add repair note'),
        content: TextField(controller: controller, maxLines: 3, decoration: const InputDecoration(hintText: 'Note')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Save')),
        ],
      ),
    );
    if (ok != true || controller.text.trim().isEmpty) return;
    try {
      await widget.api.post('/job-cards/${widget.jobCardId}/notes', {'note': controller.text.trim()});
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Note added')));
      _load();
    } on ApiException catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  Future<void> _addPart() async {
    final usable = _parts.where((p) => (p['quantity'] as num? ?? 0) > 0).cast<Map<String, dynamic>>().toList();
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Issue part'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                value: _selectedPart,
                hint: const Text('Select part'),
                items: [
                  for (final p in usable)
                    DropdownMenuItem(value: p['id'] as String, child: Text('${p['name']} (${p['quantity']})')),
                ],
                onChanged: (v) => setState(() => _selectedPart = v),
              ),
              const SizedBox(height: 12),
              TextField(
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Quantity'),
                onChanged: (v) => setState(() => _partQty = int.tryParse(v) ?? 1),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Issue')),
          ],
        ),
      ),
    );
    if (ok != true || _selectedPart == null) return;
    try {
      await widget.api.post('/job-cards/${widget.jobCardId}/parts',
          {'part_id': _selectedPart, 'quantity': _partQty});
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Parts issued — stock deducted')));
      _load();
    } on ApiException catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  Future<void> _addLabour() async {
    final desc = TextEditingController();
    final amount = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Add labour charge'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: desc, decoration: const InputDecoration(labelText: 'Description')),
            const SizedBox(height: 12),
            TextField(controller: amount, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Amount')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Add')),
        ],
      ),
    );
    if (ok != true || desc.text.trim().isEmpty) return;
    try {
      await widget.api.post('/job-cards/${widget.jobCardId}/labour',
          {'description': desc.text.trim(), 'amount': num.parse(amount.text.trim())});
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Labour added')));
      _load();
    } on ApiException catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_error != null || _job == null) {
      return Scaffold(appBar: AppBar(title: const Text('Job Card')), body: Center(child: Text(_error ?? 'Not found')));
    }
    final j = _job!;
    final canEdit = widget.user['role'] == 'admin' || widget.user['role'] == 'mechanic';

    return Scaffold(
      appBar: AppBar(title: Text('${j['job_card_number'] ?? ''}')),
      body: RefreshIndicator(
        onRefresh: () async => _load(),
        child: ListView(
          padding: const EdgeInsets.all(12),
          children: [
            Card(
              child: ListTile(
                title: Text('${j['customer_name']} — ${j['customer_phone']}'),
                subtitle: Text(
                  '${j['brand']} ${j['model']} · ${j['vehicle_number']}\n'
                  'Mechanic: ${j['mechanic_name'] ?? 'Unassigned'}\n'
                  'Received: ${formatDate(j['received_at']?.toString())}',
                ),
              ),
            ),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Status: ${statusLabel(j['status']?.toString() ?? '')}',
                        style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      children: [
                        for (final s in _statuses)
                          if (s != j['status'])
                            ActionChip(label: Text(statusLabel(s)), onPressed: () => _changeStatus(s)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Costs', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    Text('Parts: ${formatMoney(j['total_parts_cost'] ?? 0)}'),
                    Text('Labour: ${formatMoney(j['total_labour_cost'] ?? 0)}'),
                    Text('Total: ${formatMoney(j['grand_total'] ?? 0)}',
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Repair notes', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    if ((j['notes'] as List?)?.isEmpty ?? true)
                      const Text('No notes yet', style: TextStyle(color: Colors.grey)),
                    for (final n in (j['notes'] as List? ?? []).cast<Map<String, dynamic>>())
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(n['note'] ?? ''),
                            Text(formatDateTime(n['created_at']?.toString()),
                                style: const TextStyle(fontSize: 12, color: Colors.grey)),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ),
            if (canEdit) ...[
              Row(
                children: [
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: _addNote,
                      icon: const Icon(Icons.note_add),
                      label: const Text('Add note'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: _addPart,
                      icon: const Icon(Icons.handyman),
                      label: const Text('Issue part'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: _addLabour,
                      icon: const Icon(Icons.attach_money),
                      label: const Text('Labour'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
            ],
            Text('Parts used', style: Theme.of(context).textTheme.titleMedium),
            for (final p in (j['parts'] as List? ?? []).cast<Map<String, dynamic>>())
              ListTile(
                dense: true,
                title: Text(p['part_name'] ?? ''),
                subtitle: Text('Qty ${p['quantity']} × ${formatMoney(p['unit_price'])}'),
                trailing: Text(formatMoney(p['total_price'])),
              ),
          ],
        ),
      ),
    );
  }
}