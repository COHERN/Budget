// Budget Terminal — shared logic for Quick Check + Bills
(() => {
  // ---------- utils ----------
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const fmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const KEY = 'bt.bills.v2';
  const NOW = () => new Date();

  const toMoney = (v) => {
    const n = Number(String(v).replace(/[^0-9.-]/g,''));
    return Number.isFinite(n) ? n : 0;
  };

  const setBadge = (el, level) => {
    if (!el) return;
    el.classList.remove('success','warning','danger');
    el.classList.add(level);
    el.textContent = level[0].toUpperCase() + level.slice(1);
  };

  const selectOnFocus = (el) => el?.addEventListener('focus', e => e.target.select(), {passive:true});

  const debounce = (fn, ms=200) => {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(()=>fn(...args), ms); };
  };

  const setToday = () => {
    const el = $('#todayDate');
    if (!el) return;
    el.textContent = new Date().toLocaleDateString('en-US', {
      weekday:'short', month:'short', day:'numeric', year:'numeric'
    });
  };

  const setLastUpdated = () => {
    const el = $('#lastUpdated');
    if (!el) return;
    el.textContent = 'Last updated: ' + new Date(document.lastModified).toLocaleString();
  };

  // ---------- storage ----------
  const loadBills = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  };
  const saveBills = (arr) => localStorage.setItem(KEY, JSON.stringify(arr || []));
  let bills = loadBills();

  // ---------- shared calculations ----------
  const isUnpaid = (b) => !b.paid && Number.isFinite(+b.amount) && +b.amount > 0;

  // group by 1st / 15th using actual date input (yyyy-mm-dd)
  const monthDay = (iso) => {
    const d = new Date(iso);
    return Number.isFinite(d.getTime()) ? d.getDate() : null;
  };

  const totals = () => {
    const unpaid = bills.filter(isUnpaid);
    const totalUnpaid = unpaid.reduce((s,b)=> s + (+b.amount||0), 0);

    let early=0, late=0;
    unpaid.forEach(b => {
      const md = monthDay(b.date);
      if (md == null) return;
      if (md <= 15) early += (+b.amount||0);
      else late += (+b.amount||0);
    });

    return { totalUnpaid, early, late };
  };

  // ---------- QUICK CHECK page ----------
  function initQuickCheck(){
    const balance   = $('#balance');
    const purchase  = $('#purchase');
    const totalEl   = $('#totalUnpaid');
    const leftEl    = $('#leftAfter');
    const afterEl   = $('#afterBuy');
    const coverBad  = $('#coverageBadge');
    const buyBad    = $('#buyBadge');
    const pfEarlyEl = $('#prefundEarly');
    const pfLateEl  = $('#prefundLate');

    const splitInput = $('#splitInput');
    const split50 = $('#split50'), split30 = $('#split30'), split20 = $('#split20');

    [balance,purchase,splitInput].forEach(selectOnFocus);

    const recalc = () => {
      bills = loadBills();                      // always pull latest
      const { totalUnpaid, early, late } = totals();

      // main calc
      const bal = toMoney(balance?.value||0);
      const buy = toMoney(purchase?.value||0);
      const left = bal - totalUnpaid;
      const after = left - buy;

      totalEl.textContent = fmt.format(totalUnpaid || 0);
      leftEl.textContent  = fmt.format(left);
      afterEl.textContent = fmt.format(after);

      setBadge(coverBad, left >= 0 ? 'success' : 'danger');
      if (left < 0) setBadge(buyBad,'danger');
      else if (after < 0) setBadge(buyBad,'warning');
      else setBadge(buyBad,'success');

      // pre-fund display
      pfEarlyEl.textContent = '$' + fmt.format(early || 0);
      pfLateEl.textContent  = '$' + fmt.format(late  || 0);

      // split
      const amt = toMoney(splitInput?.value||0);
      split50.textContent = '$' + fmt.format(amt * 0.50);
      split30.textContent = '$' + fmt.format(amt * 0.30);
      split20.textContent = '$' + fmt.format(amt * 0.20);
    };

    balance?.addEventListener('input', recalc);
    purchase?.addEventListener('input', recalc);
    splitInput?.addEventListener('input', recalc);

    recalc();
  }

  // ---------- BILLS page ----------
  function initBills(){
    const body = $('#billBody');
    const tpl  = $('#billRowTpl');
    const addBtn = $('#addBillBtn');
    const clearBtn = $('#clearPaidBtn');

    const sumEarly = $('#sumEarly');
    const sumLate  = $('#sumLate');
    const sumTotal = $('#sumTotal');

    const write = debounce(() => {
      saveBills(bills);
      refresh();
    }, 150);

    const bindRow = (rowEl, bill) => {
      const name = rowEl.querySelector('.b-name');
      const date = rowEl.querySelector('.b-date');
      const amt  = rowEl.querySelector('.b-amt');
      const paid = rowEl.querySelector('.b-paid');
      const del  = rowEl.querySelector('.rowDel');

      name.value = bill.name || '';
      date.value = bill.date || '';
      amt.value  = bill.amount != null ? bill.amount : '';
      paid.checked = !!bill.paid;

      [name, amt].forEach(selectOnFocus);

      const update = () => {
        bill.name   = name.value.trim();
        bill.date   = date.value || '';
        bill.amount = toMoney(amt.value);
        bill.paid   = !!paid.checked;
        write();
      };

      name.addEventListener('input', update);
      date.addEventListener('change', update);
      amt.addEventListener('input', () => {
        // live formatting on blur only to avoid cursor jump
      });
      amt.addEventListener('blur', () => { amt.value = bill.amount ? fmt.format(bill.amount) : ''; });
      paid.addEventListener('change', update);

      del.addEventListener('click', () => {
        if (!confirm('Delete this bill?')) return;
        bills = bills.filter(b => b !== bill);
        write();
        render();
      });
    };

    const render = () => {
      body.innerHTML = '';
      bills
        .slice()
        .sort((a,b) => {
          const ad = new Date(a.date||'1970-01-01').getTime();
          const bd = new Date(b.date||'1970-01-01').getTime();
          return ad - bd;
        })
        .forEach(bill => {
          const node = document.importNode(tpl.content, true);
          const row = node.querySelector('.row');
          bindRow(row, bill);
          body.appendChild(node);
        });

      const { totalUnpaid, early, late } = totals();
      sumTotal.textContent = '$' + fmt.format(totalUnpaid || 0);
      sumEarly.textContent = '$' + fmt.format(early || 0);
      sumLate.textContent  = '$' + fmt.format(late  || 0);
    };

    const refresh = () => {              // NaN guard & repaint
      bills = (loadBills() || []).map(b => ({
        name: b.name || '',
        date: b.date || '',
        amount: Number.isFinite(+b.amount) ? +b.amount : 0,
        paid: !!b.paid
      }));
      render();
    };

    addBtn?.addEventListener('click', () => {
      bills.push({ name:'', date:'', amount:0, paid:false });
      saveBills(bills);
      render();
    });

    clearBtn?.addEventListener('click', () => {
      bills.forEach(b => b.paid = false);
      saveBills(bills);
      render();
    });

    // initial
    refresh();
  }

  // ---------- boot ----------
  setToday();
  setLastUpdated();

  if (document.body.contains($('#billBody'))) {
    initBills();
  } else {
    initQuickCheck();
  }
})();
