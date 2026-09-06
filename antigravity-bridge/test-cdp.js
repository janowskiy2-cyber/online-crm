const cdp = require('./cdp-controller');

async function main() {
  const status = await cdp.getScreenStatus();
  console.log('STATUS:', JSON.stringify(status, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
