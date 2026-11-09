import { fetchAuthSession } from 'aws-amplify/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://566n5qz7te.execute-api.us-east-2.amazonaws.com';

export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString() || session.tokens?.accessToken?.toString();
    if (token) {
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-organization-id': getActiveOrganizationId()
      };
    }
    return { 'Content-Type': 'application/json' };
  } catch {
    return { 'Content-Type': 'application/json' };
  }
}

// ----------------------------------------------------
// HELPER: MULTI-TENANT ORGANIZAÇÃO ATIVA NO PWA
// ----------------------------------------------------
export function getActiveOrganizationId(): string {
  return localStorage.getItem('faithhub_pwa_active_org_id') || '';
}

export function setActiveOrganizationId(orgId: string): void {
  if (orgId) {
    localStorage.setItem('faithhub_pwa_active_org_id', orgId);
    window.dispatchEvent(new CustomEvent('pwa-org-changed', { detail: { orgId } }));
  }
}

// ----------------------------------------------------
// 1. BROADCASTS & CULTOS AO VIVO
// ----------------------------------------------------
export async function fetchActiveBroadcast(organizationId?: string, campusId?: string) {
  try {
    const org = organizationId || getActiveOrganizationId();
    const queryParams = new URLSearchParams();
    if (org) queryParams.set('organization_id', org);
    if (campusId && campusId !== 'all') queryParams.set('campus_id', campusId);
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/broadcasts/active${query}`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.log("Offline/fallback active broadcast", e);
  }
  return null;
}

// ----------------------------------------------------
// 2. DEVOCIONAIS
// ----------------------------------------------------
export async function fetchTodayDevotional(organizationId?: string, campusId?: string) {
  try {
    const org = organizationId || getActiveOrganizationId();
    const campus = campusId || getActiveCampusId();
    const params = new URLSearchParams();
    if (org) params.append('organization_id', org);
    if (campus) params.append('campus_id', campus);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/devotionals/today${query}`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.log("Offline/fallback today devotional", e);
  }
  return null;
}

export async function fetchDevotionals(organizationId?: string, campusId?: string) {
  try {
    const org = organizationId || getActiveOrganizationId();
    const campus = campusId || getActiveCampusId();
    const params = new URLSearchParams();
    if (org) params.append('organization_id', org);
    if (campus) params.append('campus_id', campus);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/devotionals${query}`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.log("Offline/fallback devotionals", e);
  }
  return [];
}

// ----------------------------------------------------
// HELPER: CAMPUS ATIVO NO PWA
// ----------------------------------------------------
export function getActiveCampusId(): string {
  return localStorage.getItem('faithhub_pwa_active_campus_id') || 'campus_sede';
}

export function setActiveCampusId(campusId: string): void {
  localStorage.setItem('faithhub_pwa_active_campus_id', campusId);
  window.dispatchEvent(new CustomEvent('pwa-campus-changed', { detail: { campusId } }));
}

// ----------------------------------------------------
// 3. EVENTOS & TICKETS / PASSAPORTES
// ----------------------------------------------------
export async function fetchEvents(organizationId?: string, campusId?: string) {
  try {
    const org = organizationId || getActiveOrganizationId();
    const activeCampus = campusId || getActiveCampusId();
    const queryParams = new URLSearchParams();
    if (org) queryParams.set('organization_id', org);
    if (activeCampus && activeCampus !== 'all') queryParams.set('campus_id', activeCampus);

    const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/events${qs}`);
    if (res.ok) {
      const data = await res.json();
      return data.data || data;
    }
  } catch (e) {
    console.log("Offline/fallback events", e);
  }
  return [];
}

export async function checkoutTicket(payload: {
  event_id: string; organization_id?: string; lot_id?: string; batch_id?: string; user_id?: string;
  attendee_name: string; attendee_cpf?: string; attendee_whatsapp: string; attendee_email?: string; dietary_notes?: string;
  payment_method: 'PIX' | 'CREDIT_CARD';
}) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/tickets/checkout`, { method: 'POST', headers,
    body: JSON.stringify({ ...payload, organization_id: payload.organization_id || getActiveOrganizationId() }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Não foi possível registrar a inscrição.');
  if (!data.ticket_id || !data.qrcode_token || !data.status) throw new Error('Resposta de inscrição inválida.');
  return data;
}

export async function fetchMyTickets() {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/tickets/me`, { headers });
    if (res.ok) return await res.json();
  } catch (e) {
    console.log("Offline/fallback my tickets", e);
  }
  return [];
}

