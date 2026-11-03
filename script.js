/* ===== 1. Cây mẫu + biến toàn cục (được build lại mỗi khi áp dụng cây mới) ===== */
const SAMPLE="(1,2), (1,3)\n(2,4), (2,5)\n(5,8), (5,9)\n(3,6), (3,7)\n(6,10)";
let N,K,ROOT,EDGES,adj,par,dep,first,euler,eDep,up,sp,M,POS;
const lg=x=>Math.floor(Math.log2(x));
const better=(i,j)=>eDep[i]<=eDep[j]?i:j;

/* ===== 2. Đọc cây, kiểm tra hợp lệ, tiền xử lý ===== */
// Trả về chuỗi lỗi, hoặc '' nếu thành công
function build(text,root){
  const E=[...text.matchAll(/(\d+)\D+(\d+)/g)].map(m=>[+m[1],+m[2]]);
  if(!E.length) return 'Chưa có cạnh nào. Ví dụ: 1-2, 1-3, 2-4';
  const n=Math.max(...E.flat());
  if(n>30) return 'Tối đa 30 node để hình còn dễ nhìn.';
  if(E.some(([a,b])=>a===b||a<1||b<1)) return 'Có cạnh nối node với chính nó hoặc node < 1.';
  if(E.length!==n-1) return `Cây ${n} node cần đúng ${n-1} cạnh (bạn nhập ${E.length}). Node phải đánh số liên tục 1..${n}.`;
  if(!(root>=1&&root<=n)) return `Gốc phải nằm trong 1..${n}.`;
  const ad=Array.from({length:n+1},()=>[]);
  E.forEach(([a,b])=>{ad[a].push(b);ad[b].push(a);});
  ad.forEach(l=>l.sort((x,y)=>x-y));
  const seen=new Set([root]),q=[root];
  while(q.length){const x=q.pop();ad[x].forEach(y=>{if(!seen.has(y)){seen.add(y);q.push(y);}});}
  if(seen.size!==n) return `Đồ thị không liên thông/có chu trình: từ gốc ${root} chỉ tới được ${seen.size}/${n} node.`;

  N=n;ROOT=root;adj=ad;K=Math.max(1,Math.ceil(Math.log2(n)));
  par=Array(N+1).fill(0);dep=Array(N+1).fill(0);first=Array(N+1).fill(-1);euler=[];eDep=[];
  (function dfs(v,p){
    par[v]=p;dep[v]=p?dep[p]+1:0;first[v]=euler.length;euler.push(v);eDep.push(dep[v]);
    for(const c of adj[v]) if(c!==p){dfs(c,v);euler.push(v);eDep.push(dep[v]);}
  })(ROOT,0);
  EDGES=[];for(let v=1;v<=N;v++) if(par[v]) EDGES.push([par[v],v]);
  // up[k][v] = tổ tiên cách v 2^k bước (gốc trỏ về chính nó)
  up=[Array.from({length:N+1},(_,v)=>v?(par[v]||ROOT):0)];
  for(let k=1;k<K;k++) up.push(up[k-1].map((x,v)=>v?up[k-1][x]:0));
  // sp[k][i] = chỉ số có độ sâu nhỏ nhất trong euler[i .. i+2^k-1]
  M=euler.length;
  sp=[Array.from({length:M},(_,i)=>i)];
  for(let k=1;(1<<k)<=M;k++){sp.push([]);for(let i=0;i+(1<<k)<=M;i++) sp[k].push(better(sp[k-1][i],sp[k-1][i+(1<<(k-1))]));}
  return '';
}

/* Tự bố trí cây: lá chia đều theo chiều ngang, cha nằm giữa các con */
function layout(){
  POS={};let leaf=0;
  (function go(v,p){
    const ch=adj[v].filter(c=>c!==p);
    if(!ch.length){POS[v]=[leaf++,dep[v]];return;}
    ch.forEach(c=>go(c,v));
    POS[v]=[ch.reduce((s,c)=>s+POS[c][0],0)/ch.length,dep[v]];
  })(ROOT,0);
  const W=Math.max(780,leaf*80),H=(Math.max(...dep.slice(1))+1)*100+40;
  for(let v=1;v<=N;v++) POS[v]=[leaf>1?50+POS[v][0]*(W-100)/(leaf-1):W/2,50+POS[v][1]*100];
  return [W,H];
}

