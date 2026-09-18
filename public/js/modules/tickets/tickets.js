import { state } from '../../core/state.js';
import { query, queryAll, fullName, formatDate, escapeHtml, hasPermission } from '../../core/utils.js';
import { api } from '../../core/api.js';
import { showToast, showMessage, clearMessage } from '../../components/toast.js';

let activeScope = 'own';
let cachedTickets = [];
let isInitialized = false;

export const TICKET_CATEGORIES = {
  HARDWARE: 'Hardware / Computadora',
  SOFTWARE: 'Software / Programas',
  NETWORK: 'Red / Internet',
  ATTENDANCE_SYSTEM: 'Sistema de Asistencia',
  EMAIL: 'Correo / Cuentas',
  PRINTER: 'Impresoras',
  OTHER: 'Otro'
};

export const TICKET_PRIORITIES = {
  LOW: { label: 'Baja', class: 'priority-low' },
  MEDIUM: { label: 'Media', class: 'priority-medium' },
  HIGH: { label: 'Alta', class: 'priority-high' },
  URGENT: { label: 'Urgente', class: 'priority-urgent' }
};

export const TICKET_STATUSES = {
  PENDING: { label: 'Pendiente', class: 'ticket-status-pending' },
  IN_PROGRESS: { label: 'En Proceso', class: 'ticket-status-in-progress' },
  RESOLVED: { label: 'Resuelto', class: 'ticket-status-resolved' },
  CLOSED: { label: 'Cerrado', class: 'ticket-status-closed' },
  REJECTED: { label: 'Rechazado', class: 'ticket-status-rejected' }
};

export function isSistemasOrAdmin() {
  const user = state.session?.user;
  if (!user) return false;
  const roleName = typeof user.role === 'string' ? user.role : user.role?.name || '';
  const permissions = user.permissions || [];
  
  return (
    roleName === 'Administrador' ||
    roleName === 'Sistemas' ||
    roleName === 'SuperAdmin' ||
    permissions.includes('tickets.manage') ||
    permissions.includes('settings.read')
  );
}

