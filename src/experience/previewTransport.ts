// Runs exclusively inside the editor iframe, before any app/provider is mounted.
// It never reads the member's storage or delegates requests to the production APIs.
export function installPreviewTransport() {
  const storage = () => {
    const values = new Map<string, string>();
    return {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => {
        values.set(k, String(v));
      },
      removeItem: (k: string) => {
        values.delete(k);
      },
      clear: () => values.clear(),
      key: (i: number) => [...values.keys()][i] ?? null,
      get length() {
        return values.size;
      },
    };
  };
  Object.defineProperty(window, "localStorage", {
    value: storage(),
    configurable: true,
  });
  Object.defineProperty(window, "sessionStorage", {
    value: storage(),
    configurable: true,
  });
  localStorage.setItem("faithhub_active_org_id", "org_preview");
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
      location.href,
    );
    const method =
      init?.method || (input instanceof Request ? input.method : "GET");
    if (method.toUpperCase() !== "GET")
      return new Response(
        JSON.stringify({
          message: "Ações operacionais desativadas na prévia.",
        }),
        { status: 405, headers: { "Content-Type": "application/json" } },
      );
    let body: any = [];
    const path = url.pathname;
    const devotional = {
      id: "preview-devotional",
      title: "Uma palavra para a sua semana",
      passage: "Salmos 23:1",
      verse_text: "O Senhor é o meu pastor.",
      content:
        "Mensagem de demonstração para visualizar a identidade da igreja.",
      author: "Equipe pastoral",
      date: new Date().toISOString(),
      cover_url: "",
    };
    if (path.includes("campuses"))
      body = [
        { id: "campus_preview", name: "Sede", organization_id: "org_preview" },
      ];
    else if (path.includes("/members/me"))
      body = {
        data: {
          id: "preview-member",
          name: "Pessoa de demonstração",
          email: "demonstracao@example.test",
          role: "MEMBER",
          organization_id: "org_preview",
        },
      };
    else if (path.includes("today")) body = devotional;
    else if (path.includes("devotional")) body = [devotional];
    else if (path.includes("broadcast") && path.includes("active")) body = null;
    else if (path.includes("events"))
      body = [
        {
          id: "preview-event",
          title: "Encontro da comunidade",
          description: "Evento de demonstração",
          event_date: new Date(Date.now() + 86400000 * 7).toISOString(),
          date: new Date(Date.now() + 86400000 * 7).toISOString(),
          location: "Sede",
          is_free: 1,
          status: "PUBLISHED",
          lots: [],
        },
      ];
    else if (path.includes("pdv/products"))
      body = [
        {
          id: "preview-product",
          name: "Livro da comunidade",
          description: "Produto de demonstração",
          price: 35,
          stock: 12,
          category: "Livros",
          is_active: 1,
        },
      ];
    else if (path.includes("cell-groups"))
      body = [
        {
          id: "preview-cell",
          name: "Grupo Esperança",
          leader_name: "Equipe da igreja",
          day_of_week: "Quarta-feira",
          time: "19:30",
          neighborhood: "Centro",
          latitude: -23.55,
          longitude: -46.63,
        },
      ];
    else if (path.includes("bible") || path.includes("verse"))
      body = path.endsWith(".json")
        ? []
        : {
            text: "O Senhor é o meu pastor.",
            reference: "Salmos 23:1",
            data: [],
          };
    else if (path.includes("swaps")) body = { incoming: [], outgoing: [] };
    else if (
      path.includes("kids") ||
      path.includes("notifications") ||
      path.includes("prayers")
    )
      body = { data: [], children: [], notifications: [], requests: [] };
    else if (path.includes("analytics")) body = { data: [] };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}
