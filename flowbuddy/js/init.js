(function(){
  // Dark mode disembunyikan — hapus data-theme lama jika ada
  localStorage.removeItem('flowbuddy-theme');
  document.documentElement.removeAttribute('data-theme');
  var r = localStorage.getItem('flowbuddy-role');
  if (r) document.documentElement.setAttribute('data-role', r);
})();
