// Script para probar la subida de archivos
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function testUpload() {
  try {
    const form = new FormData();
    const filePath = '../frontend/src/app/uploads/download(7).csv';
    
    form.append('file', fs.createReadStream(filePath));
    form.append('bankId', 'eurocaja-rural');
    
    console.log('🔄 Subiendo archivo CSV...');
    
    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: form
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Subida exitosa:', result);
    } else {
      console.log('❌ Error en la subida:', result);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testUpload();
}

module.exports = testUpload;
