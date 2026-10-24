const moneyFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

export function parseMoney(value) {
  const normalized = String(value ?? '')
    .replace(/,/g, '')
    .replace(/[^\d.]/g, '');
  const decimalAt = normalized.indexOf('.');
  const clean = decimalAt === -1
    ? normalized
    : `${normalized.slice(0, decimalAt + 1)}${normalized.slice(decimalAt + 1).replace(/\./g, '')}`;
  return Math.max(0, Number.parseFloat(clean) || 0);
}

export function formatMoneyInput(value, fixed = false) {
  const normalized = String(value ?? '')
    .replace(/,/g, '')
    .replace(/[^\d.]/g, '');
  const decimalAt = normalized.indexOf('.');
  let integer = decimalAt === -1 ? normalized : normalized.slice(0, decimalAt);
  let fraction = decimalAt === -1 ? '' : normalized.slice(decimalAt + 1).replace(/\./g, '').slice(0, 2);
  integer = integer.replace(/^0+(?=\d)/, '');

  if (fixed && normalized !== '') fraction = fraction.padEnd(2, '0');
  const grouped = integer ? moneyFormatter.format(Number(integer)) : (normalized ? '0' : '');
  return decimalAt === -1 && !fixed ? grouped : `${grouped}.${fraction}`;
}

export function bindFinancialInputs(root = document) {
  root.addEventListener('keydown', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !(input.matches('.financial-input, input[type="number"]'))) return;
    if (event.key === '-' || (input.type === 'number' && ['+', 'e', 'E'].includes(event.key))) {
      event.preventDefault();
    }
  });

  root.addEventListener('input', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;

    if (input.type === 'number') {
      if (input.value !== '' && Number(input.value) < 0) {
        input.value = String(Math.max(Number(input.min) || 0, 0));
      }
      return;
    }
    if (!input.matches('.financial-input')) return;

    const caret = input.selectionStart ?? input.value.length;
    const digitsBeforeCaret = input.value.slice(0, caret).replace(/[^\d]/g, '').length;
    input.value = formatMoneyInput(input.value);

    let nextCaret = 0;
    let digitsSeen = 0;
    while (nextCaret < input.value.length && digitsSeen < digitsBeforeCaret) {
      if (/\d/.test(input.value[nextCaret])) digitsSeen += 1;
      nextCaret += 1;
    }
    input.setSelectionRange(nextCaret, nextCaret);
  });

  root.addEventListener('focusout', (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.matches('.financial-input') && input.value !== '') {
      input.value = formatMoneyInput(input.value, true);
    }
  });
}

export function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  const icon = document.getElementById('toastIcon');
  const text = document.getElementById('toastMsg');
  if (!toast || !icon || !text) return;

  icon.className = isError
    ? 'fa-solid fa-circle-exclamation text-rose-500 text-base'
    : 'fa-solid fa-circle-check text-emerald-500 text-base';
  text.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add('hidden'), 3200);
}

export function openModal(title, html, maxWidthClass = 'max-w-2xl') {
  const container = document.getElementById('modalContainer');
  const titleElement = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');
  const overlay = document.getElementById('modalOverlay');
  if (!container || !titleElement || !body || !overlay) return;

  container.className = `modal-shell ${maxWidthClass}`;
  titleElement.textContent = title;
  body.innerHTML = html;
  overlay.classList.remove('hidden');
}

export function closeModal() {
  document.getElementById('modalOverlay')?.classList.add('hidden');
}

export function truckStatusBadge(status) {
  const available = status !== 'En Taller / Fuera de Servicio' && status !== 'Fuera de Servicio';
  const label = available ? 'Disponible' : 'En Taller / Fuera de Servicio';
  return `<span class="${available ? 'badge-available' : 'badge-out-of-service'}">${label}</span>`;
}

export function whatsappLink(phone, message) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (!digits) return '';
  const international = digits.length === 10 ? `1${digits}` : digits;
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}

export function renderRows(rows, emptyHtml, renderRow) {
  return rows.length ? rows.map(renderRow).join('') : emptyHtml;
}


