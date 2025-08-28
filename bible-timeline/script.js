document.addEventListener('DOMContentLoaded', () => {
  // elements
  const timelineItems = document.querySelectorAll('.timeline-item');
  const modalContainer = document.getElementById('modal-container');
  const modalImage = document.getElementById('modal-image');
  const modalTitle = document.getElementById('modal-title');
  const modalDescription = document.getElementById('modal-description');
  const modalScriptures = document.getElementById('modal-scriptures');
  const closeButton = document.getElementById('close-button');
  const scene = document.getElementById('scene-bg');
  const ambient = document.getElementById('ambient');
  const toggleImmersiveBtn = document.getElementById('toggle-immersive');
  const toggleAudioBtn = document.getElementById('toggle-audio');
  const modalVerses = document.getElementById('modal-verses');
  const modalHistory = document.getElementById('modal-history');
  const nextBtn = document.getElementById('next-era');
  const prevBtn = document.getElementById('prev-era');

  let immersiveOn = true;
  let audioOn = false;
  let currentIndex = -1;

  // === Content Maps: ayat kunci & sejarah singkat per era ===
  const VERSES = {
    creation: [
      {ref:'Kej 1:1', txt:'Pada mulanya Allah menciptakan langit dan bumi.'},
      {ref:'Kej 3:15', txt:'Benih perempuan akan meremukkan kepala ular (proto-evangelium).'},
      {ref:'Kej 9:13', txt:'Pelangi: tanda perjanjian Allah dengan Nuh.'}
    ],
    patriarchs: [
      {ref:'Kej 12:2-3', txt:'Janji Allah kepada Abraham—menjadi berkat bagi segala bangsa.'},
      {ref:'Kej 15:6', txt:'Abraham percaya kepada TUHAN, maka diperhitungkan kepadanya sebagai kebenaran.'}
    ],
    exodus: [
      {ref:'Kel 3:14', txt:'“AKU ADALAH AKU” — penyataan nama Allah.'},
      {ref:'Kel 19:5-6', txt:'Israel: kerajaan imam & bangsa kudus.'}
    ],
    judges: [
      {ref:'Hak 21:25', txt:'“Setiap orang berbuat apa yang benar menurut pandangannya sendiri.”'},
      {ref:'Rut 1:16', txt:'Kesetiaan Rut—benang merah menuju Daud & Mesias.'}
    ],
    'united-kingdom': [
      {ref:'2Sam 7:12-16', txt:'Perjanjian Daud: takhta kekal—digenapi dalam Kristus.'},
      {ref:'Mzm 23:1', txt:'TUHAN adalah gembalaku, takkan kekurangan aku.'}
    ],
    'divided-kingdom': [
      {ref:'Yes 7:14', txt:'Nubuatan Imanuel.'},
      {ref:'2Raj 17:7-23', txt:'Kejatuhan Israel karena penyembahan berhala.'}
    ],
    exile: [
      {ref:'Yer 29:11', txt:'Rancangan damai sejahtera di tengah pembuangan.'},
      {ref:'Dan 7:13-14', txt:'Anak Manusia menerima kerajaan kekal.'}
    ],
    restoration: [
      {ref:'Hag 2:9', txt:'Kemuliaan rumah yang kemudian akan lebih besar.'},
      {ref:'Za 9:9', txt:'Raja yang lemah lembut, menunggangi keledai.'}
    ],
    jesus: [
      {ref:'Yoh 1:14', txt:'Firman itu telah menjadi manusia.'},
      {ref:'Mrk 10:45', txt:'Anak Manusia datang untuk memberikan nyawa-Nya menjadi tebusan.'}
    ],
    'early-church': [
      {ref:'Kis 1:8', txt:'Kamu akan menerima kuasa—menjadi saksi sampai ujung bumi.'},
      {ref:'Why 21:5', txt:'Lihat, Aku menjadikan segala sesuatu baru!'}
    ]
  };

  const HISTORY = {
    creation: [
      'Konteks dunia kuno: budaya Mesopotamia punya kisah penciptaan, namun Kejadian menekankan monoteisme & kebaikan ciptaan.',
      'Jejak banjir besar hadir di banyak budaya kuno (Gilgamesh, dll).'
    ],
    patriarchs: [
      'Abraham berasal dari Ur (Mesopotamia). Era migrasi Amorite (±2000–1800 SM).',
      'Praktik perjanjian dan sumpah kuno tercermin dalam kisah para patriark.'
    ],
    exodus: [
      'Konteks Mesir Kuno: kerja paksa Semit; rute padang gurun Sinai—tradisi Gunung Horeb/Sinai.',
      'Pemberian Taurat membentuk identitas Israel sebagai bangsa perjanjian.'
    ],
    judges: [
      'Periode konfederasi suku-suku Israel tanpa raja terpusat.',
      'Tekanan bangsa sekitar (Filistin, Moab, Midian) memicu siklus dosa–penindasan–seruan–pembebasan.'
    ],
    'united-kingdom': [
      'Monarki Israel berawal dari Saul; kejayaan militer & kebudayaan pada Daud & Salomo.',
      'Bait Suci I dibangun (abad 10 SM) sebagai pusat ibadah nasional.'
    ],
    'divided-kingdom': [
      'Perpecahan pasca Salomo: Israel (Samaria) & Yehuda (Yerusalem).',
      'Penaklukan Asyur (722 SM) & Babel (586 SM) menandai krisis identitas.'
    ],
    exile: [
      'Pembuangan ke Babel memperkuat monoteisme & praktik sinagoga.',
      'Pengaruh Persia kemudian membuka jalan untuk kembali (Edik Koresh, 538 SM).'
    ],
    restoration: [
      'Zerubabel memulai rekonstruksi Bait; Ezra-Nehemia membenahi Taurat & tembok.',
      'Latar transisi menuju periode Helenistik-Romawi.'
    ],
    jesus: [
      'Yesus lahir pada masa Pax Romana; Herodes Agung di Yudea; kebudayaan Yahudi beragam (Farisi, Saduki, Zelot).',
      'Penyaliban adalah eksekusi Romawi; kebangkitan jadi pusat iman Gereja.'
    ],
    'early-church': [
      'Bahasa umum: Yunani Koine; jaringan jalan Romawi mempercepat misi.',
      'Penganiayaan awal justru menyebarkan Injil ke wilayah luas.'
    ]
  };

  // === Modal handling ===
  function openEraByIndex(idx){
    const items = [...timelineItems];
    if(idx < 0 || idx >= items.length) return;
    currentIndex = idx;
    const item = items[idx];

    const title = item.dataset.title;
    const image = item.dataset.image;
    const description = item.dataset.description;
    const scriptures = item.dataset.scriptures;
    const key = item.dataset.key;
    const theme = item.dataset.theme;
    const audioSrc = item.dataset.audio;

    // Fill modal
    modalTitle.textContent = title;
    modalImage.src = image;
    modalDescription.textContent = description;
    modalScriptures.innerHTML = `Kitab yang Merekam/Ditulis: <strong>${scriptures}</strong>`;

    // verses
    modalVerses.innerHTML = (VERSES[key]||[])
      .map(v=>`<p><strong>${v.ref}</strong> — ${v.txt}</p>`).join('') || '<p>Tidak ada data ayat.</p>';

    // history
    modalHistory.innerHTML = (HISTORY[key]||[])
      .map(h=>`<li>${h}</li>`).join('') || '<li>Tidak ada catatan sejarah.</li>';

    // Immersive visuals
    applyTheme(theme, image);

    // Audio
    ambient.src = audioSrc || '';
    if(audioOn && ambient.src) ambient.play().catch(()=>{});
    if(!audioOn) ambient.pause();

    modalContainer.classList.add('show');
    modalContainer.setAttribute('aria-hidden','false');
  }

  function closeModal(){
    modalContainer.classList.remove('show');
    modalContainer.setAttribute('aria-hidden','true');
    ambient.pause();
  }

  function applyTheme(theme, imageUrl){
    // set backdrop image softly through body bg
    document.body.style.backgroundImage = `linear-gradient(rgba(0,0,0,.6),rgba(0,0,0,.9)), url('${imageUrl}')`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundPosition = 'center';

    // toggle effect layers
    const stars = scene.querySelector('.stars');
    const rain  = scene.querySelector('.rain');
    const sand  = scene.querySelector('.sand');
    stars.style.opacity = (immersiveOn && theme==='stars') ? 0.6 : 0;
    rain .style.opacity = (immersiveOn && theme==='rain')  ? 0.5 : 0;
    sand .style.opacity = (immersiveOn && theme==='sand')  ? 0.25: 0;
  }

  // click binding
  timelineItems.forEach((item, idx)=>{
    item.addEventListener('click', ()=>openEraByIndex(idx));
  });

  // close handlers
  closeButton.addEventListener('click', closeModal);
  modalContainer.addEventListener('click', (e)=>{ if(e.target===modalContainer) closeModal(); });

  // next/prev
  nextBtn.addEventListener('click', ()=>openEraByIndex(Math.min(currentIndex+1, timelineItems.length-1)));
  prevBtn.addEventListener('click', ()=>openEraByIndex(Math.max(currentIndex-1, 0)));

  // toggles
  toggleImmersiveBtn.addEventListener('click', ()=>{
    immersiveOn = !immersiveOn;
    toggleImmersiveBtn.setAttribute('aria-pressed', immersiveOn);
    toggleImmersiveBtn.textContent = immersiveOn ? '🌌 Mode Imersi: ON' : '🌌 Mode Imersi: OFF';
    // re-apply theme if modal open
    if(currentIndex>=0) {
      const item = [...timelineItems][currentIndex];
      applyTheme(item.dataset.theme, item.dataset.image);
    } else {
      // fallback
      document.body.style.backgroundImage = '';
      scene.querySelectorAll('.layer').forEach(l=>l.style.opacity=0);
    }
  });

  toggleAudioBtn.addEventListener('click', ()=>{
    audioOn = !audioOn;
    toggleAudioBtn.setAttribute('aria-pressed', audioOn);
    toggleAudioBtn.textContent = audioOn ? '🔊 Suara: ON' : '🔊 Suara: OFF';
    if(audioOn && currentIndex>=0){
      ambient.play().catch(()=>{});
    } else {
      ambient.pause();
    }
  });

  // Scroll reveal
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{ if(entry.isIntersecting) entry.target.classList.add('visible'); });
  }, {threshold:0.1});
  timelineItems.forEach(item=>observer.observe(item));
});
