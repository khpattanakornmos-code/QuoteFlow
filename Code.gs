// QuoteFlow backend for Google Apps Script
// 1) Replace SPREADSHEET_ID with your Google Sheet ID.
// 2) Deploy as Web app: Execute as Me, Who has access Anyone.

var SPREADSHEET_ID = '1TcUQ-c98-CWcEUUjpgQW7K4-pQrzIOfoQjrGs584EnY';
var DEPOSIT1_PCT = 40;

var SHEETS = {
  users: {
    name: 'Users',
    headers: ['email', 'name', 'role', 'createdAt', 'lastLoginAt']
  },
  quotations: {
    name: 'Quotations',
    headers: ['id', 'email', 'customerName', 'note', 'items', 'subtotal', 'vat', 'total', 'status', 'createdAt', 'updatedAt']
  },
  orders: {
    name: 'ActiveOrders',
    headers: ['quotationId', 'email', 'customerName', 'total', 'status', 'dueDate', 'timeline', 'depositPct', 'depositAmount', 'depositPaid', 'createdAt', 'updatedAt']
  },
  finance: {
    name: 'Finance',
    headers: ['id', 'email', 'type', 'category', 'amount', 'description', 'date', 'month', 'year', 'createdAt']
  },
  payroll: {
    name: 'Payroll',
    headers: ['id', 'email', 'workerName', 'workerType', 'amount', 'description', 'dueDate', 'status', 'createdAt', 'paidAt']
  },
  receivables: {
    name: 'Receivables',
    headers: ['id', 'email', 'customerName', 'quotationId', 'amount', 'paidAmount', 'balance', 'status', 'dueDate', 'note', 'createdAt', 'updatedAt']
  }
};

