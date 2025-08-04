document.getElementById('kk-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const hasilDiv = document.getElementById('hasil');
  const formData = new FormData();

  formData.append('namaLengkap', form.namaLengkap.value);
  formData.append('namaAyah', form.namaAyah.value);
  formData.append('namaIbu', form.namaIbu.value);
  formData.append('domisili', form.domisili.value);
  formData.append('noWa', form.noWa.value);

  for (const file of form.kkFiles.files) {
    formData.append('kkFiles', file);
  }

  hasilDiv.innerHTML = '⏳ Sedang memproses...';

  const res = await fetch('/.netlify/functions/verify-kk', {
    method: 'POST',
    body: formData,
  });

  const result = await res.json();
  hasilDiv.innerText = JSON.stringify(result, null, 2);
});