export const UI = {
showToast(msg, isError = false) {
        showToast(msg, isError);
      },

openModal(title, html, maxWidthClass = 'max-w-2xl') {
        openModal(title, html, maxWidthClass);
      },

closeModal() {
        closeModal();
      },

switchTab(tab) {
        this.closeOperationsMenu?.();
        this.activeTab = tab;
        ['trips', 'scheduled', 'trucks', 'incidents', 'drivers', 'analytics', 'reports', 'catalogs', 'security'].forEach(t => {
          const panel = document.getElementById('tabPanel_' + t);
          const btn = document.getElementById('tabBtn_' + t);
          const bnav = document.getElementById('bnavBtn_' + t);
          if (panel) panel.classList.toggle('hidden', t !== tab);
          if (btn) btn.className = t === tab ? 'tab-btn tab-btn-active' : 'tab-btn';
          if (bnav) {
            bnav.className = t === tab
                ? 'flex flex-col items-center text-blue-300 font-semibold text-[10px] gap-0.5'
              : 'flex flex-col items-center text-slate-400 font-medium text-[10px] gap-0.5';
          }
        });
        if (tab === 'analytics') {
          this.renderAnalyticsCharts();
        }
      },

renderRemindersBanner() {
        const container = document.getElementById('remindersBannerContainer');
        const today = this.offsetDateISO(0);
        const tomorrow = this.offsetDateISO(1);
        const allSched = this.getAllScheduledSorted();
        const urgent = allSched.filter(s => s.date === today || s.date === tomorrow || s.date < today);

        if (urgent.length === 0) {
          container.innerHTML = '';
          return;
        }

        const rowsHtml = urgent.map(s => {
          const isToday = s.date === today;
          const isTomorrow = s.date === tomorrow;
          const badge = isToday
            ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500 text-slate-950">HOY</span>`
            : (isTomorrow
                ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-900 dark:bg-white text-white dark:text-slate-900">MAÑANA</span>`
                : `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-600 text-white">PENDIENTE</span>`);

          return `
            <div class="p-3 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="text-xs">
                <div class="flex flex-wrap items-center gap-2">
                  ${badge}
                  <span class="font-mono font-bold">${s.date}</span>
                  <span class="text-amber-700 dark:text-amber-400 font-semibold"><i class="fa-regular fa-bell mr-1"></i>Recordar: ${this.formatTime12h(s.reminderTime || '06:00')}</span>
                  <span class="text-slate-600 dark:text-slate-300 font-semibold"><i class="fa-solid fa-truck-fast mr-1"></i>Salida: ${this.formatTime12h(s.departureTime || '08:00')}</span>
                  <span class="font-bold text-slate-900 dark:text-white">${s.route || 'Ruta por definir'}</span>
                </div>
                <div class="text-slate-500 dark:text-slate-400 mt-1">
                  Camión: <b>${this.getTruckName(s.truckId)}</b> · Chofer: <b>${this.getDriverName(s.driverId)}</b>
                  ${s.notes ? ` · <i>"${s.notes}"</i>` : ''}
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button type="button" onclick="App.liquidateScheduledTrip('${s.id}')" class="btn-primary !py-1.5 !px-3 text-xs">
                  <i class="fa-solid fa-check"></i> Liquidar
                </button>
                <button type="button" onclick="App.openScheduledModal('${s.id}')" class="btn-outline !py-1.5 !px-2.5 text-xs">
                  <i class="fa-solid fa-pen"></i>
                </button>
              </div>
            </div>
          `;
        }).join('');

        container.innerHTML = `
          <div class="card p-4 ">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-bell text-amber-500"></i>
                <h3 class="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Recordatorio de Viajes Anticipados (Hoy / Mañana)
                </h3>
              </div>
              <button type="button" onclick="App.switchTab('scheduled')" class="text-xs font-semibold text-blue-900 dark:text-blue-400 hover:underline">
                Ver toda la Agenda (${allSched.length}) →
              </button>
            </div>
            <div class="space-y-2">${rowsHtml}</div>
          </div>
        `;
      },

renderAll() {
        const s = this.getPeriodSummary();
        const periodLabel = this.formatMonthLabel(this.getSelectedMonth());
        const companyName = this.db.profile?.companyName?.trim() || '';
        const profileNameInput = document.getElementById('fProfileName');
        const headerCompanyName = document.getElementById('headerCompanyName');
        const operationsCompanyName = document.getElementById('operationsCompanyName');
        const operationsUserEmail = document.getElementById('operationsUserEmail');
        if (profileNameInput) profileNameInput.value = companyName;
        if (headerCompanyName) {
          headerCompanyName.textContent = companyName ? `| ${companyName}` : '';
          headerCompanyName.classList.toggle('hidden', !companyName);
        }
        if (operationsCompanyName) operationsCompanyName.textContent = companyName || 'Flota sin nombre';
        if (operationsUserEmail) operationsUserEmail.textContent = this.currentUser?.email || '';
        this.renderRemindersBanner();

        document.getElementById('periodSummaryLabel').innerHTML =
          `Periodo activo: <b class="text-slate-900 dark:text-white">${periodLabel}</b> (${s.trips.length} viajes · ${s.incidents.length} incidencias)`;

        const netEl = document.getElementById('kpiOwnerNet');
        netEl.textContent = this.formatRD(s.finalOwnerNet);
        netEl.className = 'kpi-value text-2xl';

        document.getElementById('kpiMarginPercent').textContent = `Margen: ${s.marginPct}% · Fletes − (Viajes + Taller + Incidencias)`;
        document.getElementById('kpiGrossFreight').textContent = this.formatRD(s.gross);
        document.getElementById('kpiTripsCount').textContent = s.trips.length;
        document.getElementById('kpiClientsCount').textContent = s.clients;

        document.getElementById('kpiTripExpensesTotal').textContent = this.formatRD(s.tripExp);
        document.getElementById('kpiTripExpensesBreakdown').textContent =
          `Comb: ${this.formatRD(s.fuel)} · Peajes: ${this.formatRD(s.tolls)} · Nómina: ${this.formatRD(s.drvPay + s.hlpPay)}`;

        document.getElementById('kpiMaintAndIncTotal').textContent = this.formatRD(s.maintTotal + s.incidentTotal);
        document.getElementById('kpiMaintAndIncBreakdown').textContent =
          `Taller: ${this.formatRD(s.maintTotal)} · Incidencias: ${this.formatRD(s.incidentTotal)}`;

        document.getElementById('badgeCountTrips').textContent = s.trips.length;
        document.getElementById('badgeCountScheduled').textContent = s.scheduled.length;
        document.getElementById('badgeCountTrucks').textContent = this.db.trucks.length;
        document.getElementById('badgeCountIncidents').textContent = s.incidents.length;
        document.getElementById('badgeCountDrivers').textContent = this.db.drivers.length;

        // Actualizar pestaña Reportes con los datos del periodo global activo
        document.getElementById('reportPeriodTitle').textContent = periodLabel;
        document.getElementById('repTripsCount').textContent = `${s.trips.length} viaje(s)`;
        document.getElementById('repGross').textContent = this.formatRD(s.gross);
        document.getElementById('repTotalExpenses').textContent = this.formatRD(s.tripExp + s.maintTotal + s.incidentTotal);
        document.getElementById('repNet').textContent = this.formatRD(s.finalOwnerNet);

        const dSel = document.getElementById('tripFilterDriver');
        const tSel = document.getElementById('tripFilterTruck');
        const pD = dSel.value || 'ALL', pT = tSel.value || 'ALL';
        dSel.innerHTML = `<option value="ALL">Todos los choferes</option>` + this.db.drivers.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
        if ([...dSel.options].some(o => o.value === pD)) dSel.value = pD;
        tSel.innerHTML = `<option value="ALL">Todos los camiones</option>` + this.db.trucks.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
        if ([...tSel.options].some(o => o.value === pT)) tSel.value = pT;

        this.renderTripsTab();
        this.renderScheduledTab();
        this.renderTrucksTab();
        this.renderIncidentsTab();
        this.renderDriversTab();
        this.renderCatalogsTab();
        if (this.activeTab === 'analytics') {
          this.renderAnalyticsCharts();
        }
      },

emptyStateMarkup() {
        return `<div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.5h16.5v15h-16.5zM3.75 9h16.5m-12.75 4.5h4.5m-4.5 3h7.5" />
          </svg>
          <span class="empty-state-title">No hay datos disponibles para este periodo</span>
          <span class="empty-state-count">0 registros</span>
        </div>`;
      },

renderTripsTab() {
        const fDrv = document.getElementById('tripFilterDriver').value || 'ALL';
        const fTrk = document.getElementById('tripFilterTruck').value || 'ALL';
        const search = document.getElementById('tripSearchInput')?.value.trim().toLocaleLowerCase() || '';
        const trips = this.getFilteredTrips().filter(t =>
          (fDrv === 'ALL' || String(t.driverId) === String(fDrv)) &&
          (fTrk === 'ALL' || String(t.truckId) === String(fTrk)) &&
          (!search || [t.route, this.getTruckName(t.truckId), t.notes]
            .some(value => String(value || '').toLocaleLowerCase().includes(search)))
        );

        const tbody = document.getElementById('tableTripsBody');
        const tfoot = document.getElementById('tableTripsFoot');

        if (trips.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td colspan="13" class="p-0">${this.emptyStateMarkup()}</td>
            </tr>`;
          tfoot.innerHTML = '';
          return;
        }

        let sGross = 0, sFuel = 0, sTolls = 0, sDrv = 0, sHlp = 0, sOth = 0, sExp = 0, sNet = 0, sCli = 0;

        tbody.innerHTML = trips.map(t => {
          const m = this.calcTrip(t);
          sGross += m.gross; sFuel += m.fuel; sTolls += m.tolls; sDrv += m.drvPay;
          sHlp += m.hlpPay; sOth += m.other; sExp += m.totalExpense; sNet += m.netOwner;
          sCli += Number(t.clientsCount) || 0;

          return `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40">
              <td class="td font-mono font-semibold whitespace-nowrap">${t.date}</td>
              <td class="td">
                <div class="font-semibold text-slate-900 dark:text-white">${t.route}</div>
                <span class="text-[11px] text-slate-500 dark:text-slate-400">${t.clientsCount} cliente(s)</span>
              </td>
              <td class="td font-medium">${this.getTruckName(t.truckId)}</td>
              <td class="td">
                <div class="font-medium text-slate-900 dark:text-white">${this.getDriverName(t.driverId)}</div>
                <div class="text-[11px] text-slate-400">Ayud: ${this.getHelpersNames(t.helperIds)}</div>
              </td>
              <td class="td text-right font-mono font-semibold whitespace-nowrap">${this.formatRD(m.gross)}</td>
              <td class="td text-right font-mono text-slate-700 dark:text-slate-200 whitespace-nowrap">${this.formatRD(m.fuel)}</td>
              <td class="td text-right font-mono text-slate-700 dark:text-slate-200 whitespace-nowrap">${this.formatRD(m.tolls)}</td>
              <td class="td text-right font-mono whitespace-nowrap">${this.formatRD(m.drvPay)}</td>
              <td class="td text-right font-mono whitespace-nowrap">${this.formatRD(m.hlpPay)}</td>
              <td class="td text-right font-mono whitespace-nowrap">${this.formatRD(m.other)}</td>
              <td class="td text-right font-mono font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">${this.formatRD(m.totalExpense)}</td>
              <td class="td text-right font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white whitespace-nowrap">
                ${this.formatRD(m.netOwner)}
              </td>
              <td class="td text-center whitespace-nowrap">
                <button type="button" onclick="App.openTripModal('${t.id}')" class="btn-outline !py-1 !px-2 text-xs" title="Editar"><i class="fa-solid fa-pen"></i></button>
                <button type="button" onclick="App.deleteTrip('${t.id}')" class="btn-outline !py-1 !px-2 text-xs hover:text-rose-600" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
              </td>
            </tr>
          `;
        }).join('');

        tfoot.innerHTML = `
          <tr>
            <td class="py-3 px-3">TOTAL (${trips.length})</td>
            <td class="py-3 px-3">${sCli} clientes</td>
            <td colspan="2"></td>
            <td class="py-3 px-3 text-right whitespace-nowrap">${this.formatRD(sGross)}</td>
            <td class="py-3 px-3 text-right whitespace-nowrap">${this.formatRD(sFuel)}</td>
            <td class="py-3 px-3 text-right whitespace-nowrap">${this.formatRD(sTolls)}</td>
            <td class="py-3 px-3 text-right whitespace-nowrap">${this.formatRD(sDrv)}</td>
            <td class="py-3 px-3 text-right whitespace-nowrap">${this.formatRD(sHlp)}</td>
            <td class="py-3 px-3 text-right whitespace-nowrap">${this.formatRD(sOth)}</td>
            <td class="py-3 px-3 text-right text-slate-700 dark:text-slate-200 whitespace-nowrap">${this.formatRD(sExp)}</td>
            <td class="py-3 px-3 text-right text-slate-900 dark:text-white whitespace-nowrap">${this.formatRD(sNet)}</td>
            <td></td>
          </tr>
        `;
      },

renderScheduledTab() {
        const list = this.getAllScheduledSorted();
        const container = document.getElementById('scheduledListContainer');
        const today = this.offsetDateISO(0);
        const tomorrow = this.offsetDateISO(1);

        if (list.length === 0) {
          container.innerHTML = `
            <div class="col-span-full py-10 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-md">
              <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">No hay viajes anticipados programados en este periodo</p>
              <button type="button" onclick="App.openScheduledModal()" class="btn-primary mt-3">+ Agendar Viaje Anticipado</button>
            </div>`;
          return;
        }

        container.innerHTML = list.map(s => {
          const m = this.calcTrip(s);
          const isToday = s.date === today;
          const isTomorrow = s.date === tomorrow;
          const badge = isToday
            ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500 text-slate-950">HOY</span>`
            : (isTomorrow
                ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-900 dark:bg-white text-white dark:text-slate-900">MAÑANA</span>`
                : `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">PROGRAMADO</span>`);

          return `
            <div class="card p-4 flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between gap-2 mb-3">
                  ${badge}
                  <span class="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">${s.date}</span>
                </div>

                <div class="grid grid-cols-2 gap-2 p-2.5 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs mb-3">
                  <div>
                    <span class="text-[10px] uppercase text-slate-400 block font-semibold">Recordar desde</span>
                    <span class="font-mono font-bold text-amber-600 dark:text-amber-400">${this.formatTime12h(s.reminderTime || '06:00')}</span>
                  </div>
                  <div class="border-l border-slate-300 dark:border-slate-700 pl-2.5">
                    <span class="text-[10px] uppercase text-slate-400 block font-semibold">Hora de Salida</span>
                    <span class="font-mono font-bold text-slate-700 dark:text-slate-300">${this.formatTime12h(s.departureTime || '08:00')}</span>
                  </div>
                </div>

                <h3 class="font-bold text-sm text-slate-900 dark:text-white">${s.route || 'Ruta por definir'}</h3>
                <p class="text-xs text-slate-500 mt-0.5">${s.clientsCount ? `${s.clientsCount} cliente(s)` : 'Clientes por definir'}</p>

                <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs space-y-1 text-slate-600 dark:text-slate-300">
                  <div><b>Camión:</b> ${this.getTruckName(s.truckId)}</div>
                  <div><b>Chofer:</b> ${this.getDriverName(s.driverId)}</div>
                  <div><b>Ayudante(s):</b> ${this.getHelpersNames(s.helperIds)}</div>
                </div>

                <div class="mt-3 p-2.5 rounded-md bg-slate-50 dark:bg-slate-900 text-xs">
                  ${m.hasAnyFinancial
                    ? `                    <div class="flex justify-between"><span>Flete: <b>${this.formatRD(m.gross)}</b></span><span class="text-slate-900 dark:text-white font-bold">Ganancia Neta: ${this.formatRD(m.netOwner)}</span></div>`
                    : `<span class="text-slate-400 italic">Cobro y pagos opcionales (definir al liquidar)</span>`}
                </div>

                ${s.notes ? `<p class="text-xs text-slate-500 mt-2 italic">"${s.notes}"</p>` : ''}
              </div>

              <div class="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                <button type="button" onclick="App.liquidateScheduledTrip('${s.id}')" class="btn-primary !py-1.5 flex-1">
                  <i class="fa-solid fa-check"></i> Liquidar
                </button>
                <button type="button" onclick="App.openScheduledModal('${s.id}')" class="btn-outline !py-1.5"><i class="fa-solid fa-pen"></i></button>
                <button type="button" onclick="App.deleteScheduledTrip('${s.id}')" class="btn-outline !py-1.5 hover:text-rose-600"><i class="fa-solid fa-trash"></i></button>
              </div>
            </div>
          `;
        }).join('');
      },

