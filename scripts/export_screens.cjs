const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.resolve(__dirname, '../../pwa-screens');

// Limpa arquivos anteriores
if (fs.existsSync(OUTPUT_DIR)) {
  const existingFiles = fs.readdirSync(OUTPUT_DIR);
  for (const f of existingFiles) {
    if (f.endsWith('.png')) {
      fs.unlinkSync(path.join(OUTPUT_DIR, f));
    }
  }
} else {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:5173';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const screensToExport = [
  // 1. Onboarding & Boas-Vindas
  {
    name: '01_welcome_onboarding_light.png',
    title: 'Onboarding & Boas-Vindas (Modo Claro)',
    url: `${BASE_URL}/?tab=profile&theme=light`,
    isGuest: true
  },
  {
    name: '01_welcome_onboarding_dark.png',
    title: 'Onboarding & Boas-Vindas (Modo Escuro)',
    url: `${BASE_URL}/?tab=profile&theme=dark`,
    isGuest: true
  },

  // 2. Home V2
  {
    name: '02_home_v2_light.png',
    title: 'Home V2 (Modo Claro)',
    url: `${BASE_URL}/?demo=true&tab=home&theme=light`
  },
  {
    name: '02_home_v2_dark.png',
    title: 'Home V2 (Modo Escuro)',
    url: `${BASE_URL}/?demo=true&tab=home&theme=dark`
  },

  // 3. Culto ao Vivo
  {
    name: '03_culto_ao_vivo_modal_light.png',
    title: 'Culto ao Vivo Player (Modo Claro)',
    url: `${BASE_URL}/?demo=true&tab=home&live=true&theme=light`
  },
  {
    name: '03_culto_ao_vivo_modal_dark.png',
    title: 'Culto ao Vivo Player (Modo Escuro)',
    url: `${BASE_URL}/?demo=true&tab=home&live=true&theme=dark`
  },

  // 4. Palavra & Devocionais
  {
    name: '04_devocionais_diarios_light.png',
    title: 'Devocionais Diários (Modo Claro)',
    url: `${BASE_URL}/?demo=true&tab=devotionals&theme=light`
  },
  {
    name: '04_devocionais_diarios_dark.png',
    title: 'Devocionais Diários (Modo Escuro)',
    url: `${BASE_URL}/?demo=true&tab=devotionals&theme=dark`
  },
  {
    name: '04_devocionais_estudo_leitor_light.png',
    title: 'Leitor Completo do Estudo da Palavra (Modo Claro)',
    url: `${BASE_URL}/?demo=true&tab=devotionals&reading=true&theme=light`
  },
  {
    name: '04_devocionais_estudo_leitor_dark.png',
    title: 'Leitor Completo do Estudo da Palavra (Modo Escuro)',
    url: `${BASE_URL}/?demo=true&tab=devotionals&reading=true&theme=dark`
  },
  {
    name: '04_devocionais_dias_anteriores_light.png',
    title: 'Histórico de Dias Anteriores (Modo Claro)',
    url: `${BASE_URL}/?demo=true&tab=devotionals&past=true&theme=light`
  },
  {
    name: '04_devocionais_dias_anteriores_dark.png',
    title: 'Histórico de Dias Anteriores (Modo Escuro)',
    url: `${BASE_URL}/?demo=true&tab=devotionals&past=true&theme=dark`
  },

  // 5. Células & Redes
  {
    name: '05_celulas_lista_light.png',
    title: 'Células & Redes: Lista Encontre sua Célula (Modo Claro)',
    url: `${BASE_URL}/?demo=true&tab=cells&cell_portal=false&theme=light`
  },
  {
    name: '05_celulas_lista_dark.png',
    title: 'Células & Redes: Lista Encontre sua Célula (Modo Escuro)',
    url: `${BASE_URL}/?demo=true&tab=cells&cell_portal=false&theme=dark`
  },
  {
    name: '05_celulas_mapa_interativo_light.png',
    title: 'Células: Mapa Interativo de Localização (Modo Claro)',
    url: `${BASE_URL}/?demo=true&tab=cells&cell_portal=false&map=true&theme=light`
  },
  {
    name: '05_celulas_mapa_interativo_dark.png',
    title: 'Células: Mapa Interativo de Localização (Modo Escuro)',
    url: `${BASE_URL}/?demo=true&tab=cells&cell_portal=false&map=true&theme=dark`
  },
  {
    name: '05_celulas_portal_mural_light.png',
    title: 'Dentro da Célula: Mural, Recados & Comunhão (Modo Claro)',
    url: `${BASE_URL}/?demo=true&tab=cells&cell_portal=true&cell_tab=dashboard&theme=light`
  },
  {
    name: '05_celulas_portal_mural_dark.png',
    title: 'Dentro da Célula: Mural, Recados & Comunhão (Modo Escuro)',
    url: `${BASE_URL}/?demo=true&tab=cells&cell_portal=true&cell_tab=dashboard&theme=dark`
  },
  {
    name: '05_celulas_portal_estudos_light.png',
    title: 'Dentro da Célula: Livro de Estudos Bíblicos (Modo Claro)',
    url: `${BASE_URL}/?demo=true&tab=cells&cell_portal=true&cell_tab=estudos&theme=light`
  },
  {
    name: '05_celulas_portal_partilha_light.png',
    title: 'Dentro da Célula: Mesa de Partilha & Lanches (Modo Claro)',
    url: `${BASE_URL}/?demo=true&tab=cells&cell_portal=true&cell_tab=lanches&theme=light`
  },

  // 6. Loja Oficial & Cantina
  {
    name: '06_loja_oficial_lista_light.png',
    title: 'Loja Oficial: Modo Lista (Modo Claro)',
    url: `${BASE_URL}/?demo=true&tab=store&layout=list&theme=light`
  },
  {
    name: '06_loja_oficial_lista_dark.png',
    title: 'Loja Oficial: Modo Lista (Modo Escuro)',
    url: `${BASE_URL}/?demo=true&tab=store&layout=list&theme=dark`
  },
  {
    name: '06_loja_oficial_grade_light.png',
    title: 'Loja Oficial: Modo Grade (Modo Claro)',
    url: `${BASE_URL}/?demo=true&tab=store&layout=grid&theme=light`
  },
  {
    name: '06_loja_oficial_grade_dark.png',
    title: 'Loja Oficial: Modo Grade (Modo Escuro)',
    url: `${BASE_URL}/?demo=true&tab=store&layout=grid&theme=dark`
  },

  // 7. Mural de Oração & Intercessão
  {
    name: '07_mural_de_oracao_light.png',
    title: 'Mural de Oração Comunitário (Modo Claro)',
    url: `${BASE_URL}/?demo=true&view=prayers&theme=light`
  },
  {
    name: '07_mural_de_oracao_dark.png',
    title: 'Mural de Oração Comunitário (Modo Escuro)',
    url: `${BASE_URL}/?demo=true&view=prayers&theme=dark`
  },
  {
    name: '07_oracao_novo_pedido_light.png',
    title: 'Formulário de Novo Pedido de Oração (Modo Claro)',
    url: `${BASE_URL}/?demo=true&view=prayers&new_prayer=true&theme=light`
  },
  {
    name: '07_oracao_novo_pedido_dark.png',
    title: 'Formulário de Novo Pedido de Oração (Modo Escuro)',
    url: `${BASE_URL}/?demo=true&view=prayers&new_prayer=true&theme=dark`
  },

  // 8. Eventos & Cursos
  {
    name: '08_eventos_e_cursos_light.png',
    title: 'Eventos & Cursos (Modo Claro)',
    url: `${BASE_URL}/?demo=true&view=events&event_tab=events&theme=light`
  },
  {
    name: '08_eventos_e_cursos_dark.png',
    title: 'Eventos & Cursos (Modo Escuro)',
    url: `${BASE_URL}/?demo=true&view=events&event_tab=events&theme=dark`
  },
  {
    name: '08_eventos_meus_ingressos_light.png',
    title: 'Meus Ingressos & Passaportes QR (Modo Claro)',
    url: `${BASE_URL}/?demo=true&view=events&event_tab=my_tickets&theme=light`
  },
  {
    name: '08_eventos_meus_ingressos_dark.png',
    title: 'Meus Ingressos & Passaportes QR (Modo Escuro)',
    url: `${BASE_URL}/?demo=true&view=events&event_tab=my_tickets&theme=dark`
  },

  // 9. Contribuições & Dízimos
  {
    name: '09_dizimos_e_contribuicoes_light.png',
    title: 'Dízimos & Ofertas PIX (Modo Claro)',
    url: `${BASE_URL}/?demo=true&view=giving&giving_tab=tithes&theme=light`
  },
  {
    name: '09_dizimos_e_contribuicoes_dark.png',
    title: 'Dízimos & Ofertas PIX (Modo Escuro)',
    url: `${BASE_URL}/?demo=true&view=giving&giving_tab=tithes&theme=dark`
  },
  {
    name: '09_dizimos_campanhas_projetos_light.png',
    title: 'Campanhas & Projetos Especiais (Modo Claro)',
    url: `${BASE_URL}/?demo=true&view=giving&giving_tab=projects&theme=light`
  },
  {
    name: '09_dizimos_campanhas_projetos_dark.png',
    title: 'Campanhas & Projetos Especiais (Modo Escuro)',
    url: `${BASE_URL}/?demo=true&view=giving&giving_tab=projects&theme=dark`
  },

  // 10. Bíblia Sagrada Digital
  {
    name: '10_biblia_sagrada_light.png',
    title: 'Bíblia Sagrada Digital (Modo Claro)',
    url: `${BASE_URL}/?demo=true&view=bible&theme=light`
  },
  {
    name: '10_biblia_sagrada_dark.png',
    title: 'Bíblia Sagrada Digital (Modo Escuro)',
    url: `${BASE_URL}/?demo=true&view=bible&theme=dark`
  },

  // 11. Perfil do Membro & Liderança
  {
    name: '11_perfil_membro_light.png',
    title: 'Perfil Digital do Membro & Carteirinha (Modo Claro)',
    url: `${BASE_URL}/?demo=true&tab=profile&theme=light`
  },
  {
    name: '11_perfil_membro_dark.png',
    title: 'Perfil Digital do Membro & Carteirinha (Modo Escuro)',
    url: `${BASE_URL}/?demo=true&tab=profile&theme=dark`
  }
];

