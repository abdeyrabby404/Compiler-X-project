/* CompilerX C Compiler - Judge0 integration (drop-in)
 * Configure your API key/base in API_CONFIG below.
 */
(function(){
  // =========================
  // ACE Editor setup
  // =========================
  const editor = ace.edit("editor", {
    mode: "ace/mode/c_cpp",
    theme: "ace/theme/one_dark",
    fontSize: 14,
    tabSize: 2,
    useSoftTabs: true,
    showPrintMargin: false,
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true,
    enableSnippets: true,
  });

  const DEFAULT_CODE = `#include <stdio.h>
// Hello from CompilerX!
// This is a simple C programming code!
int main(){
    printf("Hello CompilerX");
    return 0;
}`;

  const LS_KEY = "compilerX.c";
  editor.session.setValue(localStorage.getItem(LS_KEY) || DEFAULT_CODE);

  // =========================
  // UI Elements
  // =========================
  const runBtn = document.getElementById('runBtn');
  const saveBtn = document.getElementById('saveBtn');
  const loadBtn = document.getElementById('loadBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const statusChip = document.getElementById('statusChip');
  const stdinEl = document.getElementById('stdin');
  const stdoutPre = document.getElementById('stdoutPre');
  const clearOut = document.getElementById('clearOut');
  const optStd = document.getElementById('optStd');
  const optO = document.getElementById('optO');

  function setStatus(text, cls){
    statusChip.textContent = text;
    statusChip.className = 'status-chip ' + (cls||'');
  }

  function b64(str){ return btoa(unescape(encodeURIComponent(str))); }
  function unb64(str){ return decodeURIComponent(escape(atob(str||''))); }

  // =========================
  // Judge0 API Configuration
  // =========================
  const API_CONFIG = {
    // Option A: RapidAPI (recommended). Replace YOUR_KEY.
    useRapid: true,
    rapid: {
      url: 'https://judge0-ce.p.rapidapi.com',
      key: 'b9a9b23153msh6677e4acda3a62ep12a125jsn008cc2d66302',   // <<< PUT YOUR KEY HERE
      host: 'judge0-ce.p.rapidapi.com'
    },
    // Option B: Community/self-hosted (rate-limited). Set useRapid:false and set base.
    community: {
      base: 'https://ce.judge0.com' // or your self-hosted Judge0 base URL
    },
    language_id: 50 // C (GCC) for Judge0 CE
  };

  async function judge0Request(path, body){
    const useRapid = API_CONFIG.useRapid;
    const url = useRapid ? `${API_CONFIG.rapid.url}${path}` : `${API_CONFIG.community.base}${path}`;
    const headers = { 'Content-Type': 'application/json' };
    if(useRapid){
      headers['x-rapidapi-key'] = API_CONFIG.rapid.key;
      headers['x-rapidapi-host'] = API_CONFIG.rapid.host;
    }
    const res = await fetch(url, { method:'POST', headers, body: JSON.stringify(body) });
    if(!res.ok){ throw new Error('Network error: '+res.status); }
    return res.json();
  }

  async function runCode(){
    setStatus('Compiling…', '');
    stdoutPre.textContent = '';
    const source = editor.getValue();
    const stdin = stdinEl.value;
    const stdMap = { c99: 'c99', c11: 'c11', c17: 'gnu17' };
    const std = stdMap[optStd.value] || 'gnu17';
    const O = parseInt(optO.value,10);

    try {
      const payload = {
        language_id: API_CONFIG.language_id,
        source_code: b64(source),
        stdin: b64(stdin),
        compiler_options: `-std=${std} -O${O}`
      };
      const data = await judge0Request('/submissions?base64_encoded=true&wait=true', payload);
      const { stdout, stderr, compile_output, status } = data;
      const statusDesc = status?.description || 'Finished';

      if(compile_output){
        setStatus('Compile Error', 'err');
        stdoutPre.textContent = unb64(compile_output);
        return;
      }

      if(stderr){
        setStatus(statusDesc.includes('Accepted') ? 'Ran with stderr' : statusDesc, statusDesc.includes('Accepted') ? 'ok' : 'err');
        stdoutPre.textContent = unb64(stderr);
        if(stdout){ stdoutPre.textContent += "\n" + unb64(stdout); }
        return;
      }

      setStatus(statusDesc, statusDesc.includes('Accepted') ? 'ok' : '');
      stdoutPre.textContent = unb64(stdout) || '(no output)';
    } catch(err){
      setStatus('Error', 'err');
      stdoutPre.textContent = String(err);
    }
  }

  runBtn.addEventListener('click', runCode);
  editor.commands.addCommand({ name:'run', bindKey:{win:'Ctrl-Enter', mac:'Command-Enter'}, exec:runCode });

  // Save/Load/Download
  saveBtn.addEventListener('click', ()=>{
    localStorage.setItem(LS_KEY, editor.getValue());
    setStatus('Saved ✓','ok'); setTimeout(()=>setStatus('Idle',''), 1200);
  });
  loadBtn.addEventListener('click', ()=>{
    const val = localStorage.getItem(LS_KEY);
    if(val){ editor.session.setValue(val); setStatus('Loaded ✓','ok'); }
    else { setStatus('Nothing saved',''); }
    setTimeout(()=>setStatus('Idle',''), 1200);
  });
  clearOut.addEventListener('click', ()=>{ stdoutPre.textContent = ''; setStatus('Idle',''); });
  downloadBtn.addEventListener('click', ()=>{
    const blob = new Blob([ace.edit("editor").getValue()], {type:'text/x-c'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'main.c'; a.click();
    URL.revokeObjectURL(a.href);
  });
})();