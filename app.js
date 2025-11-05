// app.js — Budget Terminal (2 pages + help overlay)

(() => {
  // ---------- utils ----------
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const moneyFmt = new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const KEY = 'bt.bills.v2'; // new key (safe reset); change to v1 if you want to reuse old data

  const parseMoneyStr = (str) => {
    const raw = String(str||'').replace(/[^0-9.-]/g,'');
    const val = parseFloat(raw);
    return Number.isFinite(val) ? val : 0;
  };
  const parseMoneyInput = (el) => parseMoneyStr(el?.value);

  // Select-on-focus helper
  function selectOnFocus(el) {
    el?.addEventListener('focus', () => el.select());
  }

  // Debounce helper
  function debounce(fn, ms=200){
    let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); };
  }

  // Storage
  function loadBills(){
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  }
  const saveBills = debounce((bills)=>{
    localStorage.setItem(KEY, JSON.stringify(bills));
    stampUpdated();
  }, 150);

  // Footer last updated (file/data perspective)
  function stampUpdated(){
    const el = $('#lastUpdated');
    if (!el) return;
    const now = new Date();
    el.textContent = `LAST UPDATED — ${now.toLocaleString()}`;
  }

  // ---------- HELP OVERLAY ----------
  const helpBtn = $('#helpBtn');
  const helpModal = $('#helpModal');
  const helpClose = $('#helpClose');
  helpBtn?.addEventListener('click', ()=>{
    helpModal?.classList.remove('hidden');
    helpModal?.setAttribute('aria-hidden','false');
  });
  helpClose?.addEventListener('click', ()=>{
    helpModal?.classList.add('hidden');
    helpModal?.setAttribute('aria-hidden','true');
  });
  helpModal?.addEventListener('click', (e)=>{
    if (e.target === helpModal) helpModal.classList.add('hidden');
  });
  document.addEventListener('keydown',(e)=>{
    if (e.key==='Escape') helpModal?.classList.add('hidden');
  });

  // ---------- QUICK CHECK PAGE ----------
  const balanceEl     = $('#balance');
  const purchaseEl    = $('#purchase');
  const totalUnpaidEl = $('#totalUnpaid');
  const leftAfterEl   = $('#leftAfter');
  const afterBuyEl    = $('#afterBuy');
  const coverageBadge = $('#coverageBadge');
  const buyBadge      = $('#buyBadge');
  const unpaidList    = $('#unpaidList');

  const cadenceLine   = $('#cadenceLine');
  const cadenceEarly  = $('#cadenceEarly');
  const cadenceLate   = $('#cadenceLate');

  function setBadge(el, level){ // success | warning | danger
    el?.classList.remove('success','warning','danger');
    el?.classList.add(level);
    if (el) el.textContent = level.toUpperCase();
  }

  function updateCadence(bills){
    if (!cadenceLine && !cadenceEarly && !cadenceLate) return;
    const today = new Date();
    const y=today.getFullYear(), m=today.getMonth();
    const daysInMonth = new Date(y,m+1,0).getDate();

    const getDay = (dStr)=>{
      // type="date" -> YYYY-MM-DD
      const d = new Date(dStr);
      if (!isNaN(d)) return d.getDate();
      const n = parseInt(dStr,10);
      return Number.isFinite(n)? n : null;
    };

    const unpaid = bills.filter(b=>!b.paid);
    const early = unpaid
      .filter(b => {
        const day = getDay(b.due);
        return day!=null && day>=1 && day<=15;
      })
      .reduce((sum,b)=> sum + (+b.amount||0), 0);

    const late = unpaid
      .filter(b => {
        const day = getDay(b.due);
        return day!=null && day>15 && day<=daysInMonth;
      })
      .reduce((sum,b)=> sum + (+b.amount||0), 0);

    cadenceLine && (cadenceLine.textContent = 'BILLS GROUPED BY PAY PERIOD:');
    cadenceEarly && (cadenceEarly.textContent = `BY 1ST: $${moneyFmt.format(early)}`);
    cadenceLate  && (cadenceLate.textContent  = `BY 15TH: $${moneyFmt.format(late)}`);
  }

  function renderUnpaidList(bills){
    if (!unpaidList) return;
    const today = new Date();
    const y=today.getFullYear(), m=today.getMonth();
    const daysInMonth = new Date(y,m+1,0).getDate();

    const getDay = (dStr)=>{
      const d = new Date(dStr);
      if (!isNaN(d)) return d.getDate();
      const n = parseInt(dStr,10);
      return Number.isFinite(n)? n : null;
    };

    const items = bills
      .filter(b=>!b.paid)
      .map(b=>{
        const day = getDay(b.due);
        return {name:b.name||'BILL', day: day??99, amount:+b.amount||0}
      })
      .sort((a,b)=> a.day - b.day);

    unpaidList.innerHTML = items.length
      ? items.map(it => `<li>${String(it.name).toUpperCase()} — ${isFinite(it.day)? it.day:'?'} — $${moneyFmt.format(it.amount)}</li>`).join('')
      : '<li class="muted">No unpaid bills saved.</li>';
  }

  function calcQuick(){
    if (!totalUnpaidEl) return; // not on this page
    const bills = loadBills();

    const totalUnpaid = bills.reduce((sum,b)=> sum + (!b.paid ? (+b.amount||0) : 0), 0);
    totalUnpaidEl.textContent = moneyFmt.format(totalUnpaid);

    const bal = parseMoneyInput(balanceEl);
    const buy = parseMoneyInput(purchaseEl);
    const left = bal - totalUnpaid;
    const after = left - buy;

    leftAfterEl.textContent = moneyFmt.format(left);
    afterBuyEl.textContent  = moneyFmt.format(after);

    setBadge(coverageBadge, left >= 0 ? 'success' : 'danger');
    if (left < 0)       setBadge(buyBadge,'danger');
    else if (after < 0) setBadge(buyBadge,'warning');
    else                setBadge(buyBadge,'success');

    updateCadence(bills);
    renderUnpaidList(bills);
  }

  // 50/30/20 on Quick Check
  const splitAmountEl = $('#splitAmount');
  const split50El = $('#split50'), split30El = $('#split30'), split20El = $('#split20');

  function calcSplit(){
    if (!splitAmountEl) return;
    const amt = parseMoneyInput(splitAmountEl);
    const n50 = Math.max(0, amt*0.50);
    const n30 = Math.max(0, amt*0.30);
    const n20 = Math.max(0, amt*0.20);
    split50El.textContent = `$${moneyFmt.format(n50)}`;
    split30El.textContent = `$${moneyFmt.format(n30)}`;
    split20El.textContent = `$${moneyFmt.format(n20)}`;
  }

  // ---------- BILLS PAGE ----------
  const tbody = $('#billTable tbody');
  const addBillBtn = $('#addBillBtn');
  const clearPaidBtn = $('#clearPaidBtn');

  function bindRow(tr, bill, allBills){
    const name = $('.b-name', tr);
    const due  = $('.b-due', tr);
    const amt  = $('.b-amt', tr);
    const paid = $('.b-paid', tr);
    const del  = $('.rowDel', tr);

    name.value = bill.name || '';
    due.value  = bill.due  || '';
    amt.value  = bill.amount != null ? bill.amount : '';
    paid.checked = !!bill.paid;

    [name,due,amt].forEach(el=>selectOnFocus(el));

    const update = ()=>{
      bill.name   = name.value.trim();
      bill.due    = due.value; // ISO date or free text (kept ISO here)
      bill.amount = parseMoneyInput(amt);
      bill.paid   = !!paid.checked;
      saveBills(allBills);
      stampUpdated();
    };

    name.addEventListener('input', update);
    due.addEventListener('input', update);
    amt.addEventListener('input', update);
    paid.addEventListener('change', update);

    del.addEventListener('click', ()=>{
      if (!confirm('DELETE this bill?')) return;
      const idx = allBills.indexOf(bill);
      if (idx>=0) allBills.splice(idx,1);
      saveBills(allBills);
      renderBills(); // redraw
      stampUpdated();
    });
  }

  function renderBills(){
    if (!tbody) return;
    let bills = loadBills();
    // sort by date (ISO) or fallback
    bills.sort((a,b)=>{
      const da = new Date(a.due); const db = new Date(b.due);
      if (!isNaN(da) && !isNaN(db)) return da - db;
      return String(a.due||'').localeCompare(String(b.due||''));
    });

    tbody.innerHTML = '';
    bills.forEach(b=>{
      const tr = document.importNode($('#billRowTpl').content, true).firstElementChild;
      bindRow(tr, b, bills);
      tbody.appendChild(tr);
    });
  }

  addBillBtn?.addEventListener('click', ()=>{
    const bills = loadBills();
    bills.push({ name:'', due:'', amount:0, paid:false });
    saveBills(bills);
    renderBills();
  });

  clearPaidBtn?.addEventListener('click', ()=>{
    const bills = loadBills();
    bills.forEach(b=> b.paid=false);
    saveBills(bills);
    renderBills();
  });

  // ---------- INIT ----------
  // wire inputs
  balanceEl?.addEventListener('input', calcQuick);
  purchaseEl?.addEventListener('input', calcQuick);
  splitAmountEl?.addEventListener('input', calcSplit);

  // focus helpers
  [balanceEl,purchaseEl,splitAmountEl].forEach(selectOnFocus);

  // first render per page
  renderBills();   // no-op on Quick Check
  calcQuick();     // no-op on Bills
  calcSplit();     // no-op if not present
  stampUpdated();
})();