// ----------------------------------------------------
// 4. PDV / PRODUTOS E PEDIDOS
// ----------------------------------------------------
export async function fetchPdvProducts(organizationId?: string, campusId?: string) {
  try {
    const headers = await getAuthHeaders();
    
    // Tratamento defensivo caso venham argumentos invertidos por código legado
    let org = organizationId || getActiveOrganizationId();
    let campus = campusId || getActiveCampusId();

    if (org && (org.startsWith('campus_') || org === 'all')) {
      campus = org;
      org = campusId || getActiveOrganizationId();
    }

    if (!org) org = 'org_default';

    const params = new URLSearchParams();
    params.set('organization_id', org);
    if (campus && campus !== 'all') {
      params.set('campus_id', campus);
    }
    const queryParam = `?${params.toString()}`;
    const res = await fetch(`${API_BASE_URL}/pdv/products${queryParam}`, { headers });
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.data || []);
      
      return list;
    }
  } catch (e) {
    console.log("Offline/fallback PDV products", e);
  }
  return [];
}

export async function createPdvOrder(payload: {
  user_name: string; customer_phone?: string; delivery_method: 'church' | 'home'; delivery_details: string;
  items_json: Array<{ id: string; name: string; qty: number; price: number; obs?: string }>;
  total_price: number; organization_id?: string; campus_id?: string; payment_method: 'PIX' | 'CREDIT_CARD';
}) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/pdv/orders`, { method: 'POST', headers,
    body: JSON.stringify({ ...payload, organization_id: payload.organization_id || getActiveOrganizationId(), campus_id: payload.campus_id || getActiveCampusId() }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Não foi possível registrar o pedido.');
  if (!data.id || !data.payment_status) throw new Error('Resposta de pedido inválida.');
  return data;
}

export async function fetchPdvOrders(organizationId?: string) {
  try {
    const headers = await getAuthHeaders();
    const org = organizationId || getActiveOrganizationId();
    const qs = org ? `?organization_id=${encodeURIComponent(org)}` : '';
    const res = await fetch(`${API_BASE_URL}/pdv/orders${qs}`, { headers });
    if (res.ok) return await res.json();
  } catch (e) {
    console.log("Offline/fallback PDV orders", e);
  }
  return [];
}

// ----------------------------------------------------
// 5. CÉLULAS, MURAL, ESTUDOS E LANCHES
// ----------------------------------------------------
export async function fetchCellGroups(organizationId?: string, campusId?: string) {
  try {
    let effectiveOrg = organizationId;
    let effectiveCampus = campusId;

    // Suporte resiliente caso os argumentos venham invertidos (ex: campus_sede)
    if (organizationId?.startsWith('campus_') || organizationId === 'all') {
      effectiveCampus = organizationId;
      effectiveOrg = campusId;
    }

    const org = effectiveOrg || getActiveOrganizationId() || 'org_default';
    const params = new URLSearchParams();
    if (org) params.set('organization_id', org);
    
    // Impede categoricamente que identificadores de organização contaminem o filtro de campus_id
    if (effectiveCampus && effectiveCampus !== 'all' && !effectiveCampus.startsWith('org_')) {
      params.set('campus_id', effectiveCampus);
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/cell-groups${qs}`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.log("Offline/fallback cell groups", e);
  }
  return [];
}

export async function requestJoinCell(userId: string, cellGroupId: string, email?: string) {
  try {
    const headers = await getAuthHeaders();
    const targetId = userId && userId !== 'user_me' ? userId : 'me';
    const res = await fetch(`${API_BASE_URL}/members/${targetId}/request-cell`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ cellGroupId, userId: targetId, email })
    });
    return res.ok;
  } catch (e) {
    console.log("Request cell API error", e);
    return false;
  }
}