function doGet(e) {
  try {
    var action = (e.parameter.action || 'ping').trim();
    var email = normalizeEmail(e.parameter.email || '');
    var data = parseJson(e.parameter.data, {});
    if (!email && data.email) email = normalizeEmail(data.email);

    if (action === 'ping') return jsonOut({ success: true, status: 'QuoteFlow API running' });
    if (action === 'login') return jsonOut(loginUser(data, email));
    if (action === 'getQuotations') return jsonOut({ success: true, data: getQuotations(email) });
    if (action === 'getActiveOrders') return jsonOut({ success: true, data: getActiveOrders(email) });
    if (action === 'getFinance') return jsonOut({ success: true, data: getFinance(email, data) });
    if (action === 'getPayroll') return jsonOut({ success: true, data: getPayroll(email) });
    if (action === 'getReceivables') return jsonOut({ success: true, data: getReceivables(email) });
    if (action === 'getDashboard') return jsonOut({ success: true, data: getDashboard(email) });

    return jsonOut({ success: false, error: 'Unknown GET action: ' + action });
  } catch (err) {
    return jsonOut({ success: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var payload = parseJson(e.postData && e.postData.contents, {});
    var action = payload.action || '';
    var data = payload.data || {};
    var email = normalizeEmail(payload.email || data.email || '');

    if (action === 'login') return jsonOut(loginUser(data, email));
    if (action === 'createQuotation') return jsonOut(createQuotation(data, email));
    if (action === 'updateQuotation') return jsonOut(updateQuotation(data, email));
    if (action === 'deleteQuotation') return jsonOut(deleteQuotation(data, email));
    if (action === 'activateOrder') return jsonOut(activateOrder(data, email));
    if (action === 'updateOrderStatus') return jsonOut(updateOrderStatus(data, email));
    if (action === 'addFinance') return jsonOut(addFinance(data, email));
    if (action === 'deleteFinance') return jsonOut(deleteFinance(data, email));
    if (action === 'addPayroll') return jsonOut(addPayroll(data, email));
    if (action === 'updatePayroll') return jsonOut(updatePayroll(data, email));
    if (action === 'addReceivable') return jsonOut(addReceivable(data, email));
    if (action === 'updateReceivable') return jsonOut(updateReceivable(data, email));

    return jsonOut({ success: false, error: 'Unknown POST action: ' + action });
  } catch (err) {
    return jsonOut({ success: false, error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function loginUser(data, email) {
  email = normalizeEmail(email || data.email);
  if (!email) return { success: false, error: 'Missing email' };
  var rows = readRows('users');
  var found = findRow(rows, function(r) { return normalizeEmail(r.email) === email; });
  var now = isoNow();
  if (found) {
    updateByKey('users', 'email', email, { name: data.name || found.row.name, lastLoginAt: now });
    return { success: true, user: cleanUser(Object.assign({}, found.row, { name: data.name || found.row.name, lastLoginAt: now })) };
  }
  var user = { email: email, name: data.name || email.split('@')[0], role: 'admin', createdAt: now, lastLoginAt: now };
  appendObject('users', user);
  return { success: true, user: cleanUser(user) };
}

function createQuotation(data, email) {
  requireEmail(email);
  var now = isoNow();
  var id = data.id || makeId('QT');
  var qt = {
    id: id,
    email: email,
    customerName: data.customerName || '',
    note: data.note || '',
    items: JSON.stringify(data.items || []),
    subtotal: numberOf(data.subtotal),
    vat: numberOf(data.vat),
    total: numberOf(data.total),
    status: data.status || 'Draft',
    createdAt: data.createdAt || now,
    updatedAt: now
  };
  appendObject('quotations', qt);
  return { success: true, id: id };
}

function updateQuotation(data, email) {
  requireEmail(email);
  if (!data.id) return { success: false, error: 'Missing quotation id' };
  var patch = {
    customerName: data.customerName || '',
    note: data.note || '',
    items: JSON.stringify(data.items || []),
    subtotal: numberOf(data.subtotal),
    vat: numberOf(data.vat),
    total: numberOf(data.total),
    status: data.status || 'Draft',
    updatedAt: isoNow()
  };
  return updateOwnedByKey('quotations', 'id', data.id, email, patch);
}

function deleteQuotation(data, email) {
  requireEmail(email);
  if (!data.id) return { success: false, error: 'Missing quotation id' };
  return deleteOwnedByKey('quotations', 'id', data.id, email);
}

function activateOrder(data, email) {
  requireEmail(email);
  if (!data.quotationId) return { success: false, error: 'Missing quotation id' };
  var now = isoNow();
  var total = numberOf(data.total);
  var depositPct = normalizePercent(data.depositPct, DEPOSIT1_PCT);
  var depositAmount = data.depositAmount !== undefined ? numberOf(data.depositAmount) : Math.round(total * depositPct / 100);
  updateOwnedByKey('quotations', 'id', data.quotationId, email, { status: 'Active', updatedAt: now });
  syncActivationLedger(data, email, total, depositPct, depositAmount, true, now);

  var orders = readRows('orders');
  var existing = findRow(orders, function(r) {
    return r.quotationId === data.quotationId && normalizeEmail(r.email) === email;
  });
  if (existing) {
    return updateOwnedByKey('orders', 'quotationId', data.quotationId, email, {
      customerName: data.customerName || existing.row.customerName,
      total: total || numberOf(existing.row.total),
      depositPct: depositPct,
      depositAmount: depositAmount,
      depositPaid: true,
      updatedAt: now
    });
  }

  appendObject('orders', {
    quotationId: data.quotationId,
    email: email,
    customerName: data.customerName || '',
    total: total,
    status: 'In Progress',
    dueDate: data.dueDate || addDaysIso(75),
    timeline: JSON.stringify([{ step: 'รับงาน', date: now }]),
    depositPct: depositPct,
    depositAmount: depositAmount,
    depositPaid: true,
    createdAt: now,
    updatedAt: now
  });
  return { success: true, depositPct: depositPct, depositAmount: depositAmount };
}

function syncActivationLedger(data, email, total, depositPct, depositAmount, depositPaid, now) {
  var qId = data.quotationId;
  var customerName = data.customerName || '';
  var dueDate = data.dueDate || addDaysIso(75);
  var paidAmount = depositPaid ? depositAmount : 0;
  upsertFinance({
    id: 'FIN-' + qId + '-DEP',
    email: email,
    type: 'income',
    category: 'เงินมัดจำ',
    amount: paidAmount,
    description: 'มัดจำ ' + depositPct + '% ใบเสนอราคา ' + qId + (customerName ? ' - ' + customerName : ''),
    date: toIsoDate(new Date(now)),
    month: Number(now.substring(5, 7)),
    year: Number(now.substring(0, 4)),
    createdAt: now
  });
  upsertReceivable({
    id: 'RV-' + qId,
    email: email,
    customerName: customerName,
    quotationId: qId,
    amount: total,
    paidAmount: paidAmount,
    balance: Math.max(0, total - paidAmount),
    status: receivableStatus(total, paidAmount),
    dueDate: dueDate,
    note: 'สร้างอัตโนมัติจาก Active Quotation (มัดจำ ' + depositPct + '%)',
    createdAt: now,
    updatedAt: now
  });
}

function updateOrderStatus(data, email) {
  requireEmail(email);
  if (!data.quotationId) return { success: false, error: 'Missing quotation id' };
  var rows = readRows('orders');
  var found = findRow(rows, function(r) {
    return r.quotationId === data.quotationId && normalizeEmail(r.email) === email;
  });
  if (!found) return { success: false, error: 'Order not found' };

  var timeline = parseJson(found.row.timeline, []);
  if (!Array.isArray(timeline)) timeline = [];
  if (data.newStep) {
    timeline.push({ step: data.newStep, date: isoNow() });
  }
  var status = data.status || found.row.status || 'In Progress';
  var depositPct = normalizePercent(data.depositPct, numberOf(found.row.depositPct) || DEPOSIT1_PCT);
  var depositAmount = data.depositAmount !== undefined ? numberOf(data.depositAmount) : Math.round(numberOf(found.row.total) * depositPct / 100);
  var depositPaid = data.depositPaid === true || data.depositPaid === 'true';
  syncActivationLedger({
    quotationId: data.quotationId,
    customerName: found.row.customerName,
    dueDate: data.dueDate || found.row.dueDate || ''
  }, email, numberOf(found.row.total), depositPct, depositAmount, depositPaid, isoNow());
  if (status === 'Completed') {
    updateOwnedByKey('quotations', 'id', data.quotationId, email, { status: 'Closed', updatedAt: isoNow() });
  }
  return updateOwnedByKey('orders', 'quotationId', data.quotationId, email, {
    status: status,
    dueDate: data.dueDate || found.row.dueDate || '',
    timeline: JSON.stringify(timeline),
    depositPct: depositPct,
    depositAmount: depositAmount,
    depositPaid: depositPaid,
    updatedAt: isoNow()
  });
}

function addFinance(data, email) {
  requireEmail(email);
  var now = new Date();
  var date = data.date || toIsoDate(now);
  appendObject('finance', {
    id: data.id || makeId('FIN'),
    email: email,
    type: data.type || 'income',
    category: data.category || '',
    amount: numberOf(data.amount),
    description: data.description || '',
    date: date,
    month: Number(data.month || now.getMonth() + 1),
    year: Number(data.year || now.getFullYear()),
    createdAt: isoNow()
  });
  return { success: true };
}

function deleteFinance(data, email) {
  requireEmail(email);
  return deleteOwnedByKey('finance', 'id', data.id, email);
}

function addPayroll(data, email) {
  requireEmail(email);
  appendObject('payroll', {
    id: data.id || makeId('PAY'),
    email: email,
    workerName: data.workerName || '',
    workerType: data.workerType || 'พนักงาน',
    amount: numberOf(data.amount),
    description: data.description || '',
    dueDate: data.dueDate || '',
    status: data.status || 'Pending',
    createdAt: isoNow(),
    paidAt: ''
  });
  return { success: true };
}

function updatePayroll(data, email) {
  requireEmail(email);
  var patch = { status: data.status || 'Pending' };
  if (patch.status === 'Paid') patch.paidAt = isoNow();
  return updateOwnedByKey('payroll', 'id', data.id, email, patch);
}

function addReceivable(data, email) {
  requireEmail(email);
  var amount = numberOf(data.amount);
  var paid = numberOf(data.paidAmount);
  appendObject('receivables', {
    id: data.id || makeId('RV'),
    email: email,
    customerName: data.customerName || '',
    quotationId: data.quotationId || '',
    amount: amount,
    paidAmount: paid,
    balance: Math.max(0, amount - paid),
    status: receivableStatus(amount, paid),
    dueDate: data.dueDate || '',
    note: data.note || '',
    createdAt: isoNow(),
    updatedAt: isoNow()
  });
  return { success: true };
}

function updateReceivable(data, email) {
  requireEmail(email);
  var rows = readRows('receivables');
  var found = findRow(rows, function(r) { return r.id === data.id && normalizeEmail(r.email) === email; });
  if (!found) return { success: false, error: 'Receivable not found' };
  var amount = numberOf(found.row.amount);
  var paid = numberOf(data.paidAmount);
  return updateOwnedByKey('receivables', 'id', data.id, email, {
    paidAmount: paid,
    balance: Math.max(0, amount - paid),
    status: receivableStatus(amount, paid),
    note: data.note || found.row.note || '',
    updatedAt: isoNow()
  });
}

function getQuotations(email) {
  requireEmail(email);
  return readRows('quotations')
    .filter(function(r) { return normalizeEmail(r.email) === email; })
    .map(normalizeQuotation);
}

function getActiveOrders(email) {
  requireEmail(email);
  return readRows('orders')
    .filter(function(r) { return normalizeEmail(r.email) === email; })
    .map(function(r) {
      r.total = numberOf(r.total);
      r.timeline = parseJson(r.timeline, []);
      r.depositPct = numberOf(r.depositPct);
      r.depositAmount = numberOf(r.depositAmount);
      r.depositPaid = r.depositPaid === true || r.depositPaid === 'true';
      return r;
    });
}

function getFinance(email, data) {
  requireEmail(email);
  var month = Number(data.month || new Date().getMonth() + 1);
  var year = Number(data.year || new Date().getFullYear());
  return readRows('finance')
    .filter(function(r) {
      return normalizeEmail(r.email) === email && Number(r.month) === month && Number(r.year) === year;
    })
    .map(function(r) { r.amount = numberOf(r.amount); return r; });
}

function getFinanceYearSummary(email, year) {
  requireEmail(email);
  var monthly = [];
  for (var i = 1; i <= 12; i++) {
    monthly.push({ month: i, income: 0, expense: 0, profit: 0 });
  }
  readRows('finance')
    .filter(function(r) {
      return normalizeEmail(r.email) === email && Number(r.year) === Number(year);
    })
    .forEach(function(r) {
      var month = Number(r.month);
      if (month < 1 || month > 12) return;
      var bucket = monthly[month - 1];
      if (r.type === 'income') bucket.income += numberOf(r.amount);
      if (r.type === 'expense') bucket.expense += numberOf(r.amount);
      bucket.profit = bucket.income - bucket.expense;
    });
  return monthly;
}

function getPayroll(email) {
  requireEmail(email);
  return readRows('payroll')
    .filter(function(r) { return normalizeEmail(r.email) === email; })
    .map(function(r) { r.amount = numberOf(r.amount); return r; });
}

function getReceivables(email) {
  requireEmail(email);
  return readRows('receivables')
    .filter(function(r) { return normalizeEmail(r.email) === email; })
    .map(function(r) {
      r.amount = numberOf(r.amount);
      r.paidAmount = numberOf(r.paidAmount);
      r.balance = numberOf(r.balance);
      return r;
    });
}

function getDashboard(email) {
  requireEmail(email);
  var now = new Date();
  var year = now.getFullYear();
  var quotations = getQuotations(email);
  var active = getActiveOrders(email);
  var finance = getFinance(email, { month: now.getMonth() + 1, year: year });
  var payroll = getPayroll(email);
  var receivables = getReceivables(email);
  var income = finance.filter(function(r) { return r.type === 'income'; }).reduce(sumAmount, 0);
  var expense = finance.filter(function(r) { return r.type === 'expense'; }).reduce(sumAmount, 0);

  return {
    quotationCount: quotations.length,
    activeCount: quotations.filter(function(q) { return q.status === 'Active'; }).length,
    closedCount: quotations.filter(function(q) { return q.status === 'Closed'; }).length,
    draftCount: quotations.filter(function(q) { return q.status === 'Draft'; }).length,
    totalIncome: income,
    totalExpense: expense,
    netProfit: income - expense,
    totalReceivable: receivables.filter(function(r) { return r.status !== 'Paid'; }).reduce(function(s, r) { return s + numberOf(r.balance); }, 0),
    totalPayroll: payroll.filter(function(r) { return r.status === 'Pending'; }).reduce(sumAmount, 0),
    recentQuotations: quotations.sort(sortCreatedDesc).slice(0, 5),
    recentActive: active.sort(sortUpdatedDesc).slice(0, 5),
    monthlyFinance: getFinanceYearSummary(email, year)
  };
}

function normalizeQuotation(r) {
  r.items = parseJson(r.items, []);
  r.subtotal = numberOf(r.subtotal);
  r.vat = numberOf(r.vat);
  r.total = numberOf(r.total);
  return r;
}

function getBook() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID') {
    throw new Error('Please set SPREADSHEET_ID in Code.gs');
  }
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheetConfig(key) {
  var config = SHEETS[key];
  if (!config) throw new Error('Unknown sheet key: ' + key);
  return config;
}

function getSheet(key) {
  var config = getSheetConfig(key);
  var ss = getBook();
  var sh = ss.getSheetByName(config.name) || ss.insertSheet(config.name);
  ensureHeaders(sh, config.headers);
  return sh;
}

function ensureHeaders(sh, headers) {
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }
  var current = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getValues()[0];
  var changed = false;
  headers.forEach(function(h) {
    if (current.indexOf(h) < 0) {
      current.push(h);
      changed = true;
    }
  });
  if (changed || current.length < headers.length) {
    sh.getRange(1, 1, 1, current.length).setValues([current]);
  }
}

function readRows(key) {
  var sh = getSheet(key);
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  if (lastRow < 2) return [];
  var values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values.shift();
  return values.map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function appendObject(key, obj) {
  var config = getSheetConfig(key);
  var sh = getSheet(key);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  config.headers.forEach(function(h) {
    if (headers.indexOf(h) < 0) headers.push(h);
  });
  sh.appendRow(headers.map(function(h) { return obj[h] !== undefined ? obj[h] : ''; }));
}

function upsertFinance(obj) {
  var rows = readRows('finance');
  var found = findRow(rows, function(r) {
    return String(r.id) === String(obj.id) && normalizeEmail(r.email) === normalizeEmail(obj.email);
  });
  if (found) {
    return updateOwnedByKey('finance', 'id', obj.id, normalizeEmail(obj.email), {
      type: obj.type,
      category: obj.category,
      amount: obj.amount,
      description: obj.description,
      date: obj.date,
      month: obj.month,
      year: obj.year
    });
  }
  appendObject('finance', obj);
  return { success: true, id: obj.id };
}

function upsertReceivable(obj) {
  var rows = readRows('receivables');
  var found = findRow(rows, function(r) {
    return String(r.id) === String(obj.id) && normalizeEmail(r.email) === normalizeEmail(obj.email);
  });
  if (found) {
    return updateOwnedByKey('receivables', 'id', obj.id, normalizeEmail(obj.email), {
      customerName: obj.customerName,
      quotationId: obj.quotationId,
      amount: obj.amount,
      paidAmount: obj.paidAmount,
      balance: obj.balance,
      status: obj.status,
      dueDate: obj.dueDate,
      note: obj.note,
      updatedAt: obj.updatedAt
    });
  }
  appendObject('receivables', obj);
  return { success: true, id: obj.id };
}

function updateByKey(key, keyName, keyValue, patch) {
  var sh = getSheet(key);
  var values = sh.getDataRange().getValues();
  var headers = values[0];
  var keyIdx = headers.indexOf(keyName);
  if (keyIdx < 0) return { success: false, error: 'Missing key column' };
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][keyIdx]) === String(keyValue)) {
      Object.keys(patch).forEach(function(k) {
        var c = headers.indexOf(k);
        if (c >= 0) sh.getRange(r + 1, c + 1).setValue(patch[k]);
      });
      return { success: true, id: keyValue };
    }
  }
  return { success: false, error: 'Row not found' };
}

function updateOwnedByKey(key, keyName, keyValue, email, patch) {
  var sh = getSheet(key);
  var values = sh.getDataRange().getValues();
  var headers = values[0];
  var keyIdx = headers.indexOf(keyName);
  var emailIdx = headers.indexOf('email');
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][keyIdx]) === String(keyValue) && normalizeEmail(values[r][emailIdx]) === email) {
      Object.keys(patch).forEach(function(k) {
        var c = headers.indexOf(k);
        if (c >= 0) sh.getRange(r + 1, c + 1).setValue(patch[k]);
      });
      return { success: true, id: keyValue };
    }
  }
  return { success: false, error: 'Row not found' };
}