renderTrucksTab() {
        const trips = this.getFilteredTrips();
        const maints = this.getFilteredMaintenances();
        const incidents = this.getFilteredIncidents();
        const grid = document.getElementById('trucksGrid');

        if (this.db.trucks.length === 0) {
          grid.innerHTML = `
            <div class="col-span-full py-10 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-md">
              <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">No hay camiones registrados en la flota</p>
              <button type="button" onclick="App.openTruckModal()" class="btn-primary mt-3">+ Crear Primer Camión</button>
            </div>`;
        } else {
          grid.innerHTML = this.db.trucks.map(trk => {
            const tTrips = trips.filter(t => String(t.truckId) === String(trk.id));
            const tMaints = maints.filter(m => String(m.truckId) === String(trk.id));
            const tIncs = incidents.filter(i => String(i.truckId) === String(trk.id));

            let gross = 0, tripExp = 0, tripsNet = 0;
            tTrips.forEach(t => {
              const m = this.calcTrip(t);
              gross += m.gross; tripExp += m.totalExpense; tripsNet += m.netOwner;
            });
            const maintCost = tMaints.reduce((s, x) => s + (Number(x.cost) || 0), 0);
            const incCost = tIncs.reduce((s, x) => s + (Number(x.cost) || 0), 0);
            const realNet = tripsNet - maintCost - incCost;

            return `
              <div class="card p-5 flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <div>
                      <span class="text-[11px] font-mono font-semibold text-slate-400 block">Placa: ${trk.plate}</span>
                      <h3 class="font-bold text-base text-slate-900 dark:text-white">${trk.name}</h3>
                      <p class="text-xs text-slate-500">${trk.model}</p>
                      <div class="mt-2">${truckStatusBadge(trk.status)}</div>
                    </div>
                    <div class="px-3.5 py-2.5 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-center min-w-[88px] shrink-0">
                      <span class="text-2xl font-mono font-extrabold leading-none block">${tTrips.length}</span>
                      <span class="text-[9px] font-bold uppercase tracking-wider block mt-1">Viajes</span>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-2.5 my-4 text-xs">
                    <div class="p-2.5 rounded-md bg-slate-50 dark:bg-slate-900">
                      <span class="text-slate-400 block">Total Fletes</span>
                      <span class="font-mono font-bold text-slate-900 dark:text-white">${this.formatRD(gross)}</span>
                    </div>
                    <div class="p-2.5 rounded-md bg-slate-50 dark:bg-slate-900">
                      <span class="text-slate-400 block">Gastos Viajes</span>
                      <span class="font-mono font-bold text-slate-700 dark:text-slate-200">-${this.formatRD(tripExp)}</span>
                    </div>
                    <div class="p-2.5 rounded-md bg-slate-50 dark:bg-slate-900">
                      <span class="text-slate-400 block">Taller (${tMaints.length})</span>
                      <span class="font-mono font-bold text-slate-700 dark:text-slate-200">-${this.formatRD(maintCost)}</span>
                    </div>
                    <div class="p-2.5 rounded-md bg-slate-50 dark:bg-slate-900">
                      <span class="text-slate-400 block">Incidencias (${tIncs.length})</span>
                      <span class="font-mono font-bold text-slate-700 dark:text-slate-200">-${this.formatRD(incCost)}</span>
                    </div>
                  </div>

                  <div class="p-3 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-700 dark:text-slate-200">Ganancia Neta</span>
                  <span class="font-mono font-bold text-sm text-slate-900 dark:text-white">${this.formatRD(realNet)}</span>
                  </div>
                </div>

                <div class="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                  <button type="button" onclick="App.openTruckHistoryModal('${trk.id}')" class="btn-primary !py-1.5 flex-1">Ver Historial</button>
                  <button type="button" onclick="App.openTruckModal('${trk.id}')" class="btn-outline !py-1.5" title="Editar"><i class="fa-solid fa-pen"></i></button>
                  <button type="button" onclick="App.deleteTruck('${trk.id}')" class="btn-outline !py-1.5 hover:text-rose-600" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                </div>
              </div>
            `;
          }).join('');
        }

        const mBody = document.getElementById('tableMaintBody');
        mBody.innerHTML = maints.length === 0
          ? `<tr><td colspan="5" class="p-0">${this.emptyStateMarkup()}</td></tr>`
          : maints.map(m => `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40">
              <td class="td font-mono font-semibold whitespace-nowrap">${m.date}</td>
              <td class="td font-semibold">${this.getTruckName(m.truckId)}</td>
              <td class="td">${m.description}</td>
              <td class="td text-right font-mono font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">${this.formatRD(m.cost)}</td>
              <td class="td text-center">
                <button type="button" onclick="App.deleteMaintenance('${m.id}')" class="btn-outline !py-1 !px-2 text-xs hover:text-rose-600"><i class="fa-solid fa-trash"></i></button>
              </td>
            </tr>`).join('');
      },