export async function fetchCellPosts(groupId?: string, organizationId?: string) {
  try {
    const headers = await getAuthHeaders();
    const org = organizationId || getActiveOrganizationId();
    const params = new URLSearchParams();
    if (groupId) params.set('group_id', groupId);
    if (org) params.set('organization_id', org);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/posts${qs}`, { headers });
    if (res.ok) return await res.json();
  } catch (e) {
    console.log("Offline/fallback cell posts", e);
  }
  return [];
}

export async function createCellPost(payload: { 
  group_id?: string; 
  content: string; 
  author_name: string; 
  author_id?: string;
  reply_to_id?: string;
  reply_to_author?: string;
  reply_to_text?: string;
  author_role?: string;
  author_avatar?: string;
  organization_id?: string;
}) {
  try {
    const headers = await getAuthHeaders();
    const org = payload.organization_id || getActiveOrganizationId();
    const res = await fetch(`${API_BASE_URL}/posts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...payload, organization_id: org })
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.log("Create cell post fallback", e);
  }
  return null;
}

export async function reactToCellPost(postId: string, emoji: string, userId?: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/posts/${postId}/react`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ emoji, userId })
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.log("React to cell post error", e);
  }
  return null;
}

export async function fetchStudyBooks(groupId?: string, organizationId?: string, campusId?: string) {
  try {
    const headers = await getAuthHeaders();
    const org = organizationId || getActiveOrganizationId();
    const activeCampus = campusId || getActiveCampusId();
    const params = new URLSearchParams();
    if (groupId) params.set('group_id', groupId);
    if (org) params.set('organization_id', org);
    if (activeCampus && activeCampus !== 'all') params.set('campus_id', activeCampus);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/study-books${qs}`, { headers });
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : (data.data || []);
    }
  } catch (e) {
    console.log("Offline/fallback study books", e);
  }
  return [];
}

export async function fetchStudyBookDetails(bookId: string, userId?: string) {
  try {
    const headers = await getAuthHeaders();
    const userParam = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
    const res = await fetch(`${API_BASE_URL}/study-books/${bookId}${userParam}`, { headers });
    if (res.ok) {
      const data = await res.json();
      return data.data || data;
    }
  } catch (e) {
    console.log("Offline/fallback study book details", e);
  }
  return null;
}

export async function toggleChapterCompletion(chapterId: string, bookId?: string, userId?: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/study-chapters/${chapterId}/toggle-completion`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ book_id: bookId, user_id: userId })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.log("Offline/fallback toggle chapter completion", e);
  }
  return null;
}

export async function fetchCellStudies(groupId?: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/studies${groupId ? `?group_id=${groupId}` : ''}`, { headers });
    if (res.ok) return await res.json();
  } catch (e) {
    console.log("Offline/fallback cell studies", e);
  }
  return [];
}

export async function fetchCellPartilhas(groupId?: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/partilhas${groupId ? `?group_id=${groupId}` : ''}`, { headers });
    if (res.ok) return await res.json();
  } catch (e) {
    console.log("Offline/fallback cell partilhas", e);
  }
  return [];
}

export async function togglePartilhaItem(id: string, isConfirmed?: boolean, userName?: string, userId?: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/partilhas/${id}/toggle`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        is_confirmed: isConfirmed,
        user_name: userName,
        user_id: userId
      })
    });
    return res.ok;
  } catch (e) {
    console.log("Toggle partilha fallback", e);
  }
  return true;
}

export async function fetchCellGroupDetails(groupId: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/cell-groups/${groupId}`, { headers });
    if (res.ok) return await res.json();
  } catch (e) {
    console.log("Fetch cell details fallback", e);
  }
  return null;
}

export async function evaluateCellJoinRequest(groupId: string, memberId: string, approved: boolean) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/cell-groups/${groupId}/evaluate-request`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ memberId, approved })
    });
    return res.ok;
  } catch (e) {
    console.log("Evaluate request error", e);
    return false;
  }
}