function deleteOwnedByKey(key, keyName, keyValue, email) {
  var sh = getSheet(key);
  var values = sh.getDataRange().getValues();
  var headers = values[0];
  var keyIdx = headers.indexOf(keyName);
  var emailIdx = headers.indexOf('email');
  for (var r = values.length - 1; r >= 1; r--) {
    if (String(values[r][keyIdx]) === String(keyValue) && normalizeEmail(values[r][emailIdx]) === email) {
      sh.deleteRow(r + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'Row not found' };
}

function findRow(rows, predicate) {
  for (var i = 0; i < rows.length; i++) {
    if (predicate(rows[i])) return { row: rows[i], index: i };
  }
  return null;
}

function parseJson(text, fallback) {
  try {
    if (text === undefined || text === null || text === '') return fallback;
    return JSON.parse(text);
  } catch (e) {
    return fallback;
  }
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function cleanUser(u) {
  return { email: u.email, name: u.name || u.email, role: u.role || 'admin' };
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function requireEmail(email) {
  if (!email) throw new Error('Missing email');
}

function numberOf(value) {
  var n = Number(value);
  return isFinite(n) ? n : 0;
}

function normalizePercent(value, fallback) {
  var n = Number(value);
  if (!isFinite(n)) n = Number(fallback);
  if (!isFinite(n)) n = 0;
  return Math.max(0, Math.min(100, n));
}

function receivableStatus(amount, paid) {
  amount = numberOf(amount);
  paid = numberOf(paid);
  if (paid >= amount && amount > 0) return 'Paid';
  if (paid > 0) return 'Partial';
  return 'Unpaid';
}

function sumAmount(sum, row) {
  return sum + numberOf(row.amount);
}

function sortCreatedDesc(a, b) {
  return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
}

function sortUpdatedDesc(a, b) {
  return String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''));
}

function isoNow() {
  return new Date().toISOString();
}

function toIsoDate(d) {
  return d.toISOString().substring(0, 10);
}

function addDaysIso(days) {
  var d = new Date();
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

function makeId(prefix) {
  var d = new Date();
  var pad = function(n) { return String(n).length < 2 ? '0' + n : String(n); };
  var stamp = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  return prefix + '-' + stamp + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}