export async function loadTickets() {
  const container = query('#tickets-container');
  if (!container) return;

  const isManager = isSistemasOrAdmin();
  const tabsContainer = query('#ticket-manager-tabs');
  if (tabsContainer) {
    tabsContainer.hidden = !isManager;
    if (!isManager) {
      activeScope = 'own';
    }
  }

  // Setup DOM event listeners if not yet initialized
  if (!isInitialized) {
    setupTicketEventListeners();
    isInitialized = true;
  }

  container.innerHTML = '<div class="loading-indicator">Cargando tickets de soporte...</div>';

  try {
    const statusFilter = query('#ticket-status-filter')?.value || '';
    const categoryFilter = query('#ticket-category-filter')?.value || '';
    const priorityFilter = query('#ticket-priority-filter')?.value || '';
    const searchQuery = query('#ticket-search-input')?.value?.trim() || '';

    const queryParams = new URLSearchParams();
    if (statusFilter) queryParams.set('status', statusFilter);
    if (categoryFilter) queryParams.set('category', categoryFilter);
    if (priorityFilter) queryParams.set('priority', priorityFilter);
    if (searchQuery) queryParams.set('search', searchQuery);
    
    // Si es manager y la pestaña activa es 'own', pasamos scope=own para ver solo los suyos
    if (isManager && activeScope === 'own') {
      queryParams.set('scope', 'own');
    }

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/tickets?${queryString}` : '/tickets';
    const response = await api(endpoint);
    const tickets = Array.isArray(response) ? response : response.items || [];
    cachedTickets = tickets;

    updateTabBadges();
    renderTicketsList(tickets);
  } catch (error) {
    console.error('Error loading tickets:', error);
    container.innerHTML = `<div class="empty-state">Error al cargar los tickets: ${escapeHtml(error.message || 'Error desconocido')}</div>`;
  }
}


export function updateTabBadges() {
  const ownBadge = query('#own-tickets-badge');
  const allBadge = query('#all-tickets-badge');
  const currentUserId = state.session?.user?.id;

  if (ownBadge && allBadge) {
    const ownCount = cachedTickets.filter((t) => t.userId === currentUserId).length;
    ownBadge.textContent = ownCount;
    allBadge.textContent = cachedTickets.length;
  }
}

export function renderTicketsList(tickets) {
  const container = query('#tickets-container');
  if (!container) return;

  if (!tickets || tickets.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 40px 20px; background: var(--surface); border: 1px solid var(--line); border-radius: 6px;">
        <p style="font-weight: 700; color: var(--ink); margin-bottom: 6px;">No hay tickets de soporte registrados</p>
        <p style="font-size: 0.85rem; color: var(--ink-soft); margin: 0;">Puede abrir un nuevo ticket con el botón superior para reportar cualquier incidencia técnica o de sistemas.</p>
      </div>
    `;
    return;
  }

  const currentUserId = state.session?.user?.id;
  const isManager = isSistemasOrAdmin();

  container.innerHTML = tickets
    .map((t) => {
      const priorityInfo = TICKET_PRIORITIES[t.priority] || { label: t.priority, class: 'priority-medium' };
      const statusInfo = TICKET_STATUSES[t.status] || { label: t.status, class: 'ticket-status-pending' };
      const categoryLabel = TICKET_CATEGORIES[t.category] || t.category;
      
      const authorName = t.user ? fullName(t.user) : 'Usuario';
      const authorSite = t.site?.name ? ` · Sede: ${t.site.name}` : '';
      const createdFormatted = formatDate(t.createdAt) || new Date(t.createdAt).toLocaleDateString();

      const canManageThis = isManager;
      const canCancelThis = t.userId === currentUserId && t.status === 'PENDING';

      let resolutionHtml = '';
      if (t.resolutionNote && (t.status === 'RESOLVED' || t.status === 'CLOSED' || t.status === 'REJECTED' || t.status === 'IN_PROGRESS')) {
        const isRejected = t.status === 'REJECTED';
        const resolverName = t.resolver ? fullName(t.resolver) : 'Área de Sistemas';
        const resolvedDate = t.resolvedAt ? formatDate(t.resolvedAt) : '';

        resolutionHtml = `
          <div class="ticket-resolution-box ${isRejected ? 'rejected' : ''}">
            <div class="resolution-header">
              <span>Atención brindada por: ${escapeHtml(resolverName)} ${resolvedDate ? `(${escapeHtml(resolvedDate)})` : ''}</span>
              <span class="status-pill ${statusInfo.class}">${escapeHtml(statusInfo.label)}</span>
            </div>
            <p class="resolution-text">${escapeHtml(t.resolutionNote)}</p>
          </div>
        `;
      }

      let actionsHtml = '';
      if (canManageThis) {
        actionsHtml += `
          <button class="small-button primary-button btn-attend-ticket" data-ticket-id="${t.id}" type="button">
            Atender / Actualizar
          </button>
        `;
      }
      if (canCancelThis) {
        actionsHtml += `
          <button class="small-button quiet-button btn-cancel-ticket" data-ticket-id="${t.id}" type="button">
            Cancelar Ticket
          </button>
        `;
      }

      return `
        <article class="ticket-card" id="ticket-card-${t.id}">
          <header class="ticket-card-header">
            <div class="ticket-header-left">
              <span class="ticket-code">${escapeHtml(t.ticketNumber)}</span>
              <span class="ticket-date">${escapeHtml(createdFormatted)}</span>
            </div>
            <div class="ticket-badges">
              <span class="status-pill ${priorityInfo.class}">${escapeHtml(priorityInfo.label)}</span>
              <span class="status-pill event-pill">${escapeHtml(categoryLabel)}</span>
              <span class="status-pill ${statusInfo.class}">${escapeHtml(statusInfo.label)}</span>
            </div>
          </header>

          <div class="ticket-card-body">
            <h3 class="ticket-title">${escapeHtml(t.title)}</h3>
            <div class="ticket-author-info">
              <span>Reportado por: <strong>${escapeHtml(authorName)}</strong>${escapeHtml(authorSite)}</span>
            </div>
            <div class="ticket-description">${escapeHtml(t.description)}</div>
            ${resolutionHtml}
          </div>

          ${actionsHtml ? `<footer class="ticket-card-footer">${actionsHtml}</footer>` : ''}
        </article>
      `;
    })
    .join('');

  // Attach card buttons listeners
  container.querySelectorAll('.btn-attend-ticket').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ticketId = btn.dataset.ticketId;
      openResolveDialog(ticketId);
    });
  });

  container.querySelectorAll('.btn-cancel-ticket').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ticketId = btn.dataset.ticketId;
      handleCancelTicket(ticketId);
    });
  });
}

export function setupTicketEventListeners() {
  // 1. Tab switches
  queryAll('.ticket-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      queryAll('.ticket-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activeScope = tab.dataset.ticketTab || 'own';
      loadTickets();
    });
  });

  // 2. Open Create Ticket Dialog
  const openBtn = query('#open-ticket-dialog-btn');
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      openCreateTicketDialog();
    });
  }

  // 3. Refresh button
  const refreshBtn = query('#refresh-tickets-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadTickets();
    });
  }

  // 4. Filters change
  ['#ticket-status-filter', '#ticket-category-filter', '#ticket-priority-filter'].forEach((selector) => {
    const el = query(selector);
    if (el) {
      el.addEventListener('change', () => {
        loadTickets();
      });
    }
  });

  // 5. Search input
  const searchInput = query('#ticket-search-input');
  if (searchInput) {
    let timeout = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        loadTickets();
      }, 300);
    });
  }

  // 6. Create Ticket Form Submit
  const createForm = query('#create-ticket-form');
  if (createForm) {
    createForm.addEventListener('submit', handleCreateTicketSubmit);
  }

  // 7. Resolve Ticket Form Submit
  const resolveForm = query('#resolve-ticket-form');
  if (resolveForm) {
    resolveForm.addEventListener('submit', handleResolveTicketSubmit);
  }
}