export async function createPartilhaItem(payload: { cell_group_id: string; item_name: string; event_date: string; quantity?: string; user_name?: string }) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/partilhas`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.log("Create partilha error", e);
  }
  return null;
}

export async function deletePartilhaItem(id: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/partilhas/${id}`, {
      method: 'DELETE',
      headers
    });
    return res.ok;
  } catch (e) {
    console.log("Delete partilha error", e);
    return false;
  }
}

export async function removeCellMember(groupId: string, memberId: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/cell-groups/${groupId}/members/${memberId}`, {
      method: 'DELETE',
      headers
    });
    return res.ok;
  } catch (e) {
    console.log("Remove member error", e);
    return false;
  }
}

export async function updateCellGroupDetails(payload: any) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/cell-groups`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (e) {
    console.log("Update cell error", e);
    return false;
  }
}

export async function recordCellMeeting(groupId: string, payload: {
  meeting_date: string;
  study_topic?: string;
  offerings_amount?: number;
  notes?: string;
  attendees: Array<{
    member_id?: string;
    visitor_name?: string;
    visitor_phone?: string;
    status: 'PRESENT' | 'ABSENT' | 'JUSTIFIED';
    justification?: string;
  }>;
}) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/cell-groups/${groupId}/meetings`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.log("Record cell meeting error", e);
  }
  return null;
}

export async function fetchCellMeetings(groupId: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/cell-groups/${groupId}/meetings`, { headers });
    if (res.ok) return await res.json();
  } catch (e) {
    console.log("Fetch cell meetings fallback", e);
  }
  return [];
}

export async function fetchCellMeetingDetails(groupId: string, meetingId: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/cell-groups/${groupId}/meetings/${meetingId}`, { headers });
    if (res.ok) return await res.json();
  } catch (e) {
    console.log("Fetch cell meeting details fallback", e);
  }
  return null;
}

// ----------------------------------------------------
// 6. UPLOADS S3
// ----------------------------------------------------
export async function getUploadPresignedUrl(contentType: string, prefix = 'receipts') {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/upload-url?contentType=${encodeURIComponent(contentType)}&prefix=${prefix}`, { headers });
    if (res.ok) return await res.json();
  } catch (e) {
    console.log("Get upload URL fallback", e);
  }
  return null;
}

// ----------------------------------------------------
// 7. WHITELABEL / CHURCH SETTINGS
// ----------------------------------------------------
export async function fetchChurchSettings(slug?: string, organizationId?: string) {
  try {
    const params = new URLSearchParams();
    if (slug) params.set('slug', slug);
    const org = organizationId || (!slug ? getActiveOrganizationId() : undefined);
    if (org) params.set('organization_id', org);
    const queryParam = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/church-settings${queryParam}`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.log("Church settings fallback to local storage", e);
  }
  return null;
}

// ----------------------------------------------------
// 8. ORAÇÕES & INTERCESSÃO
// ----------------------------------------------------
export async function fetchPrayers(category?: string, userId?: string, orgId?: string, campusId?: string) {
  try {
    const org = orgId || getActiveOrganizationId();
    let url = `${API_BASE_URL}/prayers`;
    const params = new URLSearchParams();
    if (category && category !== 'ALL') params.append('category', category);
    if (userId) params.append('user_id', userId);
    if (org) params.append('organization_id', org);
    if (campusId && campusId !== 'all') params.append('campus_id', campusId);
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    const res = await fetch(url, { headers: await getAuthHeaders() });
    if (res.ok) return await res.json();
  } catch (e) {
    console.log("Prayers API fallback", e);
  }
  return null;
}

export async function createPrayerRequest(payload: {
  author_name: string;
  author_phone?: string;
  is_anonymous: boolean;
  category: string;
  privacy: string;
  content: string;
  user_id?: string;
  organization_id?: string;
  campus_id?: string;
}) {
  try {
    const headers = await getAuthHeaders();
    const org = payload.organization_id || getActiveOrganizationId();
    const res = await fetch(`${API_BASE_URL}/prayers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...payload, organization_id: org })
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.log("Create prayer fallback", e);
  }
  return null;
}

