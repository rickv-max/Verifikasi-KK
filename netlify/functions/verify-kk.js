import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import multiparty from 'multiparty';
import admin from 'firebase-admin';
import fetch from 'node-fetch';

// 🔐 Firebase setup
const credentials = JSON.parse(
  Buffer.from(process.env.FIREBASE_CREDENTIALS, 'base64').toString('utf8')
);

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(credentials) });
}
const db = admin.firestore();

export const config = {
  bodyParser: false,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const form = new multiparty.Form();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Form parsing failed' });

    const nama = fields.nama?.[0] || '';
    const domisili = fields.domisili?.[0] || '';
    const nomorWhatsapp = fields.nomorWhatsapp?.[0] || '';
    const file = files.file?.[0];

    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const fileBuffer = fs.readFileSync(file.path);
    const base64 = fileBuffer.toString('base64');
    const mimeType = file.headers['content-type'];

    // 🔍 Kirim ke Gemini Vision
    const geminiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-1.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Dari gambar Kartu Keluarga ini, siapa saja yang akan berusia 17 tahun atau lebih pada tahun 2029? Jawab dengan nama, umur saat 2029, dan status layak memilih atau tidak.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64}`
                }
              }
            ]
          }
        ]
      })
    });

    const geminiResult = await geminiResponse.json();
    const hasilAnalisis = geminiResult.choices?.[0]?.message?.content || 'Analisis gagal';

    // 💾 Simpan ke Firestore
    const timestamp = new Date().toISOString();
    await db.collection('verifikasi-kk').add({
      nama,
      domisili,
      nomorWhatsapp,
      hasilAnalisis,
      timestamp,
    });

    res.status(200).json({ success: true, message: 'Analisis berhasil disimpan', hasilAnalisis });
  });
}
