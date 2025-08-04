import { google } from 'googleapis';
import { GoogleGenerativeAI } from '@google/generative-ai';
import admin from 'firebase-admin';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

let firebaseApp;
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_CREDENTIALS, 'base64').toString('utf-8')
  );
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

export default async (req, res) => {
  try {
    const { namaLengkap, domisili, nomorWA, kkBase64 } = JSON.parse(req.body);
    if (!kkBase64) throw new Error('KK tidak dikirim.');

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent([
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: kkBase64,
            },
          },
          {
            text: `Berikan daftar nama pada Kartu Keluarga beserta usia mereka pada tahun 2029. Tentukan siapa saja yang berusia 17 tahun ke atas dan memenuhi syarat menjadi pemilih.`,
          },
        ],
      },
    ]);

    const content = result.response.text();

    const docRef = await db.collection('hasil_verifikasi_kk').add({
      namaLengkap,
      domisili,
      nomorWA,
      hasil: content,
      waktu: new Date(),
    });

    res.status(200).json({
      message: 'Berhasil diverifikasi dan disimpan',
      hasil: content,
      id: docRef.id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Terjadi kesalahan' });
  }
};
