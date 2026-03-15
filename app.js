/* ============================================================
   LettuceSplit — App Logic
   State management, rendering, persistence, and interactions
   ============================================================ */

(function () {
  'use strict';

  // ── Avatar color palette ──
  const AVATAR_COLORS = [
    '#A8FF70', '#7CD3FC', '#FDB022', '#F97066',
    '#B692F6', '#36BFFA', '#FF8AE2', '#67E3F9',
    '#FFA94D', '#69DB7C',
  ];

  // ── Storage Helper ──
  const Storage = {
    _key: 'lettuceSplit',
    _read() {
      try { return JSON.parse(localStorage.getItem(this._key)) || {}; } catch { return {}; }
    },
    _write(data) {
      localStorage.setItem(this._key, JSON.stringify(data));
    },
    get(key) { return this._read()[key]; },
    set(key, value) {
      const data = this._read();
      data[key] = value;
      this._write(data);
    },
  };

  // ── State ──
  const state = {
    people: [],
    items: [],
    nextPeopleId: 1,
    nextItemId: 1,
    currency: 'Rs.',
    splitView: 'cards',
    billName: '',
    images: [], // array of { dataUrl, name }
  };

  // ── DOM refs ──
  const $ = id => document.getElementById(id);
  const $personForm = $('add-person-form');
  const $personName = $('person-name');
  const $peopleList = $('people-list');
  const $peopleCount = $('people-count');
  const $personSuggestions = $('person-suggestions');

  const $itemForm = $('add-item-form');
  const $itemName = $('item-name');
  const $itemPrice = $('item-price');
  const $itemQty = $('item-qty');
  const $itemsTableWrap = $('items-table-wrap');
  const $itemsCount = $('items-count');
  const $grandTotal = $('grand-total');
  const $grandTotalAmt = $('grand-total-amount');

  const $splitSummary = $('split-summary');
  const $themeToggle = $('theme-toggle');
  const $currencySelect = $('currency-select');
  const $exportPdf = $('export-pdf');
  const $copySummary = $('copy-summary');

  const $goMainPageBtn = $('go-main-page-btn');
  const $currencyWrap = $('currency-select-wrap');

  const $landingView = $('landing-view');
  const $appView = $('app-view');
  const $homeLink = $('home-link');
  const $landingNewSplit = $('landing-new-split');
  const $savedBillsList = $('saved-bills-list');

  const $saveGroupBtn = $('save-group-btn');
  const $saveGroupForm = $('save-group-form');
  const $groupNameInput = $('group-name-input');
  const $groupNameConfirm = $('group-name-confirm');
  const $groupNameCancel = $('group-name-cancel');


  const $saveBillBtn = $('save-bill-btn');
  const $saveBillModal = $('save-bill-modal');
  const $billNameInput = $('bill-name-input');
  const $saveBillConfirm = $('save-bill-confirm');
  const $saveBillCancel = $('save-bill-cancel');

  const $imageInput = $('image-input');
  const $imagePreviews = $('image-previews');

  // ── Helpers ──
  function getInitials(name) { return name.trim().charAt(0).toUpperCase(); }
  function avatarColor(id) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }
  function formatCurrency(amount) { return state.currency + ' ' + amount.toFixed(2); }
  function escapeHTML(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
  function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }

  // ── Toast ──
  function showToast(message, type) {
    type = type || 'success';
    const container = $('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast toast--' + type;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add('toast--visible'); });
    setTimeout(function () {
      toast.classList.remove('toast--visible');
      toast.addEventListener('transitionend', function () { toast.remove(); });
    }, 3000);
  }

  // ── View Switching ──
  function showLanding() {
    $appView.style.display = 'none';
    $landingView.style.display = '';
    $goMainPageBtn.style.display = 'none';
    $currencyWrap.style.display = 'none';
    renderSavedBillsList();
  }

  function showApp() {
    $landingView.style.display = 'none';
    $appView.style.display = '';
    $goMainPageBtn.style.display = '';
    $currencyWrap.style.display = '';
  }

  function resetState() {
    state.people = [];
    state.items = [];
    state.nextPeopleId = 1;
    state.nextItemId = 1;
    state.billName = '';
    state.images = [];
  }

  // ── Landing Page ──
  $landingNewSplit.addEventListener('click', function () {
    resetState();
    render();
    renderImagePreviews();
    showApp();
  });

  $homeLink.addEventListener('click', function (e) {
    e.preventDefault();
    showLanding();
  });

  $goMainPageBtn.addEventListener('click', function () {
    showLanding();
  });

  function renderSavedBillsList() {
    const bills = Storage.get('savedBills') || [];
    if (bills.length === 0) {
      $savedBillsList.innerHTML = '<p class="saved-bills-empty">No saved bills yet.</p>';
      return;
    }
    const sorted = bills.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 10);
    $savedBillsList.innerHTML = sorted.map(function (bill) {
      const d = new Date(bill.date);
      const dateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      return '<div class="saved-bill-item">' +
        '<button type="button" class="saved-bill-item__main" data-bill-id="' + bill.id + '">' +
        '<span class="saved-bill-item__name">' + escapeHTML(bill.name) + '</span>' +
        '<span class="saved-bill-item__date">' + dateStr + '</span>' +
        '</button>' +
        '<button type="button" class="saved-bill-item__delete" data-delete-bill="' + bill.id + '" title="Delete bill">' +
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
        '</button>' +
        '</div>';
    }).join('');
  }

  $savedBillsList.addEventListener('click', function (e) {
    var deleteBtn = e.target.closest('[data-delete-bill]');
    if (deleteBtn) {
      var billId = deleteBtn.dataset.deleteBill;
      var bills = Storage.get('savedBills') || [];
      bills = bills.filter(function (b) { return b.id !== billId; });
      Storage.set('savedBills', bills);
      renderSavedBillsList();
      showToast('Bill deleted');
      return;
    }
    var item = e.target.closest('[data-bill-id]');
    if (!item) return;
    loadBill(item.dataset.billId);
  });

  function loadBill(id) {
    const bills = Storage.get('savedBills') || [];
    const bill = bills.find(function (b) { return b.id === id; });
    if (!bill) return;
    state.people = bill.people || [];
    state.items = bill.items || [];
    state.nextPeopleId = Math.max.apply(null, state.people.map(function (p) { return p.id; }).concat([0])) + 1;
    state.nextItemId = Math.max.apply(null, state.items.map(function (i) { return i.id; }).concat([0])) + 1;
    state.billName = bill.name || '';
    state.images = bill.images || [];
    if (bill.currency) {
      state.currency = bill.currency;
      $currencySelect.value = bill.currency;
    }
    render();
    renderImagePreviews();
    showApp();
  }

  // ── People ──
  function addPerson(name) {
    name = name.trim();
    if (!name) return;
    if (state.people.some(function (p) { return p.name.toLowerCase() === name.toLowerCase(); })) return;
    const person = { id: state.nextPeopleId++, name: name };
    state.people.push(person);
    // Save to known people
    const saved = Storage.get('savedPeople') || [];
    if (!saved.some(function (n) { return n.toLowerCase() === name.toLowerCase(); })) {
      saved.push(name);
      Storage.set('savedPeople', saved);
    }
    render();
  }

  function removePerson(id) {
    state.people = state.people.filter(function (p) { return p.id !== id; });
    state.items.forEach(function (item) {
      item.consumers = item.consumers.filter(function (cid) { return cid !== id; });
    });
    render();
  }

  // ── Items ──
  function addItem(name, unitPrice, quantity) {
    name = name.trim();
    if (!name || unitPrice <= 0 || quantity < 1) return;
    state.items.push({
      id: state.nextItemId++,
      name: name,
      unitPrice: parseFloat(unitPrice),
      quantity: parseInt(quantity, 10),
      consumers: [],
    });
    render();
  }

  function removeItem(id) {
    state.items = state.items.filter(function (i) { return i.id !== id; });
    render();
  }

  function duplicateItem(id) {
    var original = state.items.find(function (i) { return i.id === id; });
    if (!original) return;
    var idx = state.items.findIndex(function (i) { return i.id === id; });
    state.items.splice(idx + 1, 0, {
      id: state.nextItemId++,
      name: original.name,
      unitPrice: original.unitPrice,
      quantity: original.quantity,
      consumers: original.consumers.slice(),
    });
    render();
  }

  function toggleAllConsumers(itemId) {
    var item = state.items.find(function (i) { return i.id === itemId; });
    if (!item) return;
    var all = state.people.length > 0 && item.consumers.length === state.people.length;
    item.consumers = all ? [] : state.people.map(function (p) { return p.id; });
    render();
  }

  function toggleConsumer(itemId, personId) {
    var item = state.items.find(function (i) { return i.id === itemId; });
    if (!item) return;
    var idx = item.consumers.indexOf(personId);
    if (idx > -1) item.consumers.splice(idx, 1);
    else item.consumers.push(personId);
    renderSplitSummary();
    renderItemWarnings();
  }

  // ── Calculations ──
  function calculateSplits() {
    var splits = {};
    state.people.forEach(function (p) { splits[p.id] = { person: p, total: 0, details: [] }; });
    state.items.forEach(function (item) {
      var itemTotal = item.unitPrice * item.quantity;
      if (item.consumers.length === 0) return;
      var share = itemTotal / item.consumers.length;
      item.consumers.forEach(function (pid) {
        if (splits[pid]) {
          splits[pid].total += share;
          splits[pid].details.push({ name: item.name, amount: share });
        }
      });
    });
    return splits;
  }

  function getGrandTotal() {
    return state.items.reduce(function (sum, item) { return sum + item.unitPrice * item.quantity; }, 0);
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
      $saveGroupBtn.style.display = 'none';
      return;
    }
    $peopleList.innerHTML = state.people.map(function (person) {
      return '<div class="person-chip" role="listitem" data-person-id="' + person.id + '">' +
        '<span class="person-chip__avatar" style="background: ' + avatarColor(person.id) + '">' + escapeHTML(getInitials(person.name)) + '</span>' +
        '<span>' + escapeHTML(person.name) + '</span>' +
        '<button type="button" class="person-chip__remove" data-remove-person="' + person.id + '" aria-label="Remove ' + escapeHTML(person.name) + '" title="Remove ' + escapeHTML(person.name) + '">' +
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button></div>';
    }).join('');
    $saveGroupBtn.style.display = state.people.length >= 2 ? '' : 'none';
  }

  function renderItemsTable() {
    var itemCount = state.items.length;
    $itemsCount.textContent = itemCount + (itemCount === 1 ? ' item' : ' items');
    if (itemCount === 0) {
      $grandTotal.style.display = 'none';
      $itemsTableWrap.innerHTML = '<div class="items-empty"><div class="items-empty__icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div><p>No items added yet. Add an item above to start splitting.</p></div>';
      return;
    }
    var hasPeople = state.people.length > 0;
    var html = '<table class="items-table" role="table"><thead><tr><th scope="col">Item</th><th scope="col">Price</th><th scope="col">Qty</th><th scope="col">Total</th>' +
      (hasPeople ? '<th scope="col">Shared by</th>' : '') +
      '<th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>';

    state.items.forEach(function (item) {
      var itemTotal = item.unitPrice * item.quantity;
      var noConsumers = hasPeople && item.consumers.length === 0;
      html += '<tr data-item-row="' + item.id + '"><td><input type="text" class="inline-edit inline-edit--text" value="' + escapeHTML(item.name) + '" data-edit-field="name" data-edit-item="' + item.id + '" aria-label="Edit item name"/>' +
        (noConsumers ? '<span class="warning-badge" data-warning-item="' + item.id + '"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Unassigned</span>' : '') +
        '</td><td><input type="number" class="inline-edit inline-edit--number" value="' + item.unitPrice + '" step="0.01" min="0.01" data-edit-field="unitPrice" data-edit-item="' + item.id + '" aria-label="Edit unit price"/></td>' +
        '<td><input type="number" class="inline-edit inline-edit--number inline-edit--qty" value="' + item.quantity + '" step="1" min="1" data-edit-field="quantity" data-edit-item="' + item.id + '" aria-label="Edit quantity"/></td>' +
        '<td class="item-total">' + formatCurrency(itemTotal) + '</td>';

      if (hasPeople) {
        html += '<td><div class="consumer-checks">';
        state.people.forEach(function (person) {
          var checked = item.consumers.indexOf(person.id) > -1;
          html += '<div class="consumer-check"><input type="checkbox" id="check-' + item.id + '-' + person.id + '" ' + (checked ? 'checked' : '') + ' data-consumer-toggle data-item-id="' + item.id + '" data-person-id="' + person.id + '" aria-label="' + escapeHTML(person.name) + ' shares ' + escapeHTML(item.name) + '"/><label for="check-' + item.id + '-' + person.id + '" class="consumer-check__label" title="' + escapeHTML(person.name) + '">' + escapeHTML(person.name) + '</label></div>';
        });
        html += '</div></td>';
      }

      var allChecked = hasPeople && item.consumers.length === state.people.length;
      var toggleTitle = allChecked ? 'Unselect all' : 'Select all';
      var toggleIcon = allChecked
        ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>';

      html += '<td><div class="row-actions">' +
        (hasPeople ? '<button type="button" class="btn btn--neutral btn--icon" data-toggle-all-consumers="' + item.id + '" aria-label="' + toggleTitle + '" title="' + toggleTitle + '">' + toggleIcon + '</button>' : '') +
        '<button type="button" class="btn btn--neutral btn--icon" data-duplicate-item="' + item.id + '" aria-label="Duplicate ' + escapeHTML(item.name) + '" title="Duplicate item"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 2.0028C9.82495 2.01194 9.4197 2.05103 9.09202 2.21799C8.71569 2.40973 8.40973 2.71569 8.21799 3.09202C8.05103 3.4197 8.01194 3.82495 8.0028 4.5M19.5 2.0028C20.1751 2.01194 20.5803 2.05103 20.908 2.21799C21.2843 2.40973 21.5903 2.71569 21.782 3.09202C21.949 3.4197 21.9881 3.82494 21.9972 4.49999M21.9972 13.5C21.9881 14.175 21.949 14.5803 21.782 14.908C21.5903 15.2843 21.2843 15.5903 20.908 15.782C20.5803 15.949 20.1751 15.9881 19.5 15.9972M22 7.99999V9.99999M14.0001 2H16M5.2 22H12.8C13.9201 22 14.4802 22 14.908 21.782C15.2843 21.5903 15.5903 21.2843 15.782 20.908C16 20.4802 16 19.9201 16 18.8V11.2C16 10.0799 16 9.51984 15.782 9.09202C15.5903 8.71569 15.2843 8.40973 14.908 8.21799C14.4802 8 13.9201 8 12.8 8H5.2C4.0799 8 3.51984 8 3.09202 8.21799C2.71569 8.40973 2.40973 8.71569 2.21799 9.09202C2 9.51984 2 10.0799 2 11.2V18.8C2 19.9201 2 20.4802 2.21799 20.908C2.40973 21.2843 2.71569 21.5903 3.09202 21.782C3.51984 22 4.07989 22 5.2 22Z"/></svg></button>' +
        '<button type="button" class="btn btn--danger btn--icon" data-remove-item="' + item.id + '" aria-label="Remove ' + escapeHTML(item.name) + '" title="Remove item"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>' +
        '</div></td></tr>';
    });

    html += '</tbody></table>';
    $itemsTableWrap.innerHTML = html;
    var gt = getGrandTotal();
    $grandTotal.style.display = gt > 0 ? 'flex' : 'none';
    $grandTotalAmt.textContent = formatCurrency(gt);
  }

  function renderItemWarnings() {
    state.items.forEach(function (item) {
      var hasPeople = state.people.length > 0;
      var noConsumers = hasPeople && item.consumers.length === 0;
      var row = document.querySelector('tr[data-item-row="' + item.id + '"] td:first-child');
      if (!row) return;
      var existing = row.querySelector('.warning-badge');
      if (noConsumers && !existing) {
        var span = document.createElement('span');
        span.className = 'warning-badge';
        span.setAttribute('data-warning-item', item.id);
        span.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Unassigned';
        row.appendChild(span);
      } else if (!noConsumers && existing) {
        existing.remove();
      }
    });
  }

  function renderSplitSummary() {
    if (state.people.length === 0 || state.items.length === 0) {
      $splitSummary.innerHTML = '<div class="empty-state"><div class="empty-state__icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 10V14M18 10V14M2 8.2L2 15.8C2 16.9201 2 17.4802 2.21799 17.908C2.40973 18.2843 2.71569 18.5903 3.09202 18.782C3.51984 19 4.07989 19 5.2 19L18.8 19C19.9201 19 20.4802 19 20.908 18.782C21.2843 18.5903 21.5903 18.2843 21.782 17.908C22 17.4802 22 16.9201 22 15.8V8.2C22 7.0799 22 6.51984 21.782 6.09202C21.5903 5.7157 21.2843 5.40974 20.908 5.21799C20.4802 5 19.9201 5 18.8 5L5.2 5C4.0799 5 3.51984 5 3.09202 5.21799C2.7157 5.40973 2.40973 5.71569 2.21799 6.09202C2 6.51984 2 7.07989 2 8.2ZM14.5 12C14.5 13.3807 13.3807 14.5 12 14.5C10.6193 14.5 9.5 13.3807 9.5 12C9.5 10.6193 10.6193 9.5 12 9.5C13.3807 9.5 14.5 10.6193 14.5 12Z"/></svg></div><p class="empty-state__title">No splits to show yet</p><p class="empty-state__text">Add people and items to see the breakdown.</p></div>';
      return;
    }
    var splits = calculateSplits();
    renderSplitTable(splits);
  }


  function renderSplitTable(splits) {
    var grandTotal = 0;
    var html = '<table class="split-table" role="table"><thead><tr><th scope="col">Person</th><th scope="col">Items</th><th scope="col"># Items</th><th scope="col">Amount</th></tr></thead><tbody>';
    state.people.forEach(function (person) {
      var data = splits[person.id];
      grandTotal += data.total;
      var itemNames = data.details.map(function (d) { return d.name; }).join(', ') || '—';
      html += '<tr><td><div class="split-table__person-cell"><div class="split-table__avatar" style="background: ' + avatarColor(person.id) + '">' + escapeHTML(getInitials(person.name)) + '</div><span class="split-table__name">' + escapeHTML(person.name) + '</span></div></td><td class="split-table__items-list">' + escapeHTML(itemNames) + '</td><td>' + data.details.length + '</td><td class="split-table__amount">' + formatCurrency(data.total) + '</td></tr>';
    });
    html += '</tbody><tfoot><tr><td colspan="3">Total</td><td class="split-table__amount">' + formatCurrency(grandTotal) + '</td></tr></tfoot></table>';
    $splitSummary.innerHTML = html;
  }

  // ── Suggestions Dropdown ──
  function showSuggestions() {
    var query = $personName.value.trim().toLowerCase();
    var groups = Storage.get('groups') || [];
    var savedPeople = Storage.get('savedPeople') || [];
    var currentNames = state.people.map(function (p) { return p.name.toLowerCase(); });

    // Filter people not already added
    var filteredPeople = savedPeople.filter(function (n) {
      return !currentNames.includes(n.toLowerCase()) && (query === '' || n.toLowerCase().indexOf(query) > -1);
    });
    var filteredGroups = groups.filter(function (g) {
      return query === '' || g.name.toLowerCase().indexOf(query) > -1;
    });

    if (filteredGroups.length === 0 && filteredPeople.length === 0) {
      $personSuggestions.style.display = 'none';
      return;
    }

    var html = '';
    if (filteredGroups.length > 0) {
      html += '<div class="suggestion-section"><div class="suggestion-section__title">Groups</div>';
      filteredGroups.forEach(function (g) {
        html += '<div class="suggestion-item-row"><button type="button" class="suggestion-item suggestion-item--group" data-suggest-group="' + g.id + '"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/><line x1="20" y1="8" x2="20" y2="14"/></svg> ' + escapeHTML(g.name) + ' <span class="suggestion-item__count">(' + g.members.length + ')</span></button><button type="button" class="suggestion-item__remove" data-remove-saved-group="' + g.id + '" title="Remove group"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>';
      });
      html += '</div>';
    }
    if (filteredPeople.length > 0) {
      html += '<div class="suggestion-section"><div class="suggestion-section__title">People</div>';
      filteredPeople.forEach(function (n) {
        html += '<div class="suggestion-item-row"><button type="button" class="suggestion-item" data-suggest-person="' + escapeHTML(n) + '">' + escapeHTML(n) + '</button><button type="button" class="suggestion-item__remove" data-remove-saved-person="' + escapeHTML(n) + '" title="Remove person"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>';
      });
      html += '</div>';
    }
    $personSuggestions.innerHTML = html;
    $personSuggestions.style.display = '';
  }

  $personName.addEventListener('input', showSuggestions);
  $personName.addEventListener('focus', showSuggestions);
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#add-person-form')) $personSuggestions.style.display = 'none';
  });

  $personSuggestions.addEventListener('click', function (e) {
    // Delete a saved person
    var removePersonBtn = e.target.closest('[data-remove-saved-person]');
    if (removePersonBtn) {
      var nameToRemove = removePersonBtn.dataset.removeSavedPerson;
      var saved = Storage.get('savedPeople') || [];
      saved = saved.filter(function (n) { return n.toLowerCase() !== nameToRemove.toLowerCase(); });
      Storage.set('savedPeople', saved);
      showSuggestions();
      showToast('Person removed from suggestions');
      return;
    }
    // Delete a saved group
    var removeGroupBtn = e.target.closest('[data-remove-saved-group]');
    if (removeGroupBtn) {
      var gId = parseInt(removeGroupBtn.dataset.removeSavedGroup, 10);
      var groups = Storage.get('groups') || [];
      groups = groups.filter(function (g) { return g.id !== gId; });
      Storage.set('groups', groups);
      showSuggestions();
      showToast('Group removed from suggestions');
      return;
    }
    // Add a single person
    var personBtn = e.target.closest('[data-suggest-person]');
    if (personBtn) {
      addPerson(personBtn.dataset.suggestPerson);
      $personName.value = '';
      $personSuggestions.style.display = 'none';
      return;
    }
    // Toggle a group: add members not present, remove members that are present
    var groupBtn = e.target.closest('[data-suggest-group]');
    if (groupBtn) {
      var allGroups = Storage.get('groups') || [];
      var group = allGroups.find(function (g) { return g.id === parseInt(groupBtn.dataset.suggestGroup, 10); });
      if (group) {
        var currentNames = state.people.map(function (p) { return p.name.toLowerCase(); });
        var allPresent = group.members.every(function (m) { return currentNames.includes(m.toLowerCase()); });
        if (allPresent) {
          // Remove all group members
          group.members.forEach(function (name) {
            var person = state.people.find(function (p) { return p.name.toLowerCase() === name.toLowerCase(); });
            if (person) removePerson(person.id);
          });
        } else {
          // Add missing members
          group.members.forEach(function (name) { addPerson(name); });
        }
      }
      $personName.value = '';
      $personSuggestions.style.display = 'none';
    }
  });



  $saveGroupBtn.addEventListener('click', function () {
    if (state.people.length < 2) { showToast('Add at least 2 people to save a group', 'error'); return; }
    $saveGroupForm.style.display = 'flex';
    $groupNameInput.value = '';
    $groupNameInput.focus();
  });

  $groupNameCancel.addEventListener('click', function () { $saveGroupForm.style.display = 'none'; });

  $groupNameConfirm.addEventListener('click', function () {
    var name = $groupNameInput.value.trim();
    if (!name) { showToast('Please enter a group name', 'error'); return; }
    var groups = Storage.get('groups') || [];
    var maxId = groups.reduce(function (m, g) { return Math.max(m, g.id); }, 0);
    groups.push({ id: maxId + 1, name: name, members: state.people.map(function (p) { return p.name; }) });
    Storage.set('groups', groups);
    $saveGroupForm.style.display = 'none';
    showToast('Group "' + name + '" saved!');
  });


  // ── Event Handlers ──
  $personForm.addEventListener('submit', function (e) {
    e.preventDefault();
    addPerson($personName.value);
    $personName.value = '';
    $personName.focus();
    $personSuggestions.style.display = 'none';
  });

  $peopleList.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-remove-person]');
    if (btn) removePerson(parseInt(btn.dataset.removePerson, 10));
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
    var removeBtn = e.target.closest('[data-remove-item]');
    if (removeBtn) { removeItem(parseInt(removeBtn.dataset.removeItem, 10)); return; }
    var dupBtn = e.target.closest('[data-duplicate-item]');
    if (dupBtn) { duplicateItem(parseInt(dupBtn.dataset.duplicateItem, 10)); return; }
    var toggleBtn = e.target.closest('[data-toggle-all-consumers]');
    if (toggleBtn) { toggleAllConsumers(parseInt(toggleBtn.dataset.toggleAllConsumers, 10)); return; }
  });

  $itemsTableWrap.addEventListener('change', function (e) {
    var checkbox = e.target.closest('[data-consumer-toggle]');
    if (checkbox) { toggleConsumer(parseInt(checkbox.dataset.itemId, 10), parseInt(checkbox.dataset.personId, 10)); return; }
    var editInput = e.target.closest('[data-edit-field]');
    if (editInput) {
      var itemId = parseInt(editInput.dataset.editItem, 10);
      var field = editInput.dataset.editField;
      var item = state.items.find(function (i) { return i.id === itemId; });
      if (!item) return;
      if (field === 'name') { var v = editInput.value.trim(); if (v) item.name = v; else editInput.value = item.name; }
      else if (field === 'unitPrice') { var v2 = parseFloat(editInput.value); if (v2 > 0) item.unitPrice = v2; else editInput.value = item.unitPrice; }
      else if (field === 'quantity') { var v3 = parseInt(editInput.value, 10); if (v3 >= 1) item.quantity = v3; else editInput.value = item.quantity; }
      var row = editInput.closest('tr');
      var totalCell = row.querySelector('.item-total');
      if (totalCell) totalCell.textContent = formatCurrency(item.unitPrice * item.quantity);
      $grandTotalAmt.textContent = formatCurrency(getGrandTotal());
      renderSplitSummary();
    }
  });

  // ── Theme Toggle ──
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    Storage.set('theme', theme);
  }
  $themeToggle.addEventListener('click', function () {
    setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });
  (function initTheme() {
    var saved = Storage.get('theme');
    if (saved) setTheme(saved);
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
  })();

  // ── Currency ──
  $currencySelect.addEventListener('change', function () {
    state.currency = $currencySelect.value;
    Storage.set('currency', state.currency);
    render();
  });
  (function initCurrency() {
    var saved = Storage.get('currency');
    if (saved) { state.currency = saved; $currencySelect.value = saved; }
  })();


  // ── Copy to Clipboard (simplified — no item details) ──
  function buildSummaryText() {
    if (state.people.length === 0 || state.items.length === 0) return '';
    var splits = calculateSplits();
    var lines = [];
    var grandTotal = 0;
    lines.push('Split Summary');
    lines.push('─'.repeat(30));
    state.people.forEach(function (person) {
      var data = splits[person.id];
      grandTotal += data.total;
      lines.push('');
      lines.push(person.name + ' — ' + formatCurrency(data.total));
    });
    lines.push('');
    lines.push('─'.repeat(30));
    lines.push('Total: ' + formatCurrency(grandTotal));
    return lines.join('\n');
  }

  $copySummary.addEventListener('click', async function () {
    var text = buildSummaryText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      $copySummary.classList.add('btn-copy-summary--copied');
      $copySummary.setAttribute('title', 'Copied!');
      setTimeout(function () {
        $copySummary.classList.remove('btn-copy-summary--copied');
        $copySummary.setAttribute('title', 'Copy to clipboard');
      }, 2000);
    } catch (err) { console.error('Copy failed:', err); }
  });

  // ── Save Bill ──
  $saveBillBtn.addEventListener('click', function () {
    if (state.items.length === 0 && state.people.length === 0) { showToast('Nothing to save yet!', 'error'); return; }
    $billNameInput.value = state.billName || '';
    $saveBillModal.style.display = 'flex';
    $billNameInput.focus();
  });
  $saveBillCancel.addEventListener('click', function () { $saveBillModal.style.display = 'none'; });
  $saveBillModal.addEventListener('click', function (e) { if (e.target === $saveBillModal) $saveBillModal.style.display = 'none'; });

  $saveBillConfirm.addEventListener('click', function () {
    var name = $billNameInput.value.trim();
    if (!name) { showToast('Please enter a bill name', 'error'); return; }
    state.billName = name;
    var bills = Storage.get('savedBills') || [];
    bills.push({
      id: generateId(),
      name: name,
      date: new Date().toISOString(),
      currency: state.currency,
      people: JSON.parse(JSON.stringify(state.people)),
      items: JSON.parse(JSON.stringify(state.items)),
      images: state.images.slice(),
    });
    Storage.set('savedBills', bills);
    $saveBillModal.style.display = 'none';
    showToast('Bill "' + name + '" saved!');
  });

  // ── Images ──
  $imageInput.addEventListener('change', function () {
    var files = Array.from($imageInput.files);
    files.forEach(function (file) {
      var reader = new FileReader();
      reader.onload = function (e) {
        state.images.push({ dataUrl: e.target.result, name: file.name });
        renderImagePreviews();
      };
      reader.readAsDataURL(file);
    });
    $imageInput.value = '';
  });

  function renderImagePreviews() {
    if (state.images.length === 0) { $imagePreviews.innerHTML = ''; return; }
    $imagePreviews.innerHTML = state.images.map(function (img, i) {
      return '<div class="image-preview"><img src="' + img.dataUrl + '" alt="' + escapeHTML(img.name) + '"/><button type="button" class="image-preview__remove" data-remove-image="' + i + '" title="Remove"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>';
    }).join('');
  }

  $imagePreviews.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-remove-image]');
    if (!btn) return;
    state.images.splice(parseInt(btn.dataset.removeImage, 10), 1);
    renderImagePreviews();
  });

  // ── PDF Export ──
  var PDF_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>';

  function triggerDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }

  $exportPdf.addEventListener('click', function () {
    if (state.items.length === 0) return;
    $exportPdf.disabled = true;
    $exportPdf.textContent = 'Exporting…';

    try {
      var JsPDFConstructor;
      if (window.jspdf && window.jspdf.jsPDF) JsPDFConstructor = window.jspdf.jsPDF;
      else if (window.jsPDF) JsPDFConstructor = window.jsPDF;
      else throw new Error('jsPDF library not loaded.');

      var pdf = new JsPDFConstructor('p', 'mm', 'a4');
      var pageWidth = pdf.internal.pageSize.getWidth();
      var pageHeight = pdf.internal.pageSize.getHeight();
      var margin = 14;

      // Header
      pdf.setFontSize(20);
      pdf.setFont(undefined, 'bold');
      pdf.text('LettuceSplit', margin, 20);
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(120);
      var dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      pdf.text(dateStr, pageWidth - margin, 20, { align: 'right' });
      pdf.setTextColor(0);

      // Bill Items Table — use billName if set
      pdf.setFontSize(13);
      pdf.setFont(undefined, 'bold');
      pdf.text(state.billName || 'Bill Items', margin, 32);

      var peopleMap = {};
      state.people.forEach(function (p) { peopleMap[p.id] = p.name; });

      var itemRows = state.items.map(function (item) {
        var total = item.unitPrice * item.quantity;
        var sharedBy = item.consumers.map(function (id) { return peopleMap[id] || '?'; }).join(', ') || '—';
        return [item.name, formatCurrency(item.unitPrice), String(item.quantity), formatCurrency(total), sharedBy];
      });

      var grandTotal = state.items.reduce(function (s, i) { return s + i.unitPrice * i.quantity; }, 0);
      itemRows.push(['', '', '', formatCurrency(grandTotal), '']);

      pdf.autoTable({
        startY: 36, head: [['Item', 'Price', 'Qty', 'Total', 'Shared By']], body: itemRows,
        margin: { left: margin, right: margin }, theme: 'grid',
        headStyles: { fillColor: [80, 80, 80], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'right', cellWidth: 28 }, 2: { halign: 'center', cellWidth: 16 }, 3: { halign: 'right', cellWidth: 28 }, 4: { cellWidth: 'auto' } },
        didParseCell: function (data) {
          if (data.section === 'body' && data.row.index === itemRows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
          }
        },
      });

      // Split Summary Table
      var splitY = pdf.lastAutoTable.finalY + 12;
      pdf.setFontSize(13);
      pdf.setFont(undefined, 'bold');
      pdf.text('Split Summary', margin, splitY);

      var splits = calculateSplits();
      var splitGrandTotal = 0;
      var splitRows = state.people.map(function (person) {
        var data = splits[person.id];
        splitGrandTotal += data.total;
        var itemNames = data.details.map(function (d) { return d.name; }).join(', ') || '—';
        return [person.name, itemNames, String(data.details.length), formatCurrency(data.total)];
      });
      splitRows.push(['Total', '', '', formatCurrency(splitGrandTotal)]);

      pdf.autoTable({
        startY: splitY + 4, head: [['Person', 'Items', '# Items', 'Amount']], body: splitRows,
        margin: { left: margin, right: margin }, theme: 'grid',
        headStyles: { fillColor: [80, 80, 80], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 36 }, 1: { cellWidth: 'auto' }, 2: { halign: 'center', cellWidth: 20 }, 3: { halign: 'right', cellWidth: 30 } },
        didParseCell: function (data) {
          if (data.section === 'body' && data.row.index === splitRows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
          }
        },
      });

      // Images in PDF
      if (state.images.length > 0) {
        var imgY = pdf.lastAutoTable.finalY + 12;
        pdf.setFontSize(13);
        pdf.setFont(undefined, 'bold');
        pdf.text('Images', margin, imgY);
        var currentY = imgY + 6;
        var maxW = pageWidth - margin * 2;

        state.images.forEach(function (img) {
          try {
            var imgProps = pdf.getImageProperties(img.dataUrl);
            var ratio = imgProps.width / imgProps.height;
            var w = Math.min(maxW, 120);
            var h = w / ratio;
            if (h > 160) { h = 160; w = h * ratio; }
            if (currentY + h + 10 > pageHeight - 10) {
              pdf.addPage();
              currentY = 20;
            }
            pdf.addImage(img.dataUrl, 'JPEG', margin, currentY, w, h);
            currentY += h + 8;
          } catch (imgErr) {
            console.warn('Could not add image to PDF:', imgErr);
          }
        });
      }

      var pdfBlob = pdf.output('blob');
      triggerDownload(pdfBlob, 'lettuce-split.pdf');
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('PDF export failed. Please try again.');
    } finally {
      $exportPdf.disabled = false;
      $exportPdf.innerHTML = PDF_ICON + ' Export as PDF';
    }
  });

  // ── Initial Load ──
  render();
  renderImagePreviews();
  var savedBills = Storage.get('savedBills') || [];
  if (savedBills.length > 0) showLanding();
  else showApp();

})();
