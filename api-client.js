export async function requestTranslation(baseUrl, input, fetchImpl=fetch) {
  const response=await fetchImpl(`${baseUrl.replace(/\/$/,'')}/api/translate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(25000)});
  let data;try{data=await response.json();}catch{throw Error('서버 응답을 읽을 수 없습니다. 잠시 후 다시 시도해 주세요.');}
  if(!response.ok)throw Error(data.error||'번역 요청에 실패했습니다.');
  if(typeof data.en!=='string'||typeof data.ko!=='string'||typeof data.polite!=='string'||typeof data.explain!=='string'||!Array.isArray(data.alts)||!data.alts.every(a=>Array.isArray(a)&&a.length===2&&a.every(t=>typeof t==='string')))throw Error('올바르지 않은 번역 결과입니다.');
  return data;
}