async function main() {
  console.log('🚀 Iniciando Exportador de Telas Completo (Light & Dark + Funcionalidades Profundas)...');
  console.log(`📁 Destino: ${OUTPUT_DIR}`);
  console.log(`📊 Total de telas planejadas: ${screensToExport.length}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=393,852'
    ]
  });

  const page = await browser.newPage();

  // Emula display do iPhone 15 Pro (393 x 852 @ 2x = 786 x 1704 px crisp PNG)
  await page.setViewport({
    width: 393,
    height: 852,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  for (let i = 0; i < screensToExport.length; i++) {
    const item = screensToExport[i];
    console.log(`📸 [${i + 1}/${screensToExport.length}] Capturando ${item.title} -> ${item.name}...`);

    try {
      if (item.isGuest) {
        await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
        await page.evaluate(() => {
          sessionStorage.clear();
          localStorage.clear();
        });
      }

      await page.goto(item.url, { waitUntil: 'networkidle2' });
      await sleep(1800);

      const filePath = path.join(OUTPUT_DIR, item.name);
      await page.screenshot({ path: filePath, fullPage: false });
    } catch (err) {
      console.warn(`⚠️ Erro ao capturar ${item.name}:`, err.message);
    }
  }

  await browser.close();
  console.log('✨ Exportação do PWA finalizada com sucesso! Todas as ' + screensToExport.length + ' telas salvas em: ' + OUTPUT_DIR);
}

main().catch(err => {
  console.error('❌ Erro na execução:', err);
  process.exit(1);
});