export async function prayForRequest(prayerId: string, userId?: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/prayers/${prayerId}/pray`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_id: userId })
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.log("Pray for request fallback", e);
  }
  return null;
}

export async function submitPrayerTestimony(prayerId: string, testimonyText: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/prayers/${prayerId}/testimony`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ testimony: testimonyText })
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.log("Submit prayer testimony fallback", e);
  }
  return null;
}

// ----------------------------------------------------
// 9. UNIDADES / CAMPI DA IGREJA
// ----------------------------------------------------
export async function fetchCampuses(organizationId?: string) {
  try {
    const org = organizationId || getActiveOrganizationId();
    const qs = org ? `?organization_id=${encodeURIComponent(org)}` : '';
    const res = await fetch(`${API_BASE_URL}/campuses${qs}`);
    if (res.ok) {
      const json = await res.json();
      return json.data || [];
    }
  } catch (e) {
    console.log("Fetch campuses fallback", e);
  }
  return [];
}

// ----------------------------------------------------
// 10. PERFIL DO MEMBRO & VÍNCULO DE CÉLULA
// ----------------------------------------------------
export async function fetchCurrentMember(organizationId?: string): Promise<any> {
  // Capture the organization before asynchronous token restoration.
  const org = organizationId || getActiveOrganizationId();
  if (!org) return null;
  try {
    const headers = { ...await getAuthHeaders(), 'x-organization-id': org };
    const res = await fetch(`${API_BASE_URL}/members/me?organization_id=${encodeURIComponent(org)}`, { headers, cache: 'no-store' });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Não foi possível consultar seu cadastro nesta igreja.');
    const data = await res.json();
    const member = data.data || data;
    return member.organization_id === org ? member : null;
  } catch (e) {
    if (organizationId) throw e;
    return null;
  }
}

