/* 설문 집계: GTM(dataLayer)으로 이벤트를 보낸다. 전화번호는 절대 보내지 않는다.
   현재 GTM 의 GA4 태그는 lead_* 외 매개변수를 넘기지 않아서, 고른 혜택·업종을 이벤트 이름에 담는다.
   보이는 이벤트: survey_view → survey_step2 → survey_step3 → survey_submit
                  survey_pick_water|baemin|kiosk|tableorder|unsure, survey_biz_restaurant|cafe|bar|retail|etc */
(function(){
  window.dataLayer=window.dataLayer||[];
  var variant=(location.pathname.split('/')[2]||'x'), sent={};
  var MAP={'위약금 없는 정수기':'water','배민 접수하면':'baemin','배민 접수 혜택':'baemin','키오스크':'kiosk','테이블 오더':'tableorder','아직 잘 모르겠어요':'unsure',
           '음식점':'restaurant','카페·베이커리':'cafe','주점·호프':'bar','소매·편의점':'retail','기타':'etc'};
  function sv(name){ if(sent[name])return; sent[name]=1; window.dataLayer.push({event:'survey_'+name,survey_variant:variant}); }
  window.sv=sv;
  window.svSubmit=function(want,biz){
    sv('submit');
    (want||[]).forEach(function(w){ if(MAP[w])sv('pick_'+MAP[w]); });
    if(MAP[biz])sv('biz_'+MAP[biz]);
  };
  sv('view');
})();