/* ===== 3. Sinh các bước cho từng thuật toán ===== */
// Mỗi bước: {t: mô tả, a,b: vị trí hiện tại, jumps: các cặp [từ,đến] để tô đường đi, cells: ô up cần sáng, ops, lca}
function algo1(u,v){
  const s=[]; let a=u,b=v,ops=0;
  const P=(t,x={})=>s.push({t,a,b,ops,...x});
  P(`Bắt đầu: u=${a} (độ sâu ${dep[a]}), v=${b} (độ sâu ${dep[b]}).`);
  while(dep[a]>dep[b]){const o=a;a=par[a];ops++;P(`Đưa u lên cùng độ sâu: ${o} → ${a} (độ sâu ${dep[a]}).`,{jumps:[[o,a]]});}
  while(dep[b]>dep[a]){const o=b;b=par[b];ops++;P(`Đưa v lên cùng độ sâu: ${o} → ${b} (độ sâu ${dep[b]}).`,{jumps:[[o,b]]});}
  P(`Hai node đã cùng độ sâu ${dep[a]}.`);
  while(a!==b){
    const x=a,y=b;a=par[a];b=par[b];ops+=2;
    P(`Cùng đi lên: u ${x}→${a}, v ${y}→${b}. ${a===b?'Gặp nhau!':'Chưa gặp nhau.'}`,{jumps:[[x,a],[y,b]]});
  }
  P(`LCA(${u},${v}) = ${a} sau ${ops} bước nhảy.`,{lca:a});
  return s;
}
function algo2(u,v){
  const s=[]; let a=u,b=v,ops=0;
  const P=(t,x={})=>s.push({t,a,b,ops,...x});
  P(`Bắt đầu: u=${u} (độ sâu ${dep[u]}), v=${v} (độ sâu ${dep[v]}).`);
  if(dep[a]<dep[b]){[a,b]=[b,a];P(`Hoán đổi để node sâu hơn (${a}) đứng trước.`);}
  const d=dep[a]-dep[b];
  P(`Chênh lệch độ sâu = ${d} = ${d.toString(2)} (nhị phân). Nhảy theo các bit 1.`);
  for(let k=K-1;k>=0;k--) if((d>>k)&1){
    const o=a;a=up[k][a];ops++;
    P(`Bit ${k} = 1 → nhảy 2^${k} = ${1<<k} bước: ${o} → ${a} (up[${k}][${o}]).`,{cells:[[k,o]],jumps:[[o,a]]});
  }
  if(a===b){P(`Sau khi nâng, a = b = ${a}. Đó là LCA.`,{lca:a});return s;}
  P(`Hai node cùng độ sâu nhưng khác nhau. Nhảy cùng lúc từ k lớn xuống nhỏ nếu up[k][a] ≠ up[k][b].`);
  for(let k=K-1;k>=0;k--){
    const x=a,y=b,ua=up[k][a],ub=up[k][b];ops++;
    if(ua!==ub){a=ua;b=ub;P(`k=${k}: up[${k}][${x}]=${ua} ≠ up[${k}][${y}]=${ub} → nhảy ${1<<k} bước cả hai.`,{cells:[[k,x],[k,y]],jumps:[[x,a],[y,b]]});}
    else P(`k=${k}: up[${k}][${x}]=up[${k}][${y}]=${ua} → trùng, KHÔNG nhảy (có thể đã vượt LCA).`,{cells:[[k,x],[k,y]]});
  }
  const l=up[0][a];ops++;
  P(`Cha chung: LCA = up[0][${a}] = ${l}. Tổng ${ops} phép toán.`,{cells:[[0,a]],lca:l});
  return s;
}
function algo3(u,v){
  const s=[];const P=(t,x={})=>s.push({t,ops:0,...x});
  let l=first[u],r=first[v];
  P(`Tiền xử lý xong: Euler Tour dài ${M}, first[${u}]=${l}, first[${v}]=${r}.`);
  if(l>r){[l,r]=[r,l];P(`Hoán đổi để l ≤ r.`);}
  P(`Đoạn cần truy vấn: [${l}, ${r}] (độ dài ${r-l+1}).`,{range:[l,r]});
  const k=lg(r-l+1),i=sp[k][l],j=sp[k][r-(1<<k)+1],blocks=[[k,l],[k,r-(1<<k)+1]];
  P(`k = ⌊log2(${r-l+1})⌋ = ${k}. Dùng 2 đoạn chồng nhau độ dài ${1<<k}: bắt đầu ở ${l} và ${r-(1<<k)+1}.`,{range:[l,r],blocks});
  const res=better(i,j);
  P(`So sánh độ sâu: euler[${i}]=${euler[i]} (độ sâu ${eDep[i]}) và euler[${j}]=${euler[j]} (độ sâu ${eDep[j]}). Min tại vị trí ${res}.`,{range:[l,r],blocks,res});
  P(`LCA(${u},${v}) = ${euler[res]}. Truy vấn chỉ tốn 1 phép so sánh: O(1).`,{range:[l,r],res,lca:euler[res],ops:1});
  return s;
}
const ALGOS={1:algo1,2:algo2,3:algo3};

