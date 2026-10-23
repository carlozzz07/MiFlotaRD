import { Haptics } from '@capacitor/haptics';
import { Auth } from './auth.js';
import { UI, whatsappLink } from './ui.js';
import {
  addRecord,
  createEmptyDatabase,
  deleteRecord,
  loadDatabase,
  saveDatabase,
  STORAGE_KEY,
  updateRecord
} from './db.js';
import { bindFinancialInputs, formatMoneyInput, parseMoney } from './ui.js';

const SUPABASE_URL = 'https://pofpqcvejdrlxindicpc.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvZnBxY3ZlamRybHhpbmRpY3BjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MTc0NzUsImV4cCI6MjEwODE5MzQ3NX0.flLYbLEnM3gro3JpG4ANvrCiks7nXauGPxDN4uVIqIE';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const databaseAuth = {
      loadCloudDatabase: (userId) => Auth.loadCloudDatabase(supabaseClient, userId),
      saveCloudDatabase: (userId, database) => Auth.saveCloudDatabase(supabaseClient, userId, database)
    };

    const THEME_KEY = 'miflota_rd_theme_prod_v1';

    async function notifySuccess() {
      try {
        await Haptics.notification({ type: 'SUCCESS' });
      } catch (error) {
        console.warn('No se pudo activar la notificación háptica.', error);
      }
    }

    function getCurrentPosition() {
      if (!navigator.geolocation) return Promise.resolve(null);
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
          (error) => {
            console.warn('No se pudo obtener la ubicación GPS de la incidencia.', error);
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });
    }

    function readReceiptImage(file) {
      if (!file) return Promise.resolve(null);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error || new Error('No se pudo leer la imagen.'));
        reader.onload = () => {
          const image = new Image();
          image.onerror = () => reject(new Error('El archivo seleccionado no es una imagen válida.'));
          image.onload = () => {
            try {
              const maxDimension = 1280;
              const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
              const canvas = document.createElement('canvas');
              canvas.width = Math.round(image.width * scale);
              canvas.height = Math.round(image.height * scale);
              canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL('image/jpeg', 0.75));
            } catch (error) {
              reject(error);
            }
          };
          image.src = String(reader.result);
        };
        reader.readAsDataURL(file);
      });
    }

    const MONTHS_ES = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const App = {
      db: null,
      activeTab: 'trips',
      chartDoughnut: null,
      chartBar: null,
      incidentLocation: null,

      uid(prefix = 'id') {
        return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      },

      formatRD(val) {
        const num = Number(val) || 0;
        const sign = num < 0 ? '-' : '';
        const formatted = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(Math.abs(num));
        return `${sign}RD$ ${formatted}`;
      },

      formatTime12h(timeStr) {
        if (!timeStr) return 'Sin hora';
        const [hStr, mStr] = timeStr.split(':');
        let h = parseInt(hStr, 10);
        if (isNaN(h)) return timeStr;
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${String(h).padStart(2, '0')}:${mStr} ${ampm}`;
      },

      formatMonthLabel(yyyyMm) {
        if (!yyyyMm || yyyyMm === 'ALL') return 'Todos los meses (Histórico)';
        const [year, month] = yyyyMm.split('-');
        const mIdx = parseInt(month, 10) - 1;
        return `${MONTHS_ES[mIdx] || month} ${year}`;
      },

      offsetDateISO(days) {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
      },

      // Base de datos inicial 100% en blanco
      getEmptyDatabase() {
        return createEmptyDatabase();
      },

      _addMenuPlaceholder: null,
      _addMenuPreviousOverflow: '',

      toggleAddMenu(e) {
        e?.stopPropagation();
        const menu = document.getElementById('addNewDropdownMenu');
        const wrapper = document.getElementById('addNewDropdownWrapper');
        if (!menu || !wrapper) return;
        if (!menu.classList.contains('hidden')) {
          this.closeAddMenu();
          return;
        }

        this._addMenuPreviousOverflow = document.body.style.overflow;
        this._addMenuPlaceholder = document.createComment('add-menu-position');
        wrapper.insertBefore(this._addMenuPlaceholder, menu);
        document.body.appendChild(menu);
        menu.classList.remove('hidden');
        this.positionAddMenu();

        const chev = document.getElementById('addMenuChevron');
        const toggle = document.getElementById('addNewDropdownToggle');
        if (chev) chev.style.transform = 'rotate(180deg)';
        if (toggle) toggle.setAttribute('aria-expanded', 'true');
      },

      positionAddMenu() {
        const menu = document.getElementById('addNewDropdownMenu');
        const toggle = document.getElementById('addNewDropdownToggle');
        const backdrop = document.getElementById('addNewDropdownBackdrop');
        if (!menu || !toggle || menu.classList.contains('hidden')) return;

        const isMobile = window.matchMedia('(max-width: 639px)').matches;
        menu.classList.toggle('add-menu-mobile-sheet', isMobile);
        if (backdrop) backdrop.classList.toggle('hidden', !isMobile);

        if (isMobile) {
          menu.style.cssText = '';
          document.body.style.overflow = 'hidden';
          return;
        }

        document.body.style.overflow = this._addMenuPreviousOverflow;
        const trigger = toggle.getBoundingClientRect();
        const margin = 16;
        const width = Math.min(menu.getBoundingClientRect().width || 256, window.innerWidth - margin * 2);
        menu.style.position = 'fixed';
        menu.style.width = `${width}px`;
        menu.style.maxWidth = `calc(100vw - ${margin * 2}px)`;
        menu.style.maxHeight = `calc(100vh - ${margin * 2}px)`;
        menu.style.maxHeight = `calc(100dvh - ${margin * 2}px)`;

        const left = Math.max(margin, Math.min(trigger.right - width, window.innerWidth - width - margin));
        const menuHeight = menu.getBoundingClientRect().height;
        const below = trigger.bottom + 8;
        const top = below + menuHeight <= window.innerHeight - margin
          ? below
          : Math.max(margin, trigger.top - menuHeight - 8);
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        menu.style.right = 'auto';
        menu.style.bottom = 'auto';
      },

      closeAddMenu() {
        const menu = document.getElementById('addNewDropdownMenu');
        if (menu) {
          menu.classList.add('hidden');
          menu.classList.remove('add-menu-mobile-sheet');
          menu.style.cssText = '';
          if (this._addMenuPlaceholder?.isConnected) this._addMenuPlaceholder.replaceWith(menu);
        }
        this._addMenuPlaceholder = null;
        const backdrop = document.getElementById('addNewDropdownBackdrop');
        if (backdrop) backdrop.classList.add('hidden');
        const chev = document.getElementById('addMenuChevron');
        const toggle = document.getElementById('addNewDropdownToggle');
        if (chev) chev.style.transform = 'rotate(0deg)';
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = this._addMenuPreviousOverflow;
        this._addMenuPreviousOverflow = '';
      },

      initTheme() {
        const saved = localStorage.getItem(THEME_KEY) || 'light';
        document.documentElement.classList.toggle('dark', saved === 'dark');
        this.updateThemeIcon();
      },

      toggleTheme() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
        this.updateThemeIcon();
        if (this.activeTab === 'analytics') this.renderAnalyticsCharts();
      },

      updateThemeIcon() {
        const isDark = document.documentElement.classList.contains('dark');
        const icon = document.getElementById('themeIcon');
        if (icon) icon.className = isDark ? 'fa-solid fa-sun text-amber-400 text-sm' : 'fa-solid fa-moon text-slate-600 text-sm';
      },

      currentUser: null,

      toggleAuthPassword() {
        const input = document.getElementById('authPassword');
        const button = document.getElementById('authPasswordToggle');
        const icon = document.getElementById('authPasswordToggleIcon');
        if (!input || !button || !icon) return;
        const isVisible = input.type === 'text';
        input.type = isVisible ? 'password' : 'text';
        button.setAttribute('aria-pressed', String(!isVisible));
        button.setAttribute('aria-label', isVisible ? 'Mostrar contraseña' : 'Ocultar contraseña');
        icon.className = isVisible ? 'fa-regular fa-eye' : 'fa-regular fa-eye-slash';
      },

      async init() {
        this.initTheme();
        this.db = this.getEmptyDatabase();
        bindFinancialInputs(document);

        document.addEventListener('click', (e) => {
          const wrapper = document.getElementById('addNewDropdownWrapper');
          const menu = document.getElementById('addNewDropdownMenu');
          if (wrapper && !wrapper.contains(e.target) && !menu?.contains(e.target)) {
            this.closeAddMenu();
          }
        });
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') this.closeAddMenu();
        });
        window.addEventListener('resize', () => {
          const menu = document.getElementById('addNewDropdownMenu');
          if (menu && !menu.classList.contains('hidden')) {
            this.positionAddMenu();
          }
        });
        window.addEventListener('scroll', () => {
          const menu = document.getElementById('addNewDropdownMenu');
          if (menu && !menu.classList.contains('hidden') && !window.matchMedia('(max-width: 639px)').matches) {
            this.positionAddMenu();
          }
        }, true);

        // Verificar si hay sesión activa en Supabase
        let session;
        try {
          session = await Auth.getSession(supabaseClient);
        } catch (error) {
          console.error('No se pudo verificar la sesión de Supabase.', error);
          document.getElementById('authGateOverlay').classList.remove('hidden');
          this.showToast('No se pudo verificar la sesión. Revisa tu conexión.', true);
          return;
        }
        if (session && session.user) {
          await this.unlockAndLoadCloudData(session.user);
        } else {
          document.getElementById('authGateOverlay').classList.remove('hidden');
        }
      },

      async loginWithSupabase(e) {
        e.preventDefault();
        const email = document.getElementById('authEmail').value.trim();
        const password = document.getElementById('authPassword').value;
        const errEl = document.getElementById('authErrorMsg');
        const btn = document.getElementById('authSubmitBtn');

        errEl.classList.add('hidden');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Verificando...';

        try {
          const user = await Auth.signIn(supabaseClient, email, password);
          await this.unlockAndLoadCloudData(user);
          this.showToast('Sesión iniciada y datos sincronizados');
        } catch (error) {
          console.error('No se pudo iniciar sesión en Supabase.', error);
          errEl.textContent = error?.status === 400
            ? 'Credenciales inválidas. Verifica tu correo y contraseña.'
            : 'No fue posible iniciar sesión. Verifica tu conexión e inténtalo de nuevo.';
          errEl.classList.remove('hidden');
        } finally {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-lock-open"></i> <span>Iniciar Sesión Segura</span>';
        }
      },

      async unlockAndLoadCloudData(user) {
        this.currentUser = user;
        document.getElementById('authGateOverlay').classList.add('hidden');

        const { database, cloudError } = await loadDatabase(user, databaseAuth);
        this.db = database;
        if (cloudError) {
          console.error('No se pudo cargar la nube; se usarán los datos locales.', cloudError);
          this.showToast('No se pudo conectar a la nube; datos locales cargados', true);
        } else {
          await this.save();
        }

        this.populateMonthFilter();
        this.renderAll();

        const userName = user.email ? user.email.split('@')[0] : 'Administrador';
        this.showToast(`¡Bienvenido de nuevo, ${userName}!`);
      },

      async logoutSupabase() {
        if (!confirm('¿Cerrar sesión en este dispositivo?')) return;
        await Auth.signOut(supabaseClient);
        this.currentUser = null;
        document.getElementById('authGateOverlay').classList.remove('hidden');
      },

      async save() {
        const badge = document.getElementById('cloudSyncBadge');
        await saveDatabase(this.db, this.currentUser, databaseAuth, (state) => {
          if (!badge) return;
          badge.innerHTML = state === 'saving'
            ? '<i class="fa-solid fa-arrows-rotate fa-spin"></i> Guardando...'
            : state === 'synced'
              ? '<i class="fa-solid fa-cloud-check"></i> Sincronizado'
              : '<i class="fa-solid fa-triangle-exclamation text-rose-500"></i> Solo Local';
        });
      },
      

      

      

      // Cruza fechas de forma segura contra el selector de mes global ("YYYY-MM" o "ALL")
      matchesPeriod(recordDate, periodCode) {
        const target = periodCode || this.getSelectedMonth();
        if (!target || target === 'ALL') return true;
        const clean = String(recordDate || '').trim();
        return clean.slice(0, 7) === target;
      },

      getAvailableMonths() {
        const currentMonth = this.offsetDateISO(0).slice(0, 7);
        const set = new Set([currentMonth]);
        this.db.trips.forEach(t => { if (t.date) set.add(String(t.date).trim().slice(0, 7)); });
        this.db.maintenances.forEach(m => { if (m.date) set.add(String(m.date).trim().slice(0, 7)); });
        this.db.incidents.forEach(i => { if (i.date) set.add(String(i.date).trim().slice(0, 7)); });
        this.db.scheduledTrips.forEach(s => { if (s.date) set.add(String(s.date).trim().slice(0, 7)); });
        return [...set].filter(Boolean).sort().reverse();
      },

      populateMonthFilter(forceSelectMonth = null) {
        const sel = document.getElementById('monthFilter');
        const prev = forceSelectMonth || sel?.value || 'ALL';
        const sorted = this.getAvailableMonths();
        sel.innerHTML = `<option value="ALL">Todos los meses (Histórico)</option>` +
          sorted.map(m => `<option value="${m}">${this.formatMonthLabel(m)}</option>`).join('');
        if ([...sel.options].some(o => o.value === prev)) {
          sel.value = prev;
        } else {
          sel.value = 'ALL';
        }
      },

      getSelectedMonth() {
        const val = document.getElementById('monthFilter')?.value;
        return val ? val : 'ALL';
      },

      // Si el usuario tiene un mes específico filtrado y registra algo de otro mes, sincroniza el filtro para que vea su registro de inmediato
      syncFilterWithNewRecordDate(dateStr) {
        const current = this.getSelectedMonth();
        const recMonth = String(dateStr || '').trim().slice(0, 7);
        if (current !== 'ALL' && recMonth && recMonth !== current) {
          this.populateMonthFilter(recMonth);
        } else {
          this.populateMonthFilter(current);
        }
      },

      getFilteredTrips(monthOverride = null) {
        const m = monthOverride || this.getSelectedMonth();
        return this.db.trips
          .filter(t => this.matchesPeriod(t.date, m))
          .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      },

      getFilteredMaintenances(monthOverride = null) {
        const m = monthOverride || this.getSelectedMonth();
        return this.db.maintenances
          .filter(x => this.matchesPeriod(x.date, m))
          .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      },

      getFilteredIncidents(monthOverride = null) {
        const m = monthOverride || this.getSelectedMonth();
        return this.db.incidents
          .filter(i => this.matchesPeriod(i.date, m))
          .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      },

      getAllScheduledSorted(monthOverride = null) {
        const m = monthOverride || this.getSelectedMonth();
        return this.db.scheduledTrips
          .filter(s => this.matchesPeriod(s.date, m))
          .sort((a, b) => `${a.date}T${a.departureTime || '00:00'}`.localeCompare(`${b.date}T${b.departureTime || '00:00'}`));
      },

      calcTrip(t) {
        const gross = Number(t.freightGross) || 0;
        const fuel = Number(t.fuelCost) || 0;
        const tolls = Number(t.tollsCost) || 0;
        const drvPay = Number(t.driverPay) || 0;
        const hlpPay = Number(t.helperPay) || 0;
        const other = Number(t.otherCost) || 0;
        const totalExpense = fuel + tolls + drvPay + hlpPay + other;
        const netOwner = gross - totalExpense;
        const hasAnyFinancial = Boolean(
          (t.freightGross !== '' && t.freightGross !== null && t.freightGross !== undefined && Number(t.freightGross) > 0) ||
          totalExpense > 0
        );
        return { gross, fuel, tolls, drvPay, hlpPay, other, totalExpense, netOwner, hasAnyFinancial };
      },

      getTruckName(id) {
        if (!id) return 'Por asignar';
        return this.db.trucks.find(x => String(x.id) === String(id))?.name || 'Por asignar';
      },

      getDriverName(id) {
        if (!id) return 'Por asignar';
        return this.db.drivers.find(x => String(x.id) === String(id))?.name || 'Por asignar';
      },

      getHelpersNames(ids = []) {
        if (!ids || ids.length === 0) return 'Sin ayudante';
        return ids.map(id => this.db.helpers.find(x => String(x.id) === String(id))?.name).filter(Boolean).join(', ') || 'Sin ayudante';
      },

      

      getPeriodSummary(monthOverride = null) {
        const trips = this.getFilteredTrips(monthOverride);
        const maints = this.getFilteredMaintenances(monthOverride);
        const incidents = this.getFilteredIncidents(monthOverride);
        const scheduled = this.getAllScheduledSorted(monthOverride);

        let gross = 0, fuel = 0, tolls = 0, drvPay = 0, hlpPay = 0, other = 0, tripExp = 0, tripNet = 0, clients = 0;

        trips.forEach(t => {
          const m = this.calcTrip(t);
          gross += m.gross; fuel += m.fuel; tolls += m.tolls;
          drvPay += m.drvPay; hlpPay += m.hlpPay; other += m.other;
          tripExp += m.totalExpense; tripNet += m.netOwner;
          clients += Number(t.clientsCount) || 0;
        });

        const maintTotal = maints.reduce((s, x) => s + (Number(x.cost) || 0), 0);
        const incidentTotal = incidents.reduce((s, x) => s + (Number(x.cost) || 0), 0);
        const finalOwnerNet = tripNet - maintTotal - incidentTotal;
        const marginPct = gross > 0 ? ((finalOwnerNet / gross) * 100).toFixed(1) : 0;

        return { trips, maints, incidents, scheduled, gross, fuel, tolls, drvPay, hlpPay, other, tripExp, tripNet, maintTotal, incidentTotal, finalOwnerNet, clients, marginPct };
      },

      

      

      // PESTAÑA 1: Centro de Viajes
      

      // PESTAÑA 2: Agenda Anticipada (filtrada por el mes global seleccionado)
      

      // PESTAÑA 3: Camiones y Taller (con botón "Ver Historial" del Camión respetando el mes seleccionado)
      

      // PESTAÑA 4: Incidencias
      

      // PESTAÑA 5: Choferes (con "Restante Generado")
      

      // PESTAÑA 6: Analítica Visual
      

      // PESTAÑA 8: Catálogos
      

      // =====================================================================
      // 2. MODALES DE HISTORIAL CORREGIDOS (RESPETANDO EL MES GLOBAL ACTIVO)
      // =====================================================================
      openDriverHistoryModal(driverId) {
        const d = this.db.drivers.find(x => String(x.id) === String(driverId));
        if (!d) return;

        const periodLabel = this.formatMonthLabel(this.getSelectedMonth());
        const dTrips = this.getFilteredTrips().filter(t => String(t.driverId) === String(driverId));

        let totalFletes = 0, totalCombustible = 0, totalCobradoChofer = 0, totalRestanteGenerado = 0;

        const rowsHtml = dTrips.map(t => {
          const m = this.calcTrip(t);
          totalFletes += m.gross;
          totalCombustible += m.fuel;
          totalCobradoChofer += m.drvPay;
          totalRestanteGenerado += m.netOwner;

          return `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40">
              <td class="td font-mono font-semibold whitespace-nowrap">${t.date}</td>
              <td class="td">
                <div class="font-semibold text-slate-900 dark:text-white">${t.route}</div>
                <span class="text-[11px] text-slate-400">${t.clientsCount} cliente(s) · Ayud: ${this.getHelpersNames(t.helperIds)}</span>
              </td>
              <td class="td">${this.getTruckName(t.truckId)}</td>
              <td class="td text-right font-mono font-semibold whitespace-nowrap">${this.formatRD(m.gross)}</td>
              <td class="td text-right font-mono font-semibold whitespace-nowrap">${this.formatRD(m.fuel)}</td>
              <td class="td text-right font-mono font-semibold whitespace-nowrap">${this.formatRD(m.drvPay)}</td>
              <td class="td text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">${this.formatRD(m.netOwner)}</td>
            </tr>
          `;
        }).join('');
        const settlementUrl = whatsappLink(
          d.phone,
          `Resumen de liquidación del periodo. Viajes realizados: ${dTrips.length}. Total Fletes: ${this.formatRD(totalFletes)}. Combustible: ${this.formatRD(totalCombustible)}. Total Cobrado por Chofer: ${this.formatRD(totalCobradoChofer)}. Restante Generado: ${this.formatRD(totalRestanteGenerado)}.`
        );

        const footHtml = dTrips.length > 0 ? `
          <tfoot class="bg-slate-100 dark:bg-slate-800/90 font-mono font-bold text-xs border-t-2 border-slate-300 dark:border-slate-600">
            <tr>
              <td class="py-3 px-3" colspan="3">TOTALES DEL PERIODO (${dTrips.length} viajes)</td>
              <td class="py-3 px-3 text-right whitespace-nowrap">${this.formatRD(totalFletes)}</td>
              <td class="py-3 px-3 text-right whitespace-nowrap">${this.formatRD(totalCombustible)}</td>
              <td class="py-3 px-3 text-right whitespace-nowrap">${this.formatRD(totalCobradoChofer)}</td>
              <td class="py-3 px-3 text-right text-emerald-700 dark:text-emerald-400 whitespace-nowrap">${this.formatRD(totalRestanteGenerado)}</td>
            </tr>
          </tfoot>
        ` : '';

        this.openModal(`Historial de Chofer: ${d.name} — ${periodLabel}`, `
          <div class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div class="p-3.5 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
                <span class="text-slate-400 uppercase font-semibold block">Total Fletes</span>
                <span class="font-mono font-bold text-base text-slate-900 dark:text-white mt-0.5 block">${this.formatRD(totalFletes)}</span>
              </div>
              <div class="p-3.5 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
                <span class="text-slate-400 uppercase font-semibold block">Total Cobrado por Chofer</span>
                <span class="font-mono font-bold text-base text-sky-600 dark:text-sky-400 mt-0.5 block">${this.formatRD(totalCobradoChofer)}</span>
              </div>
              <div class="p-3.5 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
                <span class="text-slate-400 uppercase font-semibold block">Combustible</span>
                <span class="font-mono font-bold text-base text-slate-900 dark:text-white mt-0.5 block">${this.formatRD(totalCombustible)}</span>
              </div>
              <div class="p-3.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                <span class="text-emerald-800 dark:text-emerald-300 uppercase font-bold block">Restante Generado</span>
                <span class="font-mono font-bold text-base text-emerald-700 dark:text-emerald-400 mt-0.5 block">${this.formatRD(totalRestanteGenerado)}</span>
              </div>
            </div>

            <div class="overflow-x-auto border border-slate-300 dark:border-slate-700 rounded-md">
              <table class="w-full border-collapse">
                <thead>
                  <tr>
                    <th class="th">Fecha</th>
                    <th class="th">Ruta y Clientes</th>
                    <th class="th">Camión</th>
                    <th class="th text-right">Total Fletes</th>
                    <th class="th text-right">Combustible</th>
                    <th class="th text-right">Cobrado por Chofer</th>
                    <th class="th text-right">Restante Generado</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml || '<tr><td colspan="7" class="py-8 text-center text-slate-400 text-xs">Sin viajes registrados para este chofer en el periodo seleccionado.</td></tr>'}
                </tbody>
                ${footHtml}
              </table>
            </div>
            <div class="flex justify-end">
              ${settlementUrl
                ? `<a href="${settlementUrl}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp"><i class="fa-brands fa-whatsapp"></i><span>Enviar Resumen WA</span></a>`
                : '<span class="text-xs text-slate-500">Registre un teléfono para compartir este resumen por WhatsApp.</span>'}
            </div>
          </div>
        `, 'max-w-4xl');
      },

      openTruckHistoryModal(truckId) {
        const trk = this.db.trucks.find(x => String(x.id) === String(truckId));
        if (!trk) return;

        const periodLabel = this.formatMonthLabel(this.getSelectedMonth());
        const tTrips = this.getFilteredTrips().filter(t => String(t.truckId) === String(truckId));
        const tMaints = this.getFilteredMaintenances().filter(m => String(m.truckId) === String(truckId));
        const tIncs = this.getFilteredIncidents().filter(i => String(i.truckId) === String(truckId));

        let totalFletes = 0, totalGastosViajes = 0, totalNetoViajes = 0;

        const tripRowsHtml = tTrips.map(t => {
          const m = this.calcTrip(t);
          totalFletes += m.gross;
          totalGastosViajes += m.totalExpense;
          totalNetoViajes += m.netOwner;

          return `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40">
              <td class="td font-mono font-semibold whitespace-nowrap">${t.date}</td>
              <td class="td"><b>${t.route}</b> (${t.clientsCount} cli.)</td>
              <td class="td">${this.getDriverName(t.driverId)}</td>
              <td class="td text-right font-mono">${this.formatRD(m.gross)}</td>
              <td class="td text-right font-mono text-amber-600">-${this.formatRD(m.totalExpense)}</td>
              <td class="td text-right font-mono font-bold text-emerald-600">${this.formatRD(m.netOwner)}</td>
            </tr>
          `;
        }).join('');

        const maintCost = tMaints.reduce((s, x) => s + (Number(x.cost) || 0), 0);
        const incCost = tIncs.reduce((s, x) => s + (Number(x.cost) || 0), 0);
        const totalTallerEIncidencias = maintCost + incCost;
        const gananciaNetaCamion = totalFletes - totalGastosViajes - totalTallerEIncidencias;

        const maintAndIncRows = [
          ...tMaints.map(m => `
            <tr>
              <td class="td font-mono font-semibold whitespace-nowrap">${m.date}</td>
              <td class="td"><span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Taller</span></td>
              <td class="td">${m.description}</td>
              <td class="td text-right font-mono font-bold text-rose-600">-${this.formatRD(m.cost)}</td>
            </tr>`),
          ...tIncs.map(i => `
            <tr>
              <td class="td font-mono font-semibold whitespace-nowrap">${i.date}</td>
              <td class="td"><span class="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">Incidencia (${i.severity})</span></td>
              <td class="td">${i.description}</td>
              <td class="td text-right font-mono font-bold text-rose-600">-${this.formatRD(i.cost)}</td>
            </tr>`)
        ].join('');

        this.openModal(`Historial de Camión: ${trk.name} (${trk.plate}) — ${periodLabel}`, `
          <div class="space-y-5">
            <!-- 4 Tarjetas de Resumen del Camión en el Periodo -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div class="p-3 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
                <span class="text-slate-400 uppercase font-semibold block">Total Fletes</span>
                <span class="font-mono font-bold text-sm sm:text-base text-slate-900 dark:text-white mt-0.5 block">${this.formatRD(totalFletes)}</span>
              </div>
              <div class="p-3 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
                <span class="text-slate-400 uppercase font-semibold block">Total Gastos de Viajes</span>
                <span class="font-mono font-bold text-sm sm:text-base text-amber-600 mt-0.5 block">-${this.formatRD(totalGastosViajes)}</span>
              </div>
              <div class="p-3 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
                <span class="text-slate-400 uppercase font-semibold block">Total Gastos Taller/Incidencias</span>
                <span class="font-mono font-bold text-sm sm:text-base text-rose-600 mt-0.5 block">-${this.formatRD(totalTallerEIncidencias)}</span>
              </div>
              <div class="p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                <span class="text-emerald-800 dark:text-emerald-300 uppercase font-bold block">Ganancia Neta</span>
                <span class="font-mono font-bold text-sm sm:text-base ${gananciaNetaCamion >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'} mt-0.5 block">${this.formatRD(gananciaNetaCamion)}</span>
              </div>
            </div>

            <!-- Tabla 1: Viajes del Camión en ese mes -->
            <div>
              <h4 class="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">Viajes Realizados en este Periodo (${tTrips.length})</h4>
              <div class="overflow-x-auto border border-slate-300 dark:border-slate-700 rounded-md">
                <table class="w-full border-collapse">
                  <thead>
                    <tr>
                      <th class="th">Fecha</th>
                      <th class="th">Ruta</th>
                      <th class="th">Chofer</th>
                      <th class="th text-right">Flete</th>
                      <th class="th text-right">Gastos Viaje</th>
                      <th class="th text-right">Ganancia Neta Viaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${tripRowsHtml || '<tr><td colspan="6" class="py-6 text-center text-slate-400 text-xs">Sin viajes registrados en este periodo</td></tr>'}
                  </tbody>
                  ${tTrips.length > 0 ? `
                    <tfoot class="bg-slate-100 dark:bg-slate-800/90 font-mono font-bold text-xs border-t-2 border-slate-300 dark:border-slate-600">
                      <tr>
                        <td class="py-2.5 px-3" colspan="3">SUBTOTAL VIAJES (${tTrips.length})</td>
                        <td class="py-2.5 px-3 text-right">${this.formatRD(totalFletes)}</td>
                        <td class="py-2.5 px-3 text-right text-amber-600">-${this.formatRD(totalGastosViajes)}</td>
                        <td class="py-2.5 px-3 text-right text-emerald-600">${this.formatRD(totalNetoViajes)}</td>
                      </tr>
                    </tfoot>` : ''}
                </table>
              </div>
            </div>

            <!-- Tabla 2: Mantenimientos e Incidencias del Camión en ese mes -->
            <div>
              <h4 class="font-bold text-xs uppercase tracking-wider text-rose-600 mb-2">Mantenimientos de Taller e Incidencias en este Periodo (${tMaints.length + tIncs.length})</h4>
              <div class="overflow-x-auto border border-slate-300 dark:border-slate-700 rounded-md">
                <table class="w-full border-collapse">
                  <thead>
                    <tr>
                      <th class="th">Fecha</th>
                      <th class="th">Tipo</th>
                      <th class="th">Descripción</th>
                      <th class="th text-right">Costo (RD$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${maintAndIncRows || '<tr><td colspan="4" class="py-6 text-center text-slate-400 text-xs">Sin gastos de taller ni incidencias en este periodo</td></tr>'}
                  </tbody>
                  ${(tMaints.length + tIncs.length) > 0 ? `
                    <tfoot class="bg-slate-100 dark:bg-slate-800/90 font-mono font-bold text-xs border-t-2 border-slate-300 dark:border-slate-600">
                      <tr>
                        <td class="py-2.5 px-3" colspan="3">SUBTOTAL TALLER E INCIDENCIAS</td>
                        <td class="py-2.5 px-3 text-right text-rose-600">-${this.formatRD(totalTallerEIncidencias)}</td>
                      </tr>
                    </tfoot>` : ''}
                </table>
              </div>
            </div>
          </div>
        `, 'max-w-4xl');
      },

      // =====================================================================
      // MODALES DE REGISTRO Y EDICIÓN (CRUD)
      // =====================================================================
      openTripModal(tripId = null, fromScheduledId = null) {
        const t = tripId
          ? this.db.trips.find(x => String(x.id) === String(tripId))
          : (fromScheduledId ? this.db.scheduledTrips.find(x => String(x.id) === String(fromScheduledId)) : null);

        const today = this.offsetDateISO(0);
        const routeOpts = this.db.routes.map(r => `<option value="${r.name}"></option>`).join('');
        const selHelpers = t ? (t.helperIds || []).map(String) : [];

        const availableTrucks = this.db.trucks.filter((truck) => truck.status === 'Disponible');
        if (availableTrucks.length === 0) {
          this.openModal('No hay camiones disponibles', `
            <div class="space-y-4">
              <div class="rounded-md border border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                <p class="text-sm font-semibold text-slate-900 dark:text-white">No es posible registrar un viaje</p>
                <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">Registre un camión o cambie el estado de uno existente a “Disponible” para continuar.</p>
              </div>
              <div class="flex justify-end">
                <button type="button" onclick="App.closeModal(); App.switchTab('trucks')" class="btn-primary">Ir a Camiones</button>
              </div>
            </div>
          `, 'max-w-md');
          return;
        }
        const truckFieldHtml = `<select id="fTripTruck" required class="inp"><option value="">Selecciona un camión</option>${availableTrucks.map(k => `<option value="${k.id}" ${t && String(t.truckId) === String(k.id) ? 'selected' : ''}>${k.name} · ${k.plate}</option>`).join('')}</select>`;

        const driverFieldHtml = this.db.drivers.length > 0
          ? `<select id="fTripDriver" required class="inp">${this.db.drivers.map(d => `<option value="${d.id}" ${t && String(t.driverId) === String(d.id) ? 'selected' : ''}>${d.name}</option>`).join('')}</select>`
          : `<input type="text" id="fTripNewDriverName" required placeholder="Ej. Ramón Almonte (Se creará)" class="inp" />`;

        const helpersChecks = this.db.helpers.length > 0
          ? this.db.helpers.map(h => `
              <label class="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 cursor-pointer text-xs font-medium">
                <input type="checkbox" name="tripHelpers" value="${h.id}" ${selHelpers.includes(String(h.id)) ? 'checked' : ''} class="accent-slate-900 w-4 h-4 rounded" />
                <span>${h.name}</span>
              </label>`).join('')
          : `<input type="text" id="fTripNewHelperName" placeholder="Nombre de ayudante (Opcional - se guardará)" class="inp" />`;

        this.openModal(fromScheduledId ? 'Liquidar Viaje Anticipado' : (tripId ? 'Editar Viaje' : 'Registrar y Liquidar Viaje'), `
          <form onsubmit="App.saveTrip(event, ${tripId ? `'${tripId}'` : 'null'}, ${fromScheduledId ? `'${fromScheduledId}'` : 'null'})" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label class="lbl">Fecha del Viaje</label><input type="date" id="fTripDate" value="${t ? t.date : today}" required class="inp font-mono" /></div>
              <div class="sm:col-span-2">
                <label class="lbl">Ruta Realizada</label>
                <input type="text" id="fTripRoute" list="dlRoutes" value="${t && t.route ? t.route : ''}" required placeholder="Ej. Santiago ↔ Santo Domingo" class="inp" />
                <datalist id="dlRoutes">${routeOpts}</datalist>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label class="lbl">Cant. Clientes Atendidos</label><input type="number" min="1" id="fTripClients" value="${t && t.clientsCount ? t.clientsCount : 1}" required class="inp font-mono font-bold" /></div>
              <div><label class="lbl">Camión</label>${truckFieldHtml}</div>
              <div><label class="lbl">Chofer</label>${driverFieldHtml}</div>
            </div>
            <div><label class="lbl">Ayudante(s)</label><div class="flex flex-wrap gap-2">${helpersChecks}</div></div>
            <div class="p-4 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 space-y-3">
              <div>
                <label class="lbl !text-slate-600 dark:!text-slate-300">Ganancia Bruta por Flete (RD$)</label>
                <input type="text" inputmode="decimal" id="fTripGross" oninput="App.updateLiveCalc()" value="${formatMoneyInput(t && t.freightGross !== '' ? t.freightGross : '')}" required class="inp font-mono font-bold financial-input" />
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div><label class="lbl">Combustible (RD$)</label><input type="text" inputmode="decimal" id="fTripFuel" oninput="App.updateLiveCalc()" value="${formatMoneyInput(t && t.fuelCost !== '' ? t.fuelCost : 0)}" required class="inp font-mono financial-input" /></div>
                <div><label class="lbl">Peajes (RD$)</label><input type="text" inputmode="decimal" id="fTripTolls" oninput="App.updateLiveCalc()" value="${formatMoneyInput(t && t.tollsCost !== '' ? t.tollsCost : 0)}" required class="inp font-mono financial-input" /></div>
                <div><label class="lbl">Pago Chofer (RD$)</label><input type="text" inputmode="decimal" id="fTripDrvPay" oninput="App.updateLiveCalc()" value="${formatMoneyInput(t && t.driverPay !== '' ? t.driverPay : 0)}" required class="inp font-mono financial-input" /></div>
                <div><label class="lbl">Pago Ayudante (RD$)</label><input type="text" inputmode="decimal" id="fTripHlpPay" oninput="App.updateLiveCalc()" value="${formatMoneyInput(t && t.helperPay !== '' ? t.helperPay : 0)}" required class="inp font-mono financial-input" /></div>
                <div class="col-span-2"><label class="lbl">Otros Gastos / Dieta (RD$)</label><input type="text" inputmode="decimal" id="fTripOther" oninput="App.updateLiveCalc()" value="${formatMoneyInput(t && t.otherCost !== '' ? t.otherCost : 0)}" class="inp font-mono financial-input" /></div>
              </div>
            </div>
            <div class="p-4 rounded-md bg-slate-900 text-white flex items-center justify-between">
              <div><span class="text-[10px] uppercase text-slate-400 block font-semibold">Total Gastos</span><span id="liveTripExp" class="text-base font-mono font-bold text-amber-400">RD$ 0.00</span></div>
              <div class="text-right"><span class="text-[10px] uppercase text-emerald-400 block font-semibold">Ganancia Neta</span><span id="liveTripNet" class="text-xl font-mono font-bold text-emerald-400">RD$ 0.00</span></div>
            </div>
            <div><label class="lbl">Notas</label><input type="text" id="fTripNotes" value="${t ? (t.notes || '') : ''}" class="inp" /></div>
            <div class="flex justify-end gap-2">
              <button type="button" onclick="App.closeModal()" class="btn-outline">Cancelar</button>
              <button type="submit" class="btn-primary"><i class="fa-solid fa-check"></i> Guardar Viaje</button>
            </div>
          </form>
        `);
        this.updateLiveCalc();
      },

      

      async saveTrip(e, id = null, fromScheduledId = null) {
        e.preventDefault();
        let truckId = document.getElementById('fTripTruck')?.value;
        const selectedTruck = this.db.trucks.find((truck) => String(truck.id) === String(truckId));
        if (!selectedTruck || selectedTruck.status !== 'Disponible') {
          this.showToast('Selecciona un camión disponible para registrar el viaje.', true);
          return;
        }

        let driverId = document.getElementById('fTripDriver')?.value;
        const newDriverName = document.getElementById('fTripNewDriverName')?.value.trim();
        if (!driverId && newDriverName) {
          driverId = this.uid('drv');
          addRecord(this.db, 'drivers', { id: driverId, name: newDriverName, phone: '', note: '' });
        }

        let helperIds = [...document.querySelectorAll('input[name="tripHelpers"]:checked')].map(c => c.value);
        const newHelperName = document.getElementById('fTripNewHelperName')?.value.trim();
        if (newHelperName) {
          const hId = this.uid('hlp');
          addRecord(this.db, 'helpers', { id: hId, name: newHelperName, phone: '' });
          helperIds.push(hId);
        }

        const route = document.getElementById('fTripRoute').value.trim();
        const dateVal = document.getElementById('fTripDate').value;

        if (route && !this.db.routes.some(r => r.name.toLowerCase() === route.toLowerCase())) {
          addRecord(this.db, 'routes', { id: this.uid('rt'), name: route });
        }

        const payload = {
          date: dateVal,
          route,
          clientsCount: Math.max(1, Number(document.getElementById('fTripClients').value) || 1),
          truckId,
          driverId,
          helperIds,
          freightGross: parseMoney(document.getElementById('fTripGross').value),
          fuelCost: parseMoney(document.getElementById('fTripFuel').value),
          tollsCost: parseMoney(document.getElementById('fTripTolls').value),
          driverPay: parseMoney(document.getElementById('fTripDrvPay').value),
          helperPay: parseMoney(document.getElementById('fTripHlpPay').value),
          otherCost: parseMoney(document.getElementById('fTripOther').value),
          notes: document.getElementById('fTripNotes').value.trim()
        };

        if (id) updateRecord(this.db, 'trips', id, payload);
        else addRecord(this.db, 'trips', { id: this.uid('trp'), ...payload }, true);

        if (fromScheduledId) {
          deleteRecord(this.db, 'scheduledTrips', fromScheduledId);
        }

        await this.save();
        this.syncFilterWithNewRecordDate(dateVal);
        this.closeModal();
        this.renderAll();
        this.showToast('Viaje guardado correctamente');
        await notifySuccess();
      },

      async captureIncidentLocation() {
        const status = document.getElementById('fIncGpsStatus');
        if (status) status.textContent = 'Obteniendo ubicación...';
        const location = await getCurrentPosition();
        if (!location) {
          this.incidentLocation = null;
          if (status) status.textContent = 'No se pudo obtener la ubicación';
          this.showToast('No fue posible capturar la ubicación GPS.', true);
          return;
        }
        const latitudeInput = document.getElementById('fIncLatitude');
        const longitudeInput = document.getElementById('fIncLongitude');
        if (!latitudeInput || !longitudeInput) return;
        this.incidentLocation = location;
        latitudeInput.value = String(location.latitude);
        longitudeInput.value = String(location.longitude);
        if (status) status.textContent = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
      },

      deleteTrip(id) {
        if (!confirm('¿Eliminar este viaje?')) return;
        deleteRecord(this.db, 'trips', id);
        this.save();
        this.renderAll();
        this.showToast('Viaje eliminado');
      },

      openScheduledModal(schedId = null) {
        const s = schedId ? this.db.scheduledTrips.find(x => String(x.id) === String(schedId)) : null;
        const tomorrow = this.offsetDateISO(1);
        const routeOpts = this.db.routes.map(r => `<option value="${r.name}"></option>`).join('');
        const truckOpts = `<option value="">-- Por asignar (Opcional) --</option>` +
          this.db.trucks.map(k => `<option value="${k.id}" ${s && String(s.truckId) === String(k.id) ? 'selected' : ''}>${k.name}</option>`).join('');
        const driverOpts = `<option value="">-- Por asignar (Opcional) --</option>` +
          this.db.drivers.map(d => `<option value="${d.id}" ${s && String(s.driverId) === String(d.id) ? 'selected' : ''}>${d.name}</option>`).join('');
        const selHelpers = s ? (s.helperIds || []).map(String) : [];

        const helpersChecks = this.db.helpers.map(h => `
          <label class="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 cursor-pointer text-xs font-medium">
            <input type="checkbox" name="schedHelpers" value="${h.id}" ${selHelpers.includes(String(h.id)) ? 'checked' : ''} class="accent-slate-900 w-4 h-4 rounded" />
            <span>${h.name}</span>
          </label>
        `).join('');

        this.openModal(s ? 'Editar Viaje Anticipado' : 'Agendar Viaje Anticipado con Recordatorio', `
          <form onsubmit="App.saveScheduledTrip(event, ${s ? `'${s.id}'` : 'null'})" class="space-y-4">
            <div class="p-4 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="lbl">Fecha del Viaje *</label>
                <input type="date" id="fSchDate" value="${s ? s.date : tomorrow}" required class="inp font-mono font-bold" />
              </div>
              <div>
                <label class="lbl">Hora Inicio Recordatorio *</label>
                <input type="time" id="fSchReminderTime" value="${s ? (s.reminderTime || '05:00') : '05:00'}" required class="inp font-mono font-bold" />
              </div>
              <div>
                <label class="lbl">Hora de Salida *</label>
                <input type="time" id="fSchDepartureTime" value="${s ? (s.departureTime || '06:30') : '06:30'}" required class="inp font-mono font-bold" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="sm:col-span-2">
                <label class="lbl">Ruta (Opcional)</label>
                <input type="text" id="fSchRoute" list="dlSchRoutes" value="${s ? (s.route || '') : ''}" placeholder="Ej. Santiago ↔ Santo Domingo" class="inp" />
                <datalist id="dlSchRoutes">${routeOpts}</datalist>
              </div>
              <div>
                <label class="lbl">Cant. Clientes (Opcional)</label>
                <input type="number" min="1" id="fSchClients" value="${s && s.clientsCount ? s.clientsCount : ''}" placeholder="Opcional" class="inp font-mono" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label class="lbl">Camión (Opcional)</label><select id="fSchTruck" class="inp">${truckOpts}</select></div>
              <div><label class="lbl">Chofer (Opcional)</label><select id="fSchDriver" class="inp">${driverOpts}</select></div>
            </div>

            <div><label class="lbl">Ayudante(s) (Opcional)</label><div class="flex flex-wrap gap-2">${helpersChecks || '<span class="text-xs text-slate-400">Sin ayudantes creados</span>'}</div></div>

            <div class="p-4 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 space-y-3">
              <span class="text-xs font-bold uppercase text-slate-400 block">Montos de Cobro y Pagos (100% Opcionales)</span>
              <div>
                <label class="lbl">Flete a Cobrar (RD$ — Opcional)</label>
                <input type="text" inputmode="decimal" id="fTripGross" oninput="App.updateLiveCalc()" value="${formatMoneyInput(s && s.freightGross !== '' ? s.freightGross : '')}" placeholder="Opcional" class="inp font-mono financial-input" />
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div><label class="lbl">Combustible (Opcional)</label><input type="text" inputmode="decimal" id="fTripFuel" oninput="App.updateLiveCalc()" value="${formatMoneyInput(s && s.fuelCost !== '' ? s.fuelCost : '')}" class="inp font-mono financial-input" /></div>
                <div><label class="lbl">Peajes (Opcional)</label><input type="text" inputmode="decimal" id="fTripTolls" oninput="App.updateLiveCalc()" value="${formatMoneyInput(s && s.tollsCost !== '' ? s.tollsCost : '')}" class="inp font-mono financial-input" /></div>
                <div><label class="lbl">Pago Chofer (Opcional)</label><input type="text" inputmode="decimal" id="fTripDrvPay" oninput="App.updateLiveCalc()" value="${formatMoneyInput(s && s.driverPay !== '' ? s.driverPay : '')}" class="inp font-mono financial-input" /></div>
                <div><label class="lbl">Pago Ayud. (Opcional)</label><input type="text" inputmode="decimal" id="fTripHlpPay" oninput="App.updateLiveCalc()" value="${formatMoneyInput(s && s.helperPay !== '' ? s.helperPay : '')}" class="inp font-mono financial-input" /></div>
                <div class="col-span-2"><label class="lbl">Otros / Avance (Opcional)</label><input type="text" inputmode="decimal" id="fTripOther" oninput="App.updateLiveCalc()" value="${formatMoneyInput(s && s.otherCost !== '' ? s.otherCost : '')}" class="inp font-mono financial-input" /></div>
              </div>
              <div class="flex justify-between text-xs pt-2 border-t border-slate-300 dark:border-slate-700">
                <span>Gastos Previstos: <b id="liveTripExp" class="font-mono">RD$ 0.00</b></span>
                <span>Ganancia Neta: <b id="liveTripNet" class="font-mono text-emerald-600">RD$ 0.00</b></span>
              </div>
            </div>

            <div><label class="lbl">Nota del Recordatorio (Opcional)</label><input type="text" id="fSchNotes" value="${s ? (s.notes || '') : ''}" class="inp" /></div>

            <div class="flex justify-end gap-2">
              <button type="button" onclick="App.closeModal()" class="btn-outline">Cancelar</button>
              <button type="submit" class="btn-primary">Guardar en Agenda</button>
            </div>
          </form>
        `);
        this.updateLiveCalc();
      },

      saveScheduledTrip(e, id = null) {
        e.preventDefault();
        const helperIds = [...document.querySelectorAll('input[name="schedHelpers"]:checked')].map(c => c.value);
        const route = document.getElementById('fSchRoute').value.trim();
        const dateVal = document.getElementById('fSchDate').value;

        if (route && !this.db.routes.some(r => r.name.toLowerCase() === route.toLowerCase())) {
          addRecord(this.db, 'routes', { id: this.uid('rt'), name: route });
        }

        const g = document.getElementById('fTripGross').value;
        const f = document.getElementById('fTripFuel').value;
        const tl = document.getElementById('fTripTolls').value;
        const d = document.getElementById('fTripDrvPay').value;
        const h = document.getElementById('fTripHlpPay').value;
        const o = document.getElementById('fTripOther').value;
        const c = document.getElementById('fSchClients').value;

        const payload = {
          date: dateVal,
          reminderTime: document.getElementById('fSchReminderTime').value,
          departureTime: document.getElementById('fSchDepartureTime').value,
          route: route || '',
          clientsCount: c !== '' ? Number(c) : '',
          truckId: document.getElementById('fSchTruck').value || '',
          driverId: document.getElementById('fSchDriver').value || '',
          helperIds,
          freightGross: g !== '' ? parseMoney(g) : '',
          fuelCost: f !== '' ? parseMoney(f) : '',
          tollsCost: tl !== '' ? parseMoney(tl) : '',
          driverPay: d !== '' ? parseMoney(d) : '',
          helperPay: h !== '' ? parseMoney(h) : '',
          otherCost: o !== '' ? parseMoney(o) : '',
          notes: document.getElementById('fSchNotes').value.trim()
        };

        if (id) updateRecord(this.db, 'scheduledTrips', id, payload);
        else addRecord(this.db, 'scheduledTrips', { id: this.uid('sch'), ...payload });

        this.save();
        this.syncFilterWithNewRecordDate(dateVal);
        this.closeModal();
        this.switchTab('scheduled');
        this.renderAll();
        this.showToast('Viaje anticipado guardado en Agenda');
      },

      liquidateScheduledTrip(schedId) {
        this.openTripModal(null, schedId);
      },

      deleteScheduledTrip(id) {
        if (!confirm('¿Eliminar este viaje anticipado?')) return;
        deleteRecord(this.db, 'scheduledTrips', id);
        this.save();
        this.renderAll();
      },

      openIncidentModal() {
        this.incidentLocation = null;
        const today = this.offsetDateISO(0);
        const truckField = this.db.trucks.length > 0
          ? `<select id="fIncTruck" required class="inp">${this.db.trucks.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}</select>`
          : `<input type="text" id="fIncNewTruck" required placeholder="Nombre del camión" class="inp" />`;
        const driverField = this.db.drivers.length > 0
          ? `<select id="fIncDriver" required class="inp">${this.db.drivers.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}</select>`
          : `<input type="text" id="fIncNewDriver" required placeholder="Nombre del chofer" class="inp" />`;

        this.openModal('Registrar Incidencia en Ruta', `
          <form onsubmit="App.saveIncident(event)" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label class="lbl">Fecha</label><input type="date" id="fIncDate" value="${today}" required class="inp font-mono" /></div>
              <div>
                <label class="lbl">Gravedad</label>
                <select id="fIncSeverity" required class="inp">
                  <option value="Baja">Baja</option>
                  <option value="Media" selected>Media</option>
                  <option value="Alta">Alta</option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label class="lbl">Camión Involucrado</label>${truckField}</div>
              <div><label class="lbl">Chofer</label>${driverField}</div>
            </div>
            <div><label class="lbl">Descripción de la Incidencia</label><input id="fIncDesc" required placeholder="Ej. Avería en ruta, neumático, choque leve..." class="inp" /></div>
            <div><label class="lbl">Costo Asociado (RD$)</label><input type="text" inputmode="decimal" id="fIncCost" value="0.00" required class="inp font-mono font-bold text-rose-600 financial-input" /></div>
            <div class="space-y-2">
              <label class="lbl">Ubicación de la Incidencia</label>
              <input type="hidden" id="fIncLatitude" />
              <input type="hidden" id="fIncLongitude" />
              <div class="flex flex-wrap items-center gap-2">
                <button type="button" onclick="App.captureIncidentLocation()" class="btn-outline"><i class="fa-solid fa-location-crosshairs"></i>Capturar Ubicación GPS</button>
                <span id="fIncGpsStatus" class="text-xs text-slate-500">Ubicación no capturada</span>
              </div>
            </div>
            <div><label class="lbl">Foto del incidente (opcional)</label><input type="file" id="fIncPhoto" accept="image/*" capture="environment" class="inp" /></div>
            <div class="flex justify-end gap-2">
              <button type="button" onclick="App.closeModal()" class="btn-outline">Cancelar</button>
              <button type="submit" class="btn-primary">Guardar Incidencia</button>
            </div>
          </form>
        `, 'max-w-lg');
      },

      async saveIncident(e) {
        e.preventDefault();
        let truckId = document.getElementById('fIncTruck')?.value;
        const newTrk = document.getElementById('fIncNewTruck')?.value.trim();
        if (!truckId && newTrk) {
          truckId = this.uid('trk');
          addRecord(this.db, 'trucks', { id: truckId, name: newTrk, plate: 'S/P', model: 'General', status: 'Disponible' });
        }

        let driverId = document.getElementById('fIncDriver')?.value;
        const newDrv = document.getElementById('fIncNewDriver')?.value.trim();
        if (!driverId && newDrv) {
          driverId = this.uid('drv');
          addRecord(this.db, 'drivers', { id: driverId, name: newDrv, phone: '', note: '' });
        }

        const dateVal = document.getElementById('fIncDate').value;
        const photoFile = document.getElementById('fIncPhoto').files[0];
        let photo;
        try {
          photo = await readReceiptImage(photoFile);
        } catch (error) {
          console.error('No se pudo procesar la foto de la incidencia.', error);
          this.showToast('No se pudo leer la foto. Intenta seleccionar otra imagen.', true);
          return;
        }
        const location = this.incidentLocation || await getCurrentPosition();

        addRecord(this.db, 'incidents', {
          id: this.uid('inc'),
          date: dateVal,
          severity: document.getElementById('fIncSeverity').value,
          truckId,
          driverId,
          description: document.getElementById('fIncDesc').value.trim(),
          cost: parseMoney(document.getElementById('fIncCost').value),
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          location: location ? `${location.latitude}, ${location.longitude}` : '',
          receiptImage: photo
        }, true);
        await this.save();
        this.syncFilterWithNewRecordDate(dateVal);
        this.closeModal();
        this.switchTab('incidents');
        this.renderAll();
        this.showToast(location ? 'Incidencia registrada' : 'Incidencia registrada; ubicación GPS no disponible');
        await notifySuccess();
      },

      deleteIncident(id) {
        if (!confirm('¿Eliminar esta incidencia?')) return;
        deleteRecord(this.db, 'incidents', id);
        this.save();
        this.renderAll();
      },

      openDriverModal(id = null) {
        const d = id ? this.db.drivers.find(x => String(x.id) === String(id)) : null;
        this.openModal(d ? 'Editar Chofer' : 'Nuevo Chofer', `
          <form onsubmit="App.saveDriver(event, ${d ? `'${d.id}'` : 'null'})" class="space-y-4">
            <div><label class="lbl">Nombre Completo</label><input id="fDrvName" value="${d ? d.name : ''}" required class="inp" /></div>
            <div><label class="lbl">Teléfono / Cédula</label><input id="fDrvPhone" value="${d ? d.phone : ''}" class="inp" /></div>
            <div><label class="lbl">Nota</label><input id="fDrvNote" value="${d ? (d.note || '') : ''}" class="inp" /></div>
            <button type="submit" class="w-full btn-primary">Guardar Chofer</button>
          </form>`, 'max-w-md');
      },
      saveDriver(e, id = null) {
        e.preventDefault();
        const data = { name: document.getElementById('fDrvName').value.trim(), phone: document.getElementById('fDrvPhone').value.trim(), note: document.getElementById('fDrvNote').value.trim() };
        if (id) updateRecord(this.db, 'drivers', id, data);
        else addRecord(this.db, 'drivers', { id: this.uid('drv'), ...data });
        this.save(); this.closeModal(); this.renderAll();
        this.showToast('Chofer guardado');
      },
      deleteDriver(id) {
        if (!confirm('¿Eliminar chofer?')) return;
        deleteRecord(this.db, 'drivers', id);
        this.save(); this.renderAll();
      },

      openTruckModal(id = null) {
        const t = id ? this.db.trucks.find(x => String(x.id) === String(id)) : null;
        this.openModal(t ? 'Editar Camión' : 'Nuevo Camión', `
          <form onsubmit="App.saveTruck(event, ${t ? `'${t.id}'` : 'null'})" class="space-y-4">
            <div><label class="lbl">Ficha / Nombre</label><input id="fTrkName" value="${t ? t.name : ''}" required class="inp" /></div>
            <div><label class="lbl">Placa</label><input id="fTrkPlate" value="${t ? t.plate : ''}" required class="inp" /></div>
            <div><label class="lbl">Marca y Modelo</label><input id="fTrkModel" value="${t ? t.model : ''}" required class="inp" /></div>
            <div>
              <label class="lbl">Estado de la flota</label>
              <select id="fTrkStatus" class="inp">
                <option value="Disponible" ${!t || (t.status !== 'En Taller / Fuera de Servicio' && t.status !== 'Fuera de Servicio') ? 'selected' : ''}>Disponible</option>
                <option value="En Taller / Fuera de Servicio" ${t?.status === 'En Taller / Fuera de Servicio' || t?.status === 'Fuera de Servicio' ? 'selected' : ''}>En Taller / Fuera de Servicio</option>
              </select>
            </div>
            <button type="submit" class="w-full btn-primary">Guardar Camión</button>
          </form>`, 'max-w-md');
      },
      saveTruck(e, id = null) {
        e.preventDefault();
        const data = {
          name: document.getElementById('fTrkName').value.trim(),
          plate: document.getElementById('fTrkPlate').value.trim(),
          model: document.getElementById('fTrkModel').value.trim(),
          status: document.getElementById('fTrkStatus').value === 'Disponible'
            ? 'Disponible'
            : 'En Taller / Fuera de Servicio'
        };
        if (id) updateRecord(this.db, 'trucks', id, data);
        else addRecord(this.db, 'trucks', { id: this.uid('trk'), ...data });
        this.save(); this.closeModal(); this.renderAll();
        this.showToast('Camión guardado');
      },
      deleteTruck(id) {
        if (!confirm('¿Eliminar camión?')) return;
        deleteRecord(this.db, 'trucks', id);
        this.save(); this.renderAll();
      },

      openMaintenanceModal() {
        const today = this.offsetDateISO(0);
        const truckField = this.db.trucks.length > 0
          ? `<select id="fMntTruck" required class="inp">${this.db.trucks.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}</select>`
          : `<input type="text" id="fMntNewTruck" required placeholder="Nombre del camión" class="inp" />`;

        this.openModal('Registrar Gasto de Taller (Mantenimiento)', `
          <form onsubmit="App.saveMaintenance(event)" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div><label class="lbl">Fecha</label><input type="date" id="fMntDate" value="${today}" required class="inp font-mono" /></div>
              <div><label class="lbl">Camión</label>${truckField}</div>
            </div>
            <div><label class="lbl">Descripción del Mantenimiento / Repuesto</label><input id="fMntDesc" required class="inp" /></div>
            <div><label class="lbl">Costo (RD$)</label><input type="text" inputmode="decimal" id="fMntCost" required class="inp font-mono font-bold text-rose-600 financial-input" /></div>
            <div><label class="lbl">Foto de factura (opcional)</label><input type="file" id="fMntPhoto" accept="image/*" capture="environment" class="inp" /></div>
            <button type="submit" class="w-full btn-primary">Guardar Mantenimiento</button>
          </form>`, 'max-w-md');
      },
      async saveMaintenance(e) {
        e.preventDefault();
        let truckId = document.getElementById('fMntTruck')?.value;
        const newTrk = document.getElementById('fMntNewTruck')?.value.trim();
        if (!truckId && newTrk) {
          truckId = this.uid('trk');
          addRecord(this.db, 'trucks', { id: truckId, name: newTrk, plate: 'S/P', model: 'General', status: 'Disponible' });
        }

        const dateVal = document.getElementById('fMntDate').value;
        const cost = parseMoney(document.getElementById('fMntCost').value);
        if (cost <= 0) {
          this.showToast('El costo del mantenimiento debe ser mayor que cero.', true);
          return;
        }
        let photo;
        try {
          photo = await readReceiptImage(document.getElementById('fMntPhoto').files[0]);
        } catch (error) {
          console.error('No se pudo procesar la foto de la factura.', error);
          this.showToast('No se pudo leer la foto. Intenta seleccionar otra imagen.', true);
          return;
        }

        addRecord(this.db, 'maintenances', {
          id: this.uid('mnt'),
          date: dateVal,
          truckId,
          description: document.getElementById('fMntDesc').value.trim(),
          cost,
          receiptImage: photo
        }, true);
        await this.save();
        this.syncFilterWithNewRecordDate(dateVal);
        this.closeModal();
        this.renderAll();
        this.showToast('Mantenimiento registrado');
        await notifySuccess();
      },
      deleteMaintenance(id) {
        if (!confirm('¿Eliminar mantenimiento?')) return;
        deleteRecord(this.db, 'maintenances', id);
        this.save(); this.renderAll();
      },

      openHelperModal() {
        this.openModal('Nuevo Ayudante', `
          <form onsubmit="App.saveHelper(event)" class="space-y-4">
            <div><label class="lbl">Nombre</label><input id="fHlpName" required class="inp" /></div>
            <div><label class="lbl">Teléfono</label><input id="fHlpPhone" class="inp" /></div>
            <button type="submit" class="w-full btn-primary">Guardar Ayudante</button>
          </form>`, 'max-w-md');
      },
      saveHelper(e) {
        e.preventDefault();
        addRecord(this.db, 'helpers', { id: this.uid('hlp'), name: document.getElementById('fHlpName').value.trim(), phone: document.getElementById('fHlpPhone').value.trim() });
        this.save(); this.closeModal(); this.renderAll();
        this.showToast('Ayudante guardado');
      },
      deleteHelper(id) {
        deleteRecord(this.db, 'helpers', id);
        this.save(); this.renderAll();
      },

      openRouteModal() {
        this.openModal('Nueva Ruta', `
          <form onsubmit="App.saveRoute(event)" class="space-y-4">
            <div><label class="lbl">Nombre de la Ruta</label><input id="fRtName" required class="inp" /></div>
            <button type="submit" class="w-full btn-primary">Guardar Ruta</button>
          </form>`, 'max-w-md');
      },
      saveRoute(e) {
        e.preventDefault();
        addRecord(this.db, 'routes', { id: this.uid('rt'), name: document.getElementById('fRtName').value.trim() });
        this.save(); this.closeModal(); this.renderAll();
        this.showToast('Ruta guardada');
      },
      deleteRoute(id) {
        deleteRecord(this.db, 'routes', id);
        this.save(); this.renderAll();
      },

      // =====================================================================
      // POPUP DE SELECCIÓN DE PERIODO PARA REPORTES (PDF Y EXCEL .XLSX)
      // =====================================================================
      openExportPeriodModal(formatType) {
        const months = this.getAvailableMonths();
        const currentSelected = this.getSelectedMonth();
        const optionsHtml = `<option value="ALL" ${currentSelected === 'ALL' ? 'selected' : ''}>Todos los meses (Histórico)</option>` +
          months.map(m => `<option value="${m}" ${currentSelected === m ? 'selected' : ''}>${this.formatMonthLabel(m)}</option>`).join('');

        const isPDF = formatType === 'PDF';

        this.openModal(isPDF ? 'Generar Reporte Corporativo PDF' : 'Generar Libro de Excel (.XLSX)', `
          <form onsubmit="App.confirmExportByPeriod(event, '${formatType}')" class="space-y-5">
            <div>
              <label class="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                ¿De qué periodo deseas generar el reporte?
              </label>
              <select id="exportModalPeriodSelect" class="inp font-bold">
                ${optionsHtml}
              </select>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Se incluirán únicamente los viajes, gastos de taller e incidencias que pertenezcan al periodo elegido.
              </p>
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button type="button" onclick="App.closeModal()" class="btn-outline">Cancelar</button>
              <button type="submit" class="${isPDF ? 'btn-primary' : 'btn-primary'}">
                <i class="fa-solid ${isPDF ? 'fa-file-pdf' : 'fa-file-excel'}"></i>
                <span>Generar</span>
              </button>
            </div>
          </form>
        `, 'max-w-md');
      },

      confirmExportByPeriod(e, formatType) {
        e.preventDefault();
        const chosenPeriod = document.getElementById('exportModalPeriodSelect').value || 'ALL';
        this.closeModal();
        if (formatType === 'PDF') {
          this.generateCorporatePDF(chosenPeriod);
        } else {
          this.exportExcelXLSX(chosenPeriod);
        }
      },

      // =====================================================================
      // EXPORTACIÓN PDF CORPORATIVO DINÁMICO (CON OVERFLOW LINEBREAK)
      // =====================================================================
      generateCorporatePDF(periodCode = 'ALL') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape', 'pt', 'a4');
        const s = this.getPeriodSummary(periodCode);
        const periodLabel = this.formatMonthLabel(periodCode);

        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 842, 72, 'F');

        doc.setFillColor(5, 150, 105);
        doc.roundedRect(36, 18, 36, 36, 6, 6, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('MF', 45, 41);

        doc.setFontSize(17);
        doc.text('MiFlota RD — Reporte Financiero Corporativo', 84, 34);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(`Periodo: ${periodLabel}   |   Fecha de emisión: ${new Date().toLocaleDateString('es-DO')}`, 84, 52);

        const kpiY = 88;
        const kpis = [
          { label: 'INGRESOS FLETES', val: this.formatRD(s.gross), rgb: [15, 23, 42] },
          { label: 'GASTOS VIAJES', val: this.formatRD(s.tripExp), rgb: [180, 83, 9] },
          { label: 'TALLER E INCIDENCIAS', val: this.formatRD(s.maintTotal + s.incidentTotal), rgb: [190, 18, 60] },
          { label: 'GANANCIA NETA', val: this.formatRD(s.finalOwnerNet), rgb: [5, 150, 105] }
        ];

        kpis.forEach((k, idx) => {
          const x = 36 + idx * 195;
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(203, 213, 225);
          doc.roundedRect(x, kpiY, 182, 50, 6, 6, 'FD');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(100, 116, 139);
          doc.text(k.label, x + 12, kpiY + 18);
          doc.setFontSize(12);
          doc.setTextColor(...k.rgb);
          doc.text(k.val, x + 12, kpiY + 36);
        });

        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(`1. Desglose de Viajes Realizados (${s.trips.length})`, 36, 158);

        const tripBody = s.trips.map(t => {
          const m = this.calcTrip(t);
          return [
            t.date,
            t.route,
            String(t.clientsCount),
            this.getTruckName(t.truckId),
            this.getDriverName(t.driverId),
            this.formatRD(m.gross),
            this.formatRD(m.fuel),
            this.formatRD(m.tolls),
            this.formatRD(m.drvPay),
            this.formatRD(m.hlpPay),
            this.formatRD(m.other),
            this.formatRD(m.totalExpense),
            this.formatRD(m.netOwner)
          ];
        });

        doc.autoTable({
          startY: 165,
          margin: { left: 36, right: 36 },
          head: [['Fecha', 'Ruta', 'Cli.', 'Camión', 'Chofer', 'Flete Bruto', 'Comb.', 'Peajes', 'Chofer', 'Ayud.', 'Otros', 'Gasto Total', 'Ganancia Neta']],
          body: tripBody.length ? tripBody : [['-', 'Sin viajes registrados en este periodo', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'RD$ 0.00']],
          theme: 'grid',
          styles: { overflow: 'linebreak', cellPadding: 4, fontSize: 7.5, valign: 'middle' },
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 115 },
            2: { cellWidth: 26, halign: 'center' },
            3: { cellWidth: 68 },
            4: { cellWidth: 68 },
            5: { halign: 'right' },
            6: { halign: 'right' },
            7: { halign: 'right' },
            8: { halign: 'right' },
            9: { halign: 'right' },
            10: { halign: 'right' },
            11: { halign: 'right', textColor: [190, 18, 60] },
            12: { halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] }
          }
        });

        const nextY = doc.lastAutoTable.finalY + 20;
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(`2. Mantenimientos de Taller (${s.maints.length}) e Incidencias (${s.incidents.length})`, 36, nextY);

        const combinedBody = [
          ...s.maints.map(m => [m.date, 'Mantenimiento Taller', this.getTruckName(m.truckId), m.description, this.formatRD(m.cost)]),
          ...s.incidents.map(i => [i.date, `Incidencia (${i.severity})`, this.getTruckName(i.truckId), i.description, this.formatRD(i.cost)])
        ];

        doc.autoTable({
          startY: nextY + 7,
          margin: { left: 36, right: 36 },
          head: [['Fecha', 'Categoría', 'Camión', 'Descripción', 'Costo (RD$)']],
          body: combinedBody.length ? combinedBody : [['-', '-', '-', 'Sin registros en este periodo', 'RD$ 0.00']],
          theme: 'grid',
          styles: { overflow: 'linebreak', cellPadding: 4, fontSize: 8, valign: 'middle' },
          headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 65 },
            1: { cellWidth: 110 },
            2: { cellWidth: 110 },
            4: { cellWidth: 95, halign: 'right', fontStyle: 'bold', textColor: [190, 18, 60] }
          }
        });

        doc.save(`MiFlota_RD_${periodCode}.pdf`);
        this.showToast('Reporte PDF Corporativo descargado');
      },

      // =====================================================================
      // EXPORTACIÓN A EXCEL REAL (.XLSX) CON AUTOAJUSTE DE COLUMNAS (SHEETJS)
      // =====================================================================
      exportExcelXLSX(periodCode = 'ALL') {
        const s = this.getPeriodSummary(periodCode);
        const periodLabel = this.formatMonthLabel(periodCode);

        const rows = [
          ['MIFLOTA RD — REPORTE FINANCIERO Y OPERATIVO'],
          ['Periodo Filtrado:', periodLabel],
          ['Fecha de Generación:', new Date().toLocaleDateString('es-DO')],
          [],
          ['RESUMEN FINANCIERO DEL PERIODO'],
          ['Ingresos por Fletes', this.formatRD(s.gross)],
          ['Gastos Operativos de Viajes', this.formatRD(s.tripExp)],
          ['Gastos de Taller (Mantenimiento)', this.formatRD(s.maintTotal)],
          ['Gastos de Incidencias en Ruta', this.formatRD(s.incidentTotal)],
          ['Ganancia Neta', this.formatRD(s.finalOwnerNet)],
          [],
          ['HISTORIAL DETALLADO DE VIAJES REALIZADOS'],
          ['Fecha', 'Ruta', 'Cant. Clientes', 'Camión', 'Chofer', 'Ayudante(s)', 'Flete Bruto (RD$)', 'Combustible (RD$)', 'Peajes (RD$)', 'Pago Chofer (RD$)', 'Pago Ayudante (RD$)', 'Otros (RD$)', 'Gasto Total (RD$)', 'Ganancia Neta (RD$)', 'Notas']
        ];

        s.trips.forEach(t => {
          const m = this.calcTrip(t);
          rows.push([
            t.date,
            t.route,
            Number(t.clientsCount) || 0,
            this.getTruckName(t.truckId),
            this.getDriverName(t.driverId),
            this.getHelpersNames(t.helperIds),
            this.formatRD(m.gross),
            this.formatRD(m.fuel),
            this.formatRD(m.tolls),
            this.formatRD(m.drvPay),
            this.formatRD(m.hlpPay),
            this.formatRD(m.other),
            this.formatRD(m.totalExpense),
            this.formatRD(m.netOwner),
            t.notes || ''
          ]);
        });

        rows.push(
          [],
          ['MANTENIMIENTOS DE TALLER E INCIDENCIAS EN RUTA'],
          ['Fecha', 'Categoría', 'Camión', 'Chofer / Responsable', 'Descripción Detallada', 'Costo (RD$)']
        );

        s.maints.forEach(m => {
          rows.push([m.date, 'Mantenimiento Taller', this.getTruckName(m.truckId), '-', m.description, this.formatRD(m.cost)]);
        });

        s.incidents.forEach(i => {
          rows.push([i.date, `Incidencia (${i.severity})`, this.getTruckName(i.truckId), this.getDriverName(i.driverId), i.description, this.formatRD(i.cost)]);
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(rows);

        const colWidths = [];
        rows.forEach(row => {
          row.forEach((cellVal, colIdx) => {
            const len = String(cellVal ?? '').length;
            colWidths[colIdx] = Math.max(colWidths[colIdx] || 14, len + 5);
          });
        });
        ws['!cols'] = colWidths.map(w => ({ wch: Math.min(w, 48) }));

        XLSX.utils.book_append_sheet(wb, ws, 'Reporte MiFlota RD');
        XLSX.writeFile(wb, `MiFlota_RD_${periodCode}.xlsx`);
        this.showToast('Libro de Excel (.xlsx) descargado');
      },

      // =====================================================================
      // RESPALDO Y SEGURIDAD (.JSON)
      // =====================================================================
      exportBackupJSON() {
        const blob = new Blob([JSON.stringify(this.db, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Backup_MiFlota_RD_${this.offsetDateISO(0)}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showToast('Copia de seguridad (.json) descargada');
      },

      restoreBackupJSON(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const parsed = JSON.parse(e.target.result);
            if (!parsed || typeof parsed !== 'object') throw new Error('Invalido');
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
            this.showToast('Copia restaurada. Recargando...');
            setTimeout(() => window.location.reload(), 800);
          } catch (err) {
            this.showToast('El archivo JSON seleccionado no es válido', true);
          }
        };
        reader.readAsText(file);
      },

      clearAllData() {
        if (!confirm('¿Estás seguro de vaciar absolutamente todo el sistema? Esta acción no se puede deshacer.')) return;
        this.db = this.getEmptyDatabase();
        this.save();
        this.populateMonthFilter('ALL');
        this.renderAll();
        this.showToast('El sistema ha sido vaciado por completo');
      }
    };

    Object.assign(App, UI);
    window.App = App;
    window.addEventListener('DOMContentLoaded', () => App.init());
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('Service Worker registrado con éxito.'))
        .catch((error) => console.error('Error al registrar el Service Worker.', error));
    }