export function openCreateTicketDialog() {
  const dialog = query('#ticket-dialog');
  const form = query('#create-ticket-form');
  if (!dialog || !form) return;

  form.reset();
  dialog.showModal();
}

export async function handleCreateTicketSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = query('#submit-ticket-form-btn');
  
  const title = form.title?.value?.trim();
  const category = form.category?.value;
  const priority = form.priority?.value;
  const description = form.description?.value?.trim();

  if (!title || !category || !priority || !description) {
    showToast('Por favor complete todos los campos obligatorios.', 'warning');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;

  try {
    const created = await api('/tickets', {
      method: 'POST',
      body: JSON.stringify({
        title,
        category,
        priority,
        description
      })
    });

    showToast(`Ticket ${created.ticketNumber || ''} registrado exitosamente. El área de Sistemas lo revisará pronto.`, 'success');
    
    const dialog = query('#ticket-dialog');
    if (dialog) dialog.close();
    
    loadTickets();
  } catch (error) {
    console.error('Error creating ticket:', error);
    showToast(error.message || 'No se pudo registrar el ticket.', 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

export function openResolveDialog(ticketId) {
  const ticket = cachedTickets.find((t) => t.id === ticketId);
  if (!ticket) return;

  const dialog = query('#resolve-ticket-dialog');
  const form = query('#resolve-ticket-form');
  if (!dialog || !form) return;

  form.reset();

  const idInput = query('#resolve-ticket-id');
  if (idInput) idInput.value = ticket.id;

  const numEl = query('#resolve-summary-number');
  if (numEl) numEl.textContent = ticket.ticketNumber;

  const prioEl = query('#resolve-summary-priority');
  if (prioEl) {
    const prio = TICKET_PRIORITIES[ticket.priority] || { label: ticket.priority };
    prioEl.textContent = prio.label;
  }

  const catEl = query('#resolve-summary-category');
  if (catEl) {
    catEl.textContent = TICKET_CATEGORIES[ticket.category] || ticket.category;
  }

  const titleEl = query('#resolve-summary-title');
  if (titleEl) titleEl.textContent = ticket.title;

  const authorEl = query('#resolve-summary-author');
  if (authorEl) {
    const authorName = ticket.user ? fullName(ticket.user) : 'Usuario';
    const siteName = ticket.site?.name ? ` · Sede: ${ticket.site.name}` : '';
    authorEl.textContent = `Reportado por: ${authorName}${siteName}`;
  }

  const descEl = query('#resolve-summary-desc');
  if (descEl) descEl.textContent = ticket.description;

  const statusSelect = query('#resolve-form-status');
  if (statusSelect) {
    statusSelect.value = ticket.status === 'PENDING' ? 'IN_PROGRESS' : ticket.status;
  }

  const noteInput = query('#resolve-form-note');
  if (noteInput && ticket.resolutionNote) {
    noteInput.value = ticket.resolutionNote;
  }

  dialog.showModal();
}

export async function handleResolveTicketSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = query('#submit-resolve-form-btn');

  const ticketId = query('#resolve-ticket-id')?.value;
  const status = form.status?.value;
  const resolutionNote = form.resolutionNote?.value?.trim();

  if (!ticketId || !status || !resolutionNote) {
    showToast('Por favor ingrese el estado y la nota de atención técnica.', 'warning');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;

  try {
    await api(`/tickets/${ticketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        resolutionNote
      })
    });

    showToast('Ticket actualizado y notificado al usuario correctamente.', 'success');

    const dialog = query('#resolve-ticket-dialog');
    if (dialog) dialog.close();

    loadTickets();
  } catch (error) {
    console.error('Error updating ticket:', error);
    showToast(error.message || 'No se pudo actualizar el ticket.', 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

export async function handleCancelTicket(ticketId) {
  if (!confirm('¿Está seguro de que desea cancelar este ticket de soporte?')) {
    return;
  }

  try {
    await api(`/tickets/${ticketId}/cancel`, {
      method: 'PATCH'
    });

    showToast('Ticket cancelado correctamente.', 'success');
    loadTickets();
  } catch (error) {
    console.error('Error cancelling ticket:', error);
    showToast(error.message || 'No se pudo cancelar el ticket.', 'error');
  }
}
