import 'dart:convert';

import 'package:http/http.dart' as http;

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, [this.statusCode]);

  @override
  String toString() => message;
}

/// Central REST API client with JWT handling.
/// Uses [HttpClient] so it works on any backend address (localhost, LAN, cloud).
class ApiClient {
  final String baseUrl;
  final http.Client _client = http.Client();

  String? _accessToken;

  ApiClient(this.baseUrl);

  void setToken(String? token) => _accessToken = token;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_accessToken != null) 'Authorization': 'Bearer $_accessToken',
      };

  Uri _uri(String path, [Map<String, dynamic>? query]) =>
      Uri.parse('$baseUrl$path').replace(queryParameters: query);

  Future<dynamic> get(String path, [Map<String, dynamic>? query]) async {
    final res = await _client.get(_uri(path, query), headers: _headers);
    return _decode(res);
  }

  Future<dynamic> post(String path, [dynamic body]) async {
    final res = await _client.post(
      _uri(path),
      headers: _headers,
      body: jsonEncode(body ?? {}),
    );
    return _decode(res);
  }

  Future<dynamic> put(String path, [dynamic body]) async {
    final res = await _client.put(
      _uri(path),
      headers: _headers,
      body: jsonEncode(body ?? {}),
    );
    return _decode(res);
  }

  Future<dynamic> delete(String path) async {
    final res = await _client.delete(_uri(path), headers: _headers);
    return _decode(res);
  }

  dynamic _decode(http.Response res) {
    final any = res.body.isEmpty ? <String, dynamic>{} : jsonDecode(res.body);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return any is Map<String, dynamic> ? any['data'] : any;
    }
    final message = (any is Map<String, dynamic> && any['message'] != null)
        ? any['message'].toString()
        : 'Request failed (${res.statusCode})';
    throw ApiException(message, res.statusCode);
  }
}