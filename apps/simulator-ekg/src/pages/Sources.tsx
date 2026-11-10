import { DATASETS, REJECTED_DATASETS } from '../config/datasets';
import { SOURCES } from '../clinical/ecg-criteria';
import { useCatalog, quizCases } from '../store/catalog';
import { CATEGORY_LABEL, type Category } from '../cases/diagnoses';

export default function Sources() {
  const cases = quizCases(useCatalog((s) => s.cases));
  const cats = Object.keys(CATEGORY_LABEL) as Category[];
  return (
    <div className="prose-sim mx-auto max-w-4xl px-4 py-6" data-testid="sources">
      <h1>Sumber Data &amp; Lisensi</h1>
      <p>Simulator ini memakai dua jenis EKG yang selalu diberi label berbeda di layar:</p>
      <ul className="list-disc pl-5">
        <li>
          <strong>● EKG nyata</strong> — rekaman pasien yang sudah dide-identifikasi dari dataset terbuka berlisensi CC BY 4.0 (boleh dibagikan ulang dan dimodifikasi dengan atribusi). Hanya subset terkurasi yang disertakan; sinyal disimpan ulang sebagai 8 sadapan independen (I, II, V1–V6) dalam format biner ringkas, sadapan III, aVR, aVL, aVF diturunkan saat ditampilkan. Tidak ada filter yang diterapkan selain koreksi offset DC.
        </li>
        <li>
          <strong>◆ Sintetis</strong> — dibangkitkan model vektorkardiogram (dipol jantung 3D diproyeksikan ke 12 sadapan dengan matriks Dower) untuk pola yang tidak tersedia sebagai data terbuka. Bukan rekaman pasien.
        </li>
      </ul>
      <h2>Jumlah kasus</h2>
      <table className="mt-2 w-full text-left text-sm">
        <thead>
          <tr>
            <th>Kategori</th>
            <th>Nyata</th>
            <th>Sintetis</th>
          </tr>
        </thead>
        <tbody>
          {cats.map((c) => (
            <tr key={c} className="border-t border-slate-200 dark:border-slate-700">
              <td className="py-1">{CATEGORY_LABEL[c]}</td>
              <td>{cases.filter((x) => x.category === c && x.kind === 'nyata').length}</td>
              <td>{cases.filter((x) => x.category === c && x.kind === 'sintetis').length}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-400 font-bold">
            <td className="py-1">Total</td>
            <td>{cases.filter((x) => x.kind === 'nyata').length}</td>
            <td>{cases.filter((x) => x.kind === 'sintetis').length}</td>
          </tr>
        </tbody>
      </table>
      {DATASETS.map((d) => (
        <section key={d.id} className="card mt-4" data-testid={`dataset-${d.id}`}>
          <h2 className="!mt-0">
            {d.name} (v{d.version})
          </h2>
          <p>
            <strong>Lisensi:</strong>{' '}
            <a href={d.licenseUrl} rel="noopener">
              {d.license}
            </a>{' '}
            · <a href={d.url} rel="noopener">halaman dataset</a>
          </p>
          <p>
            <strong>Dipakai untuk:</strong> {d.usedFor}
          </p>
          <p>
            <strong>Seleksi:</strong> {d.selection}
          </p>
          <p className="font-semibold">Sitasi:</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {d.citations.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
        </section>
      ))}
      <h2>Dataset yang tidak dipakai</h2>
      <ul className="list-disc pl-5 text-sm">
        {REJECTED_DATASETS.map((r) => (
          <li key={r.name}>
            <strong>{r.name}:</strong> {r.reason}
          </li>
        ))}
      </ul>
      <h2>Model EKG sintetis</h2>
      <ul className="list-disc pl-5 text-sm">
        <li>Dower GE, Machado HB, Osborne JA. On deriving the electrocardiogram from vectorcardiographic leads. Clin Cardiol 1980;3:87–95.</li>
        <li>Sameni R, Clifford GD, Jutten C, Shamsollahi MB. Multichannel ECG and noise modeling: application to maternal and fetal ECG signals. EURASIP J Adv Signal Process 2007:043407.</li>
        <li>McSharry PE, Clifford GD, Tarassenko L, Smith LA. A dynamical model for generating synthetic electrocardiogram signals. IEEE Trans Biomed Eng 2003;50:289–294.</li>
      </ul>
      <h2>Pedoman & literatur klinis</h2>
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        {Object.entries(SOURCES).map(([k, v]) => (
          <li key={k}>
            <code>{k}</code> — {v}
          </li>
        ))}
      </ol>
    </div>
  );
}
