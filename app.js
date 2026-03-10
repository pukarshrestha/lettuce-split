/* ============================================================
   Bill Splitter — App Logic
   State management, rendering, and interactions
   ============================================================ */

(function () {
  'use strict';

  // ── Avatar color palette ──
  const AVATAR_COLORS = [
    '#A8FF70', '#7CD3FC', '#FDB022', '#F97066',
    '#B692F6', '#36BFFA', '#FF8AE2', '#67E3F9',
    '#FFA94D', '#69DB7C',
  ];

  // ── State ──
  const state = {
    people: [],   // { id, name }
    items: [],    // { id, name, unitPrice, quantity, consumers: [personId…] }
    nextPeopleId: 1,
    nextItemId: 1,
    currency: 'Rs.',
  };

  // ── DOM refs ──
  const $personForm = document.getElementById('add-person-form');
  const $personName = document.getElementById('person-name');
  const $peopleList = document.getElementById('people-list');
  const $peopleCount = document.getElementById('people-count');

  const $itemForm = document.getElementById('add-item-form');
  const $itemName = document.getElementById('item-name');
  const $itemPrice = document.getElementById('item-price');
  const $itemQty = document.getElementById('item-qty');
  const $itemsTableWrap = document.getElementById('items-table-wrap');
  const $itemsCount = document.getElementById('items-count');
  const $grandTotal = document.getElementById('grand-total');
  const $grandTotalAmt = document.getElementById('grand-total-amount');

  const $splitSummary = document.getElementById('split-summary');

  const $themeToggle = document.getElementById('theme-toggle');
  const $currencySelect = document.getElementById('currency-select');
  const $exportPdf = document.getElementById('export-pdf');
  const $exportJpeg = document.getElementById('export-jpeg');

  // ── Helpers ──
  function getInitials(name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  function avatarColor(id) {
    return AVATAR_COLORS[id % AVATAR_COLORS.length];
  }

  function formatCurrency(amount) {
    return state.currency + ' ' + amount.toFixed(2);
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── People ──
  function addPerson(name) {
    name = name.trim();
    if (!name) return;
    // Prevent duplicates
    if (state.people.some(p => p.name.toLowerCase() === name.toLowerCase())) return;
    const person = { id: state.nextPeopleId++, name };
    state.people.push(person);
    render();
  }

  function removePerson(id) {
    state.people = state.people.filter(p => p.id !== id);
    // Remove from all item consumers
    state.items.forEach(item => {
      item.consumers = item.consumers.filter(cid => cid !== id);
    });
    render();
  }

  // ── Items ──
  function addItem(name, unitPrice, quantity) {
    name = name.trim();
    if (!name || unitPrice <= 0 || quantity < 1) return;
    const item = {
      id: state.nextItemId++,
      name,
      unitPrice: parseFloat(unitPrice),
      quantity: parseInt(quantity, 10),
      consumers: [...state.people.map(p => p.id)], // default: everyone
    };
    state.items.push(item);
    render();
  }

  function removeItem(id) {
    state.items = state.items.filter(i => i.id !== id);
    render();
  }

  function toggleConsumer(itemId, personId) {
    const item = state.items.find(i => i.id === itemId);
    if (!item) return;
    const idx = item.consumers.indexOf(personId);
    if (idx > -1) {
      item.consumers.splice(idx, 1);
    } else {
      item.consumers.push(personId);
    }
    renderSplitSummary();
    // Update just the warning badges in the table without full re-render
    renderItemWarnings();
  }

  // ── Calculations ──
  function calculateSplits() {
    const splits = {};
    state.people.forEach(p => {
      splits[p.id] = { person: p, total: 0, details: [] };
    });

    state.items.forEach(item => {
      const itemTotal = item.unitPrice * item.quantity;
      const consumerCount = item.consumers.length;
      if (consumerCount === 0) return;
      const share = itemTotal / consumerCount;

      item.consumers.forEach(pid => {
        if (splits[pid]) {
          splits[pid].total += share;
          splits[pid].details.push({ name: item.name, amount: share });
        }
      });
    });

    return splits;
  }

  function getGrandTotal() {
    return state.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }

  // ── Rendering ──
  function render() {
    renderPeople();
    renderItemsTable();
    renderSplitSummary();
  }

  function renderPeople() {
    $peopleCount.textContent = state.people.length;

    if (state.people.length === 0) {
      $peopleList.innerHTML = '<p class="text-sm text-tertiary" style="padding: var(--spacing-sm) 0;">No people added yet. Add someone above to get started.</p>';
      return;
    }

    $peopleList.innerHTML = state.people.map(person => `
      <div class="person-chip" role="listitem" data-person-id="${person.id}">
        <span class="person-chip__avatar" style="background: ${avatarColor(person.id)}">${escapeHTML(getInitials(person.name))}</span>
        <span>${escapeHTML(person.name)}</span>
        <button
          type="button"
          class="person-chip__remove"
          data-remove-person="${person.id}"
          aria-label="Remove ${escapeHTML(person.name)}"
          title="Remove ${escapeHTML(person.name)}"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `).join('');
  }

  function renderItemsTable() {
    const itemCount = state.items.length;
    $itemsCount.textContent = itemCount + (itemCount === 1 ? ' item' : ' items');

    if (itemCount === 0) {
      $grandTotal.style.display = 'none';
      $itemsTableWrap.innerHTML = `
        <div class="items-empty">
          <div class="items-empty__icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          </div>
          <p>No items added yet. Add an item above to start splitting.</p>
        </div>
      `;
      return;
    }

    const hasPeople = state.people.length > 0;

    let html = `
      <table class="items-table" role="table">
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">Price</th>
            <th scope="col">Qty</th>
            <th scope="col">Total</th>
            ${hasPeople ? '<th scope="col">Shared by</th>' : ''}
            <th scope="col"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
    `;

    state.items.forEach(item => {
      const itemTotal = item.unitPrice * item.quantity;
      const noConsumers = hasPeople && item.consumers.length === 0;

      html += `
        <tr data-item-row="${item.id}">
          <td>
            <input
              type="text"
              class="inline-edit inline-edit--text"
              value="${escapeHTML(item.name)}"
              data-edit-field="name"
              data-edit-item="${item.id}"
              aria-label="Edit item name"
            />
            ${noConsumers ? `<span class="warning-badge" data-warning-item="${item.id}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Unassigned</span>` : ''}
          </td>
          <td>
            <input
              type="number"
              class="inline-edit inline-edit--number"
              value="${item.unitPrice}"
              step="0.01"
              min="0.01"
              data-edit-field="unitPrice"
              data-edit-item="${item.id}"
              aria-label="Edit unit price"
            />
          </td>
          <td>
            <input
              type="number"
              class="inline-edit inline-edit--number inline-edit--qty"
              value="${item.quantity}"
              step="1"
              min="1"
              data-edit-field="quantity"
              data-edit-item="${item.id}"
              aria-label="Edit quantity"
            />
          </td>
          <td class="item-total">${formatCurrency(itemTotal)}</td>
      `;

      if (hasPeople) {
        html += '<td><div class="consumer-checks">';
        state.people.forEach(person => {
          const checked = item.consumers.includes(person.id);
          html += `
            <div class="consumer-check">
              <input
                type="checkbox"
                id="check-${item.id}-${person.id}"
                ${checked ? 'checked' : ''}
                data-consumer-toggle
                data-item-id="${item.id}"
                data-person-id="${person.id}"
                aria-label="${escapeHTML(person.name)} shares ${escapeHTML(item.name)}"
              />
              <label
                for="check-${item.id}-${person.id}"
                class="consumer-check__label"
                title="${escapeHTML(person.name)}"
              >${escapeHTML(person.name)}</label>
            </div>
          `;
        });
        html += '</div></td>';
      }

      html += `
          <td style="text-align: center;">
            <button
              type="button"
              class="btn btn--danger btn--icon"
              data-remove-item="${item.id}"
              aria-label="Remove ${escapeHTML(item.name)}"
              title="Remove item"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    $itemsTableWrap.innerHTML = html;

    // Grand total
    const gt = getGrandTotal();
    $grandTotal.style.display = gt > 0 ? 'flex' : 'none';
    $grandTotalAmt.textContent = formatCurrency(gt);
  }

  function renderItemWarnings() {
    state.items.forEach(item => {
      const hasPeople = state.people.length > 0;
      const noConsumers = hasPeople && item.consumers.length === 0;
      const row = document.querySelector(`tr[data-item-row="${item.id}"] td:first-child`);
      if (!row) return;
      const existing = row.querySelector('.warning-badge');
      if (noConsumers && !existing) {
        const span = document.createElement('span');
        span.className = 'warning-badge';
        span.setAttribute('data-warning-item', item.id);
        span.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Unassigned`;
        row.appendChild(span);
      } else if (!noConsumers && existing) {
        existing.remove();
      }
    });
  }

  function renderSplitSummary() {
    if (state.people.length === 0 || state.items.length === 0) {
      $splitSummary.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <p class="empty-state__title">No splits to show yet</p>
          <p class="empty-state__text">Add people and items to see the breakdown.</p>
        </div>
      `;
      return;
    }

    const splits = calculateSplits();
    let html = '<div class="splits-grid">';

    state.people.forEach(person => {
      const data = splits[person.id];
      const itemCount = data.details.length;

      html += `
        <div class="split-card">
          <div class="split-card__header">
            <div class="split-card__avatar" style="background: ${avatarColor(person.id)}">${escapeHTML(getInitials(person.name))}</div>
            <div>
              <div class="split-card__name">${escapeHTML(person.name)}</div>
              <div class="split-card__item-count">${itemCount} item${itemCount !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <div class="split-card__amount">${formatCurrency(data.total)}</div>
      `;

      if (data.details.length > 0) {
        html += '<hr class="split-card__divider"/><ul class="split-card__details">';
        data.details.forEach(d => {
          html += `
            <li class="split-card__detail">
              <span>${escapeHTML(d.name)}</span>
              <span class="split-card__detail-amount">${formatCurrency(d.amount)}</span>
            </li>
          `;
        });
        html += '</ul>';
      }

      html += '</div>';
    });

    html += '</div>';
    $splitSummary.innerHTML = html;
  }

  // ── Event Handlers ──
  $personForm.addEventListener('submit', function (e) {
    e.preventDefault();
    addPerson($personName.value);
    $personName.value = '';
    $personName.focus();
  });

  $peopleList.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-remove-person]');
    if (btn) {
      removePerson(parseInt(btn.dataset.removePerson, 10));
    }
  });

  $itemForm.addEventListener('submit', function (e) {
    e.preventDefault();
    addItem($itemName.value, $itemPrice.value, $itemQty.value);
    $itemName.value = '';
    $itemPrice.value = '';
    $itemQty.value = '1';
    $itemName.focus();
  });

  $itemsTableWrap.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-remove-item]');
    if (btn) {
      removeItem(parseInt(btn.dataset.removeItem, 10));
    }
  });

  $itemsTableWrap.addEventListener('change', function (e) {
    // Consumer toggle
    const checkbox = e.target.closest('[data-consumer-toggle]');
    if (checkbox) {
      toggleConsumer(
        parseInt(checkbox.dataset.itemId, 10),
        parseInt(checkbox.dataset.personId, 10)
      );
      return;
    }

    // Inline edit
    const editInput = e.target.closest('[data-edit-field]');
    if (editInput) {
      const itemId = parseInt(editInput.dataset.editItem, 10);
      const field = editInput.dataset.editField;
      const item = state.items.find(i => i.id === itemId);
      if (!item) return;

      if (field === 'name') {
        const val = editInput.value.trim();
        if (val) item.name = val;
        else editInput.value = item.name; // revert if empty
      } else if (field === 'unitPrice') {
        const val = parseFloat(editInput.value);
        if (val > 0) item.unitPrice = val;
        else editInput.value = item.unitPrice; // revert
      } else if (field === 'quantity') {
        const val = parseInt(editInput.value, 10);
        if (val >= 1) item.quantity = val;
        else editInput.value = item.quantity; // revert
      }

      // Update computed cells without full re-render
      const row = editInput.closest('tr');
      const totalCell = row.querySelector('.item-total');
      if (totalCell) totalCell.textContent = formatCurrency(item.unitPrice * item.quantity);
      $grandTotalAmt.textContent = formatCurrency(getGrandTotal());
      renderSplitSummary();
    }
  });

  // ── Theme Toggle ──
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('bill-splitter-theme', theme);
  }

  $themeToggle.addEventListener('click', function () {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  });

  // Restore theme from localStorage
  (function initTheme() {
    const saved = localStorage.getItem('bill-splitter-theme');
    if (saved) {
      setTheme(saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  })();

  // ── Currency ──
  $currencySelect.addEventListener('change', function () {
    state.currency = $currencySelect.value;
    localStorage.setItem('bill-splitter-currency', state.currency);
    render();
  });

  // Restore currency from localStorage
  (function initCurrency() {
    const saved = localStorage.getItem('bill-splitter-currency');
    if (saved) {
      state.currency = saved;
      $currencySelect.value = saved;
    }
  })();

  // ── Export helpers ──
  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // Cleanup after a short delay
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  function createExportClone() {
    const itemsSection = document.getElementById('items-section');
    const splitSection = $splitSummary.closest('section.card');

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;width:1100px;padding:24px;background:' +
      getComputedStyle(document.body).backgroundColor + ';color:' +
      getComputedStyle(document.body).color + ';';

    const itemsClone = itemsSection.cloneNode(true);
    const splitClone = splitSection.cloneNode(true);

    // Remove interactive elements from clone
    itemsClone.querySelectorAll('[data-remove-item]').forEach(btn => btn.closest('td').remove());
    itemsClone.querySelectorAll('.bill-form-row').forEach(el => el.remove());
    // Replace inline edit inputs with static text
    itemsClone.querySelectorAll('.inline-edit').forEach(inp => {
      const span = document.createElement('span');
      if (inp.dataset.editField === 'unitPrice') {
        span.textContent = formatCurrency(parseFloat(inp.value));
      } else {
        span.textContent = inp.value;
      }
      inp.replaceWith(span);
    });

    wrapper.appendChild(itemsClone);
    const spacer = document.createElement('div');
    spacer.style.height = '24px';
    wrapper.appendChild(spacer);
    wrapper.appendChild(splitClone);

    document.body.appendChild(wrapper);
    return { wrapper, cleanup: () => wrapper.remove() };
  }

  const PDF_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>';
  const JPEG_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';

  $exportPdf.addEventListener('click', async function () {
    if (state.items.length === 0) return;
    $exportPdf.disabled = true;
    $exportPdf.textContent = 'Exporting…';

    try {
      const { wrapper, cleanup } = createExportClone();

      const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        backgroundColor: getComputedStyle(document.body).backgroundColor,
      });
      cleanup();

      const imgData = canvas.toDataURL('image/png');

      // Robust jsPDF detection — the UMD bundle registers differently depending on version
      let JsPDFConstructor;
      if (window.jspdf && window.jspdf.jsPDF) {
        JsPDFConstructor = window.jspdf.jsPDF;
      } else if (window.jsPDF) {
        JsPDFConstructor = window.jsPDF;
      } else {
        throw new Error('jsPDF library not loaded. Please check your internet connection and refresh.');
      }

      const pdf = new JsPDFConstructor('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      const imgRatio = canvas.height / canvas.width;
      const imgHeight = contentWidth * imgRatio;

      if (imgHeight <= pageHeight - margin * 2) {
        // Fits on one page
        pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, imgHeight);
      } else {
        // Multi-page: slice the canvas
        const pageContentHeight = pageHeight - margin * 2;
        const scaledPageHeight = (pageContentHeight / contentWidth) * canvas.width;
        let srcY = 0;
        let page = 0;
        while (srcY < canvas.height) {
          if (page > 0) pdf.addPage();
          const sliceHeight = Math.min(scaledPageHeight, canvas.height - srcY);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceHeight;
          const ctx = sliceCanvas.getContext('2d');
          ctx.drawImage(canvas, 0, srcY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
          const sliceData = sliceCanvas.toDataURL('image/png');
          const sliceDisplayHeight = (sliceHeight / canvas.width) * contentWidth;
          pdf.addImage(sliceData, 'PNG', margin, margin, contentWidth, sliceDisplayHeight);
          srcY += sliceHeight;
          page++;
        }
      }

      const pdfBlob = pdf.output('blob');
      triggerDownload(pdfBlob, 'bill-split.pdf');
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('PDF export failed. Please try again.');
    } finally {
      $exportPdf.disabled = false;
      $exportPdf.innerHTML = PDF_ICON + ' Export as PDF';
    }
  });

  $exportJpeg.addEventListener('click', async function () {
    if (state.items.length === 0) return;
    $exportJpeg.disabled = true;
    $exportJpeg.textContent = 'Exporting…';

    try {
      const { wrapper, cleanup } = createExportClone();

      const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        backgroundColor: getComputedStyle(document.body).backgroundColor,
      });
      cleanup();

      // Use toBlob for reliable download with correct extension
      canvas.toBlob(function (blob) {
        if (blob) {
          triggerDownload(blob, 'bill-split.jpg');
        }
      }, 'image/jpeg', 0.95);
    } catch (err) {
      console.error('JPEG export failed:', err);
      alert('JPEG export failed. Please try again.');
    } finally {
      $exportJpeg.disabled = false;
      $exportJpeg.innerHTML = JPEG_ICON + ' Export as JPEG';
    }
  });

  // ── Initial Render ──
  render();

})();