// ----------------------------------------------------
// 11. MINISTÉRIOS & ESCALAS DE VOLUNTÁRIOS
// ----------------------------------------------------
export interface VolunteerScope { organizationId: string; campusId: string; signal?: AbortSignal }
function volunteerScope(scope?: VolunteerScope): VolunteerScope {
  return scope || { organizationId: getActiveOrganizationId(), campusId: getActiveCampusId() };
}
async function volunteerRequest(path: string, options: RequestInit = {}, scope?: VolunteerScope) {
  const selected = volunteerScope(scope);
  if (!selected.organizationId) throw Error('Selecione uma igreja para acessar o voluntariado.');
  const url = new URL(API_BASE_URL + path);
  url.searchParams.set('organization_id', selected.organizationId);
  url.searchParams.set('campus_id', selected.campusId || 'all');
  const headers = new Headers(await getAuthHeaders());
  // Token restoration is asynchronous; pin the context captured before it started.
  headers.set('x-organization-id', selected.organizationId);
  headers.set('x-campus-id', selected.campusId || 'all');
  return fetch(url.href, { ...options, headers, signal: selected.signal, cache: 'no-store' });
}
async function volunteerList(path: string, scope?: VolunteerScope): Promise<any[]> {
  const response = await volunteerRequest(path, {}, scope);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw Error(data.message || 'Não foi possível carregar o voluntariado desta igreja e unidade.');
  }
  return response.json();
}
async function volunteerAction(path: string, body: any, scope?: VolunteerScope, method = 'POST'): Promise<{ success: boolean; message?: string }> {
  try { const res = await volunteerRequest(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }, scope);
    const data = await res.json(); return { success: res.ok, message: data.message || 'Não foi possível concluir esta ação nesta igreja e unidade.' };
  } catch { return { success: false, message: 'Não foi possível concluir esta ação. Tente novamente.' }; }
}
export const fetchMySchedules = (scope?: VolunteerScope) => volunteerList('/volunteers/my-schedules', scope);
export async function respondToSchedule(id: string, status: 'ACCEPTED' | 'DECLINED', decline_reason?: string, scope?: VolunteerScope) {
  return (await volunteerAction(`/volunteers/schedules/${encodeURIComponent(id)}/respond`, { status, decline_reason }, scope)).success;
}
export function fetchMinistries(organizationId?: string, campusId?: string, scope?: VolunteerScope) {
  const selected = scope || { organizationId: organizationId || getActiveOrganizationId(), campusId: campusId || getActiveCampusId() };
  return volunteerList('/ministries?scope=member&status=ACTIVE', selected);
}
export const fetchMinistrySchedules = (id: string, scope?: VolunteerScope) => volunteerList(`/ministries/${encodeURIComponent(id)}/schedules?timeframe=upcoming&status=PUBLISHED&scope=member`, scope);
export async function joinMinistry(id: string, _memberId: string, roles_csv?: string, notes?: string, scope?: VolunteerScope) {
  const result = await volunteerAction('/volunteers/applications', { ministry_id: id, roles_csv, notes }, scope);
  if (!result.success) throw Error(result.message); return true;
}
export const fetchMyBlockouts = (scope?: VolunteerScope) => volunteerList('/volunteers/blockouts', scope);
export async function createBlockout(start_date: string, end_date: string, reason?: string, scope?: VolunteerScope) { return (await volunteerAction('/volunteers/blockouts', { start_date, end_date, reason }, scope)).success; }
export async function deleteBlockout(id: string, scope?: VolunteerScope) { return (await volunteerAction(`/volunteers/blockouts/${encodeURIComponent(id)}`, undefined, scope, 'DELETE')).success; }
export const fetchEligiblePeersForSwap = (id: string, role: string, scope?: VolunteerScope) => volunteerList(`/volunteers/schedules/eligible-peers?${new URLSearchParams({ schedule_id: id, role_id: role })}`, scope);
export const requestRosterSwap = (id: string, target_member_id?: string, reason?: string, scope?: VolunteerScope) => volunteerAction(`/volunteers/schedules/roster/${encodeURIComponent(id)}/swap`, { target_member_id, reason }, scope);
export async function fetchMyPendingSwaps(scope?: VolunteerScope): Promise<{ incoming: any[]; outgoing: any[] }> {
  const response = await volunteerRequest('/volunteers/swaps/pending', {}, scope);
  if (!response.ok) throw Error('Não foi possível carregar as trocas desta igreja e unidade.');
  return response.json();
}
export const respondToSwap = (id: string, action: 'ACCEPT' | 'REJECT', scope?: VolunteerScope) => volunteerAction(`/volunteers/swaps/${encodeURIComponent(id)}/respond`, { action }, scope);
export const cancelRosterSwap = (id?: string, rosterItemId?: string, scope?: VolunteerScope) => volunteerAction(id ? `/volunteers/swaps/${encodeURIComponent(id)}/cancel` : '/volunteers/swaps/cancel', { rosterItemId }, scope);
export function createVolunteerClient(scope: VolunteerScope) {
  return {
    fetchMySchedules: () => fetchMySchedules(scope), fetchMinistries: () => fetchMinistries(undefined, undefined, scope),
    fetchMyBlockouts: () => fetchMyBlockouts(scope), fetchMyPendingSwaps: () => fetchMyPendingSwaps(scope),
    fetchMinistrySchedules: (id: string) => fetchMinistrySchedules(id, scope),
    respondToSchedule: (id: string, status: 'ACCEPTED' | 'DECLINED', reason?: string) => respondToSchedule(id, status, reason, scope),
    joinMinistry: (id: string, member: string, roles?: string) => joinMinistry(id, member, roles, undefined, scope),
    createBlockout: (start: string, end: string, reason?: string) => createBlockout(start, end, reason, scope),
    deleteBlockout: (id: string) => deleteBlockout(id, scope), fetchEligiblePeersForSwap: (id: string, role: string) => fetchEligiblePeersForSwap(id, role, scope),
    requestRosterSwap: (id: string, target?: string, reason?: string) => requestRosterSwap(id, target, reason, scope),
    respondToSwap: (id: string, action: 'ACCEPT' | 'REJECT') => respondToSwap(id, action, scope),
    cancelRosterSwap: (id?: string, roster?: string) => cancelRosterSwap(id, roster, scope)
  };
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(await getAuthHeaders());
  new Headers(options.headers).forEach((value, key) => headers.set(key, value));
  return fetch(url, { ...options, headers });
}
