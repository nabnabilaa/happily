(function(){
  // Dark mode disembunyikan — hapus data-theme lama jika ada
  localStorage.removeItem('flowbuddy-theme');
  document.documentElement.removeAttribute('data-theme');
  var r = localStorage.getItem('flowbuddy-role');
  if (r) document.documentElement.setAttribute('data-role', r);

  // Pemilih font sudah dihapus; fontnya sekarang tetap Nunito. Preferensi lama
  // dibuang supaya tidak tertinggal di storage sebagai sampah tanpa pembaca.
  localStorage.removeItem('flowbuddy-font');
  document.documentElement.removeAttribute('data-font');
})();
