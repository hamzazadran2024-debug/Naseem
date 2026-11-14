(function () {
  const $ = (id) => document.getElementById(id);
  const cfg = window.APP_CONFIG;
  const state = { page: 1, editingId: null, rows: [], lookups: { drivers: [], companies: [] } };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const today = () => new Date().toISOString().slice(0, 10);

  function header() {
    $("companyName").textContent = cfg.companyName;
    const d = new Date();
    $("todayDate").textContent = today();
    $("todayDay").textContent = d.toLocaleDateString("ar", { weekday: "long" });
  }

  function fillSelect(el, items, placeholder) {
    el.innerHTML = `<option value="">${placeholder}</option>` + items.map(i => `<option value="${i.id}">${esc(i.name)}</option>`).join("");
  }

  function resetForm() {
    state.editingId = null;
    $("driver").value = ""; $("company").value = ""; $("tripNo").value = ""; $("serialNo").value = "";
    $("recordDate").value = today();
    $("formTitle").textContent = "إضافة سجل جديد";
    $("saveBtn").textContent = "حفظ السجل";
    $("formError").textContent = "";
  }

  async function save() {
    const rec = {
      driver_id: Number($("driver").value) || null,
      company_id: Number($("company").value) || null,
      trip_no: $("tripNo").value.trim(),
      serial_no: $("serialNo").value.trim(),
      record_date: $("recordDate").value
    };
    if (!rec.driver_id || !rec.company_id || !rec.trip_no || !rec.record_date) {
      $("formError").textContent = "اختر السائق والشركة وأدخل رقم الرحلة والتاريخ.";
      return;
    }
    $("saveBtn").disabled = true;
    try {
      if (state.editingId) await db.updateRecord(state.editingId, rec); else await db.addRecord(rec);
      resetForm();
      await refresh();
    } catch (e) {
      console.error(e);
      $("formError").textContent = "تعذر حفظ السجل. تحقق من الاتصال وحاول مرة أخرى.";
    } finally { $("saveBtn").disabled = false; }
  }

  async function refresh() {
    const pageSize = cfg.pageSize || 10;
    try {
      const { rows, total } = await db.listRecords({ page: state.page, pageSize, date: $("filterDate").value, driverId: $("filterDriver").value });
      const pages = Math.max(1, Math.ceil(total / pageSize));
      if (state.page > pages) { state.page = pages; return refresh(); }
      state.rows = rows;
      $("rows").innerHTML = rows.length ? rows.map((r, i) => `
        <tr>
          <td>${(state.page - 1) * pageSize + i + 1}</td>
          <td>${esc(r.driver_name)}</td><td>${esc(r.company_name)}</td>
          <td>${esc(r.trip_no)}</td><td>${esc(r.serial_no)}</td><td>${esc(r.record_date)}</td>
          <td>
            <button class="icon v" data-act="view" data-id="${r.id}">عرض</button>
            <button class="icon e" data-act="edit" data-id="${r.id}">تعديل</button>
            <button class="icon d" data-act="del" data-id="${r.id}">حذف</button>
          </td></tr>`).join("") : `<tr><td colspan="7" class="empty">لا توجد سجلات. أضف أول سجل من النموذج أعلاه.</td></tr>`;
      const from = total ? (state.page - 1) * pageSize + 1 : 0;
      $("pageInfo").textContent = `عرض ${from} إلى ${Math.min(state.page * pageSize, total)} من ${total} سجل`;
      $("pageBtns").innerHTML = `<button data-p="${state.page - 1}" ${state.page <= 1 ? "disabled" : ""}>السابق</button>
        <button class="on" disabled>${state.page}</button>
        <button data-p="${state.page + 1}" ${state.page >= pages ? "disabled" : ""}>التالي</button>`;
    } catch (e) {
      console.error(e);
      $("rows").innerHTML = `<tr><td colspan="7" class="empty">تعذر تحميل السجلات. تحقق من الاتصال.</td></tr>`;
    }
  }

  function onRowAction(e) {
    const b = e.target.closest("button[data-act]"); if (!b) return;
    const id = Number(b.dataset.id); const r = state.rows.find(x => x.id === id); if (!r) return;
    if (b.dataset.act === "view") {
      $("viewBody").innerHTML = [["السائق", r.driver_name], ["الشركة", r.company_name], ["الرحلة", r.trip_no], ["الرقم المتسلسل", r.serial_no], ["التاريخ", r.record_date]]
        .map(([k, v]) => `<div class="kv"><span>${k}</span><span>${esc(v)}</span></div>`).join("");
      $("viewDialog").showModal();
    } else if (b.dataset.act === "edit") {
      state.editingId = id;
      $("driver").value = r.driver_id; $("company").value = r.company_id;
      $("tripNo").value = r.trip_no; $("serialNo").value = r.serial_no || ""; $("recordDate").value = r.record_date;
      $("formTitle").textContent = "تعديل السجل"; $("saveBtn").textContent = "حفظ التعديل";
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (b.dataset.act === "del") {
      if (confirm("حذف هذا السجل نهائيًا؟")) db.deleteRecord(id).then(refresh).catch(console.error);
    }
  }

  async function ensureLogin() {
    if (await db.session()) return;
    const dlg = $("loginDialog"); dlg.showModal();
    await new Promise(resolve => {
      $("loginBtn").onclick = async () => {
        try { await db.signIn($("loginEmail").value, $("loginPass").value); dlg.close(); resolve(); }
        catch { $("loginError").textContent = "البريد أو كلمة المرور غير صحيحة."; }
      };
    });
  }

  async function init() {
    header();
    await ensureLogin();
    state.lookups = await db.listLookups();
    fillSelect($("driver"), state.lookups.drivers, "اختر السائق");
    fillSelect($("company"), state.lookups.companies, "اختر الشركة");
    fillSelect($("filterDriver"), state.lookups.drivers, "كل السائقين");
    resetForm();
    $("saveBtn").onclick = save;
    $("resetBtn").onclick = resetForm;
    $("rows").onclick = onRowAction;
    $("pageBtns").onclick = (e) => { const b = e.target.closest("button[data-p]"); if (b && !b.disabled) { state.page = Number(b.dataset.p); refresh(); } };
    $("filterDate").onchange = $("filterDriver").onchange = () => { state.page = 1; refresh(); };
    refresh();
  }
  init().catch(e => { console.error(e); $("rows").innerHTML = `<tr><td colspan="7" class="empty">تعذر بدء التطبيق. راجع إعدادات الاتصال في js/config.js.</td></tr>`; });
})();