/* ===== 4. Trạng thái & giao diện ===== */
const $=id=>document.getElementById(id);
let algo=1,U=1,V=1,steps=[],idx=-1,timer=null,tblOpen=false,toggle=0;
const svg=$('tree');

function drawTree(){
  const [W,H]=layout();
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  let h='';
  EDGES.forEach(([a,b])=>h+=`<line id="e${b}" class="edge" x1="${POS[a][0]}" y1="${POS[a][1]}" x2="${POS[b][0]}" y2="${POS[b][1]}"/>`);
  for(let v=1;v<=N;v++){const [x,y]=POS[v];
    h+=`<g onclick="pick(${v})"><circle id="n${v}" class="node" cx="${x}" cy="${y}" r="22"/><text class="nlab" x="${x}" y="${y}">${v}</text><text class="dlab" x="${x+30}" y="${y-18}">d=${dep[v]}</text></g>`;}
  svg.innerHTML=h;
  for(const id of ['selU','selV']){const s=$(id);s.innerHTML='';for(let v=1;v<=N;v++)s.add(new Option(v,v));}
}
// Áp dụng cây từ ô nhập (không tự chạy, bạn bấm Next/Animate để chạy)
function apply(text,root){
  const err=build(text,root);
  $('err').textContent=err;
  if(err) return;
  drawTree();
  U=N>=4?4:1;V=N>=9?9:N;toggle=0;
  reset();
}
$('btnApply').onclick=()=>apply($('edgeInp').value,+$('rootInp').value);
$('btnSample').onclick=()=>{$('edgeInp').value=SAMPLE;$('rootInp').value=1;apply(SAMPLE,1);};
$('selU').onchange=()=>{U=+$('selU').value;reset();};
$('selV').onchange=()=>{V=+$('selV').value;reset();};
function pick(v){if(toggle===0)U=v;else V=v;toggle^=1;reset();} // click cây: lần lượt đặt u rồi v
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{algo=+b.dataset.a;tblOpen=false;reset();});
$('btnTbl').onclick=()=>{tblOpen=!tblOpen;render();};

function reset(){
  clearInterval(timer);timer=null;steps=[];idx=-1;
  $('selU').value=U;$('selV').value=V;
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',+b.dataset.a===algo));
  $('btnTbl').classList.toggle('hidden',algo!==3);
  $('log').innerHTML='';$('caption').textContent=`Thuật toán ${algo}: tìm LCA(${U}, ${V}), gốc = ${ROOT}. Bấm “Bước tiếp theo” hoặc “Chạy tự động”.`;
  render();
}
function next(){
  if(!steps.length) steps=ALGOS[algo](U,V);
  if(idx<steps.length-1){
    idx++;const d=document.createElement('div');d.textContent=`#${idx+1}: ${steps[idx].t}`;
    $('log').appendChild(d);$('log').scrollTop=1e9;$('caption').textContent=steps[idx].t;render();return true;
  }
  clearInterval(timer);timer=null;return false;
}
$('btnNext').onclick=()=>{clearInterval(timer);timer=null;next();};
$('btnReset').onclick=reset;
$('btnAuto').onclick=()=>{
  if(timer){clearInterval(timer);timer=null;return;}
  if(steps.length&&idx>=steps.length-1) reset();
  next();timer=setInterval(next,1100);
};

