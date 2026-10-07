// 방문자가 어디서 들어왔는지 기록한다.
// 신청 페이지의 document.referrer 는 직전 페이지(대개 posmos.net 자신)라서 원래 출처를 알 수 없다.
// 그래서 외부에서 들어온 순간의 referrer·from·utm 을 저장해 두고, 사이트 안 이동으로는 덮어쓰지 않는다.
(function(w){
  var KEY='posmos_landing';
  var TTL=30*24*60*60*1000;
  var UTM_KEYS=['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
  var FROM_LABELS={'ig-dm-price':'인스타DM-요금','ig-dm-product':'인스타DM-제품','ig-dm-consult':'인스타DM-상담','ig-profile':'인스타프로필','ig-ad':'인스타광고','ig-story':'인스타스토리','ig-old':'인스타옛계정','daangn':'당근마켓'};

  function hostOf(url){
    try{return new URL(url).hostname.replace(/^www\./,'');}catch(e){return '';}
  }

  function fromLabel(code){
    if(!code)return '';
    return Object.prototype.hasOwnProperty.call(FROM_LABELS,code)?FROM_LABELS[code]:code;
  }

  // 사이트 밖 채널(인스타·당근마켓)의 유입 코드면 그 채널 이름을, 아니면 빈 문자열을 돌려준다.
  // 이 코드들은 인앱 브라우저처럼 referrer 가 없어도 유입 코드로 인정한다.
  function channelOf(code){
    if(!code)return '';
    if(/^ig-/.test(code))return '인스타그램';
    if(code==='daangn')return '당근마켓';
    return '';
  }

  function classify(landing){
    if(!landing)return '알 수 없음';
    var host=hostOf(landing.referrer);
    if(host){
      if(/google\./.test(host))return '구글 검색';
      if(/naver\./.test(host))return '네이버';
      if(/daum\.|kakao\./.test(host))return '다음/카카오';
      // 인스타·페북 앱이 링크를 열 때 lm.facebook.com 을 거친다. 페이스북보다 먼저 걸러낸다.
      if(/instagram\.|lm\.facebook\.|l\.facebook\./.test(host))return '인스타그램';
      if(/facebook\./.test(host))return '페이스북';
      // 당근 안드로이드 앱은 referrer 가 android-app://com.towneers.www/ 로 올 수 있다.
      if(/daangn\.|karrotmarket\.|towneers\./.test(host))return '당근마켓';
      // 모르는 중간 주소를 거쳐 왔어도 채널 유입 코드가 있으면 그 채널로 본다.
      return channelOf(landing.from)||host;
    }
    // 인앱 브라우저는 referrer 를 보내지 않는 경우가 많아 유입 코드·utm 으로 보완한다.
    if(channelOf(landing.from))return channelOf(landing.from);
    if(landing.utm&&landing.utm.utm_source)return 'utm: '+landing.utm.utm_source;
    return '직접접속 (주소창/북마크)';
  }

  function read(){
    try{
      var v=JSON.parse(localStorage.getItem(KEY));
      if(v&&Date.now()-v.at<TTL)return v;
    }catch(e){}
    return null;
  }

  function write(v){
    try{localStorage.setItem(KEY,JSON.stringify(v));}catch(e){}
  }

  var params=new URLSearchParams(w.location.search);
  var ref=document.referrer;
  var internal=!!ref&&hostOf(ref)===w.location.hostname.replace(/^www\./,'');

  var utm={};
  UTM_KEYS.forEach(function(k){var v=params.get(k);if(v)utm[k]=v;});

  // from 은 대부분 사이트 안 버튼 위치(상단메뉴 등)다. 외부 referrer 와 함께 오거나 채널 코드(ig-*, daangn)일 때만
  // 유입 코드로 본다. 새 탭·주소 복사처럼 referrer 없이 열린 버튼 링크가 원래 출처를 덮어쓰지 않게 하기 위함.
  var from=params.get('from')||'';
  var externalRef=!!ref&&!internal;
  var campaignFrom=(from&&(externalRef||channelOf(from)))?from:'';

  var hasSignal=externalRef||!!campaignFrom||Object.keys(utm).length>0;
  var landing=read();

  // 외부 출처가 있으면 최신 출처로 갱신하고, 기록이 없을 때의 첫 직접접속도 남긴다.
  if(hasSignal||(!landing&&!internal)){
    landing={
      at:Date.now(),
      referrer:internal?'':ref,
      from:campaignFrom,
      utm:utm,
      page:w.location.pathname+w.location.search
    };
    write(landing);
  }

  w.posmosSource={
    landing:landing,
    classify:classify,
    fromLabel:fromLabel
  };
})(window);
