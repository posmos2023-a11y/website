// 메인 첫 화면 광고 팝업 3종(토스 0원 · 인터넷 패키지 · 태블릿 POS). 세 개를 한 번에 띄운다.
// - 세션당 한 번만 뜬다. '닫기'를 누르면 이번 방문에서는 다시 안 뜨고, '오늘 하루 보지 않기'는 한국 날짜로 오늘 하루 안 뜬다.
// - 토스 0원은 행사가 끝나는 2026-10-31 이후 자동으로 빠진다.
// - 주소 끝에 ?popup=1 을 붙이면 위 조건과 상관없이 다시 띄운다(점검용).
// - 없애려면 index.html 의 <script src="ad-popup.js"> 한 줄을 지우면 된다.
(function(){
  'use strict';
  var KST=9*60*60*1000;
  var force=/[?&]popup=1(&|$)/.test(location.search);
  function today(){return new Date(Date.now()+KST).toISOString().slice(0,10);}
  function get(store,k){try{return window[store].getItem(k);}catch(e){return null;}}
  function set(store,k,v){try{window[store].setItem(k,v);}catch(e){}}

  if(!force){
    if(get('localStorage','posmos_ad_popup_hide')===today())return;
    if(get('sessionStorage','posmos_ad_popup_seen'))return;
  }

  var tossOn=Date.now()<Date.parse('2026-11-01T00:00:00+09:00');
  var ads=[];
  if(tossOn)ads.push({key:'toss',from:'팝업-토스0원',img:'popup-toss.webp',alt:'선착순 300대 한정, 10월 31일 마감. 토스터미널과 토스프론트, 소비자가 528,000원(VAT 포함)에서 0원'});
  ads.push({key:'package',from:'팝업-인터넷패키지',img:'popup-pkg.webp',alt:'포스기 + 토스프론트 공짜. 반납 없음, 사장님 소유'});
  ads.push({key:'tablet',from:'팝업-태블릿POS',img:'popup-tab.webp',alt:'태블릿 POS 세트 월 9,900원, VAT 포함. 별도 수수료 없음'});

  function track(ev,key){
    try{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:ev,popup_name:key||'all'});}catch(e){}
  }

  var css=''
  +'.adp{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,5,18,.74);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);font-family:Pretendard,"Apple SD Gothic Neo",-apple-system,sans-serif;opacity:0;transition:opacity .35s ease}'
  +'.adp.on{opacity:1}'
  +'.adp *{box-sizing:border-box}'
  +'.adp-panel{width:100%;max-width:1020px;max-height:100%;display:flex;flex-direction:column}'
  +'.adp-top{display:flex;align-items:center;justify-content:space-between;padding:0 2px 10px}'
  +'.adp-brand{display:flex;align-items:center;gap:8px;color:#fff;font-size:15px;font-weight:800;letter-spacing:.06em}'
  +'.adp-brand i{width:24px;height:24px;border-radius:7px;background:linear-gradient(145deg,#2e5de0,#6690ff);display:grid;place-items:center;font-style:normal;font-size:13px;font-family:Inter,sans-serif;font-weight:700}'
  +'.adp-x{width:44px;height:44px;border:0;border-radius:50%;background:none;color:#fff;display:grid;place-items:center;cursor:pointer;margin-right:-6px}'
  +'.adp-x span{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.14);display:grid;place-items:center}'
  +'.adp-x:hover span{background:rgba(255,255,255,.24)}'
  +'.adp-row{display:flex;justify-content:center;gap:18px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding:2px 2px 6px;scrollbar-width:none}'
  +'.adp-row::-webkit-scrollbar{display:none}'
  +'.adp-card{flex:0 0 clamp(236px,calc((100vw - 120px)/3),320px);background:#0e0e28;border-radius:20px;overflow:hidden;box-shadow:0 30px 70px -24px rgba(0,0,0,.8),0 0 0 1px rgba(255,255,255,.1);display:flex;flex-direction:column;opacity:0;transform:translateY(26px) scale(.97);transition:opacity .5s ease,transform .6s cubic-bezier(.16,1,.3,1)}'
  +'.adp.on .adp-card{opacity:1;transform:none}'
  +'.adp.on .adp-card:nth-child(2){transition-delay:.09s}.adp.on .adp-card:nth-child(3){transition-delay:.18s}'
  +'.adp-card img{display:block;width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;flex:0 0 auto;background:#16163a}'
  +'.adp-cta{margin:12px;height:50px;border-radius:999px;background:linear-gradient(135deg,#2d5ee8,#5a84ff);color:#fff;font-size:16px;font-weight:800;letter-spacing:-.02em;display:flex;align-items:center;justify-content:center;text-decoration:none;box-shadow:0 12px 28px -12px rgba(59,107,255,.85);transition:filter .2s,transform .2s}'
  +'.adp-cta:hover{filter:brightness(1.08);transform:translateY(-1px)}'
  +'.adp-bot{display:flex;align-items:center;justify-content:space-between;padding:6px 2px 0}'
  +'.adp-bot button{border:0;background:none;min-height:44px;padding:0 6px;font-family:inherit;font-size:13.5px;color:rgba(255,255,255,.72);cursor:pointer}'
  +'.adp-bot button:hover{color:#fff}'
  +'.adp-bot .adp-close{font-weight:700;color:rgba(255,255,255,.9)}'
  +'.adp-dots{display:none;justify-content:center;gap:7px;padding:8px 0 0}'
  +'.adp-dots b{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.35);transition:width .3s,background .3s}'
  +'.adp-dots b.on{width:20px;border-radius:99px;background:#fff}'
  +'.adp a:focus-visible,.adp button:focus-visible{outline:2px solid #5a84ff;outline-offset:3px;border-radius:12px}'
  +'@media(max-width:860px){'
  +'.adp-row{justify-content:flex-start;scroll-snap-type:x mandatory;padding:2px 12px 6px;margin:0 -16px;gap:12px}'
  +'.adp-card{flex-basis:min(76vw,calc((100vh - 232px)/1.25),320px);scroll-snap-align:center}'
  +'.adp-card:first-child{margin-left:calc(50vw - 16px - min(38vw,calc((100vh - 232px)/2.5),160px))}'
  +'.adp-card:last-child{margin-right:calc(50vw - 16px - min(38vw,calc((100vh - 232px)/2.5),160px))}'
  +'.adp-dots{display:flex}'
  +'}'
  +'@supports(height:100svh){@media(max-width:860px){.adp-card{flex-basis:min(76vw,calc((100svh - 232px)/1.25),320px)}.adp-card:first-child{margin-left:calc(50vw - 16px - min(38vw,calc((100svh - 232px)/2.5),160px))}.adp-card:last-child{margin-right:calc(50vw - 16px - min(38vw,calc((100svh - 232px)/2.5),160px))}}}';

  function build(){
    var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
    var wrap=document.createElement('div');
    wrap.className='adp';wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label','포스모스 안내');
    var cards=ads.map(function(a){
      return '<div class="adp-card"><img src="'+a.img+'" alt="'+a.alt+'" width="720" height="900" decoding="async"><a class="adp-cta" href="posmos-apply.html?from='+a.from+'" data-k="'+a.key+'">지금 신청하기 →</a></div>';
    }).join('');
    var dots=ads.map(function(_,i){return '<b'+(i===0?' class="on"':'')+'></b>';}).join('');
    wrap.innerHTML='<div class="adp-panel">'
      +'<div class="adp-top"><div class="adp-brand"><i aria-hidden="true">P</i>POSMOS</div><button type="button" class="adp-x" aria-label="닫기"><span><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></span></button></div>'
      +'<div class="adp-row">'+cards+'</div>'
      +'<div class="adp-dots" aria-hidden="true">'+dots+'</div>'
      +'<div class="adp-bot"><button type="button" class="adp-hide">오늘 하루 보지 않기</button><button type="button" class="adp-close">닫기</button></div>'
      +'</div>';
    document.body.appendChild(wrap);

    var prevOverflow=document.documentElement.style.overflow;
    document.documentElement.style.overflow='hidden';
    var closed=false;
    function close(why){
      if(closed)return;closed=true;
      document.documentElement.style.overflow=prevOverflow;
      wrap.classList.remove('on');
      setTimeout(function(){if(wrap.parentNode)wrap.parentNode.removeChild(wrap);},400);
      document.removeEventListener('keydown',onKey,true);
      track('popup_close',why);
    }
    function onKey(e){
      if(e.key==='Escape'){e.preventDefault();close('esc');return;}
      if(e.key!=='Tab')return;
      var f=[].slice.call(wrap.querySelectorAll('a[href],button')).filter(function(x){return x.offsetParent!==null;});
      if(!f.length)return;
      var first=f[0],last=f[f.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
    document.addEventListener('keydown',onKey,true);
    wrap.querySelector('.adp-x').addEventListener('click',function(){close('x');});
    wrap.querySelector('.adp-close').addEventListener('click',function(){close('close');});
    wrap.querySelector('.adp-hide').addEventListener('click',function(){set('localStorage','posmos_ad_popup_hide',today());close('hide-today');});
    wrap.addEventListener('click',function(e){if(e.target===wrap)close('backdrop');});
    [].forEach.call(wrap.querySelectorAll('.adp-cta'),function(a){
      a.addEventListener('click',function(){track('popup_click',a.getAttribute('data-k'));});
    });

    // 휴대폰: 옆으로 넘기는 카드 줄의 현재 위치를 점으로 보여 준다
    var row=wrap.querySelector('.adp-row'),dotEls=[].slice.call(wrap.querySelectorAll('.adp-dots b'));
    row.addEventListener('scroll',function(){
      var cs=[].slice.call(row.children),mid=row.getBoundingClientRect().left+row.clientWidth/2,best=0,bd=1e9;
      cs.forEach(function(c,i){var r=c.getBoundingClientRect(),d=Math.abs(r.left+r.width/2-mid);if(d<bd){bd=d;best=i;}});
      dotEls.forEach(function(d,i){d.classList.toggle('on',i===best);});
    },{passive:true});

    set('sessionStorage','posmos_ad_popup_seen','1');
    requestAnimationFrame(function(){requestAnimationFrame(function(){wrap.classList.add('on');});});
    var first=wrap.querySelector('.adp-cta');if(first)first.focus({preventScroll:true});
    track('popup_view');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(build,400);});
  else setTimeout(build,400);
})();
