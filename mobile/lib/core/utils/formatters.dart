import 'package:intl/intl.dart';

String formatMoney(num value) {
  final f = NumberFormat.currency(locale: 'en_US', symbol: r'$');
  return f.format(value);
}

String formatDate(String? iso) {
  if (iso == null) return '-';
  return DateFormat('yyyy-MM-dd').format(DateTime.parse(iso));
}

String formatDateTime(String? iso) {
  if (iso == null) return '-';
  return DateFormat('yyyy-MM-dd HH:mm').format(DateTime.parse(iso));
}

String statusLabel(String status) {
  switch (status) {
    case 'received': return 'Received';
    case 'checking': return 'Checking';
    case 'waiting_parts': return 'Waiting For Parts';
    case 'repairing': return 'Repairing';
    case 'completed': return 'Completed';
    case 'delivered': return 'Delivered';
    default: return status.replaceAll('_', ' ');
  }
}

String roleLabel(String role) {
  switch (role) {
    case 'admin': return 'Admin';
    case 'mechanic': return 'Mechanic';
    case 'store_keeper': return 'Store Keeper';
    default: return role;
  }
}