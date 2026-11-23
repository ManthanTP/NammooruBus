const fs = require('fs');
const { execSync } = require('child_process');

try {
  execSync('npm i -D qrcode', { stdio: 'inherit' });
  const QRCode = require('qrcode');
  QRCode.toString('https://nammoorubus.vercel.app/', { type: 'svg', margin: 2, color: { dark: '#00136E', light: '#FFFFFF' } }, (err, svg) => {
    if (err) throw err;
    fs.writeFileSync('public/qr-download.svg', svg);
    console.log('Successfully generated public/qr-download.svg');
  });
} catch (e) {
  console.error('Error generating QR:', e.message);
}
