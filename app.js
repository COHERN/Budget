// app.js — Budget Terminal (clean rebuild)

/* utils */
(() => {
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  /* ----- date in header ----- */
  function setTodayLine() {
    const el = $("#todayLine");
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  /* ----- tabs ----- */
  function initTabs() {
    const tabs  = $$(".tab");
    const panes = $$(".tabpane");

    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.tab;
        tabs.forEach(t => t.classList.remove("active"));
        panes.forEach(p => p.classList.remove("active"));
        tab.classList.add("active");
        const pane = $("#tab-" + target);
        if (pane) pane.classList.add("active");
      });
    });
  }

  /* ----- storage ----- */
  const KEY = "bt.bills.v3";

  function loadBills() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(b => ({
        name: b.name || "",
        due: b.due || "",
        amount: Number.isFinite(+b.amount) ? +b.amount : 0,
        paid: !!b.paid
      }));
    } catch {
      return [];
    }
  }

  function saveBills(bills) {
    localStorage.setItem(KEY, JSON.stringify(bills));
    const lu = $("#lastUpdated");
    if (lu) {
      const now = new Date();
      lu.textContent = `Last updated: ${now.toLocaleString("en-US")}`;
    }
  }

  /* ----- global state ----- */
  let bills = loadBills();

  /* ----- Quick Check elements ----- */
  const balanceEl     = $("#balance");
  const purchaseEl    = $("#purchase");
  const totalUnpaidEl = $("#totalUnpaid");
  const leftAfterEl   = $("#leftAfter");
  const afterBuyEl    = $("#afterBuy");
  const coverageBadge = $("#coverageBadge");
  const buyBadge      = $("#buyBadge");

  const prefundFirstEl     = $("#prefundFirst");
  const prefundFifteenthEl = $("#prefundFifteenth");
  const unpaidSummaryEl    = $("#unpaidSummary");

  function parseMoneyInput(el) {
    if (!el) return 0;
    const raw = String(el.value || "").replace(/[^0-9.-]/g, "");
    const v = parseFloat(raw);
    return Number.isFinite(v) ? v : 0;
  }

  function sumUnpaid(billsArr) {
    return billsArr.reduce((sum, b) => {
      return sum + (!b.paid ? (+b.amount || 0) : 0);
    }, 0);
  }

  function updatePrefund() {
    if (!prefundFirstEl || !prefundFifteenthEl) return;

    let firstTotal = 0;
    let fifteenthTotal = 0;

    bills.forEach(b => {
      if (b.paid) return;
      if (!b.due) return;
      const d = new Date(b.due);
      if (Number.isNaN(d.getTime())) return;
      const day = d.getDate();
      const amt = +b.amount || 0;
      if (day <= 15) firstTotal  += amt;
      else           fifteenthTotal += amt;
    });

    prefundFirstEl.textContent     = `Prefund 1st: $${fmt.format(firstTotal)}`;
    prefundFifteenthEl.textContent = `Prefund 15th: $${fmt.format(fifteenthTotal)}`;
  }

  function setBadge(el, level, label) {
    if (!el) return;
    el.classList.remove("pill-success", "pill-warning", "pill-danger");
    if (level === "good") {
      el.classList.add("pill-success");
    } else if (level === "warn") {
      el.classList.add("pill-warning");
    } else if (level === "bad") {
      el.classList.add("pill-danger");
    }
    if (label) el.textContent = label;
  }

  function recalcMain() {
    const unpaid = sumUnpaid(bills);
    if (totalUnpaidEl) totalUnpaidEl.textContent = fmt.format(unpaid);
    if (unpaidSummaryEl) unpaidSummaryEl.textContent = `$${fmt.format(unpaid)}`;

    const bal  = parseMoneyInput(balanceEl);
    const buy  = parseMoneyInput(purchaseEl);
    const left = bal - unpaid;
    const after = left - buy;

    if (leftAfterEl) leftAfterEl.textContent = fmt.format(left);
    if (afterBuyEl)  afterBuyEl.textContent  = fmt.format(after);

    // coverage badge (balance vs bills)
    if (left >= 0) {
      setBadge(coverageBadge, "good", "Bills Covered");
    } else {
      setBadge(coverageBadge, "bad", "Not Covered");
    }

    // purchase badge (after optional purchase)
    if (left < 0) {
      setBadge(buyBadge, "bad", "Already Under");
    } else if (after < 0) {
      setBadge(buyBadge, "warn", "Purchase Breaks Coverage");
    } else {
      setBadge(buyBadge, "good", "Safe to Buy");
    }

    updatePrefund();
  }

  if (balanceEl) balanceEl.addEventListener("input", recalcMain);
  if (purchaseEl) purchaseEl.addEventListener("input", recalcMain);

  /* ----- Bills table ----- */
  const tbody        = $("#billTableBody");
  const rowTemplate  = $("#billRowTpl");
  const addBillBtn   = $("#addBillBtn");
  const clearPaidBtn = $("#clearPaidBtn");
  const saveBillsBtn = $("#saveBillsBtn");

  function bindBillRow(tr, bill) {
    const nameInput  = $(".b-name", tr);
    const dueInput   = $(".b-due", tr);
    const amtInput   = $(".b-amt", tr);
    const paidInput  = $(".b-paid", tr);
    const delBtn     = $(".rowDel", tr);

    if (nameInput) nameInput.value = bill.name || "";
    if (dueInput)  dueInput.value  = bill.due  || "";
    if (amtInput)  amtInput.value  = bill.amount != null ? bill.amount : "";
    if (paidInput) paidInput.checked = !!bill.paid;

    function updateFromRow() {
      if (nameInput) bill.name = nameInput.value.trim();
      if (dueInput)  bill.due  = dueInput.value;
      if (amtInput)  bill.amount = parseFloat(amtInput.value) || 0;
      if (paidInput) bill.paid = !!paidInput.checked;

      saveBills(bills);
      recalcMain();
    }

    if (nameInput) nameInput.addEventListener("input", updateFromRow);
    if (dueInput)  dueInput.addEventListener("change", updateFromRow);
    if (amtInput)  amtInput.addEventListener("input", updateFromRow);
    if (paidInput) paidInput.addEventListener("change", updateFromRow);

    if (delBtn) {
      delBtn.addEventListener("click", () => {
        const ok = window.confirm("Delete this bill?");
        if (!ok) return;
        bills = bills.filter(b => b !== bill);
        saveBills(bills);
        renderBills();
        recalcMain();
      });
    }
  }

  function renderBills() {
    if (!tbody || !rowTemplate) return;
    tbody.innerHTML = "";

    // sort by date, unpaid first
    const sorted = [...bills].sort((a, b) => {
      const aPaid = a.paid ? 1 : 0;
      const bPaid = b.paid ? 1 : 0;
      if (aPaid !== bPaid) return aPaid - bPaid;

      const da = a.due ? new Date(a.due).getTime() : Infinity;
      const db = b.due ? new Date(b.due).getTime() : Infinity;
      return da - db;
    });

    sorted.forEach(bill => {
      const frag = document.importNode(rowTemplate.content, true);
      const tr = frag.firstElementChild;
      bindBillRow(tr, bill);
      tbody.appendChild(tr);
    });
  }

  if (addBillBtn) {
    addBillBtn.addEventListener("click", () => {
      const newBill = { name: "", due: "", amount: 0, paid: false };
      bills.push(newBill);
      saveBills(bills);
      renderBills();
      recalcMain();
    });
  }

  if (clearPaidBtn) {
    clearPaidBtn.addEventListener("click", () => {
      bills.forEach(b => { b.paid = false; });
      saveBills(bills);
      renderBills();
      recalcMain();
    });
  }

  if (saveBillsBtn) {
    saveBillsBtn.addEventListener("click", () => {
      saveBills(bills);
      // optional: tiny feedback
      alert("Bills saved.");
    });
  }

  /* ----- init ----- */
  setTodayLine();
  initTabs();
  renderBills();
  recalcMain();
})();
