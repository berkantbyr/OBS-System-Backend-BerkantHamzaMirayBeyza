// Bu dosya klasör yapısını tamamlamak ve `package.json` içindeki
// `main: "src/app.js"` ile uyumlu olmak için eklendi.
// Asıl iş mantığı servisler ve router dosyalarındadır.

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const apiRouter = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Orta katmanlar
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Temel API prefix'i
app.use('/api', apiRouter);

// Sağlık kontrolü için kök endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'OBS Backend API çalışıyor',
  });
});

// 404 ve global hata yakalayıcılar
app.use(notFound);
app.use(errorHandler);

// Sunucuyu sadece doğrudan çalıştırıldığında dinle
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;

