import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/constants/app_config.dart';

/// Contacts GET /app/version and, if a newer build exists, shows a dialog.
/// Returns true ONLY when a blocking update (force update / below minimum
/// version) was shown, so the caller should stop startup.
/// Optional ("new version available") updates never block startup.
class VersionCheck {
  static Future<bool> check(BuildContext context) async {
    try {
      final api = ApiClient(AppConfig.apiBaseUrl);
      final data = await api.get('/app/version', {'platform': 'android'}) as Map<String, dynamic>;
      final latest = data['latest_version']?.toString() ?? '';
      final min = data['min_version']?.toString() ?? '';
      final force = data['force_update'] == true;
      final updateUrl = data['update_url']?.toString() ?? '';

      final current = AppConfig.appVersion;
      final isUpdate = _compare(current, latest) < 0;
      final belowMin = _compare(current, min) < 0;
      final blocking = force || belowMin;

      if (!isUpdate && !blocking) return false;

      await showDialog<void>(
        context: context,
        barrierDismissible: !blocking,
        builder: (_) => AlertDialog(
          title: Text(blocking ? 'Update required' : 'New version available'),
          content: Text(
            blocking
                ? 'Your app version is out of date. Please update to continue using the app.'
                : 'A newer version of the app is available for download.',
          ),
          actions: [
            if (!blocking)
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Later'),
              ),
            FilledButton(
              onPressed: () {
                if (updateUrl.isNotEmpty) {
                  // Launch the Play Store / APK URL (add url_launcher here when enabled).
                }
                Navigator.of(context).pop();
              },
              child: const Text('Update'),
            ),
          ],
        ),
      );

      // Blocking updates stop the splash flow until the user updates.
      if (blocking) return true;

      // Optional updates: user proceeds normally either way.
      return false;
    } catch (_) {
      return false; // offline — fall through
    }
  }

  /// Returns -1 if [a] < [b], 0 if equal, 1 if greater (semver 3-part).
  static int _compare(String a, String b) {
    final pa = a.split('.').map((s) => int.tryParse(s) ?? 0).toList();
    final pb = b.split('.').map((s) => int.tryParse(s) ?? 0).toList();
    for (var i = 0; i < 3; i++) {
      final x = i < pa.length ? pa[i] : 0;
      final y = i < pb.length ? pb[i] : 0;
      if (x != y) return x < y ? -1 : 1;
    }
    return 0;
  }
}