// Tô màu cây theo bước đã chạy
function render(){
  const st=steps[idx]||{},done=steps.slice(0,idx+1);
  const nodes=new Set(),edges=new Set();
  done.forEach(x=>(x.jumps||[]).forEach(([o,a])=>{
    nodes.add(o);nodes.add(a);
    for(let y=o;y&&y!==a;y=par[y]) edges.add(y); // tô cả các cạnh nằm giữa khi nhảy 2^k
  }));
  for(let v=1;v<=N;v++){
    let c='#fff';
    if(nodes.has(v))c='#34d399';
    if(v===U)c='#3b82f6'; if(v===V)c='#f97316';
    if(st.a===v||st.b===v)c='#fde047';
    if(st.lca===v)c='#f43f5e';
    const n=$('n'+v);n.style.fill=c;n.style.strokeWidth=(st.a===v||st.b===v||st.lca===v)?4:2;
    const e=$('e'+v);if(e)e.classList.toggle('hot',edges.has(v));
  }
  $('ops').textContent=st.ops??0;$('res').textContent=st.lca??'?';
  $('tables').innerHTML=tables(st);
}

/* ===== 5. Các bảng phụ trợ ===== */
const td=(x,c='')=>`<td class="${c}">${x}</td>`;
function tables(st){
  const cells=st.cells||[],R=[...Array(N)].map((_,i)=>i+1);
  if(algo===1){
    let h='<p class="font-semibold mb-1">Bảng cha &amp; độ sâu</p><table><tr><th>node</th>'+R.map(v=>`<th>${v}</th>`).join('')+'</tr>';
    h+='<tr><th>cha</th>'+R.map(v=>td(par[v]||'-',[st.a,st.b].includes(v)?'h1':'')).join('')+'</tr>';
    return h+'<tr><th>depth</th>'+R.map(v=>td(dep[v])).join('')+'</tr></table>';
  }
  if(algo===2){
    let h='<p class="font-semibold mb-1">Bảng nhảy up[u][k] (tổ tiên cách 2^k bước; gốc trỏ về chính nó)</p><table><tr><th>u</th><th>depth</th>';
    for(let k=0;k<K;k++)h+=`<th>k=${k} (2^${k}=${1<<k})</th>`;
    h+='</tr>';
    R.forEach(v=>{
      h+=`<tr>${td(v,[U,V].includes(v)?'h2':'')}${td(dep[v])}`;
      for(let k=0;k<K;k++)h+=td(up[k][v],cells.some(c=>c[0]===k&&c[1]===v)?'h1':'');
      h+='</tr>';
    });
    return h+'</table>';
  }
  if(!tblOpen) return '<p class="text-slate-500">Bấm nút phía trên để xem Euler Tour &amp; Sparse Table.</p>';
  const [l,r]=st.range||[-1,-2],blocks=st.blocks||[];
  const cls=i=>i===st.res?'h3':(i>=l&&i<=r?'h2':'');
  let h='<p class="font-semibold mb-1">Euler Tour (DFS sequence) &amp; độ sâu</p><table><tr><th>i</th>'+euler.map((_,i)=>`<th>${i}</th>`).join('')+'</tr>';
  h+='<tr><th>euler</th>'+euler.map((x,i)=>td(x,cls(i))).join('')+'</tr>';
  h+='<tr><th>depth</th>'+eDep.map((x,i)=>td(x,cls(i))).join('')+'</tr></table>';
  h+=`<p class="my-1">first[u]=${first[U]}, first[v]=${first[V]}</p>`;
  h+='<p class="font-semibold mt-2 mb-1">Sparse Table (node có độ sâu nhỏ nhất của đoạn [i, i+2^k−1])</p><table><tr><th>k\\i</th>'+euler.map((_,i)=>`<th>${i}</th>`).join('')+'</tr>';
  sp.forEach((row,k)=>{
    h+=`<tr><th>${k}</th>`;
    for(let i=0;i<M;i++) h+=i<row.length?td(euler[row[i]],blocks.some(b=>b[0]===k&&b[1]===i)?'h1':''):td('','bg-slate-100');
    h+='</tr>';
  });
  return h+'</table>';
}

$('btnSample').click(); // khởi động bằng cây mẫu
