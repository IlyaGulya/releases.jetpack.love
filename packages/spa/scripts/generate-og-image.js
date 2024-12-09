import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const publicDir = join(__dirname, '..', 'public');

async function generateOGImage() {
  try {
    await sharp(join(publicDir, 'og-image.svg'))
      .resize(1200, 630)
      .png()
      .toFile(join(publicDir, 'og-image.png'));
    
    console.log('✅ OG image generated successfully');
  } catch (error) {
    console.error('Error generating OG image:', error);
    process.exit(1);
  }
}

generateOGImage(); 