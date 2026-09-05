/// App environment configuration.
///
/// The API base URL comes from --dart-define so the same build can be pointed
/// at a development or production (cloud) backend WITHOUT code changes:
///
///   flutter build apk --dart-define=API_BASE_URL=https://api.your-domain.com/api/v1
///
/// Default (no --dart-define) targets the local dev server ONLY for development.
class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8080/api/v1',
  );

  static const String appVersion = '1.0.0';
}