import { fetchAuthSession } from 'aws-amplify/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://usl72lj2m5.execute-api.us-east-2.amazonaws.com';

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
      
      // Se não houver produtos específicos vinculados a este campus e o campus não for 'all',
      // busca os produtos da organização como fallback para a loja nunca ficar vazia
      if (list.length === 0 && campus && campus !== 'all') {
        const fallbackRes = await fetch(`${API_BASE_URL}/pdv/products?organization_id=${org}`, { headers });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          return Array.isArray(fallbackData) ? fallbackData : (fallbackData.data || []);
        }
      }

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
  total_price: number; organization_id?: string; payment_method: 'PIX' | 'CREDIT_CARD';
}) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/pdv/orders`, { method: 'POST', headers,
    body: JSON.stringify({ ...payload, organization_id: payload.organization_id || getActiveOrganizationId() }) });
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
export async function fetchCurrentMember(): Promise<any> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/members/me`, { headers });
    if (res.ok) {
      const data = await res.json();
      return data.data || data;
    }
  } catch (e) {
    console.log("Fetch current member fallback", e);
  }
  return null;
}

// ----------------------------------------------------
// 11. MINISTÉRIOS & ESCALAS DE VOLUNTÁRIOS
// ----------------------------------------------------
export async function fetchMySchedules(): Promise<any[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/volunteers/my-schedules`, { headers });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.log("Fetch my schedules fallback", e);
  }
  return [];
}

export async function respondToSchedule(rosterItemId: string, status: 'ACCEPTED' | 'DECLINED', decline_reason?: string): Promise<boolean> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/volunteers/schedules/${rosterItemId}/respond`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ status, decline_reason })
    });
    return res.ok;
  } catch (e) {
    console.log("Respond schedule error", e);
    return false;
  }
}

export async function fetchMinistries(organizationId?: string, campusId?: string): Promise<any[]> {
  try {
    const headers = await getAuthHeaders();
    const org = organizationId || getActiveOrganizationId();
    if (!org) return [];
    const params = new URLSearchParams({ organization_id: org });
    if (campusId && campusId !== 'all') params.set('campus_id', campusId);

    const res = await fetch(`${API_BASE_URL}/ministries?${params.toString()}`, { headers });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.log("Fetch ministries fallback", e);
  }
  return [];
}

export async function fetchMinistrySchedules(ministryId: string): Promise<any[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/ministries/${ministryId}/schedules?timeframe=upcoming&status=PUBLISHED`, { headers });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.log("Fetch ministry schedules fallback", e);
  }
  return [];
}

export async function joinMinistry(ministryId: string, memberId: string, rolesCsv?: string, notes?: string): Promise<boolean> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/ministries/${ministryId}/volunteers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        member_id: memberId,
        status: 'CANDIDATE',
        roles_csv: rolesCsv,
        notes
      })
    });
    return res.ok;
  } catch (e) {
    console.log("Join ministry error", e);
    return false;
  }
}

export async function fetchMyBlockouts(): Promise<any[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/volunteers/blockouts`, { headers });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.log("Fetch blockouts error", e);
  }
  return [];
}

export async function createBlockout(startDate: string, endDate: string, reason?: string): Promise<boolean> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/volunteers/blockouts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        start_date: startDate,
        end_date: endDate,
        reason
      })
    });
    return res.ok;
  } catch (e) {
    console.log("Create blockout error", e);
    return false;
  }
}

export async function deleteBlockout(id: string): Promise<boolean> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/volunteers/blockouts/${id}`, {
      method: 'DELETE',
      headers
    });
    return res.ok;
  } catch (e) {
    console.log("Delete blockout error", e);
    return false;
  }
}

// ----------------------------------------------------
// 9. SHIFT SWAP (TROCA DE ESCALAS ENTRE MEMBROS)
// ----------------------------------------------------
export async function fetchEligiblePeersForSwap(scheduleId: string, roleId: string): Promise<any[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/volunteers/schedules/eligible-peers?schedule_id=${scheduleId}&role_id=${roleId}`, { headers });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.log("Fetch eligible peers error", e);
  }
  return [];
}

export async function requestRosterSwap(rosterItemId: string, targetMemberId?: string, reason?: string): Promise<{ success: boolean; message?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/volunteers/schedules/roster/${rosterItemId}/swap`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        target_member_id: targetMemberId || undefined,
        reason
      })
    });
    const data = await res.json();
    return { success: res.ok, message: data.message || data.error };
  } catch (e) {
    console.log("Request roster swap error", e);
    return { success: false, message: 'Erro ao enviar pedido de troca' };
  }
}

export async function fetchMyPendingSwaps(): Promise<{ incoming: any[]; outgoing: any[] }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/volunteers/swaps/pending`, { headers });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.log("Fetch pending swaps error", e);
  }
  return { incoming: [], outgoing: [] };
}

export async function respondToSwap(swapId: string, action: 'ACCEPT' | 'REJECT'): Promise<{ success: boolean; message?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/volunteers/swaps/${swapId}/respond`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action })
    });
    const data = await res.json();
    return { success: res.ok, message: data.message || data.error };
  } catch (e) {
    console.log("Respond to swap error", e);
    return { success: false, message: 'Erro ao responder à troca' };
  }
}

export async function cancelRosterSwap(swapId?: string, rosterItemId?: string): Promise<{ success: boolean; message?: string }> {
  try {
    const headers = await getAuthHeaders();
    const url = swapId 
      ? `${API_BASE_URL}/volunteers/swaps/${swapId}/cancel`
      : `${API_BASE_URL}/volunteers/swaps/cancel`;
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ rosterItemId })
    });
    const data = await res.json();
    return { success: res.ok, message: data.message || data.error };
  } catch (e) {
    console.log("Cancel swap error", e);
    return { success: false, message: 'Erro ao cancelar pedido de troca' };
  }
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(await getAuthHeaders());
  new Headers(options.headers).forEach((value, key) => headers.set(key, value));
  return fetch(url, { ...options, headers });
}
