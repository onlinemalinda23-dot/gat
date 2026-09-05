import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/utils/formatters.dart';
import 'job_card_detail_page.dart';

class JobCardsPage extends StatefulWidget {
  final ApiClient api;
  final Map<String, dynamic> user;
  const JobCardsPage({super.key, required this.api, required this.user});

  @override
  State<JobCardsPage> createState() => _JobCardsPageState();
}

class _JobCardsPageState extends State<JobCardsPage> {
  List<dynamic> _cards = [];
  bool _loading = true;
  String? _error;
  String _status = '';
  final _search = TextEditingController();

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final query = <String, dynamic>{'limit': 100};
      if (_status.isNotEmpty) query['status'] = _status;
      if (_search.text.trim().isNotEmpty) query['search'] = _search.text.trim();
      final data = await widget.api.get('/job-cards', query);
      setState(() {
        _cards = (data as List).cast();
        _error = null;
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Failed to load job cards');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _openDetail(Map<String, dynamic> card) async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => JobCardDetailPage(api: widget.api, jobCardId: card['id'] as String, user: widget.user)),
    );
    _load();
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
                  decoration: const InputDecoration(
                    hintText: 'Search number / customer / vehicle',
                    isDense: true,
                  ),
                  onSubmitted: (_) => _load(),
                ),
              ),
              const SizedBox(width: 8),
              DropdownButton<String>(
                value: _status.isEmpty ? null : _status,
                hint: const Text('Status'),
                items: const [
                  DropdownMenuItem(value: 'received', child: Text('Received')),
                  DropdownMenuItem(value: 'checking', child: Text('Checking')),
                  DropdownMenuItem(value: 'waiting_parts', child: Text('Waiting Parts')),
                  DropdownMenuItem(value: 'repairing', child: Text('Repairing')),
                  DropdownMenuItem(value: 'completed', child: Text('Completed')),
                  DropdownMenuItem(value: 'delivered', child: Text('Delivered')),
                ],
                onChanged: (v) {
                  _status = v ?? '';
                  _load();
                },
              ),
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? Center(child: Text(_error!))
                  : _cards.isEmpty
                      ? const Center(child: Text('No job cards'))
                      : RefreshIndicator(
                          onRefresh: () async => _load(),
                          child: ListView.builder(
                            itemCount: _cards.length,
                            itemBuilder: (context, i) {
                              final c = _cards[i] as Map<String, dynamic>;
                              return Card(
                                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                child: ListTile(
                                  title: Text('${c['job_card_number']} — ${c['customer_name'] ?? ''}'),
                                  subtitle: Text(
                                    '${c['brand'] ?? ''} ${c['model'] ?? ''} · ${c['vehicle_number'] ?? ''}\n'
                                    '${statusLabel(c['status']?.toString() ?? '')} · ${formatDate(c['received_at']?.toString())}',
                                  ),
                                  trailing: const Icon(Icons.chevron_right),
                                  onTap: () => _openDetail(c),
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