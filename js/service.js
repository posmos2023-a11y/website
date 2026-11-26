// 서비스 상세 페이지 공통 동작: 휴대폰 메뉴 열고 닫기
(function(){
  var btn=document.getElementById('hamburger'),menu=document.getElementById('mobile-menu');
  if(!btn||!menu)return;
  btn.addEventListener('click',function(){
    var open=menu.classList.toggle('open');
    btn.classList.toggle('open',open);
    btn.setAttribute('aria-expanded',open?'true':'false');
  });
  menu.addEventListener('click',function(e){
    if(e.target.closest('a')){menu.classList.remove('open');btn.classList.remove('open');btn.setAttribute('aria-expanded','false');}
  });
})();
