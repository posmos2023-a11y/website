// 포스모스 고급화 버전 메인 페이지 스크립트.
// 메뉴·₩0 독·사진 넘김·FAQ·토스 프론트 무대 같은 기본 동작은 항상 돌고, 인트로와 등장 모션은 GSAP 을 불러왔을 때만 붙인다.
// GSAP 을 못 불러오면 html.motion 을 떼서 모든 내용이 처음부터 보이게 한다.
// '동작 줄이기' 설정(html.reduced)이면 위치·크기 변화 없이 투명도만 바꾸고, 무한 반복 장식은 멈춘다.
(function(){
  'use strict';
  var root=document.documentElement;
  var finePointer=window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var motion=root.classList.contains('motion');
  var reduced=root.classList.contains('reduced');
  var fast=root.classList.contains('intro-fast');
  if(motion&&!(window.gsap&&window.ScrollTrigger)){
    root.classList.remove('motion','intro','intro-fast');
    motion=false;
  }
  if(motion)window.__posmosMotion=true;
  var pointerFx=motion&&finePointer&&!reduced;
  var each=function(sel,fn,scope){[].forEach.call((scope||document).querySelectorAll(sel),fn);};
  var $=function(sel,scope){return (scope||document).querySelector(sel);};
  var isMobile=function(){return window.innerWidth<=900;};
  var whenIdle=function(f){if(window.requestIdleCallback)window.requestIdleCallback(f,{timeout:3000});else setTimeout(f,1200);};

  /* ---------- 부드러운 스크롤 (마우스 환경만) ---------- */
  var lenis=null;
  if(pointerFx&&window.Lenis){
    lenis=new Lenis({duration:0.9,easing:function(t){return Math.min(1,1.001-Math.pow(2,-10*t));}});
    lenis.on('scroll',ScrollTrigger.update);
    gsap.ticker.add(function(time){lenis.raf(time*1000);});
    gsap.ticker.lagSmoothing(0);
  }
  // 페이지 안 이동 링크: Lenis 를 쓸 때는 직접 스크롤한다(상단 메뉴 높이만큼 띄움)
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href^="#"]');
    if(!a||!lenis)return;
    var id=a.getAttribute('href').slice(1);
    var target=id&&document.getElementById(id);
    if(!target)return;
    e.preventDefault();
    lenis.scrollTo(id==='top'?0:target,{offset:id==='top'?0:-64,duration:1.4});
    if(history.pushState)history.pushState(null,'','#'+id);
    if(!target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1');
    target.focus({preventScroll:true});
  });

  /* ---------- 신청 페이지로 넘어갈 때: 누른 버튼이 신청 카드로 커진다(View Transitions) ---------- */
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href^="posmos-apply.html"]');
    if(!a)return;
    each('a[href^="posmos-apply.html"]',function(x){x.style.viewTransitionName='';});
    a.style.viewTransitionName='apply-cta';
  });
  window.addEventListener('pageshow',function(){
    each('a[href^="posmos-apply.html"]',function(x){x.style.viewTransitionName='';});
  });

  /* ---------- 상단 메뉴 ---------- */
  var nav=$('#nav');
  var navProgress=$('#navProgress');
  var navInd=$('#navInd');
  var navLinks=[].slice.call(document.querySelectorAll('.nav-center li a'));
  var hero=$('#slideHero');
  var ctaStrip=$('#ctaStrip');
  var darkZones=[].slice.call(document.querySelectorAll('[data-dark]'));
  var sections=['top','deals','pricing','services','tossfront','kiosk','tableorder','qrorder','process','supply','devrequest','faq-zone'].map(function(id){
    return {id:id,el:document.getElementById(id)};
  });
  // 메뉴에 없는 구간은 가까운 메뉴에 붙인다(FAQ 는 개발 문의 뒤라 표시선이 앞으로 튀지 않게)
  var navSectionAlias={deals:'pricing',services:'pricing',tossfront:'pricing',kiosk:'pricing',tableorder:'pricing',qrorder:'pricing','faq-zone':'devrequest'};
  var currentSection=null,lastY=window.scrollY;

  function moveIndicator(a){
    if(!a){navInd.style.width='0';return;}
    navInd.style.width=(a.offsetWidth-24)+'px';
    navInd.style.transform='translateX('+(a.parentNode.offsetLeft+12)+'px)';
  }
  function updateNav(){
    var y=window.scrollY+100,cur='top';
    sections.forEach(function(s){
      if(s.el&&s.el.getBoundingClientRect().top+window.scrollY<=y)cur=s.id;
    });
    cur=navSectionAlias[cur]||cur;
    if(cur===currentSection)return;
    currentSection=cur;
    var active=null;
    navLinks.forEach(function(a){
      var on=a.dataset.section===cur;
      a.classList.toggle('active',on);
      if(on)active=a;
    });
    moveIndicator(active);
  }
  // 메뉴 바로 아래가 네이비 면이면 메뉴도 어두운 모양으로 바꾼다
  function overDark(){
    for(var i=0;i<darkZones.length;i++){
      var z=darkZones[i];
      if(!z)continue;
      var r=z.getBoundingClientRect();
      if(r.top<=36&&r.bottom>36)return true;
    }
    return false;
  }

  /* ---------- ₩0 독: 첫 화면 바닥 막대 → 스크롤하면 상담 버튼을 품은 독 → 하단 CTA 에서는 숨김 ---------- */
  var dock=$('#zeroDock'),fabBtn=$('#fabBtn'),fabKakao=$('#fabKakao');
  var docked=false,away=false,wasOn=false,swapT=0,measureT=0,ticked=false;
  if(dock)dock.addEventListener('animationend',function(e){if(e.animationName==='zdTick')dock.classList.remove('zd-tick');});
  function isStage(){return root.classList.contains('zd-stage');}
  function dockOn(){return docked&&!away&&!isStage();}
  // 첫 화면 바닥 막대 높이(--zd-h)는 첫 화면 아래 여백으로, 독이 가리는 높이(--dock-h)는 앵커 이동·포커스 여백으로 쓴다
  function measure(){
    if(!dock)return;
    if(!docked)root.style.setProperty('--zd-h',dock.offsetHeight+'px');
    var cs=getComputedStyle(dock),shown=root.classList.contains('zd-in')&&!away&&!isStage()&&cs.visibility!=='hidden'&&parseFloat(cs.opacity)>0.5;
    root.style.setProperty('--dock-h',shown?Math.max(0,window.innerHeight-dock.getBoundingClientRect().top)+'px':'0px');
  }
  // 휴대폰 첫 화면: 혜택 알약 줄이 바닥 ₩0 막대에 반쯤 걸리면 어색하다.
  // 단말기 무대를 줄여(160px까지) 알약을 다 보이게 하고, 그래도 모자라면 알약 줄을 막대 아래로 다 내린다.
  // 화면 폭이 바뀔 때만 다시 잰다(스크롤로 주소창이 접혀 높이만 바뀔 때는 그대로 둬서 페이지가 튀지 않게)
  var heroPills=$('.slide-pills'),heroStage=$('#heroStage'),fitW=0;
  var dockHiddenQ=window.matchMedia('(max-width:600px) and (max-height:620px),(min-width:400px) and (max-width:900px) and (max-height:660px),(max-height:500px) and (orientation:landscape)');
  function docTop(el){var y=0;for(;el;el=el.offsetParent)y+=el.offsetTop;return y;}
  function fitHero(force){
    if(!hero||!heroPills||!heroStage||!dock)return;
    if(!force&&window.innerWidth===fitW)return;
    fitW=window.innerWidth;
    var before=hero.style.getPropertyValue('--stage-fit')+'|'+heroPills.style.marginTop;
    hero.style.removeProperty('--stage-fit');
    heroPills.style.marginTop='';
    var zd=parseFloat(root.style.getPropertyValue('--zd-h'))||0;
    if(isMobile()&&zd&&!dockHiddenQ.matches){
      var line=window.innerHeight-zd,rows=[];
      each('.slide-pill',function(pl){
        var tp=docTop(pl),bt=tp+pl.offsetHeight,last=rows[rows.length-1];
        if(last&&Math.abs(last.t-tp)<4)last.b=Math.max(last.b,bt);else rows.push({t:tp,b:bt});
      },heroPills);
      var cut=rows.some(function(r){return r.t<line&&r.b>line-12;});
      if(cut){
        var need=Math.ceil(rows[rows.length-1].b-line+12),grow=Math.ceil(line+8-rows[0].t);
        var sub=$('.slide-cta-sub'),subB=sub?docTop(sub)+sub.offsetHeight:line;
        if(heroStage.offsetHeight-need>=160)hero.style.setProperty('--stage-fit',need+'px');
        // 다 못 넣으면 단말기를 키워 알약을 막대 아래로 통째로 보낸다(전화 줄은 막대 위에 남게). 그것도 안 되면 알약 줄만 내린다
        else if(subB+grow<=line-6&&heroStage.offsetHeight+grow<=320)hero.style.setProperty('--stage-fit',(-grow)+'px');
        else heroPills.style.marginTop=(parseFloat(getComputedStyle(heroPills).marginTop)+grow)+'px';
      }
    }
    if(hero.style.getPropertyValue('--stage-fit')+'|'+heroPills.style.marginTop!==before&&window.ScrollTrigger)ScrollTrigger.refresh();
  }
  function syncDock(){
    if(!dock)return;
    var on=dockOn();
    fabBtn.classList.toggle('visible',on);
    fabKakao.classList.toggle('visible',on);
    // 휴대폰 티커는 독이 나타날 때마다 한 바퀴만 돌고 '포스기 비용 ₩0'에서 멈춘다
    if(on&&!wasOn&&isMobile()&&!reduced&&!ticked){
      ticked=true;
      dock.classList.remove('zd-tick');
      void dock.offsetWidth;
      dock.classList.add('zd-tick');
    }
    wasOn=on;
    clearTimeout(measureT);
    measureT=setTimeout(measure,800);
  }
  function setDocked(v){
    if(!dock||v===docked)return;
    docked=v;
    if(!motion||reduced){root.classList.toggle('zd-docked',v);syncDock();return;}
    // 같은 요소가 아래로 잠깐 내려갔다 새 모양으로 올라온다
    dock.classList.add('zd-swap');
    clearTimeout(swapT);
    swapT=setTimeout(function(){
      root.classList.toggle('zd-docked',docked);
      syncDock();
      dock.classList.remove('zd-swap');
    },300);
  }
  var io='IntersectionObserver' in window;
  var heroCta=$('.slide-cta-group');
  if(dock&&io&&heroCta){
    // 첫 화면 CTA 가 화면 위쪽 35% 선을 넘어가면 독으로 바뀐다
    new IntersectionObserver(function(es){
      var e=es[0],rb=e.rootBounds;
      setDocked(!e.isIntersecting&&e.boundingClientRect.top<(rb?rb.top:0));
    },{rootMargin:'-35% 0px 0px 0px'}).observe(heroCta);
  }
  // 휴대폰 토스 프론트: 무대가 화면 위에 붙어 기능 목록이 그 밑으로 지나가는 동안만 독을 내린다. 목록이 끝나 무대가 풀리면 독이 돌아온다
  var tfStageBox=$('#tossfront .tf-stage'),tfListBox=$('#tfList'),tfGridBox=$('#tossfront .tf-grid');
  // 휴대폰: 기능 목록이 무대 아래 끝을 지나 올라가면 무대를 목록 끝에 내려놓는다(.tf-done → absolute).
  // sticky 만으로는 격자 전체 끝까지 붙어 있어 가격·버튼·매장 사진이 무대 밑으로 들어간다
  function stageRelease(){
    if(!tfGridBox||!tfStageBox||!tfListBox)return;
    var done=isMobile()&&tfListBox.getBoundingClientRect().bottom<tfStageBox.offsetHeight;
    if(done!==tfGridBox.classList.contains('tf-done'))tfGridBox.classList.toggle('tf-done',done);
  }
  function stageDock(){
    if(!dock||!tfStageBox||!tfListBox)return;
    var on=false;
    if(isMobile()){
      var s=tfStageBox.getBoundingClientRect(),l=tfListBox.getBoundingClientRect();
      on=s.top<window.innerHeight*0.12&&s.bottom>64&&l.bottom>s.bottom+8;
    }
    if(on!==isStage()){root.classList.toggle('zd-stage',on);syncDock();}
  }
  function updateDock(y){
    if(!dock)return;
    if(!io)setDocked(y>hero.offsetHeight*0.35);
    // 하단 상담 영역이 보이면 같은 버튼이 겹치지 않게 내려가 숨는다
    var a=ctaStrip.getBoundingClientRect().top<window.innerHeight*0.8;
    if(a!==away){
      away=a;
      root.classList.toggle('zd-away',a);
      syncDock();
    }
  }
  // 어떤 이유로든 등장 모션이 안 붙으면 4초 뒤 그냥 보이게 한다
  setTimeout(function(){root.classList.add('zd-in');},4000);

  /* ---------- 토스 프론트 무대: 스크롤에 따라 기기가 돌고, 기능 줄마다 장면이 바뀐다 ---------- */
  var tfStage=$('#tfStage'),tfImgs={},tfCur='front';
  if(tfStage)each('img',function(im){tfImgs[im.getAttribute('data-k')]=im;},tfStage);
  var tfItems=[].slice.call(document.querySelectorAll('#tfList li'));
  var tfMap=['front','card','phone','tap','front','34','front'];
  function setTf(k){
    if(k===tfCur||!tfImgs[k])return;
    tfImgs[tfCur].classList.remove('on');
    tfImgs[k].classList.add('on');
    tfCur=k;
  }
  function updateStage(){
    if(!tfStage||!motion)return;
    var vh=window.innerHeight,mid=vh*(isMobile()?0.78:0.58),active=-1;
    for(var i=0;i<tfItems.length;i++){if(tfItems[i].getBoundingClientRect().top<mid)active=i;}
    tfItems.forEach(function(li,i){
      li.classList.toggle('on',i<=active);
      li.classList.toggle('cur',i===active);
    });
    if(active>=0){setTf(tfMap[active]);return;}
    var r=tfStage.getBoundingClientRect();
    var p=Math.max(0,Math.min(0.999,(vh-r.top)/(vh*0.95)));
    setTf(['back','side','34','front'][Math.floor(p*4)]);
  }

  function onScroll(){
    var y=window.scrollY;
    nav.classList.toggle('scrolled',y>60);
    nav.classList.toggle('on-dark',overDark());
    // 첫 화면을 지나 아래로 내릴 때는 메뉴를 숨기고, 위로 올리면 다시 보인다
    if(y>lastY+2&&y>window.innerHeight*0.9)nav.classList.add('nav-hidden');
    else if(y<lastY-2||y<=window.innerHeight*0.9)nav.classList.remove('nav-hidden');
    lastY=y;
    var max=root.scrollHeight-window.innerHeight;
    navProgress.style.transform='scaleX('+(max>0?Math.min(1,y/max):0)+')';
    updateNav();
    updateDock(y);
    updateStage();
    stageRelease();
    stageDock();
  }
  // 숨겨진 탭에서 열리면 레이아웃이 0 으로 잡혀 엉뚱한 메뉴가 켜질 수 있어, 보이게 되거나 다 뜬 뒤 다시 계산한다
  function resetNav(){currentSection=null;onScroll();}
  var resizeT=0;
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',function(){
    resetNav();
    clearTimeout(resizeT);
    resizeT=setTimeout(function(){measure();fitHero();},200);
  });
  window.addEventListener('load',function(){resetNav();measure();fitHero(true);});
  document.addEventListener('visibilitychange',resetNav);
  onScroll();
  measure();
  fitHero(true);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){resetNav();measure();fitHero(true);});

  /* ---------- 모바일 메뉴 ---------- */
  (function(){
    var btn=$('#hamburger'),menu=$('#mobile-menu');
    if(btn)btn.addEventListener('click',function(){btn.classList.toggle('open');menu.classList.toggle('open');});
    each('a',function(a){a.addEventListener('click',function(){btn.classList.remove('open');menu.classList.remove('open');});},menu);
  })();

  /* ---------- 첫 화면 매장 사진판: 둘째·셋째 장은 페이지가 다 뜬 뒤 쉬는 시간에 받는다 ---------- */
  var reel=$('#heroReel'),pan=reel&&$('.reel-pan',reel);
  var pics=reel?[].slice.call(reel.querySelectorAll('.reel-pic')):[];
  var cn=navigator.connection||{};
  // 동작 줄이기·데이터 절약·느린 회선·모션 미로딩이면 첫 장 한 장만 정지 상태로 둔다
  var skipExtra=!motion||reduced||!!cn.saveData||/2g|3g/.test(cn.effectiveType||'')||isMobile();
  if(skipExtra)pics=pics.slice(0,1);
  function loadReel(){
    pics.slice(1).forEach(function(p){
      var s=p.querySelector('source'),im=p.querySelector('img');
      if(s&&s.getAttribute('data-srcset')){s.srcset=s.getAttribute('data-srcset');s.removeAttribute('data-srcset');}
      if(im&&im.getAttribute('data-src')){im.src=im.getAttribute('data-src');im.removeAttribute('data-src');}
    });
  }
  if(pics.length>1){
    if(document.readyState==='complete')whenIdle(loadReel);
    else window.addEventListener('load',function(){whenIdle(loadReel);});
  }

  /* ---------- 첫 화면 단말기: 3D(js/hero3d.js)가 뜨기 전 잠깐 보이는 정지 사진. 제목 쪽을 보는 각도(data-look 의 셋째 값) 한 장만 받는다 ---------- */
  var spinWrap=$('#spin');
  var spinImgs=spinWrap?[].slice.call(spinWrap.querySelectorAll('img')):[];
  var spinCur=0;
  function setSpin(i){
    if(!spinImgs.length)return;
    i=((i%spinImgs.length)+spinImgs.length)%spinImgs.length;
    if(i===spinCur||!spinImgs[i].complete||!spinImgs[i].naturalWidth)return;
    spinImgs[spinCur].classList.remove('on');
    spinImgs[i].classList.add('on');
    spinCur=i;
  }
  var look=spinWrap?(spinWrap.getAttribute('data-look')||'1,0,8,7').split(',').map(Number):[];
  var rest=look.length>2?look[2]:0;
  if(rest&&spinImgs[rest]&&!cn.saveData){
    var restImg=spinImgs[rest];
    if('fetchPriority' in restImg)restImg.fetchPriority='high';
    restImg.addEventListener('load',function(){setSpin(rest);},{once:true});
    if(restImg.getAttribute('data-srcset')){restImg.srcset=restImg.getAttribute('data-srcset');restImg.removeAttribute('data-srcset');}
    if(restImg.getAttribute('data-src')){restImg.src=restImg.getAttribute('data-src');restImg.removeAttribute('data-src');}
  }

  /* ---------- 사진 넘김(테이블오더·QR오더) ---------- */
  each('.fade-show',function(fs){
    var imgs=[].slice.call(fs.querySelectorAll('img'));
    var n=imgs.length,i=0,hover=false,visible=true;
    var tile=fs.parentNode;
    var box=tile.querySelector('.fs-dots');
    // 한 장뿐이면 넘김 점 없이 그 사진만 둔다
    tile.classList.add('s0');
    if(n<2){
      if(box)box.parentNode.removeChild(box);
      if(imgs[0])imgs[0].classList.add('on');
      return;
    }
    var dots=[];
    if(box){
      imgs.forEach(function(_,k){
        var d=document.createElement('button');
        d.className='fs-dot'+(k===0?' active':'');
        d.setAttribute('aria-label','슬라이드 '+(k+1));
        d.setAttribute('aria-current',k===0?'true':'false');
        d.addEventListener('click',function(){if(k!==i)show(k);});
        box.appendChild(d);
        dots.push(d);
      });
    }
    function show(k){
      imgs[i].classList.remove('on');
      if(dots[i]){dots[i].classList.remove('active');dots[i].setAttribute('aria-current','false');}
      i=(k+n)%n;
      imgs[i].classList.add('on');
      if(dots[i]){dots[i].classList.add('active');dots[i].setAttribute('aria-current','true');}
      tile.classList.toggle('s0',i===0);
    }
    function sync(){tile.classList.toggle('paused',hover||!visible);}
    // 점 채움 애니메이션이 끝나면 다음 장(동작 줄이기에서는 채움이 없어 자동으로 넘어가지 않는다)
    tile.addEventListener('animationend',function(e){if(e.target.classList.contains('fs-dot'))show(i+1);});
    tile.addEventListener('pointerenter',function(e){if(e.pointerType==='mouse'){hover=true;sync();}});
    tile.addEventListener('pointerleave',function(){hover=false;sync();});
    if(io)new IntersectionObserver(function(es){visible=es[0].isIntersecting;sync();}).observe(tile);
    var x0=null;
    tile.addEventListener('touchstart',function(e){x0=e.touches[0].clientX;},{passive:true});
    tile.addEventListener('touchend',function(e){
      if(x0===null)return;
      var dx=e.changedTouches[0].clientX-x0;
      x0=null;
      if(Math.abs(dx)>30)show(dx<0?i+1:i-1);
    },{passive:true});
  });

  /* ---------- 키오스크 화면 교대 ---------- */
  (function(){
    var show=$('#ksShow');
    if(!show||reduced)return;
    var imgs=[].slice.call(show.querySelectorAll('img')),i=0,visible=false;
    if(imgs.length<2)return;
    if(io)new IntersectionObserver(function(es){visible=es[0].isIntersecting;}).observe(show);
    setInterval(function(){
      if(!visible||document.hidden)return;
      imgs[i].classList.remove('on');
      i=(i+1)%imgs.length;
      imgs[i].classList.add('on');
    },3200);
  })();

  /* ---------- 자주 묻는 질문 ---------- */
  (function(){
    var items=[].slice.call(document.querySelectorAll('.faq-item'));
    items.forEach(function(item){
      var btn=item.querySelector('.faq-q');
      btn.addEventListener('click',function(){
        var open=!item.classList.contains('open');
        items.forEach(function(o){
          o.classList.remove('open');
          o.querySelector('.faq-q').setAttribute('aria-expanded','false');
        });
        if(open){
          item.classList.add('open');
          btn.setAttribute('aria-expanded','true');
        }
        // 펼침으로 아래 내용 위치가 바뀌므로 스크롤 효과 기준점을 다시 잡는다
        if(motion)setTimeout(function(){ScrollTrigger.refresh();},600);
      });
    });
  })();

  if(!motion){root.classList.add('zd-in');return;}

  /* ================= 모션 ================= */
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ignoreMobileResize:true});
  ScrollTrigger.addEventListener('refresh',resetNav);
  // 등장 효과는 once 대신 기본 동작(내려올 때 한 번 재생, 되감지 않음)을 쓴다.
  // once 는 페이지 중간에서 열릴 때(#주소·새로고침) 이미 지난 트리거가 생성 도중 사라지며 ScrollTrigger 오류를 낸다.
  var EASE='expo.out';
  var R=isMobile()?14:16;
  // 휴대폰은 화면 아래 ₩0 바(약 58px)에 가려, 86~90% 지점에서 시작한 등장이 거의 보이지 않는다. 한 번 재생되는 등장은 바 위 70px(화면 아래에서 130px)보다 늦게 시작하지 않게 한다.
  // 76%로 묶으면 스크롤을 멈췄을 때 바 위 140px가 늘 비어 보인다
  var MOB=isMobile();
  var CAP=MOB?Math.max(72,Math.min(88,100-13000/Math.max(window.innerHeight,400))):100;
  function at(pct){return 'top '+(MOB?Math.min(pct,CAP):pct)+'%';}
  // 동작 줄이기 모드에서는 위치·크기·회전·가림막 변화를 빼고 투명도만 바꾼다
  var MOVE=['x','y','xPercent','yPercent','scale','rotate','rotation','rotateX','rotateY','clipPath'];
  function m(v){if(reduced)MOVE.forEach(function(k){delete v[k];});return v;}
  function lines(scope){return scope.querySelectorAll('.ln>*');}

  // 숫자를 자릿수마다 세로 띠로 굴려 제자리에 세운다. 끝나면 원래 글자로 되돌린다(화면 낭독기는 원래 글자만 읽음).
  function roll(el,opt){
    if(!el||reduced)return;
    opt=opt||{};
    var text=el.textContent.trim(),html='';
    for(var i=0;i<text.length;i++){
      var c=text.charAt(i);
      if(/\d/.test(c)){
        var seq=[];
        for(var k=0;k<=10+(+c);k++)seq.push('<span>'+(k%10)+'</span>');
        html+='<span class="roll"><span class="roll-strip">'+seq.join('')+'</span></span>';
      }else html+='<span>'+c+'</span>';
    }
    el.innerHTML='<span aria-hidden="true" style="display:inline-flex">'+html+'</span><span class="sr-only">'+text+'</span>';
    var strips=el.querySelectorAll('.roll-strip');
    var tl=gsap.timeline({delay:opt.delay||0,onComplete:function(){el.textContent=text;}});
    for(var j=strips.length-1;j>=0;j--){
      var n=strips[j].children.length;
      tl.fromTo(strips[j],{yPercent:0},{yPercent:-100*(n-1)/n,duration:opt.dur||1.5,ease:'power4.out'},(strips.length-1-j)*0.07);
    }
    return tl;
  }

  // 글씨는 줄 단위로 한 번, 가림막(.ln) 안에서 아래에서 위로만 올라온다. 회전·크기·튕김은 쓰지 않는다(읽기 편하게)
  function linesIn(lineEls,opt){
    opt=opt||{};
    // 휴대폰은 움직임이 처음 0.3초에 몰려 끝나 보이지 않으므로, 1.2초 동안 고르게 올라오는 곡선을 쓴다
    return gsap.fromTo(lineEls,{opacity:0,yPercent:105},{opacity:1,yPercent:0,duration:opt.dur||(MOB?1.2:0.9),ease:MOB?'power3.out':EASE,stagger:opt.stagger||(MOB?0.14:0.08),delay:opt.delay||0});
  }

  /* ---------- 인트로: 꽃잎 8장이 모여 로고가 되고, 상단 메뉴 로고 자리로 날아가 앉는다 ---------- */
  function runIntro(done){
    var intro=$('#intro');
    if(!root.classList.contains('intro')||!intro){
      if(intro)intro.parentNode.removeChild(intro);
      done(false);
      return;
    }
    if('scrollRestoration' in history)history.scrollRestoration='manual';
    window.scrollTo(0,0);
    if(lenis)lenis.stop();
    var k=fast?0.5:1;
    var logo=$('.intro-logo',intro),mark=$('.intro-mark',intro),word=$('.intro-word',intro),bg=$('.intro-bg',intro);
    var petals=intro.querySelectorAll('.pt'),cores=intro.querySelectorAll('.core');
    var lr=logo.getBoundingClientRect();
    gsap.set(logo,{x:-lr.width/2,y:-lr.height/2,transformOrigin:'0 0'});
    var flown=false,finished=false;
    function finish(){
      if(finished)return;
      finished=true;
      root.classList.remove('intro','intro-fast');
      if(intro.parentNode)intro.parentNode.removeChild(intro);
      try{sessionStorage.setItem('posmos_intro','1');}catch(e){}
      if(lenis)lenis.start();
      ScrollTrigger.refresh();
    }
    function fly(){
      if(flown)return;
      flown=true;
      var target=$('#nav .nav-mark').getBoundingClientRect();
      var s=target.width/mark.getBoundingClientRect().width*(gsap.getProperty(logo,'scale')||1);
      gsap.to(logo,{x:target.left-window.innerWidth/2,y:target.top-window.innerHeight/2,scale:s,duration:0.62*k,ease:'expo.inOut'});
      if(isMobile())gsap.to('.intro-word-mask',{opacity:0,duration:0.25});
      gsap.to(bg,{opacity:0,duration:0.55*k,delay:0.12*k,ease:'power2.inOut'});
      gsap.delayedCall(0.18*k,function(){done(true);});
      gsap.delayedCall(0.66*k,finish);
    }
    if(reduced){
      gsap.timeline()
        .fromTo(logo,{opacity:0},{opacity:1,duration:0.4})
        .add(function(){gsap.to(intro,{opacity:0,duration:0.5,onComplete:finish});done(true);},'+=0.3');
      return;
    }
    var tl=gsap.timeline();
    tl.fromTo(petals,{y:-46,opacity:0,rotation:function(i){return i%2?-40:40;},svgOrigin:'50 50'},{y:0,opacity:1,rotation:0,svgOrigin:'50 50',duration:0.6*k,ease:'expo.out',stagger:{each:0.03*k,from:'random'}},0)
      .fromTo(cores,{scale:0,transformOrigin:'50% 50%'},{scale:1,duration:0.45*k,ease:'back.out(2.4)'},0.28*k)
      .fromTo(mark,{rotation:-120},{rotation:0,duration:1*k,ease:'expo.out'},0)
      .fromTo(word,{yPercent:115},{yPercent:0,duration:0.6*k,ease:EASE},0.4*k)
      .add(fly,0.86*k);
    intro.addEventListener('click',function(){
      tl.progress(1);
      fly();
    });
    // 어떤 이유로든 멈추면 4초 뒤 강제로 끝낸다
    setTimeout(function(){if(!finished){fly();finish();}},4000);
  }

  /* ---------- 첫 화면 사진판 모션: 창이 열리고, 기기를 중심으로 천천히 물러나며, 같은 자리의 기기로 교차한다 ---------- */
  var curKb=null,reelPaused=false;
  // 확대는 CSS transform-origin(사진마다 기기 위치)을 기준으로 한다
  function kb(p,from,dur,ease){
    var im=p.querySelector('img');
    return gsap.fromTo(im,{scale:from},{scale:1,duration:dur,ease:ease});
  }
  function decoded(im){
    var d=(im&&im.decode?im.decode():Promise.resolve()).catch(function(){});
    return Promise.race([d,new Promise(function(r){setTimeout(r,2500);})]);
  }
  function reelIn(fromIntro){
    if(!reel||!pics.length||reduced)return;
    if(fromIntro&&!isMobile()){
      gsap.fromTo(reel,{opacity:0},{opacity:1,duration:fast?1.0:1.4,ease:'power2.out',clearProps:'opacity'});
    }
    if(isMobile())return;
    // 첫 장 확대는 디코딩이 끝난 뒤에만 시작한다(그 전에는 CSS 의 확대 정지 화면)
    decoded(pics[0].querySelector('img')).then(function(){
      curKb=kb(pics[0],1.32,fast?7.5:8.1,'power3.out');
      if(reelPaused)curKb.pause();
    });
    if(pics.length<2)return;
    var cur=0,loops=0;
    function next(){
      var n=(cur+1)%pics.length,im=pics[n].querySelector('img');
      if(reelPaused||document.hidden||!im.getAttribute('src')){gsap.delayedCall(1.5,next);return;}
      decoded(im).then(function(){
        if(!im.naturalWidth){gsap.delayedCall(1.5,next);return;}
        gsap.set(pics[n],{zIndex:2});
        curKb=kb(pics[n],1.1,8.6,'none');
        gsap.fromTo(pics[n],{opacity:0},{opacity:1,duration:1.6,ease:'sine.inOut',onComplete:function(){
          gsap.set(pics[cur],{opacity:0,zIndex:0});
          pics[cur].classList.remove('on');
          pics[n].classList.add('on');
          gsap.set(pics[n],{zIndex:1});
          cur=n;
          if(cur===0)loops++;
          // 두 바퀴 돈 뒤 첫 장에서 멈춘다
          if(loops<2)gsap.delayedCall(7,next);
        }});
      });
    }
    gsap.delayedCall(8.5,next);
  }
  if(reel&&!reduced){
    // 화면 밖·포커스가 들어왔을 때는 확대와 교차를 멈춘다
    var setReelPause=function(v){
      reelPaused=v;
      if(curKb){if(v)curKb.pause();else curKb.resume();}
    };
    var reelOut=false,reelFocus=false;
    ScrollTrigger.create({trigger:hero,start:'top top',end:'bottom top',
      onLeave:function(){reelOut=true;setReelPause(true);},
      onEnterBack:function(){reelOut=false;setReelPause(reelFocus);}});
    hero.addEventListener('focusin',function(){reelFocus=true;setReelPause(true);});
    hero.addEventListener('focusout',function(){reelFocus=false;setReelPause(reelOut);});
    // 스크롤하면 사진판은 글자보다 천천히 내려간다
    gsap.to(reel,{yPercent:isMobile()?6:10,ease:'none',scrollTrigger:{trigger:hero,start:'top top',end:'bottom top',scrub:true}});
  }

  /* ---------- 첫 화면 단말기: 또렷한 매장 사진을 먼저 보여 준 뒤 제목 쪽을 보는 각도로 앞에 떠오른다. 회전은 3D(js/hero3d.js)가 맡는다 ---------- */
  var stage=$('#heroStage');
  function stageIn(){
    if(!stage)return;
    if(reduced){gsap.fromTo(stage,{opacity:0},{opacity:1,duration:0.9});return;}
    spinWrap.classList.add('fast');setSpin(rest);void spinWrap.offsetWidth;spinWrap.classList.remove('fast');
    gsap.fromTo(stage,{opacity:0,y:120,scale:0.86},{opacity:1,y:0,scale:1,duration:1.4,ease:'expo.out'});
    gsap.fromTo('#heroStage .stage-glow',{opacity:0,scale:0.5},{opacity:1,scale:1,duration:1.6,ease:EASE});
    // 단말기가 서는 동안 뒤 사진을 한 단계 눌러(네이비는 어둡게, 화이트는 흰 안개로) 초점을 앞으로 옮긴다. 목표값은 CSS --reel-to
    if(reel)gsap.fromTo(reel,{'--reel-dim':0},{'--reel-dim':parseFloat(getComputedStyle(reel).getPropertyValue('--reel-to'))||0.34,duration:1.6,ease:'power2.inOut'});
  }
  // 3D 단말기가 이어받기 직전에 정지 사진을 쉬는 각도로 맞춘다
  window.__heroRest=function(){if(spinWrap)setSpin(rest);};

  /* ---------- 첫 화면 등장 ---------- */
  function heroIn(fromIntro){
    var tl=gsap.timeline({defaults:{ease:EASE}});
    if(fromIntro)tl.fromTo(nav,{opacity:0},{opacity:1,duration:0.5},0);
    else tl.fromTo(nav,m({yPercent:-100,opacity:0}),m({yPercent:0,opacity:1,duration:1,clearProps:'transform'}),0.05);
    tl.add(function(){reelIn(fromIntro);},0)
      .add(stageIn,fromIntro?(fast?0.85:1.45):1)
      .fromTo('.slide-badge',m({opacity:0,y:20}),m({opacity:1,y:0,duration:0.9}),0.1)
      .add(function(){
        var h1=$('.slide-h1'),ls=h1.querySelectorAll('.ln>*');
        if(reduced){gsap.fromTo(ls,{opacity:0},{opacity:1,duration:1.2,stagger:0.1});return;}
        linesIn(ls,MOB?{}:{dur:1,stagger:0.1});
      },0.15)
      .fromTo('.slide-sub',m({opacity:0,y:20}),m({opacity:1,y:0,duration:1}),fast?0.3:0.42)
      .fromTo('.slide-pill',m({opacity:0,y:14}),m({opacity:1,y:0,duration:0.8,stagger:0.06,ease:'power3.out'}),fast?0.24:0.52)
      .fromTo('.slide-cta-group',m({opacity:0,y:22}),m({opacity:1,y:0,duration:fast?0.8:1}),fast?0.3:0.62);
    // ₩0 네 칸: 빛줄기가 그어지고 칸이 차례로 올라오며 ₩0 이 굴러간다
    if(dock){
      tl.add(function(){root.classList.add('zd-in');},fast?0.45:0.7)
        .fromTo(dock,m({yPercent:100}),m({yPercent:0,duration:1,clearProps:'transform'}),'<');
      tl.fromTo('#zeroDock .zd-track>.ss-item:not(.zd-clone)',m({opacity:0,y:18}),m({opacity:1,y:0,duration:0.9,stagger:0.08,clearProps:'transform,opacity'}),'<0.1')
        .add(measure,'+=0.2');
    }
  }
  if(!reduced){
    // 스크롤하면 단말기는 살짝 물러난다(첫 화면 글자는 제자리)
    if(stage)gsap.to(stage,{yPercent:24,scale:0.88,ease:'none',scrollTrigger:{trigger:hero,start:'top top',end:'bottom top',scrub:true}});
  }
  runIntro(heroIn);

  /* ---------- 섹션 제목 ---------- */
  each('.sec-head',function(head){
    var eb=head.querySelector('.eyebrow'),h2=head.querySelector('.sec-h2'),p=head.querySelector('.sec-p');
    if(!h2)return;
    var tl=gsap.timeline({scrollTrigger:{trigger:h2,start:at(86)}});
    if(eb)tl.fromTo(eb,m({opacity:0,y:MOB?16:12}),m({opacity:1,y:0,duration:MOB?1:0.9,ease:MOB?'power3.out':EASE}),0);
    if(reduced){
      tl.fromTo(lines(h2),{opacity:0},{opacity:1,duration:1.25,stagger:0.11},0.06);
      if(p)tl.fromTo(p,{opacity:0},{opacity:1,duration:1.1},0.32);
      return;
    }
    tl.add(linesIn(lines(h2)),0.06);
    // C. 설명문은 문단 통째로 한 번 나타난다(스크롤을 멈춰도 흐린 채로 남지 않게)
    if(p)tl.fromTo(p,{opacity:0,y:MOB?22:12},{opacity:1,y:0,duration:MOB?1.1:0.8,ease:MOB?'power3.out':'power2.out'},MOB?0.3:0.21);
  });

  // 섹션마다 주인공 타일 하나만 커튼처럼 열리고, 나머지 타일은 짧게 떠오른다
  function signature(el){
    return [m({opacity:0,clipPath:'inset(18% 0% 0% 0% round '+R+'px)'}),m({opacity:1,clipPath:'inset(0% 0% 0% 0% round '+R+'px)',duration:1.4,ease:'expo.inOut',clearProps:'clipPath'})];
  }
  function tiles(els){
    return [m({opacity:0,y:16}),m({opacity:1,y:0,duration:0.9,ease:'power3.out',stagger:0.06,clearProps:'transform'})];
  }

  /* ---------- 요금제: 패키지 타일이 열리고 기기 세 대가 층층이 올라오며 34,000 이 굴러간다 ---------- */
  (function(){
    var grid=$('#priceGrid');
    if(!grid)return;
    var pack=grid.querySelector('.t-pack'),rest=grid.querySelectorAll('[data-tile]:not(.t-pack)');
    var sg=signature(pack),tt=tiles(rest);
    gsap.timeline({scrollTrigger:{trigger:grid,start:at(80)}})
      .fromTo(pack,sg[0],sg[1],0)
      .fromTo(rest,tt[0],tt[1],0.1)
      .fromTo('.pack-pos',m({y:70,opacity:0}),m({y:0,opacity:1,duration:1.4,ease:'expo.out'}),0.2)
      .fromTo('.pack-front',m({y:90,opacity:0}),m({y:0,opacity:1,duration:1.4,ease:'expo.out'}),0.32)
      .fromTo('.pack-term',m({y:60,opacity:0}),m({y:0,opacity:1,duration:1.3,ease:'expo.out'}),0.42)
      .add(function(){roll($('.plan-price'),{dur:1.2});},0.3)
      .fromTo('.strike',{'--s':reduced?1:0},{'--s':1,duration:reduced?0.01:0.7,ease:'power2.inOut'},1.3)
      .fromTo(grid.querySelectorAll('.plan-item'),m({opacity:0,y:10}),m({opacity:1,y:0,duration:0.8,ease:EASE,stagger:0.05}),0.5);
  })();

  /* ---------- 배달 통합: 앱 세 개가 날아와 포스 화면 위에 모이고, 화면이 일어선다 ---------- */
  if(reduced){
    gsap.fromTo('#apps .app, #tiltShot',{opacity:0},{opacity:1,duration:1,stagger:0.1,scrollTrigger:{trigger:'#apps',start:at(88)}});
  }else{
    var spread=isMobile()?60:90,lift=isMobile()?-30:-40;
    gsap.fromTo('#apps .app',
      {x:function(i){return (i-1)*spread;},y:function(i){return i===1?lift:30;},rotation:0,scale:0.9,opacity:0},
      {x:0,y:0,rotation:0,scale:1,opacity:1,ease:'none',scrollTrigger:{trigger:'#apps',start:'top 96%',end:'top 52%',scrub:0.8}});
    gsap.fromTo('#tiltShot',{rotateX:12,scale:0.94,y:40,opacity:0.3},{rotateX:0,scale:1,y:0,opacity:1,ease:'none',
      scrollTrigger:{trigger:'#tiltShot',start:'top 98%',end:'top 38%',scrub:1}});
  }
  gsap.fromTo('.tpos-card',m({opacity:0,y:40}),m({opacity:1,y:0,duration:1,ease:'power3.out',stagger:0.12,clearProps:'transform',
    scrollTrigger:{trigger:'.tpos-grid',start:at(86)}}));

  /* ---------- 토스 프론트 쇼룸 ---------- */
  gsap.fromTo('#tossfront .tf-stage .stage-glow',m({opacity:0,scale:0.5}),m({opacity:1,scale:1,duration:1.6,ease:EASE,scrollTrigger:{trigger:'#tossfront .tf-grid',start:at(85)}}));
  gsap.fromTo('#tossfront .svc-feature-tags .tag',m({opacity:0,y:14}),m({opacity:1,y:0,duration:0.8,ease:EASE,stagger:0.08,scrollTrigger:{trigger:MOB?'#tossfront .svc-feature-tags':'#tossfront .tf-info',start:at(85)}}));
  gsap.fromTo('#tossfront .svc-price',m({opacity:0,y:12}),m({opacity:1,y:0,duration:0.7,ease:'power3.out',scrollTrigger:{trigger:'#tossfront .svc-price',start:at(88)}}));
  (function(){
    var film=document.querySelectorAll('#tossfront .film img');
    if(!film.length)return;
    // 끝 투명도는 CSS 값(네이비 .75, 화이트 1)을 따른다
    var op=parseFloat(getComputedStyle(film[0]).opacity)||1;
    gsap.fromTo(film,m({opacity:0,y:30}),m({opacity:op,y:0,duration:1,ease:EASE,stagger:0.08,clearProps:'opacity,transform',scrollTrigger:{trigger:'#tossfront .film',start:at(92)}}));
  })();

  /* ---------- 키오스크: 바닥에서 솟아오르고 가격이 굴러간다 ---------- */
  gsap.fromTo('#ksShow',m({opacity:0,y:MOB?60:140,scale:0.92}),m({opacity:1,y:0,scale:1,duration:1.6,ease:EASE,scrollTrigger:{trigger:MOB?'#ksShow':'#kiosk',start:at(MOB?88:70)}}));
  each('[data-roll]',function(el){
    if(el.classList.contains('plan-price'))return;
    var rolled=false;
    ScrollTrigger.create({trigger:el,start:at(88),onEnter:function(){if(rolled)return;rolled=true;roll(el,{dur:1.1});}});
  });

  /* ---------- 벤토 타일 ---------- */
  each('.bento',function(b){
    var photo=b.querySelector('.b-photo'),rest=b.querySelectorAll('[data-tile]:not(.b-photo)');
    var tl=gsap.timeline({scrollTrigger:{trigger:b,start:at(80)}});
    if(photo){var sg=signature(photo);tl.fromTo(photo,sg[0],sg[1],0);}
    var tt=tiles(rest);
    tl.fromTo(rest,tt[0],tt[1],0.1)
      .fromTo(b.querySelectorAll('.svc-feature-list li'),m({opacity:0,y:10}),m({opacity:1,y:0,duration:0.8,ease:EASE,stagger:0.05}),0.35);
    var pop=b.querySelector('.pos-pop');
    if(pop&&!isMobile())tl.fromTo(pop,m({opacity:0,x:120,rotation:6}),m({opacity:1,x:0,rotation:0,duration:1.4,ease:EASE,clearProps:'opacity,transform'}),0.6);
    var free=b.querySelector('.b-free .price-num');
    if(free)tl.fromTo(free,m({opacity:0,y:12}),m({opacity:1,y:0,duration:0.7,ease:'power3.out'}),0.6);
  });
  // QR 스티커 10장이 겹쳐 있다가 부채꼴로 펼쳐진다
  (function(){
    var st=document.querySelectorAll('#stickers .sticker');
    if(!st.length)return;
    // 타일 폭 안에 10장이 다 들어오게 간격을 잡는다(새로고침·회전 때 다시 계산)
    function sx(){var box=$('#stickers').offsetWidth,card=st[0].offsetWidth;return Math.min(isMobile()?30:104,(box-card-48)/9);}
    var fx=function(i){return (i-4.5)*sx();},fy=function(i){return Math.abs(i-4.5)*(isMobile()?4:6);},fr=function(i){return (i-4.5)*(isMobile()?6:5);};
    if(reduced){gsap.set(st,{x:fx,y:fy,rotation:fr});return;}
    gsap.fromTo(st,
      {x:0,y:40,rotation:function(i){return (i-4.5)*1.2;},opacity:0},
      {x:fx,y:fy,rotation:fr,opacity:1,ease:'none',
        stagger:0.02,scrollTrigger:{trigger:'#stickers',start:'top 95%',end:'center 55%',scrub:0.8,invalidateOnRefresh:true}});
  })();

  /* ---------- 도입 과정 ---------- */
  (function(){
    var line=$('#timeline');
    if(!line)return;
    if(!reduced)gsap.fromTo('#tlProgress',{scaleY:0},{scaleY:1,ease:'none',
      scrollTrigger:{trigger:line,start:'top 65%',end:'bottom 72%',scrub:0.6}});
    each('.tl-item',function(item){
      var dot=item.querySelector('.tl-dot');
      ScrollTrigger.create({trigger:item,start:at(65),
        onEnter:function(){dot.classList.add('lit');},
        onLeaveBack:function(){dot.classList.remove('lit');}});
      gsap.fromTo(item.querySelector('.tl-content'),m({opacity:0,y:20}),m({opacity:1,y:0,duration:0.9,ease:'power3.out',
        scrollTrigger:{trigger:item,start:at(82)}}));
    },line);
  })();

  /* ---------- 자주 묻는 질문: 제목·사진·질문이 차례로, 사진은 액자 안에서 천천히 흐른다 ---------- */
  gsap.fromTo('#faq [data-rv]',m({opacity:0,y:16}),m({opacity:1,y:0,duration:0.7,ease:'power3.out',stagger:0.07,
    scrollTrigger:{trigger:'#faq',start:at(85)}}));
  if(!reduced&&$('.faq-shot img')){
    gsap.fromTo('.faq-shot img',{yPercent:-4,scale:1.08},{yPercent:4,scale:1.08,ease:'none',
      scrollTrigger:{trigger:'.faq-shot',start:'top bottom',end:'bottom top',scrub:true}});
  }

  /* ---------- 수발주·개발 문의 사진: 같은 4:3 액자 안에서 천천히 흐른다 ---------- */
  if(!reduced){
    ['#edShot','#devShot'].forEach(function(sel){
      if(!$(sel))return;
      gsap.fromTo(sel+' img',{yPercent:-4},{yPercent:4,ease:'none',
        scrollTrigger:{trigger:sel,start:'top bottom',end:'bottom top',scrub:true}});
    });
  }

  /* ---------- 하단 CTA: 제목이 올라오고, 단말기가 아래에서 떠오르며 뒷면에서 정면으로 돌아선다 ---------- */
  gsap.timeline({scrollTrigger:{trigger:ctaStrip,start:at(75)}})
    .add(function(){
      var ls=lines(ctaStrip);
      if(reduced){gsap.fromTo(ls,{opacity:0},{opacity:1,duration:1.3});return;}
      linesIn(ls);
    })
    .fromTo(ctaStrip.querySelectorAll('[data-rv]'),m({opacity:0,y:30}),m({opacity:1,y:0,duration:1,ease:EASE,stagger:0.12}),0.3);
  if(!reduced&&$('.cta-device')){
    gsap.fromTo('.cta-device .spin-float',{yPercent:45},{yPercent:0,ease:'none',
      scrollTrigger:{trigger:'.cta-device',start:'top bottom',end:'bottom bottom',scrub:true}});
  }

  /* ---------- 그 밖의 등장 요소 ---------- */
  each('[data-rv=""]',function(el){
    gsap.fromTo(el,m({opacity:0,y:32}),m({opacity:1,y:0,duration:1.2,ease:EASE,
      scrollTrigger:{trigger:el,start:at(88)}}));
  });

  if(!reduced){
    /* ---------- 사진 액자 안 시차는 PC 에서만 작게(±4%) ---------- */
    if(!isMobile())each('.fade-show',function(el){
      gsap.fromTo(el,{yPercent:-4,scale:1.08},{yPercent:4,scale:1.08,ease:'none',scrollTrigger:{trigger:el.parentNode,start:'top bottom',end:'bottom top',scrub:true}});
    });

    /* ---------- 사진이 커튼처럼 열리며 드러난다 ---------- */
    each('.tpos-img',function(el){
      var im=el.querySelector('img');
      gsap.timeline({scrollTrigger:{trigger:el,start:at(90)}})
        .fromTo(el,{clipPath:'inset(100% 0% 0% 0%)'},{clipPath:'inset(0% 0% 0% 0%)',duration:1.2,ease:'expo.inOut',clearProps:'clipPath'})
        .fromTo(im,{scale:1.08},{scale:1,duration:1.4,ease:'expo.out',clearProps:'transform'},0);
    });
    each('.ed-shot, .dev-shot, .process-shot, .faq-shot',function(el){
      gsap.fromTo(el,{clipPath:'inset(0% 0% 100% 0% round '+R+'px)'},{clipPath:'inset(0% 0% 0% 0% round '+R+'px)',duration:1.4,ease:'expo.inOut',clearProps:'clipPath',
        scrollTrigger:{trigger:el,start:at(88)}});
    });

  }

  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){ScrollTrigger.refresh();});
})();