renderIncidentsTab() {
        const list = this.getFilteredIncidents();
        const tbody = document.getElementById('tableIncidentsBody');

        if (list.length === 0) {
          tbody.innerHTML = `<tr><td colspan="7" class="p-0">${this.emptyStateMarkup()}</td></tr>`;
          return;
        }

        tbody.innerHTML = list.map(inc => {
          const badge = inc.severity === 'Alta'
            ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
            : (inc.severity === 'Media' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300');

          return `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40">
              <td class="td font-mono font-semibold whitespace-nowrap">${inc.date}</td>
              <td class="td font-semibold">${this.getTruckName(inc.truckId)}</td>
              <td class="td">${this.getDriverName(inc.driverId)}</td>
              <td class="td"><span class="px-2 py-0.5 rounded text-xs font-bold ${badge}">${inc.severity}</span></td>
              <td class="td">${inc.description}</td>
              <td class="td text-right font-mono font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">-${this.formatRD(inc.cost)}</td>
              <td class="td text-center">
                <button type="button" onclick="App.deleteIncident('${inc.id}')" class="btn-outline !py-1 !px-2 text-xs hover:text-rose-600"><i class="fa-solid fa-trash"></i></button>
              </td>
            </tr>
          `;
        }).join('');
      },

renderDriversTab() {
        const trips = this.getFilteredTrips();
        const grid = document.getElementById('driversGrid');

        if (this.db.drivers.length === 0) {
          grid.innerHTML = `
            <div class="col-span-full flex flex-col items-center rounded-md border border-dashed border-slate-300 dark:border-slate-700">
              ${this.emptyStateMarkup()}
              <button type="button" onclick="App.openDriverModal()" class="btn-primary mb-5">+ Crear Primer Chofer</button>
            </div>`;
          return;
        }

        grid.innerHTML = this.db.drivers.map(drv => {
          const dTrips = trips.filter(t => String(t.driverId) === String(drv.id));
          let gross = 0, fuel = 0, drvPaid = 0, net = 0;
          dTrips.forEach(t => {
            const m = this.calcTrip(t);
            gross += m.gross; fuel += m.fuel; drvPaid += m.drvPay; net += m.netOwner;
          });
          const settlementUrl = whatsappLink(
            drv.phone,
            `Resumen de liquidación del periodo. Viajes realizados: ${dTrips.length}. Total Fletes: ${this.formatRD(gross)}. Combustible: ${this.formatRD(fuel)}. Total Cobrado por Chofer: ${this.formatRD(drvPaid)}. Restante Generado: ${this.formatRD(net)}.`
          );

          return `
            <div class="card p-5 flex flex-col justify-between">
              <div>
                <div class="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 class="font-bold text-base text-slate-900 dark:text-white">${drv.name}</h3>
                    <p class="text-xs text-slate-500">${drv.phone || ''} ${drv.note ? '· ' + drv.note : ''}</p>
                  </div>
                  <span class="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700 font-mono font-bold text-xs">${dTrips.length} viajes</span>
                </div>
                <div class="grid grid-cols-2 gap-2.5 my-4 text-xs">
                  <div class="p-2.5 rounded-md bg-slate-50 dark:bg-slate-900">
                    <span class="text-slate-400 block">Total Fletes</span>
                    <span class="font-mono font-bold">${this.formatRD(gross)}</span>
                  </div>
                  <div class="p-2.5 rounded-md bg-slate-50 dark:bg-slate-900">
                    <span class="text-slate-400 block">Combustible</span>
                    <span class="font-mono font-bold">${this.formatRD(fuel)}</span>
                  </div>
                  <div class="p-2.5 rounded-md bg-slate-50 dark:bg-slate-900">
                    <span class="text-slate-500 block">Total Cobrado por Chofer</span>
                    <span class="font-mono font-bold">${this.formatRD(drvPaid)}</span>
                  </div>
                  <div class="p-2.5 rounded-md bg-slate-100 dark:bg-slate-800">
                    <span class="text-slate-600 dark:text-slate-300 block font-semibold">Restante Generado</span>
                    <span class="font-mono font-bold text-slate-900 dark:text-white">${this.formatRD(net)}</span>
                  </div>
                </div>
              </div>
              <div class="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                ${settlementUrl
                  ? `<a href="${settlementUrl}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp flex-1"><i class="fa-brands fa-whatsapp"></i><span>Enviar Resumen WA</span></a>`
                  : '<span class="text-[11px] text-slate-400">Sin teléfono</span>'}
                <button type="button" onclick="App.openDriverHistoryModal('${drv.id}')" class="btn-primary !py-1.5 flex-1">Ver Historial</button>
                <button type="button" onclick="App.openDriverModal('${drv.id}')" class="btn-outline !py-1.5"><i class="fa-solid fa-pen"></i></button>
                <button type="button" onclick="App.deleteDriver('${drv.id}')" class="btn-outline !py-1.5 hover:text-rose-600"><i class="fa-solid fa-trash"></i></button>
              </div>
            </div>
          `;
        }).join('');
      },

renderAnalyticsCharts() {
        const s = this.getPeriodSummary();
        const payroll = s.drvPay + s.hlpPay;
        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#cbd5e1' : '#334155';

        const canvasD = document.getElementById('canvasExpensesDoughnut');
        const emptyD = document.getElementById('expensesChartEmpty');
        if (this.chartDoughnut) this.chartDoughnut.destroy();
        this.chartDoughnut = null;

        const labelsD = ['Combustible', 'Peajes', 'Nómina', 'Otros', 'Taller', 'Incidencias'];
        const dataD = [s.fuel, s.tolls, payroll, s.other, s.maintTotal, s.incidentTotal];
        const hasExpenseData = dataD.some(value => value > 0);
        canvasD.classList.toggle('hidden', !hasExpenseData);
        emptyD.classList.toggle('hidden', hasExpenseData);
        emptyD.innerHTML = hasExpenseData ? '' : this.emptyStateMarkup();

        if (hasExpenseData) {
          this.chartDoughnut = new Chart(canvasD.getContext('2d'), {
            type: 'doughnut',
            data: {
              labels: labelsD,
              datasets: [{ data: dataD, backgroundColor: ['#475569', '#1d4ed8', '#64748b', '#0f766e', '#9a3412', '#b91c1c'], borderWidth: 2, borderColor: isDark ? '#111827' : '#ffffff' }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom', labels: { color: textColor, boxWidth: 12, font: { size: 11 } } } }
            }
          });
        }

        document.getElementById('expensesLegendBox').innerHTML = hasExpenseData ? labelsD.map((l, i) => `
          <div class="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-900">
            <span class="truncate text-slate-600 dark:text-slate-300">${l}</span>
            <span class="font-mono font-bold ml-2">${this.formatRD(dataD[i])}</span>
          </div>
        `).join('') : '<div class="col-span-2 text-center text-xs text-slate-500 dark:text-slate-400">0 registros</div>';

        const canvasB = document.getElementById('canvasTrucksBar');
        const emptyB = document.getElementById('trucksChartEmpty');
        if (this.chartBar) this.chartBar.destroy();
        this.chartBar = null;

        const names = this.db.trucks.map(t => t.name);
        const incArr = [], costArr = [], netArr = [];

        this.db.trucks.forEach(trk => {
          const tTrips = s.trips.filter(t => String(t.truckId) === String(trk.id));
          const tMaints = s.maints.filter(m => String(m.truckId) === String(trk.id));
          const tIncs = s.incidents.filter(i => String(i.truckId) === String(trk.id));
          let g = 0, exp = 0;
          tTrips.forEach(t => { const m = this.calcTrip(t); g += m.gross; exp += m.totalExpense; });
          const mCost = tMaints.reduce((a, x) => a + (Number(x.cost) || 0), 0);
          const iCost = tIncs.reduce((a, x) => a + (Number(x.cost) || 0), 0);
          const totalCost = exp + mCost + iCost;
          incArr.push(g);
          costArr.push(totalCost);
          netArr.push(g - totalCost);
        });

        const hasFleetData = names.length > 0 && (s.trips.length > 0 || s.maints.length > 0 || s.incidents.length > 0);
        canvasB.classList.toggle('hidden', !hasFleetData);
        emptyB.classList.toggle('hidden', hasFleetData);
        emptyB.innerHTML = hasFleetData ? '' : this.emptyStateMarkup();

        if (hasFleetData) {
          this.chartBar = new Chart(canvasB.getContext('2d'), {
            type: 'bar',
            data: {
              labels: names,
              datasets: [
                { label: 'Ingresos Fletes', data: incArr, backgroundColor: '#1e3a8a', borderRadius: 3 },
                { label: 'Gastos', data: costArr, backgroundColor: '#64748b', borderRadius: 3 },
                { label: 'Ganancia Neta', data: netArr, backgroundColor: '#0f766e', borderRadius: 3 }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom', labels: { color: textColor } } },
              scales: {
                x: { ticks: { color: textColor } },
                y: { beginAtZero: true, ticks: { color: textColor } }
              }
            }
          });
        }
      },

renderCatalogsTab() {
        const trips = this.getFilteredTrips();
        const hList = document.getElementById('helpersList');
        if (this.db.helpers.length === 0) {
          hList.innerHTML = `<div class="text-xs text-slate-400 py-4 text-center">Sin ayudantes registrados.</div>`;
        } else {
          hList.innerHTML = this.db.helpers.map(h => {
            const hTrips = trips.filter(t => (t.helperIds || []).map(String).includes(String(h.id)));
            const earned = hTrips.reduce((sum, t) => sum + ((Number(t.helperPay) || 0) / ((t.helperIds || []).length || 1)), 0);
            return `
              <div class="p-3 rounded-md border border-slate-300 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div class="font-semibold text-sm">${h.name}</div>
                  <div class="text-xs text-slate-500">${h.phone || ''} · ${hTrips.length} viaje(s)</div>
                </div>
                <div class="flex items-center gap-3">
                  <span class="font-mono font-bold text-sm">${this.formatRD(earned)}</span>
                  <button type="button" onclick="App.deleteHelper('${h.id}')" class="text-slate-400 hover:text-rose-600"><i class="fa-solid fa-trash"></i></button>
                </div>
              </div>`;
          }).join('');
        }

        const rList = document.getElementById('routesList');
        if (this.db.routes.length === 0) {
          rList.innerHTML = `<div class="text-xs text-slate-400 py-4 text-center">Sin rutas predefinidas.</div>`;
        } else {
          rList.innerHTML = this.db.routes.map(r => {
            const count = trips.filter(t => t.route === r.name).length;
            return `
              <div class="p-3 rounded-md border border-slate-300 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div class="font-semibold text-sm">${r.name}</div>
                  <div class="text-xs text-slate-500">${count} viaje(s)</div>
                </div>
                <button type="button" onclick="App.deleteRoute('${r.id}')" class="text-slate-400 hover:text-rose-600"><i class="fa-solid fa-trash"></i></button>
              </div>`;
          }).join('');
        }
      },

updateLiveCalc() {
        const g = parseMoney(document.getElementById('fTripGross')?.value);
        const exp = parseMoney(document.getElementById('fTripFuel')?.value) +
                    parseMoney(document.getElementById('fTripTolls')?.value) +
                    parseMoney(document.getElementById('fTripDrvPay')?.value) +
                    parseMoney(document.getElementById('fTripHlpPay')?.value) +
                    parseMoney(document.getElementById('fTripOther')?.value);
        const net = g - exp;
        const expEl = document.getElementById('liveTripExp');
        const netEl = document.getElementById('liveTripNet');
        if (expEl) expEl.textContent = this.formatRD(exp);
        if (netEl) netEl.textContent = this.formatRD(net);
      }
};
