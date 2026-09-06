const { runSql, close } = require('./src/config/db');

async function run() {
  try {
    console.log('Creating settings table...');
    await runSql(`
      CREATE TABLE IF NOT EXISTS settings (
        setting_key VARCHAR(255) PRIMARY KEY,
        setting_value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Inserting default text.lk settings...');
    await runSql(`
      INSERT INTO settings (setting_key, setting_value) 
      VALUES 
        ('text_lk_api_token', ''),
        ('text_lk_sender_id', '')
      ON CONFLICT DO NOTHING;
    `);

    console.log('Done!');
  } catch (err) {
    console.error(err);
  } finally {
    await close();
  }
}

run();
