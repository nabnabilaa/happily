(function(){
  var t = localStorage.getItem('flowbuddy-theme');
  if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  var r = localStorage.getItem('flowbuddy-role');
  if (r) document.documentElement.setAttribute('data-role', r);
})();
