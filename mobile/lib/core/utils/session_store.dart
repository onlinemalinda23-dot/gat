import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class SessionStore {
  static const _kToken = 'accessToken';
  static const _kRefresh = 'refreshToken';
  static const _kUser = 'user';

  static Future<void> saveSession(String token, String refresh, Map<String, dynamic> user) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_kToken, token);
    await p.setString(_kRefresh, refresh);
    await p.setString(_kUser, jsonEncode(user));
  }

  static Future<String?> token() async {
    final p = await SharedPreferences.getInstance();
    return p.getString(_kToken);
  }

  static Future<Map<String, dynamic>?> user() async {
    final p = await SharedPreferences.getInstance();
    final raw = p.getString(_kUser);
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  static Future<void> clear() async {
    final p = await SharedPreferences.getInstance();
    await p.remove(_kToken);
    await p.remove(_kRefresh);
    await p.remove(_kUser);
  }
}