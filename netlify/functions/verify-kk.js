import { readFile } from 'fs/promises';
import multiparty from 'multiparty';
import fetch from 'node-fetch';

export const config = { bodyParser: false };

export default async (req, res) => {
  const form = new multiparty.Form();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Form parsing error' });

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const hasil = [];

    for (let file of files.kkFiles) {
      const buffer = await readFile(file.path);
      const base64 = buffer.toString('base64');

      const geminiRes = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { mimeType: file.headers['content-type'], data: base64 } },
                { text: "Dari data Kartu Keluarga ini, siapa saja yang berusia 17 tahun atau lebih pada tahun 2029? Sebutkan namanya saja. Format jawaban: nama1, nama2, dst." }
              ]
            }
          ]
        })
      });

      const data = await geminiRes.json();
      const isiJawaban = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Gagal mengambil hasil";

      hasil.push({
        namaFile: file.originalFilename,
        hasil: isiJawaban
      });
    }

    res.status(200).json({
      identitas: {
        namaLengkap: fields.namaLengkap?.[0],
        namaAyah: fields.namaAyah?.[0],
        namaIbu: fields.namaIbu?.[0],
        domisili: fields.domisili?.[0],
        noWa: fields.noWa?.[0],
      },
      hasilKK: hasil
    });
  });
};
