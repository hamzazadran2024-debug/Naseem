// Data layer. app.js only talks to window.db, so swapping backends never touches the UI.
(function () {
  const cfg = window.APP_CONFIG;
  const useSupabase = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);

  /* ---------- Local mode (localStorage) ---------- */
  const LS = "fleet-records-v1";
  const seed = {
    companies: [{ id: 1, name: "النقل الإسلامي" }],
    drivers: [{ id: 1, name: "أحمد محمد" }, { id: 2, name: "علي حسن" }, { id: 3, name: "محمد داود" }],
    records: [], nextId: 1
  };
  const load = () => { try { return JSON.parse(localStorage.getItem(LS)) || structuredClone(seed); } catch { return structuredClone(seed); } };
  const save = (s) => { try { localStorage.setItem(LS, JSON.stringify(s)); } catch (e) { console.error(e); } };

  const local = {
    async listLookups() { const s = load(); return { drivers: s.drivers, companies: s.companies }; },
    async listRecords({ page, pageSize, date, driverId }) {
      const s = load();
      const dn = Object.fromEntries(s.drivers.map(d => [d.id, d.name]));
      const cn = Object.fromEntries(s.companies.map(c => [c.id, c.name]));
      let rows = s.records.filter(r => (!date || r.record_date === date) && (!driverId || r.driver_id == driverId))
        .sort((a, b) => b.record_date.localeCompare(a.record_date) || b.id - a.id)
        .map(r => ({ ...r, driver_name: dn[r.driver_id], company_name: cn[r.company_id] }));
      const total = rows.length;
      return { rows: rows.slice((page - 1) * pageSize, page * pageSize), total };
    },
    async addRecord(r) { const s = load(); s.records.push({ ...r, id: s.nextId++ }); save(s); },
    async updateRecord(id, r) { const s = load(); const i = s.records.findIndex(x => x.id === id); if (i >= 0) s.records[i] = { ...s.records[i], ...r }; save(s); },
    async deleteRecord(id) { const s = load(); s.records = s.records.filter(x => x.id !== id); save(s); },
    async session() { return true; },
    async signIn() { return true; }
  };

  /* ---------- Supabase mode ---------- */
  let sb;
  const remote = {
    async listLookups() {
      const [d, c] = await Promise.all([
        sb.from("drivers").select("id,name").eq("active", true).order("name"),
        sb.from("companies").select("id,name").order("name")
      ]);
      if (d.error || c.error) throw (d.error || c.error);
      return { drivers: d.data, companies: c.data };
    },
    async listRecords({ page, pageSize, date, driverId }) {
      let q = sb.from("records_view").select("*", { count: "exact" })
        .order("record_date", { ascending: false }).order("id", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (date) q = q.eq("record_date", date);
      if (driverId) q = q.eq("driver_id", driverId);
      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: data, total: count || 0 };
    },
    async addRecord(r) { const { error } = await sb.from("records").insert(r); if (error) throw error; },
    async updateRecord(id, r) { const { error } = await sb.from("records").update(r).eq("id", id); if (error) throw error; },
    async deleteRecord(id) { const { error } = await sb.from("records").delete().eq("id", id); if (error) throw error; },
    async session() { const { data } = await sb.auth.getSession(); return !!data.session; },
    async signIn(email, password) { const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error; return true; }
  };

  if (useSupabase) sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  window.db = useSupabase ? remote : local;
  window.db.mode = useSupabase ? "supabase" : "local";
})();
