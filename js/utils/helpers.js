(function () {
  'use strict';

  const Helpers = {
    /* ── Currency ──────────────────────────────────── */
    formatCurrency(amount) {
      const n = parseFloat(amount) || 0;
      return '৳' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    rawNumber(amount) {
      return parseFloat(amount) || 0;
    },

    /* ── Dates (Always Bangladesh Standard Time GMT+6 / Asia/Dhaka) ── */
    TIMEZONE: 'Asia/Dhaka',

    getBDDateParts(dateInput = new Date()) {
      if (!dateInput) dateInput = new Date();
      if (typeof dateInput === 'string') {
        const clean = dateInput.trim();
        const m = clean.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
        if (m && !clean.endsWith('Z') && !clean.includes('+') && !clean.match(/[T\s]\d{2}:\d{2}:\d{2}-\d{2}/)) {
          return {
            year: parseInt(m[1], 10),
            month: parseInt(m[2], 10),
            day: parseInt(m[3], 10),
            hour: m[4] ? parseInt(m[4], 10) : 0,
            minute: m[5] ? parseInt(m[5], 10) : 0,
            second: m[6] ? parseInt(m[6], 10) : 0
          };
        }
      }
      const d = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
      const validDate = isNaN(d.getTime()) ? new Date() : d;

      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Dhaka',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
          hour12: false
        });
        const parts = formatter.formatToParts(validDate);
        const map = {};
        parts.forEach(p => map[p.type] = p.value);
        const h = parseInt(map.hour, 10);
        return {
          year: parseInt(map.year, 10),
          month: parseInt(map.month, 10),
          day: parseInt(map.day, 10),
          hour: (h === 24) ? 0 : h,
          minute: parseInt(map.minute, 10),
          second: parseInt(map.second, 10)
        };
      } catch (err) {
        // Fallback: manually calculate GMT+6 offset
        const bdMillis = validDate.getTime() + (validDate.getTimezoneOffset() * 60000) + (6 * 3600000);
        const bdDate = new Date(bdMillis);
        return {
          year: bdDate.getFullYear(),
          month: bdDate.getMonth() + 1,
          day: bdDate.getDate(),
          hour: bdDate.getHours(),
          minute: bdDate.getMinutes(),
          second: bdDate.getSeconds()
        };
      }
    },

    formatDate(dateStr) {
      if (!dateStr) return '';
      const p = this.getBDDateParts(dateStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[p.month - 1]} ${p.day}, ${p.year}`;
    },

    formatDateFull(dateStr = new Date()) {
      const d = (dateStr instanceof Date) ? dateStr : new Date(dateStr);
      const validDate = isNaN(d.getTime()) ? new Date() : d;
      try {
        return validDate.toLocaleDateString('en-US', {
          timeZone: 'Asia/Dhaka',
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (e) {
        return this.formatDate(dateStr);
      }
    },

    formatDateTime(dateStr) {
      if (!dateStr) return '';
      const p = this.getBDDateParts(dateStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const pad = n => String(n).padStart(2, '0');
      const h12 = p.hour % 12 || 12;
      const ampm = p.hour < 12 ? 'AM' : 'PM';
      return `${months[p.month - 1]} ${p.day}, ${p.year}, ${pad(h12)}:${pad(p.minute)} ${ampm}`;
    },

    formatTime(dateStr = new Date()) {
      const p = this.getBDDateParts(dateStr);
      const pad = n => String(n).padStart(2, '0');
      const h12 = p.hour % 12 || 12;
      const ampm = p.hour < 12 ? 'AM' : 'PM';
      return `${pad(h12)}:${pad(p.minute)} ${ampm}`;
    },

    formatDateInput(dateStr) {
      if (!dateStr) return this.today();
      const p = this.getBDDateParts(dateStr);
      const pad = n => String(n).padStart(2, '0');
      return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
    },

    today() {
      const p = this.getBDDateParts(new Date());
      const pad = n => String(n).padStart(2, '0');
      return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
    },

    yesterday() {
      return this.addDays(this.today(), -1);
    },

    addDays(dateStr, days) {
      const p = this.getBDDateParts(dateStr);
      const d = new Date(Date.UTC(p.year, p.month - 1, p.day + days, 12, 0, 0));
      const pad = n => String(n).padStart(2, '0');
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    },

    nowBDTime() {
      const p = this.getBDDateParts(new Date());
      const pad = n => String(n).padStart(2, '0');
      return `${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
    },

    nowBDDateTime() {
      const p = this.getBDDateParts(new Date());
      const pad = n => String(n).padStart(2, '0');
      return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
    },

    nowBDDateTimeLocalInput() {
      const p = this.getBDDateParts(new Date());
      const pad = n => String(n).padStart(2, '0');
      return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
    },

    isDateInRange(dateStr, from, to) {
      if (!dateStr) return false;
      const s = String(dateStr).trim().match(/^(\d{4}-\d{2}-\d{2})/);
      const targetDate = s ? s[1] : this.formatDateInput(dateStr);
      if (from) {
        const fromDate = String(from).slice(0, 10);
        if (targetDate < fromDate) return false;
      }
      if (to) {
        const toDate = String(to).slice(0, 10);
        if (targetDate > toDate) return false;
      }
      return true;
    },

    /* ── CSV Export ────────────────────────────────── */
    exportCSV(data, filename) {
      if (!data || !data.length) return;
      const headers = Object.keys(data[0]);
      const rows = data.map(row =>
        headers.map(h => {
          let val = row[h] ?? '';
          val = String(val).replace(/"/g, '""');
          return `"${val}"`;
        }).join(',')
      );
      const csv = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = (filename || 'export') + '.csv';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    parseCSV(text) {
      if (!text) return [];
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length === 0) return [];

      const parseLine = (line) => {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              cur += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
          } else {
            cur += char;
          }
        }
        result.push(cur.trim());
        return result;
      };

      const headers = parseLine(lines[0]);
      const list = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i]);
        if (values.length < headers.length) continue;
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = values[idx] ?? '';
        });
        list.push(obj);
      }
      return list;
    },

    printHTML(html, title, settings = {}) {
      const w = window.open('', '_blank', 'width=800,height=600');
      const isReceipt = settings.default_print_type === 'receipt';
      const bodyClass = isReceipt ? 'receipt-body' : 'paper-body';
      w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>${title || 'Print'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Libre+Barcode+39&display=swap" rel="stylesheet">
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:'Inter',sans-serif;padding:30px;color:#1e293b;font-size:13px}
          body.receipt-body { padding: 4px; font-size: 8pt; color: #000; line-height: 1.3; }
          body.receipt-body * { font-size: 8pt; }
          body.receipt-body h3 { font-size: 10pt !important; }
          body.receipt-body h4 { font-size: 8.5pt !important; }
          body.receipt-body small { font-size: 7.5pt !important; }
          body.receipt-body table th, body.receipt-body table td { font-size: 7.5pt !important; padding: 2px 0; }
          table{width:100%;border-collapse:collapse;margin:12px 0}
          th,td{border:1px solid #cbd5e1;padding:8px 10px;text-align:left}
          th{background:#f1f5f9;font-weight:600}
          .text-right{text-align:right} .text-center{text-align:center}
          h1{font-size:20px;margin-bottom:4px} h2{font-size:16px;margin:16px 0 8px}
          .invoice-header{display:flex;justify-content:space-between;margin-bottom:20px}
          .totals{margin-top:12px;text-align:right} .totals .grand{font-size:18px;font-weight:700}
          
          /* Thermal Receipt Printer CSS */
          /* Thermal Receipt Printer CSS */
          .thermal-receipt {
            max-width: ${settings.receipt_width || 80}mm;
            margin: 0 auto;
            color: #000;
            font-family: 'Inter', sans-serif;
            font-size: 12px;
          }
          .thermal-receipt table {
            border: none;
            width: 100%;
            border-collapse: collapse;
          }
          
          /* Style 1 / style-minimal-dashed: Clean Minimalist Dashed (Zero solid fills, ideal for thermal) */
          .thermal-receipt.style-1 hr,
          .thermal-receipt.style-minimal-dashed hr {
            border: none;
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
          .thermal-receipt.style-1 .totals,
          .thermal-receipt.style-minimal-dashed .totals {
            margin-top: 8px;
            border-top: 1px dashed #000;
            padding-top: 6px;
          }
          .thermal-receipt.style-1 .totals p,
          .thermal-receipt.style-minimal-dashed .totals p {
            margin: 3px 0;
            display: flex;
            justify-content: space-between;
          }
          
          /* Style 2 / style-minimal-clean: Clean Monospace Minimal (Crisp typewriter layout) */
          .thermal-receipt.style-2,
          .thermal-receipt.style-minimal-clean {
            font-family: 'Courier New', Courier, monospace !important;
            padding: 4px;
            color: #000;
          }
          .thermal-receipt.style-2 *,
          .thermal-receipt.style-minimal-clean * {
            font-family: 'Courier New', Courier, monospace !important;
            color: #000 !important;
          }
          .thermal-receipt.style-2 hr,
          .thermal-receipt.style-minimal-clean hr {
            border: none;
            border-top: 1px dashed #000 !important;
            margin: 7px 0;
          }
          .thermal-receipt.style-2 .receipt-item-row,
          .thermal-receipt.style-minimal-clean .receipt-item-row {
            border-bottom: 1px dotted #555 !important;
            padding: 4px 0 !important;
          }
          .thermal-receipt.style-2 .receipt-item-name,
          .thermal-receipt.style-minimal-clean .receipt-item-name {
            font-weight: bold !important;
          }
          .thermal-receipt.style-2 .totals,
          .thermal-receipt.style-minimal-clean .totals {
            margin-top: 8px;
            border-top: 1px dashed #000 !important;
            padding-top: 5px;
          }
          .thermal-receipt.style-2 .totals p,
          .thermal-receipt.style-minimal-clean .totals p {
            margin: 3px 0;
            display: flex;
            justify-content: space-between;
          }

          /* style-minimal-centered: Modern Minimal Centered (Boutique Cafe Vibe) */
          .thermal-receipt.style-minimal-centered {
            font-family: 'Inter', sans-serif;
            color: #000;
            text-align: center;
          }
          .thermal-receipt.style-minimal-centered hr {
            border: none;
            border-top: 1px dashed #000 !important;
            margin: 8px 0;
          }
          .thermal-receipt.style-minimal-centered .receipt-item-row {
            border-bottom: 1px dotted #aaa !important;
            padding: 5px 0 !important;
            text-align: left;
          }
          .thermal-receipt.style-minimal-centered .totals {
            margin-top: 8px;
            border-top: 1.5px dashed #000;
            padding-top: 6px;
            text-align: left;
          }
          .thermal-receipt.style-minimal-centered .totals p {
            margin: 3px 0;
            display: flex;
            justify-content: space-between;
          }

          /* style-minimal-compact: Space Saver Fast Thermal */
          .thermal-receipt.style-minimal-compact {
            font-family: monospace, sans-serif;
            font-size: 11px !important;
            line-height: 1.25;
            color: #000;
          }
          .thermal-receipt.style-minimal-compact hr {
            border: none;
            border-top: 1px dashed #000;
            margin: 5px 0;
          }
          .thermal-receipt.style-minimal-compact .receipt-item-row {
            padding: 2px 0 !important;
            border-bottom: 1px dotted #ccc !important;
          }
          .thermal-receipt.style-minimal-compact .totals {
            margin-top: 5px;
            border-top: 1px dashed #000;
            padding-top: 4px;
          }
          .thermal-receipt.style-minimal-compact .totals p {
            margin: 2px 0;
            display: flex;
            justify-content: space-between;
          }

          /* Style 3: Modern Tabular Grid */
          .thermal-receipt.style-3 {
            font-family: 'Inter', sans-serif;
            color: #1e293b;
          }
          .thermal-receipt.style-3 hr {
            border: none;
            border-top: 1px dashed #000 !important;
            margin: 8px 0;
          }
          .thermal-receipt.style-3 .receipt-item-row {
            border-bottom: 1px solid #e2e8f0 !important;
            padding: 5px 0 !important;
          }
          .thermal-receipt.style-3 .receipt-item-name {
            color: #0f172a !important;
            font-weight: 700;
          }
          .thermal-receipt.style-3 .receipt-item-details {
            color: #64748b !important;
            margin-top: 2px !important;
          }
          .thermal-receipt.style-3 .totals {
            margin-top: 8px;
            border-top: 1px dashed #000;
            padding-top: 6px;
          }
          .thermal-receipt.style-3 .totals p {
            margin: 3px 0;
            display: flex;
            justify-content: space-between;
          }
          .thermal-receipt.style-3 .totals p strong {
            font-weight: 700;
          }
          
          .thermal-receipt .totals p {
            margin: 3px 0;
          }
          
          /* Product Label Printer CSS */
          .product-label {
            width: 50mm;
            height: 30mm;
            padding: 3mm;
            border: 1px dashed #94a3b8;
            margin: 0 auto;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            font-family: 'Inter', sans-serif;
            color: #000;
          }
          .label-title {
            font-size: 10px;
            font-weight: 800;
            margin-bottom: 2px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }
          .label-price {
            font-size: 11px;
            font-weight: 800;
            margin: 1px 0;
          }
          .label-barcode {
            margin: 2px auto;
            font-family: 'Libre Barcode 39', monospace;
            font-size: 24px;
            letter-spacing: 2px;
          }
          .label-sku {
            font-size: 8px;
            color: #334155;
            font-weight: 600;
          }
          
          /* Paper Invoice CSS styles */
          .paper-invoice {
            max-width: ${settings.invoice_width || 800}px;
            margin: 0 auto;
            color: #1e293b;
            padding: 0.3in 10px;
          }
          .paper-invoice .invoice-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
            padding-bottom: 16px;
          }
          .paper-invoice .store-details h2 {
            font-size: 22px;
            font-weight: 700;
            color: #0f172a;
          }
          .paper-invoice .invoice-meta {
            text-align: right;
          }
          .paper-invoice .invoice-meta h1 {
            font-size: 26px;
            font-weight: 800;
            color: #1e293b;
            letter-spacing: -0.5px;
          }
          .paper-invoice .billing-details {
            margin-bottom: 20px;
            background: #f8fafc;
            padding: 12px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
          }
          .paper-invoice .billing-details h3 {
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 4px;
            color: #475569;
            text-transform: uppercase;
          }
          .paper-invoice .items-table th, .paper-invoice .items-table td {
            padding: 10px 12px;
            font-size: 12px;
          }
          .paper-invoice .invoice-bottom {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
            gap: 40px;
          }
          .paper-invoice .notes-area {
            flex: 1;
            font-size: 11px;
            color: #64748b;
            line-height: 1.5;
          }
          .paper-invoice .totals-area {
            width: 300px;
          }
          .paper-invoice .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            font-size: 13px;
            border-bottom: 1px solid #e2e8f0;
          }
          .paper-invoice .totals-row.grand {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
            border-bottom: 2px solid #0f172a;
            padding: 8px 0;
          }
          .paper-invoice .totals-row.paid {
            font-size: 13px;
            color: #10b981;
            border: none;
          }
          .paper-invoice .signature-line {
            display: flex;
            justify-content: space-between;
            margin-top: 60px;
            font-size: 12px;
          }
          .paper-invoice .sig-box {
            text-align: center;
          }
          
          /* Modern Minimalist Theme */
          .paper-invoice.theme-modern .invoice-top {
            border-bottom: 3px solid #3b82f6;
          }
          .paper-invoice.theme-modern .items-table th {
            background: #3b82f6;
            color: #fff;
          }
          
          /* Classic Business Theme */
          .paper-invoice.theme-classic .invoice-top {
            border-bottom: 4px double #000;
          }
          .paper-invoice.theme-classic .items-table th {
            background: #000;
            color: #fff;
          }
          .paper-invoice.theme-classic .billing-details {
            background: #fff;
            border-radius: 0;
            border: 2px solid #000;
          }

          /* Compact Invoice Theme */
          .paper-invoice.theme-compact {
            font-size: 11px;
          }
          .paper-invoice.theme-compact .invoice-top {
            margin-bottom: 12px;
            padding-bottom: 8px;
          }
          .paper-invoice.theme-compact .items-table th, .paper-invoice.theme-compact .items-table td {
            padding: 6px 8px;
          }
          
          @media print {
            body { padding: 0 !important; }
            body.receipt-body { padding: 1mm !important; }
            body.receipt-body .thermal-receipt { width: 100% !important; max-width: 100% !important; }
            .product-label { border: none !important; }
            .paper-invoice { width: 100% !important; padding: 0 !important; margin: 0 !important; }
            thead { display: table-row-group !important; }
          }
        </style></head><body class="${bodyClass}">${html}</body></html>`);
      w.document.close();
      setTimeout(() => { w.print(); }, 400);
    },

    async printOrder(order, items, localPayments = null) {
      const S = POS.Store;
      const settings = await S.getSettings();
      const printType = settings.default_print_type || 'receipt';

      let paymentsList = localPayments;
      if (!paymentsList) {
        try {
          const pRes = await fetch(`${window.location.origin}/api/payments`, {
            headers: S.getHeaders()
          });
          if (pRes.ok) {
            const allP = await pRes.json();
            paymentsList = allP.filter(p => p.orderId === order.id);
          }
        } catch (err) {
          console.error(err);
        }
      }
      if (!paymentsList) paymentsList = [];

      let itemsHtml = '';
      if (printType === 'receipt') {
        const isStyle3 = settings.receipt_style === 'style-3';
        items.forEach(item => {
          const varText = item.variationName ? ` (${this.esc(item.variationName)})` : '';
          if (isStyle3) {
            // Tabular Grid Layout
            itemsHtml += `
              <div class="receipt-item-row" style="display: grid; grid-template-columns: 1.5fr 30px 65px 75px; gap: 4px; padding: 5px 0; font-size: 8.5pt; text-align: right; align-items: center;">
                <span class="receipt-item-name" style="text-align: left; font-weight: 700; word-break: break-word;">${this.esc(item.productName)}${varText}</span>
                <span class="receipt-item-qty" style="text-align: center; color: #475569;">${item.qty}</span>
                <span class="receipt-item-price" style="color: #475569;">${this.formatCurrency(item.unitPrice)}</span>
                <strong class="receipt-item-total" style="color: #0f172a;">${this.formatCurrency(item.total || (item.unitPrice * item.qty))}</strong>
              </div>
            `;
          } else {
            // Block Layout for Style 1 & 2
            itemsHtml += `
              <div class="receipt-item-row" style="padding: 4px 0; border-bottom: 1px dashed #ddd; font-size: 8.5pt;">
                <div class="receipt-item-name" style="font-weight: 700; word-break: break-word;">${this.esc(item.productName)}${varText}</div>
                <div class="receipt-item-details" style="display: flex; justify-content: space-between; font-size: 8pt; color: #333; margin-top: 2px;">
                  <span>${item.qty} x ${this.formatCurrency(item.unitPrice)}</span>
                  <strong>${this.formatCurrency(item.total || (item.unitPrice * item.qty))}</strong>
                </div>
              </div>
            `;
          }
        });
      } else {
        items.forEach(item => {
          itemsHtml += `
            <tr>
              <td>${this.esc(item.productName)} ${item.variationName ? `<br><small style="color:#555">${this.esc(item.variationName)}</small>` : ''}</td>
              <td class="text-center">${item.qty}</td>
              <td class="text-right">${this.formatCurrency(item.unitPrice)}</td>
              <td class="text-right">${this.formatCurrency(item.total || (item.unitPrice * item.qty))}</td>
            </tr>
          `;
        });
      }

      const showStoreName = settings.invoice_show_store_name !== '0';
      const storeName = showStoreName ? (settings.store_name || '').trim() : '';
      const storeAddress = settings.store_address || '';
      const storePhone = settings.store_phone || '';

      let printContent = '';

      if (printType === 'receipt') {
        // Thermal Receipt layout
        printContent = `
          <div class="thermal-receipt ${settings.receipt_style || 'style-1'}">
            <hr style="margin-top: 0; margin-bottom: 8px;">
            <div style="text-align: center; margin-bottom: 8px;">
              ${settings.invoice_logo ? `<img src="${settings.invoice_logo}" style="max-width: 60px; max-height: 60px; object-fit: contain; margin-bottom: 6px; display: block; margin-left: auto; margin-right: auto;">` : ''}
              ${storeName ? `<h3 style="margin:0; font-size:12pt;">${this.esc(storeName)}</h3>` : ''}
              <p style="font-size:8pt; margin: 2px 0 0 0;">${this.esc(storeAddress)}</p>
              <p style="font-size:8pt; margin: 1px 0 0 0;">Phone: ${this.esc(storePhone)}</p>
              ${settings.store_website ? `<p style="font-size:8pt; margin: 1px 0 0 0;">Website: ${this.esc(settings.store_website)}</p>` : ''}
            </div>
            <hr>
            <div style="font-size: 8pt; line-height: 1.4; margin-bottom: 6px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <span><strong>Invoice:</strong> ${order.invoiceId}</span>
                <span style="font-size:11pt; font-weight:900; border:1.5px dashed #000; color:#000; background:transparent; padding:2px 8px; border-radius:3px;">TOKEN #${String(order.tokenNo || 1).padStart(2, '0')}</span>
              </div>
              ${order.tableName ? `<div><strong>Table / Service:</strong> <span style="font-weight:700;">${this.esc(order.tableName)}</span> (${this.esc(order.orderType || 'Dine In')})</div>` : ''}
              <div><strong>Customer:</strong> ${this.esc(order.customerName || 'Walk-in Guest')}${order.customerPhone ? ` (${this.esc(order.customerPhone)})` : ''}</div>
              <div><strong>Date:</strong> ${this.formatDateTime(order.date)}</div>
            </div>
            <hr>
            <div style="margin: 6px 0;">
              ${settings.receipt_style === 'style-3' ? `
                <div style="display: grid; grid-template-columns: 1.5fr 30px 65px 75px; gap: 4px; padding: 4px 0; border-bottom: 2px solid #475569; font-size: 8pt; font-weight: 700; text-align: right; text-transform: uppercase; color: #475569; margin-bottom: 4px;">
                  <span style="text-align: left;">Item Description</span>
                  <span style="text-align: center;">Qty</span>
                  <span>Price</span>
                  <span>Total</span>
                </div>
              ` : ''}
              ${itemsHtml}
            </div>
            
            <div class="totals" style="font-size: 8.5pt;">
              <p>Sub Total: <strong>${this.formatCurrency(order.subtotal)}</strong></p>
              ${order.discountAmount > 0 ? `<p>Discount: <strong style="color:#000">-${this.formatCurrency(order.discountAmount)}</strong></p>` : ''}
              ${order.taxAmount > 0 ? `<p>Tax (${order.taxPercent}%): <strong>${this.formatCurrency(order.taxAmount)}</strong></p>` : ''}
              <p style="font-size:10.5pt; font-weight:800; border-top:1px dashed #000; padding-top:4px; margin-top:4px;">Grand Total: <span>${this.formatCurrency(order.grandTotal)}</span></p>
            </div>

            ${paymentsList.length > 0 ? `
              <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #000; font-size: 8pt; line-height: 1.4;">
                <div style="font-weight: 700; margin-bottom: 2px;">Payment Details:</div>
                ${paymentsList.map(p => `
                  <div style="display: flex; justify-content: space-between;">
                    <span>• ${this.esc(p.method)}${(p.lastFour || p.lastfour) ? ` (xxxx-${p.lastFour || p.lastfour})` : ''}</span>
                    <strong>${this.formatCurrency(p.amount)}</strong>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            
            <hr>
            <div style="text-align: center; margin-top: 15px; font-size: 8pt;">
              ${settings.invoice_note ? `<p style="margin-bottom: 8px; font-style: italic; color:#333;">${this.esc(settings.invoice_note)}</p>` : ''}
              <p style="font-weight:700;">Thank you for shopping with us!</p>
              ${settings.store_website ? `<p style="font-size: 8pt; margin-top:4px; color:#555;">${this.esc(settings.store_website)}</p>` : ''}
              <p style="font-size: 7.5pt; margin-top:6px; color:#888;">Software by Zen IT</p>
            </div>
          </div>
        `;
      } else {
        // Paper A4 Invoice layout
        printContent = `
          <div class="paper-invoice ${settings.invoice_style || 'theme-modern'}">
            <div class="invoice-top">
              <div class="store-details" style="display:flex; align-items:center; gap:16px;">
                ${settings.invoice_logo ? `<img src="${settings.invoice_logo}" style="max-width: 80px; max-height: 80px; object-fit: contain; border-radius: 4px;">` : ''}
                <div>
                  ${storeName ? `<h2 style="margin:0;">${this.esc(storeName)}</h2>` : ''}
                  <p style="margin:2px 0 0 0; font-size:12px; color:#64748b;">${this.esc(storeAddress)}</p>
                  <p style="margin:1px 0 0 0; font-size:12px; color:#64748b;"><strong>Phone:</strong> ${this.esc(storePhone)}</p>
                  ${settings.store_website ? `<p style="margin:1px 0 0 0; font-size:12px; color:#64748b;"><strong>Website:</strong> ${this.esc(settings.store_website)}</p>` : ''}
                </div>
              </div>
              <div class="invoice-meta">
                <h1>RETAIL INVOICE</h1>
                <div style="display:inline-block; font-size:14px; font-weight:900; background:#000; color:#fff; padding:3px 12px; border-radius:4px; margin:4px 0 8px;">TOKEN #${String(order.tokenNo || 1).padStart(2, '0')}</div>
                <p><strong>Invoice ID:</strong> ${order.invoiceId}</p>
                <p><strong>Sales Date:</strong> ${this.formatDateTime(order.date)}</p>
              </div>
            </div>
            
            <div class="billing-details">
              <h3>Bill To:</h3>
              <p><strong>Customer Name:</strong> ${this.esc(order.customerName)}</p>
              <p><strong>Contact Phone:</strong> ${this.esc(order.customerPhone)}</p>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th style="text-align:left;">Item Description</th>
                  <th style="text-align:center; width:80px;">Qty</th>
                  <th style="text-align:right; width:120px;">Unit Price</th>
                  <th style="text-align:right; width:120px;">Total Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div class="invoice-bottom">
              <div class="notes-area">
                <p style="font-weight:700; margin-bottom:4px; color:var(--text-dark);">Terms & Conditions / Note</p>
                ${settings.invoice_note ? `<p style="white-space: pre-line; line-height: 1.5; color: #555;">${this.esc(settings.invoice_note)}</p>` : '<p>1. Goods once sold cannot be returned or exchanged.</p><p>2. Keep this invoice safe for any warranty claims.</p>'}
                <div style="margin-top: 15px; font-size: 11px; color:#475569;">
                  ${settings.store_website ? `<p>Website: <strong>${this.esc(settings.store_website)}</strong></p>` : ''}
                </div>
              </div>
              <div class="totals-area">
                <div class="totals-row">
                  <span>Sub Total:</span>
                  <strong>${this.formatCurrency(order.subtotal)}</strong>
                </div>
                ${order.discountAmount > 0 ? `
                  <div class="totals-row text-danger">
                    <span>Discount:</span>
                    <strong>-${this.formatCurrency(order.discountAmount)}</strong>
                  </div>
                ` : ''}
                ${order.taxAmount > 0 ? `
                  <div class="totals-row">
                    <span>Tax (${order.taxPercent}%):</span>
                    <strong>${this.formatCurrency(order.taxAmount)}</strong>
                  </div>
                ` : ''}
                <div class="totals-row grand">
                  <span>Grand Total:</span>
                  <strong>${this.formatCurrency(order.grandTotal)}</strong>
                </div>

                ${paymentsList.length > 0 ? `
                  <div style="margin-top:12px; border-top:1px dashed #cbd5e1; padding-top:8px; font-size:11px;">
                    <div style="font-weight:700; color:#475569; margin-bottom:4px;">Payment Method:</div>
                    ${paymentsList.map(p => `
                      <div class="totals-row" style="border:none; padding:2px 0;">
                        <span>• ${this.esc(p.method)}${(p.lastFour || p.lastfour) ? ` (xxxx-${p.lastFour || p.lastfour})` : ''}</span>
                        <strong>${this.formatCurrency(p.amount)}</strong>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            </div>

            <div class="signature-line">
              <div class="sig-box">
                <div style="border-top:1px solid #94a3b8; width:180px; margin-top:50px;">Customer Signature</div>
              </div>
              <div class="sig-box">
                <div style="border-top:1px solid #94a3b8; width:180px; margin-top:50px;">Authorized Signature</div>
              </div>
            </div>
          </div>
        `;
      }

      this.printHTML(printContent, `Invoice ${order.invoiceId}`, settings);
    },

    printKitchenToken(order, items, settings = {}) {
      const tokenNum = String(order.tokenNo || 1).padStart(2, '0');
      const tableInfo = order.tableName || order.tableNumber || (order.orderType === 'dine_in' ? 'Dine In' : (order.orderType || 'Express / Takeaway'));
      const html = `
        <div class="thermal-receipt" style="max-width: 80mm; margin: 0 auto; font-family: 'Inter', sans-serif; color: #000; padding: 4px;">
          <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px;">
            <div style="font-size: 15pt; font-weight: 900; letter-spacing: 1px;">*** KITCHEN ORDER TICKET ***</div>
            <div style="font-size: 9pt; font-weight: 700; margin-top: 2px; text-transform: uppercase;">ZenPos — Kitchen Preparation Slip</div>
            <div style="margin: 8px auto 4px auto; border: 2px dashed #000; background: transparent; color: #000; display: inline-block; padding: 6px 18px; border-radius: 6px; font-size: 22pt; font-weight: 900; letter-spacing: 2px;">
              TOKEN #${tokenNum}
            </div>
          </div>
          <div style="font-size: 9pt; line-height: 1.5; margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 6px;">
            <div><strong>Table / Service:</strong> <span style="font-size: 11pt; font-weight: 800;">${this.esc(tableInfo)}</span></div>
            <div><strong>Invoice ID:</strong> ${this.esc(order.invoiceId)}</div>
            <div><strong>Order Time:</strong> ${this.formatDateTime(order.date || new Date())}</div>
            ${order.notes ? `<div><strong>Kitchen Note:</strong> <em>${this.esc(order.notes)}</em></div>` : ''}
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
            <thead>
              <tr style="border-bottom: 2px solid #000;">
                <th style="text-align: left; padding: 4px 0; font-size: 10pt; font-weight: 800;">Item Name</th>
                <th style="text-align: right; padding: 4px 0; font-size: 10pt; font-weight: 800; width: 50px;">Qty</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr style="border-bottom: 1px dashed #999;">
                  <td style="padding: 6px 0; font-size: 11pt; font-weight: 700;">
                    ${this.esc(item.productName)}
                    ${item.variationName ? `<div style="font-size: 9pt; font-weight: normal; color: #333;">(${this.esc(item.variationName)})</div>` : ''}
                    ${item.notes ? `<div style="font-size: 8.5pt; font-style: italic; color: #555;">Note: ${this.esc(item.notes)}</div>` : ''}
                  </td>
                  <td style="text-align: right; padding: 6px 0; font-size: 13pt; font-weight: 900; vertical-align: top;">
                    x${item.qty}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="text-align: center; border-top: 2px dashed #000; padding-top: 6px; font-size: 8pt; font-weight: 700;">
            *** KITCHEN ORDER TICKET (KOT) ***
          </div>
        </div>
      `;
      this.printHTML(html, `KOT Token #${tokenNum}`, { default_print_type: 'receipt' });
    },

    /* ── Modal Dialog Manager ───────────────────────── */
    showModal(html) {
      let overlay = document.getElementById('global-modal-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'global-modal-overlay';
        overlay.className = 'modal-overlay';
        document.body.appendChild(overlay);
      }
      overlay.innerHTML = html;
      overlay.classList.add('active');
    },

    hideModal() {
      const overlay = document.getElementById('global-modal-overlay');
      if (overlay) {
        overlay.classList.remove('active');
        overlay.innerHTML = '';
      }
    },

    confirm(message, options = {}) {
      return new Promise((resolve) => {
        const title = options.title || 'Confirm Action';
        const confirmText = options.confirmText || 'Yes, Proceed';
        const cancelText = options.cancelText || 'Cancel';
        const isDanger = options.danger !== false;

        const html = `
          <div class="modal animate" style="max-width:380px; text-align:center;">
            <div class="modal-body" style="padding:26px 22px;">
              <div style="font-size:40px; margin-bottom:12px;">${isDanger ? '⚠️' : '❓'}</div>
              <h3 style="font-size:17px; font-weight:800; color:#1e293b; margin-bottom:8px;">${this.escapeHtml(title)}</h3>
              <p style="font-size:13px; color:#64748b; line-height:1.45; margin-bottom:22px;">${this.escapeHtml(message)}</p>
              <div style="display:flex; justify-content:center; gap:10px;">
                <button type="button" class="btn btn-secondary" id="btn-helper-confirm-no" style="min-width:95px; height:38px;">${this.escapeHtml(cancelText)}</button>
                <button type="button" class="btn ${isDanger ? 'btn-danger' : 'btn-primary'}" id="btn-helper-confirm-yes" style="min-width:115px; height:38px; font-weight:700; ${isDanger ? 'background:#ef4444; border-color:#ef4444;' : ''}">${this.escapeHtml(confirmText)}</button>
              </div>
            </div>
          </div>
        `;
        this.showModal(html);
        const yesBtn = document.getElementById('btn-helper-confirm-yes');
        const noBtn = document.getElementById('btn-helper-confirm-no');
        if (yesBtn) {
          yesBtn.onclick = () => {
            this.hideModal();
            resolve(true);
          };
        }
        if (noBtn) {
          noBtn.onclick = () => {
            this.hideModal();
            resolve(false);
          };
        }
      });
    },

    /* ── Toast Notification ────────────────────────── */
    showToast(message, type) {
      type = type || 'success';
      const icons = { success: '✓', error: '✗', info: 'ⓘ', warning: '⚠' };
      const toast = document.createElement('div');
      toast.className = 'toast toast-' + type;
      toast.innerHTML = '<span class="toast-icon">' + (icons[type] || 'ⓘ') + '</span><span>' + message + '</span>';
      document.body.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add('show'));
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 350);
      }, 3000);
    },

    /* ── Confirm Dialog ────────────────────────────── */
    confirm(message) {
      return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
          <div class="modal" style="max-width:420px">
            <div class="modal-header"><h3>Confirm Action</h3>
              <button class="modal-close" id="confirm-close">&times;</button></div>
            <div class="modal-body"><p style="font-size:15px">${message}</p></div>
            <div class="modal-footer">
              <button class="btn btn-secondary" id="confirm-no">Cancel</button>
              <button class="btn btn-danger" id="confirm-yes">Confirm</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);
        const close = (val) => { overlay.remove(); resolve(val); };
        overlay.querySelector('#confirm-yes').onclick = () => close(true);
        overlay.querySelector('#confirm-no').onclick = () => close(false);
        overlay.querySelector('#confirm-close').onclick = () => close(false);
      });
    },

    /* ── Debounce ──────────────────────────────────── */
    debounce(fn, ms) {
      let t; return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms || 300); };
    },

    /* ── Escape HTML ──────────────────────────────── */
    esc(str) {
      const d = document.createElement('div');
      d.textContent = str || '';
      return d.innerHTML;
    },

    /* ── Payment methods ──────────────────────────── */
    paymentMethodsList: [],
    paymentMethods: ['Cash', 'Card', 'bKash', 'Nagad', 'Rocket', 'Bank Transfer', 'Other'],

    async loadPaymentMethods() {
      try {
        const S = window.POS && window.POS.Store;
        if (S && typeof S.getAll === 'function') {
          const list = await S.getAll('payment-methods');
          if (Array.isArray(list) && list.length > 0) {
            this.paymentMethodsList = list;
            const active = list.filter(m => m.status === 'active').map(m => m.name);
            if (active.length > 0) {
              this.paymentMethods = active;
            }
            return list;
          }
        }
      } catch (err) {
        console.warn('Error loading dynamic payment methods:', err);
      }
      return this.paymentMethodsList || [];
    },

    getPaymentMethodColor(method) {
      const mName = (typeof method === 'object' && method !== null) 
        ? String(method.name || '') 
        : String(method || '');
      const m = mName.toLowerCase().trim();
      if (this.paymentMethodsList && this.paymentMethodsList.length > 0) {
        const matched = this.paymentMethodsList.find(p => String(p.name || '').toLowerCase().trim() === m);
        if (matched && matched.color) return matched.color;
      }
      switch (m) {
        case 'cash': return '#10B981';
        case 'card': return '#3B82F6';
        case 'bkash': return '#E2136E';
        case 'nagad': return '#F7941D';
        case 'rocket': return '#8C3494';
        case 'bank transfer':
        case 'bank': return '#1E40AF';
        default: return '#64748B';
      }
    },

    getPaymentMethodIcon(method, size = 28) {
      let iconCandidate = '';
      let mName = '';
      if (typeof method === 'object' && method !== null) {
        iconCandidate = String(method.icon || '').trim();
        mName = String(method.name || '').trim();
      } else {
        mName = String(method || '').trim();
      }
      const m = mName.toLowerCase();

      // Check if custom icon passed directly on method object
      if (iconCandidate) {
        if (iconCandidate.includes('<svg')) {
          let svgStr = iconCandidate;
          const svgStart = svgStr.indexOf('<svg');
          if (svgStart > 0) svgStr = svgStr.substring(svgStart);
          return svgStr.replace(/width="[^"]*"/, `width="${size}"`).replace(/height="[^"]*"/, `height="${size}"`);
        }
        if (iconCandidate.startsWith('data:') || iconCandidate.startsWith('http') || iconCandidate.startsWith('/') || iconCandidate.startsWith('./')) {
          return `<img src="${iconCandidate}" alt="${this.esc(mName)}" style="width:${size}px; height:${size}px; object-fit:contain; border-radius:6px; flex-shrink:0; background:#fff; padding:2px; border:1px solid #e2e8f0; box-shadow:0 1px 2px rgba(0,0,0,0.05); display:block;">`;
        }
        if (iconCandidate.length <= 4) {
          return `<span style="font-size:${Math.round(size * 0.75)}px; line-height:1; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${iconCandidate}</span>`;
        }
      }

      // Check if custom icon defined in paymentMethodsList
      if (this.paymentMethodsList && this.paymentMethodsList.length > 0) {
        const matched = this.paymentMethodsList.find(p => String(p.name || '').toLowerCase().trim() === m);
        if (matched && matched.icon && matched.icon.trim()) {
          const iconStr = matched.icon.trim();
          if (iconStr.includes('<svg')) {
            let svgStr = iconStr;
            const svgStart = svgStr.indexOf('<svg');
            if (svgStart > 0) svgStr = svgStr.substring(svgStart);
            return svgStr.replace(/width="[^"]*"/, `width="${size}"`).replace(/height="[^"]*"/, `height="${size}"`);
          }
          if (iconStr.startsWith('data:') || iconStr.startsWith('http') || iconStr.startsWith('/') || iconStr.startsWith('./')) {
            return `<img src="${iconStr}" alt="${this.esc(mName)}" style="width:${size}px; height:${size}px; object-fit:contain; border-radius:6px; flex-shrink:0; background:#fff; padding:2px; border:1px solid #e2e8f0; box-shadow:0 1px 2px rgba(0,0,0,0.05); display:block;">`;
          }
          if (iconStr.length <= 4) {
            return `<span style="font-size:${Math.round(size * 0.75)}px; line-height:1; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${iconStr}</span>`;
          }
        }
      }

      let mKey = m;
      if (m.includes('bkash')) mKey = 'bkash';
      else if (m.includes('nagad')) mKey = 'nagad';
      else if (m.includes('rocket')) mKey = 'rocket';
      else if (m.includes('card') || m.includes('visa') || m.includes('master') || m.includes('credit') || m.includes('debit')) mKey = 'card';
      else if (m.includes('cash')) mKey = 'cash';
      else if (m.includes('bank')) mKey = 'bank';

      switch (mKey) {
        case 'bkash':
          return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg" style="border-radius:6px; flex-shrink:0; display:block;">
            <rect width="48" height="48" rx="8" fill="#E2136E"/>
            <path d="M12 18L24 10L19 25Z" fill="#FFFFFF"/>
            <path d="M24 10L38 15L27 24Z" fill="#FCE4EC"/>
            <path d="M19 25L24 10L24 37Z" fill="#F8BBD0"/>
            <path d="M27 24L24 10L24 37Z" fill="#FFFFFF"/>
            <path d="M12 18L19 25L15 29Z" fill="#F48FB1"/>
            <path d="M38 15L27 24L32 29Z" fill="#FFFFFF"/>
            <path d="M24 37L19 25L24 29Z" fill="#F06292"/>
            <path d="M24 37L27 24L24 29Z" fill="#F8BBD0"/>
          </svg>`;

        case 'nagad':
          return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg" style="border-radius:6px; flex-shrink:0;">
            <rect width="48" height="48" rx="8" fill="#FFF7ED"/>
            <defs>
              <linearGradient id="nagadGrad_${size}_${Math.floor(Math.random()*1000)}" x1="10" y1="38" x2="38" y2="10" gradientUnits="userSpaceOnUse">
                <stop stop-color="#ED1C24"/>
                <stop offset="0.5" stop-color="#F7941D"/>
                <stop offset="1" stop-color="#FBB040"/>
              </linearGradient>
            </defs>
            <path d="M14 34C11 28 12 18 22 12C26 9 31 8 28 14C25 20 20 22 20 26C20 31 23 34 27 34C33 34 36 28 36 21C36 17 38 15 40 18C43 23 42 32 35 37C30 41 19 42 14 34Z" fill="url(#nagadGrad_${size}_${Math.floor(Math.random()*1000)})"/>
            <path d="M22 26C22 23 24 19 27 16C28 15 29 17 28 19C26 22 25 24 26 26C27 28 29 29 31 28C32 29 30 31 28 31C25 31 22 29 22 26Z" fill="#ED1C24"/>
          </svg>`;

        case 'bank transfer':
        case 'bank':
          return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg" style="border-radius:6px; flex-shrink:0;">
            <rect width="48" height="48" rx="8" fill="#EFF6FF"/>
            <path d="M12 36H36M12 21H36M14 17L24 11L34 17H14ZM16 21V33M21 21V33M27 21V33M32 21V33" stroke="#1E40AF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="35" cy="33" r="6" fill="#2563EB"/>
            <path d="M33 33H37M35 31L37 33L35 35" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>`;

        case 'rocket':
          return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg" style="border-radius:6px; flex-shrink:0;">
            <rect width="48" height="48" rx="8" fill="#FDF2F8"/>
            <path d="M16 32C14.5 30.5 14 27 15 25L23 17C26 14 30 13 33 13C33 16 32 20 29 23L21 31C19 32 17.5 33.5 16 32Z" fill="#8C3494"/>
            <path d="M15 25L12 27L14 30L16 32L19 34L21 31" fill="#701A75"/>
            <path d="M13 33L10 38L15 35" fill="#EF4444"/>
            <circle cx="27" cy="19" r="2" fill="#FFFFFF"/>
          </svg>`;

        case 'cash':
          return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg" style="border-radius:6px; flex-shrink:0;">
            <rect width="48" height="48" rx="8" fill="#ECFDF5"/>
            <rect x="11" y="16" width="26" height="16" rx="3" stroke="#059669" stroke-width="2.5" fill="#D1FAE5"/>
            <circle cx="24" cy="24" r="4" stroke="#059669" stroke-width="2"/>
            <path d="M15 20V20.01M33 28V28.01" stroke="#059669" stroke-width="2.5" stroke-linecap="round"/>
          </svg>`;

        case 'card':
          return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg" style="border-radius:6px; flex-shrink:0;">
            <rect width="48" height="48" rx="8" fill="#EEF2FF"/>
            <rect x="10" y="15" width="28" height="18" rx="3" fill="#4338CA"/>
            <rect x="10" y="20" width="28" height="4" fill="#312E81"/>
            <rect x="14" y="27" width="5" height="3" rx="1" fill="#FBBF24"/>
            <line x1="22" y1="28" x2="33" y2="28" stroke="#A5B4FC" stroke-width="2" stroke-linecap="round"/>
          </svg>`;

        default: {
          const color = this.getPaymentMethodColor(mName);
          const initials = (mName || 'P').trim().substr(0, 2).toUpperCase();
          return `<div style="width:${size}px; height:${size}px; border-radius:8px; background:${color}18; border:1.5px solid ${color}45; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:${Math.max(10, Math.round(size * 0.36))}px; color:${color}; flex-shrink:0;">${initials}</div>`;
        }
      }
    },

    previewImage(url, title = 'Receipt Image') {
      if (!url) return;
      const modalOverlay = document.getElementById('global-modal-overlay');
      if (!modalOverlay) return;
      modalOverlay.innerHTML = `
        <div class="modal animate" style="max-width: 600px; padding: 0; overflow: hidden; background: #fff;">
          <div class="modal-header" style="padding: 12px 16px; border-bottom: 1px solid var(--border);">
            <h3 style="margin: 0; font-size: 15px;">🔍 ${this.esc(title)}</h3>
            <button class="modal-close" id="modal-close-img-preview">&times;</button>
          </div>
          <div style="padding: 16px; display: flex; justify-content: center; align-items: center; background: #0f172a10;">
            <img src="${url}" style="max-width: 100%; max-height: 75vh; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); object-fit: contain;">
          </div>
          <div class="modal-footer" style="padding: 10px 16px;">
            <a href="${url}" download="receipt.png" class="btn btn-secondary btn-sm" style="margin-right:auto;">⬇️ Download</a>
            <button class="btn btn-primary btn-sm" id="btn-close-img-preview">Close</button>
          </div>
        </div>
      `;
      modalOverlay.classList.add('active');
      const close = () => modalOverlay.classList.remove('active');
      modalOverlay.querySelector('#modal-close-img-preview').onclick = close;
      modalOverlay.querySelector('#btn-close-img-preview').onclick = close;
    },

    /* ── Access Control & Permission Helper ──────── */
    hasPermission(perm, customUser) {
      const user = customUser || (window.POS && POS.Store ? POS.Store.getCurrentUser() : null);
      if (!user) return false;
      if (user.role === 'admin') return true;
      let perms = user.permissions;
      if (!perms) return false;
      if (typeof perms === 'string') {
        try { perms = JSON.parse(perms); } catch (e) { perms = []; }
      }
      if (!Array.isArray(perms)) return false;
      if (perms.includes('*')) return true;
      if (perms.includes(perm)) return true;

      const aliases = {
        'pos': ['new-order'],
        'new-order': ['pos'],
        'sales': ['sales_list', 'sales_return', 'return_list', 'custom_item_prices'],
        'sales_list': ['sales', 'sales-list'],
        'sales-list': ['sales', 'sales_list'],
        'sales_return': ['sales', 'sales-return'],
        'sales-return': ['sales', 'sales_return'],
        'return_list': ['sales', 'return-list'],
        'return-list': ['sales', 'return_list'],
        'custom_item_prices': ['sales', 'custom-item-price'],
        'custom-item-price': ['sales', 'custom_item_prices'],
        'inventory': ['products', 'bulk_stock', 'inventory_details', 'label_printer'],
        'products': ['inventory'],
        'bulk_stock': ['inventory', 'bulk-scan'],
        'bulk-scan': ['inventory', 'bulk_stock'],
        'inventory_details': ['inventory', 'inventory-details'],
        'inventory-details': ['inventory', 'inventory_details'],
        'label_printer': ['inventory', 'label-printer'],
        'label-printer': ['inventory', 'label_printer'],
        'invoice_settings': ['invoice-settings'],
        'invoice-settings': ['invoice_settings'],
        'payment_methods': ['payment-methods'],
        'payment-methods': ['payment_methods'],
        'report_settings': ['report-settings'],
        'report-settings': ['report_settings'],
        'expired_wastes': ['expired-wastes', 'expenses'],
        'expired-wastes': ['expired_wastes', 'expenses']
      };

      const mapped = aliases[perm];
      if (mapped && mapped.some(k => perms.includes(k))) return true;

      return false;
    },

    /* ── Reusable Media Picker Modal ─────────────── */
    openMediaPicker({ onSelect, title = 'Choose Image from Gallery or Upload', folderName = 'General', folderId = null, activeTab = 'gallery' }) {
      let pickerOverlay = document.getElementById('media-picker-overlay');
      if (!pickerOverlay) {
        pickerOverlay = document.createElement('div');
        pickerOverlay.id = 'media-picker-overlay';
        pickerOverlay.className = 'modal-overlay';
        pickerOverlay.style.zIndex = '99999';
        document.body.appendChild(pickerOverlay);
      }

      let currentTab = activeTab || 'gallery';
      let selectedImageUrl = null;
      let selectedImageObj = null;
      let folders = [];
      let currentFolder = folderId || 'all';

      pickerOverlay.innerHTML = `
        <div class="modal animate" style="max-width: 780px; width: 95%; max-height: 85vh; display: flex; flex-direction: column; padding: 0; overflow: hidden; background: #fff;">
          <div class="modal-header" style="padding: 14px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: 700; font-size: 16px; color: #1e293b; display: flex; align-items: center; gap: 8px;">
              <span>🖼️</span> <span>${this.esc(title)}</span>
              ${folderName ? `<span style="font-size:11px; font-weight:700; background:#ECFDF5; color:#059669; padding:2px 8px; border-radius:12px; border:1px solid #A7F3D0;">📁 ${this.esc(folderName)}</span>` : ''}
            </div>
            <button class="modal-close" id="modal-close-picker" style="font-size: 24px; cursor: pointer; border: none; background: none; color: #64748b;">&times;</button>
          </div>

          <div style="display: flex; gap: 8px; border-bottom: 1px solid var(--border); background: #f8fafc; padding: 8px 20px;">
            <button type="button" class="btn btn-sm ${currentTab === 'gallery' ? 'btn-primary' : 'btn-secondary'}" id="tab-btn-gallery" style="display: flex; align-items: center; gap: 6px;">
              📁 Choose from Gallery
            </button>
            <button type="button" class="btn btn-sm ${currentTab === 'upload' ? 'btn-primary' : 'btn-secondary'}" id="tab-btn-upload" style="display: flex; align-items: center; gap: 6px;">
              📤 Upload from Device
            </button>
          </div>

          <div id="picker-body" style="padding: 16px 20px; flex: 1; overflow-y: auto; min-height: 320px;"></div>

          <div class="modal-footer" style="padding: 12px 20px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: #f8fafc;">
            <div id="picker-selected-indicator" style="font-size: 13px; color: #64748b;">No image selected</div>
            <div style="display: flex; gap: 8px;">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-picker-cancel">Cancel</button>
              <button type="button" class="btn btn-primary btn-sm" id="btn-picker-confirm" disabled>Select Image</button>
            </div>
          </div>
        </div>
      `;

      pickerOverlay.classList.add('active');

      const closePicker = () => {
        pickerOverlay.classList.remove('active');
      };

      pickerOverlay.querySelector('#modal-close-picker').onclick = closePicker;
      pickerOverlay.querySelector('#btn-picker-cancel').onclick = closePicker;

      const confirmBtn = pickerOverlay.querySelector('#btn-picker-confirm');
      confirmBtn.onclick = () => {
        if (selectedImageUrl && typeof onSelect === 'function') {
          onSelect(selectedImageUrl, selectedImageObj);
          closePicker();
        }
      };

      // Resolve designated target folder
      const resolveTargetFolderId = (list) => {
        if (folderId && list.some(f => f.id === folderId)) return folderId;
        if (folderName) {
          const match = list.find(f => f.name.toLowerCase().trim() === folderName.toLowerCase().trim());
          if (match) return match.id;
        }
        return list.length > 0 ? list[0].id : 'default';
      };

      // Load folders and images
      const loadGallery = async () => {
        const body = pickerOverlay.querySelector('#picker-body');
        body.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <label style="font-size:12px; font-weight:600; color:#475569; margin:0;">Folder:</label>
              <select id="picker-folder-select" class="form-select" style="font-size:12px; height:32px; padding:2px 8px; width:auto; min-width:160px;">
                <option value="all">All Folders</option>
              </select>
            </div>
            <div style="font-size:12px; color:#64748b;" id="picker-img-count">Loading images...</div>
          </div>
          <div id="picker-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:12px; max-height:400px; overflow-y:auto;">
            <div style="grid-column:1/-1; text-align:center; padding:40px; color:#94a3b8;">Loading photos from gallery...</div>
          </div>
        `;

        try {
          const foldersRes = await fetch('/api/gallery/folders');
          folders = await foldersRes.json();

          if (currentFolder === 'all' && (folderId || folderName)) {
            currentFolder = resolveTargetFolderId(folders);
          }

          const imagesRes = await fetch(`/api/gallery/images${currentFolder !== 'all' ? '?folderId=' + currentFolder : ''}`);
          const images = await imagesRes.json();

          const sel = pickerOverlay.querySelector('#picker-folder-select');
          if (sel) {
            sel.innerHTML = `<option value="all" ${currentFolder === 'all' ? 'selected' : ''}>All Folders</option>` +
              folders.map(f => `<option value="${f.id}" ${currentFolder === f.id ? 'selected' : ''}>${f.name} (${f.imageCount || 0})</option>`).join('');

            sel.onchange = () => {
              currentFolder = sel.value;
              loadGallery();
            };
          }

          const grid = pickerOverlay.querySelector('#picker-grid');
          const countEl = pickerOverlay.querySelector('#picker-img-count');
          if (countEl) countEl.textContent = `${images.length} photo(s)`;

          if (images.length === 0) {
            grid.innerHTML = `
              <div style="grid-column:1/-1; text-align:center; padding:40px 10px; color:#94a3b8;">
                <div style="font-size:28px; margin-bottom:8px;">📁</div>
                <div style="font-weight:600; color:#64748b; font-size:14px;">No images in this folder</div>
                <p style="font-size:12px; margin:4px 0 12px 0;">Switch to "Upload from Device" above to add new photos.</p>
              </div>
            `;
            return;
          }

          grid.innerHTML = images.map(img => {
            const isSelected = selectedImageUrl === img.data;
            return `
              <div class="picker-item" data-id="${img.id}" style="border: 2px solid ${isSelected ? 'var(--primary)' : '#e2e8f0'}; border-radius: 6px; overflow: hidden; cursor: pointer; background: #fff; position: relative; transition: all 0.15s; aspect-ratio: 1/1; display:flex; flex-direction:column;">
                <div style="flex:1; width:100%; height:100px; display:flex; align-items:center; justify-content:center; background:#f8fafc; overflow:hidden;">
                  <img src="${img.data}" alt="${this.esc(img.name)}" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <div style="padding:4px 6px; font-size:11px; font-weight:600; color:#334155; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; background:#fff; border-top:1px solid #f1f5f9;">
                  ${this.esc(img.name)}
                </div>
                ${isSelected ? `<div style="position:absolute; top:4px; right:4px; background:var(--primary); color:#fff; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold;">✓</div>` : ''}
              </div>
            `;
          }).join('');

          grid.querySelectorAll('.picker-item').forEach(item => {
            item.onclick = () => {
              const id = item.dataset.id;
              const img = images.find(i => i.id === id);
              if (img) {
                selectedImageUrl = img.data;
                selectedImageObj = img;
                confirmBtn.disabled = false;
                pickerOverlay.querySelector('#picker-selected-indicator').innerHTML = `
                  <span style="font-weight:600; color:#1e293b;">Selected:</span> ${this.esc(img.name)}
                `;
                grid.querySelectorAll('.picker-item').forEach(it => {
                  it.style.border = '2px solid #e2e8f0';
                  const tick = it.querySelector('.picker-check-mark');
                  if (tick) tick.remove();
                });
                item.style.border = '2px solid var(--primary)';
                const tick = document.createElement('div');
                tick.className = 'picker-check-mark';
                tick.style.cssText = 'position:absolute; top:4px; right:4px; background:var(--primary); color:#fff; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold;';
                tick.textContent = '✓';
                item.appendChild(tick);
              }
            };
          });
        } catch (err) {
          body.innerHTML = `<div class="text-danger text-center p-3">Failed to load gallery images: ${err.message}</div>`;
        }
      };

      const loadUpload = async () => {
        const body = pickerOverlay.querySelector('#picker-body');
        try {
          const res = await fetch('/api/gallery/folders');
          folders = await res.json();
        } catch(e) {}

        const targetFolder = resolveTargetFolderId(folders);

        body.innerHTML = `
          <div style="max-width: 500px; margin: 0 auto; display: flex; flex-direction: column; gap: 14px;">
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-weight:700;">Save into Gallery Folder:</label>
              <select id="upload-target-folder" class="form-select">
                ${folders.map(f => `<option value="${f.id}" ${f.id === targetFolder ? 'selected' : ''}>${f.name}</option>`).join('')}
              </select>
              <div style="font-size:11px; color:#059669; margin-top:4px; font-weight:600;">
                ✓ Automatically saved into the "${this.esc(folderName)}" folder in your central gallery.
              </div>
            </div>

            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-weight:700;">Choose Photo from Device:</label>
              <div id="drop-zone" style="border: 2px dashed #cbd5e1; border-radius: 8px; padding: 30px 20px; text-align: center; background: #f8fafc; cursor: pointer; transition: border-color 0.2s;">
                <div style="font-size: 32px; margin-bottom: 8px;">📷</div>
                <div style="font-weight: 600; color: #1e293b; font-size: 14px;">Click to browse or drag and drop image here</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">PNG, JPG, JPEG, WEBP, SVG up to 5MB</div>
                <input type="file" id="picker-file-input" accept="image/*" style="display: none;">
              </div>
            </div>

            <div id="upload-preview-box" style="display: none; align-items: center; gap: 12px; padding: 10px; background: #f1f5f9; border-radius: 6px; border: 1px solid #e2e8f0;">
              <img id="upload-img-preview" src="" style="width: 55px; height: 55px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1;">
              <div style="flex: 1; overflow: hidden;">
                <div id="upload-file-name" style="font-size: 13px; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"></div>
                <div id="upload-file-size" style="font-size: 11px; color: #64748b;"></div>
              </div>
              <button type="button" class="btn btn-primary btn-sm" id="btn-do-upload" style="background:#10B981; border-color:#10B981; font-weight:700;">Upload & Select</button>
            </div>
          </div>
        `;

        const dropZone = body.querySelector('#drop-zone');
        const fileInput = body.querySelector('#picker-file-input');
        const previewBox = body.querySelector('#upload-preview-box');
        const imgPreview = body.querySelector('#upload-img-preview');
        const namePreview = body.querySelector('#upload-file-name');
        const sizePreview = body.querySelector('#upload-file-size');
        const doUploadBtn = body.querySelector('#btn-do-upload');

        dropZone.onclick = () => fileInput.click();
        dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--primary)'; };
        dropZone.ondragleave = () => { dropZone.style.borderColor = '#cbd5e1'; };
        dropZone.ondrop = (e) => {
          e.preventDefault();
          dropZone.style.borderColor = '#cbd5e1';
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
          }
        };

        let pendingBase64 = null;
        let pendingName = '';
        let pendingSize = '';

        const handleFile = (file) => {
          if (!file || !file.type.startsWith('image/')) return;
          pendingName = file.name;
          pendingSize = (file.size / 1024).toFixed(1) + ' KB';
          const reader = new FileReader();
          reader.onload = (re) => {
            pendingBase64 = re.target.result;
            imgPreview.src = pendingBase64;
            namePreview.textContent = pendingName;
            sizePreview.textContent = pendingSize;
            previewBox.style.display = 'flex';
          };
          reader.readAsDataURL(file);
        };

        fileInput.onchange = (e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        };

        doUploadBtn.onclick = async () => {
          if (!pendingBase64) return;
          doUploadBtn.disabled = true;
          doUploadBtn.textContent = 'Uploading...';
          const folderIdToUse = body.querySelector('#upload-target-folder').value || targetFolder;
          try {
            const res = await fetch('/api/gallery/images', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                folder_id: folderIdToUse,
                name: pendingName,
                data: pendingBase64,
                size: pendingSize
              })
            });
            const data = await res.json();
            if (data.success && data.image) {
              if (typeof onSelect === 'function') {
                onSelect(data.image.data, data.image);
              }
              closePicker();
            } else {
              alert(data.error || 'Upload failed');
              doUploadBtn.disabled = false;
              doUploadBtn.textContent = 'Upload & Select';
            }
          } catch(err) {
            alert('Upload error: ' + err.message);
            doUploadBtn.disabled = false;
            doUploadBtn.textContent = 'Upload & Select';
          }
        };
      };

      const tabGallery = pickerOverlay.querySelector('#tab-btn-gallery');
      const tabUpload = pickerOverlay.querySelector('#tab-btn-upload');

      tabGallery.onclick = () => {
        currentTab = 'gallery';
        tabGallery.className = 'btn btn-sm btn-primary';
        tabUpload.className = 'btn btn-sm btn-secondary';
        loadGallery();
      };

      tabUpload.onclick = () => {
        currentTab = 'upload';
        tabGallery.className = 'btn btn-sm btn-secondary';
        tabUpload.className = 'btn btn-sm btn-primary';
        loadUpload();
      };

      if (currentTab === 'upload') {
        tabGallery.className = 'btn btn-sm btn-secondary';
        tabUpload.className = 'btn btn-sm btn-primary';
        loadUpload();
      } else {
        loadGallery();
      }
    },

    /* ── Customer labels ──────────────────────────── */
    customerLabels: ['Regular', 'VIP', 'Elite', 'Wholesale', 'Premium', 'New'],

    labelColors: {
      Regular: '#64748b', VIP: '#7c3aed', Elite: '#d97706',
      Wholesale: '#059669', Premium: '#2563eb', New: '#06b6d4'
    },

    /* ── HTML Escaping ───────────────────────────── */
    escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },
    esc(str) {
      return this.escapeHtml(str);
    }
  };

  window.POS = window.POS || {};
  window.POS.Helpers = Helpers;
})();
