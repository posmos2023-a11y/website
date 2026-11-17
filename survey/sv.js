/* 설문 집계: GTM(dataLayer)으로 이벤트를 보낸다. 전화번호는 GA·GTM 으로 절대 보내지 않는다.
   제출한 전화번호·고른 혜택·업종은 상담 신청과 같은 텔레그램 알림 서버(leadgen /site-lead)로만 보낸다.
   그 서버가 실패하면 Formspree(메일)로 대신 보낸다.
   현재 GTM 의 GA4 태그는 lead_* 외 매개변수를 넘기지 않아서, 고른 혜택·업종을 이벤트 이름에 담는다.
   보이는 이벤트: survey_view → survey_step2 → survey_step3 → survey_submit
                  survey_pick_water|baemin|kiosk|tableorder|unsure, survey_biz_restaurant|cafe|bar|retail|etc */
(function(){
  window.dataLayer=window.dataLayer||[];
  var variant=(location.pathname.split('/')[2]||'b'), sent={};
  var MAP={'위약금 없는 정수기':'water','배민 접수하면':'baemin','배민 접수 혜택':'baemin','키오스크':'kiosk','테이블 오더':'tableorder','아직 잘 모르겠어요':'unsure',
           '음식점':'restaurant','카페·베이커리':'cafe','주점·호프':'bar','소매·편의점':'retail','기타':'etc'};
  function sv(name){ if(sent[name])return; sent[name]=1; window.dataLayer.push({event:'survey_'+name,survey_variant:variant}); }
  window.sv=sv;
  var SHORT={water:'정수기',baemin:'배민',kiosk:'키오스크',tableorder:'테이블오더',unsure:'혜택 미정'};
  function lead(phone,want,biz){
    try{
      var src=window.posmosSource,landing=src&&src.landing;
      var picks=(want||[]).map(function(w){return SHORT[MAP[w]]||w;}).join('·');
      var body=JSON.stringify({
        전화번호:phone,
        지역:'',
        '신청 버튼':('설문'+variant.toUpperCase()+(biz?' · '+biz:'')+' · '+(picks||'혜택 미선택')).slice(0,60),
        '유입 경로':src?src.classify(landing):'알 수 없음',
        '유입 코드':landing&&landing.from?src.fromLabel(landing.from):'없음',
        '첫 방문 페이지':landing?landing.page:location.pathname,
        '접속 기기':/Mobi|Android/i.test(navigator.userAgent)?'모바일':'PC',
        '신청 시각':new Date().toLocaleString('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'medium',timeStyle:'short'})
      });
      var backup=function(){return fetch('https://formspree.io/f/xgobbwjd',{method:'POST',keepalive:true,
        headers:{'Content-Type':'application/json','Accept':'application/json'},body:body}).catch(function(){});};
      fetch('https://posmos-leadgen.vercel.app/site-lead',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},body:body})
        .then(function(r){if(!r.ok&&r.status!==429)return backup();})
        .catch(backup);
    }catch(e){}
  }
  window.svSubmit=function(want,biz,phone){
    if(phone)lead(phone,want,biz);
    sv('submit');
    (want||[]).forEach(function(w){ if(MAP[w])sv('pick_'+MAP[w]); });
    if(MAP[biz])sv('biz_'+MAP[biz]);
  };
  sv('view');
})();
