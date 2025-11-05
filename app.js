(() => {
  const fmt = new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

  // Quick Check
  const calcBtn = document.getElementById('calcBtn');
  calcBtn?.addEventListener('click',()=>{
    const bal = parseFloat(document.getElementById('balance').value)||0;
    const bonus = parseFloat(document.getElementById('bonus').value)||0;
    const purchase = parseFloat(document.getElementById('purchase').value)||0;
    const total = bal + bonus - purchase;
    document.getElementById('result').textContent = 'Remaining: $' + fmt.format(total);
  });

  // 50/30/20 Split
  const splitBtn = document.getElementById('splitBtn');
  splitBtn?.addEventListener('click',()=>{
    const amt = parseFloat(document.getElementById('splitAmount').value)||0;
    const need = amt*0.5, want=amt*0.3, save=amt*0.2;
    document.getElementById('splitResults').innerHTML = 
      `<p>Needs: $${fmt.format(need)}<br>Wants: $${fmt.format(want)}<br>Savings: $${fmt.format(save)}</p>`;
  });

  // Bills
  const table = document.getElementById('billTable')?.querySelector('tbody');
  document.getElementById('addBillBtn')?.addEventListener('click',()=>{
    const row=document.createElement('tr');
    row.innerHTML=`<td><input></td><td><input type="date"></td><td><input type="number" step="0.01"></td><td><input type="checkbox"></td><td><button>DELETE</button></td>`;
    table.appendChild(row);
    row.querySelector('button').addEventListener('click',()=>row.remove());
  });
})();