// app.js — shared helpers + per-page logic

(() => {
  // ------------- utils -------------
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const fmt = new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const KEY = 'bt.bills.v2';

  const loadBills = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  };
  const saveBills = (arr) => localStorage.setItem(KEY, JSON.stringify(arr));

  const moneyFrom = (el) => {
    if (!el) return 0;
    const v = parseFloat(String(el.value || '').replace(/[^0-9.-]/g,''));
    return Number.isFinite(v) ? v : 0;
  };

  // compute totals from storage
  function totalsFromStorage() {
    const bills = loadBills();
    const totalUnpaid = bills.reduce((s,b)=> s + (!b.paid ? (+b.amount||0):0), 0);
    const cadence = bills.reduce((acc,b)=>{
      const d = parseInt(b.date?.slice(8,10) || b.due || '0',10);
      if (!b.paid && d>0){
        if (d <= 15) acc.early += (+b.amount||0);
        else         acc.late  += (+b.amount||0);
      }
      return acc;
    }, {early:0, late:0});
    return { totalUnpaid, cadence };
  }

  // select-on-focus
  function selectOnFocus(container=document){
    container.addEventListener('focusin', (e)=>{
      if (e.target.matches('input')) e.target.select();
    });
  }

  // ------------- page router -------------
  const page = document.body.dataset.page;

  // ---- Quick Check ----
  if (page === 'quick') {
    const balanceEl    = $('#balance');
    const purchaseEl   = $('#purchase');
    const totalUnpaidEl= $('#totalUnpaid');
    const leftAfterEl  = $('#leftAfter');
    const afterBuyEl   = $('#afterBuy');

    const incomeSplitEl= $('#income');
    const needsEl      = $('#needs');
    const wantsEl      = $('#wants');
    const savesEl      = $('#saves');

    function calc() {
      const { totalUnpaid } = totalsFromStorage();
      totalUnpaidEl.textContent = fmt.format(totalUnpaid);

      const bal = moneyFrom(balanceEl);
      const buy = moneyFrom(purchaseEl);

      const left = bal - totalUnpaid;
      const after = left - buy;

      leftAfterEl.textContent = fmt.format(left);
      afterBuyEl.textContent  = fmt.format(after);
    }

    function splitCalc(){
      const v = moneyFrom(incomeSplitEl);
      needsEl.textContent = fmt.format(v * 0.50);
      wantsEl.textContent = fmt.format(v * 0.30);
      savesEl.textContent = fmt.format(v * 0.20);
    }

    // bootstrap
    selectOnFocus(document);
    ['input','change'].forEach(ev=>{
      balanceEl.addEventListener(ev, calc);
      purchaseEl.addEventListener(ev, calc);
      incomeSplitEl.addEventListener(ev, splitCalc);
    });
    calc();
    splitCalc();
  }

  // ---- Bills page ----
  if (page === 'bills') {
    const list = $('#billList');
    const addBtn = $('#addBill');

    let bills = loadBills();

    function render(){
      list.innerHTML = `
        <div class="bill-head">BILL</div>
        <div class="bill-head">DATE</div>
        <div class="bill-head">AMOUNT</div>
        <div class="bill-head">PAID</div>
        <div class="bill-head"></div>
      `;
      bills.forEach((b, i) => {
        const row = document.createElement('div');
        row.className = 'bill-row';
        row.innerHTML = `
          <input class="input name"   value="${b.name ?? ''}" placeholder="Name">
          <input class="input small date" type="date" value="${b.date ?? ''}">
          <input class="input amount" inputmode="decimal" placeholder="0.00" value="${b.amount ?? ''}">
          <input class="paid" type="checkbox" ${b.paid ? 'checked':''} style="width:24px;height:24px;accent-color:black;border:2px solid #000;border-radius:6px;">
          <button class="btn danger del">DELETE</button>
        `;
        list.appendChild(row);

        const name = $('.name',row);
        const date = $('.date',row);
        const amt  = $('.amount',row);
        const paid = $('.paid',row);
        const del  = $('.del',row);

        const update = () => {
          bills[i].name   = name.value.trim();
          bills[i].date   = date.value;
          bills[i].amount = moneyFrom(amt);
          bills[i].paid   = !!paid.checked;
          saveBills(bills);
        };
        name.addEventListener('input', update);
        date.addEventListener('change', update);
        amt.addEventListener('input', update);
        paid.addEventListener('change', update);

        del.addEventListener('click', () => {
          if (!confirm('Delete this bill?')) return;
          bills.splice(i,1);
          saveBills(bills);
          render();
        });
      });
    }

    addBtn.addEventListener('click', () => {
      bills.push({name:'', date:'', amount:0, paid:false});
      saveBills(bills);
      render();
    });

    selectOnFocus(document);
    render();
  }

  // nothing to do on split/help besides HTML content
})();
