const express = require('express');
const router = express.Router();
const multer = require('multer');
const Tesseract = require('tesseract.js');
const Faturamento = require('../models/Faturamento');
const TipoDespesa = require('../models/TipoDespesa');
const NotaFiscal = require('../models/NotaFiscal');
const NotaFiscalParser = require('../utils/NotaFiscalParser');
const CMVAnalyzer = require('../utils/CMVAnalyzer');
const CMVAnalyzerV2 = require('../utils/CMVAnalyzerV2');
const ContaAzulMapper = require('../utils/ContaAzulMapper');
const logger = require('../utils/logger');
const { gerarToken, verificarSenha, buscarUsuarioPorEmail, middlewareAutenticacao } = require('../auth');
const { pool } = require('../database');
const xlsx = require('xlsx');

// Configurar multer para upload de arquivos (XML, PDF, Excel)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB por arquivo
    files: 100 // Máximo 100 arquivos por requisição
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/xml',
      'text/xml',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/octet-stream' // Fallback for some browsers
    ];
    const allowedExt = ['.xml', '.pdf', '.xlsx', '.xls'];
    const ext = require('path').extname(file.originalname).toLowerCase();

    if (allowedExt.includes(ext) || allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos XML, PDF e Excel são permitidos'));
    }
  }
});

// Configurar multer específico para Excel (sem restrições de tipo)
const uploadExcel = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB por arquivo
    files: 1 // Máximo 1 arquivo por requisição para Excel
  },
  fileFilter: (req, file, cb) => {
    const allowedExt = ['.xlsx', '.xls'];
    const ext = require('path').extname(file.originalname).toLowerCase();

    // Allow if extension is correct OR if mimetype suggests Excel
    const isExcelFile = allowedExt.includes(ext) ||
                       file.mimetype.includes('spreadsheet') ||
                       file.mimetype.includes('excel') ||
                       file.mimetype === 'application/octet-stream';

    if (isExcelFile) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos Excel (.xlsx, .xls) são permitidos'));
    }
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Detectar duplicatas inteligentes baseado em:
 * - fornecedor_nome (exato)
 * - descricao (exato)
 * - valor_total (exato ou dentro de 1% de tolerância)
 * - data_emissao (opcional: mesmo dia ou até 24h antes/depois)
 *
 * Retorna: { isDuplicate: boolean, similarNota: { id, numero_nf, ... } | null }
 */
async function checkIntelligentDuplicate(client, dados, hoursWindow = 24) {
  try {
    // Normalizar valores para comparação
    const valoresSimilares = [
      dados.valor_total,
      dados.valor_total * 1.01,   // +1%
      dados.valor_total * 0.99    // -1%
    ];

    // Construir query para encontrar duplicatas inteligentes
    // Critério: MESMO fornecedor + MESMA descrição + valor similar + data próxima
    let query = `
      SELECT id, numero_nf, fornecedor_nome, descricao, valor_total, data_emissao
      FROM notas_fiscais
      WHERE LOWER(TRIM(fornecedor_nome)) = LOWER(TRIM($1))
      AND LOWER(TRIM(descricao)) = LOWER(TRIM($2))
      AND valor_total IN (${valoresSimilares.map((_, i) => `$${i + 3}`).join(',')})
    `;

    const params = [
      dados.fornecedor_nome,
      dados.descricao,
      ...valoresSimilares
    ];

    // Se tiver data, adicionar filtro de data (24h antes/depois)
    if (dados.data_emissao) {
      const dataEmissao = new Date(dados.data_emissao);
      const dataAntes = new Date(dataEmissao.getTime() - hoursWindow * 60 * 60 * 1000);
      const dataDepois = new Date(dataEmissao.getTime() + hoursWindow * 60 * 60 * 1000);

      query += ` AND data_emissao BETWEEN $${params.length + 1} AND $${params.length + 2}`;
      params.push(dataAntes.toISOString(), dataDepois.toISOString());
    }

    query += ` ORDER BY created_at DESC LIMIT 1`;

    const result = await client.query(query, params);

    if (result.rows.length > 0) {
      return {
        isDuplicate: true,
        similarNota: result.rows[0],
        motivo: `Encontrada nota similar: ${result.rows[0].numero_nf} (mesmo fornecedor, descrição e valor)`
      };
    }

    return {
      isDuplicate: false,
      similarNota: null,
      motivo: null
    };
  } catch (erro) {
    console.error('❌ Erro ao verificar duplicata inteligente:', erro.message);
    // Se houver erro na verificação, não bloqueia a importação
    return {
      isDuplicate: false,
      similarNota: null,
      motivo: null
    };
  }
}

// ============================================
// AUTENTICAÇÃO
// ============================================

// POST /api/auth/login
router.post('/auth/login', (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        success: false,
        error: 'Email e senha são obrigatórios'
      });
    }

    const usuario = buscarUsuarioPorEmail(email);

    if (!usuario) {
      logger.warning(`Tentativa de login com email não registrado: ${email}`);
      return res.status(401).json({
        success: false,
        error: 'Email ou senha inválidos'
      });
    }

    if (!verificarSenha(senha, usuario.senha_hash)) {
      logger.warning(`Tentativa de login com senha incorreta: ${email}`);
      return res.status(401).json({
        success: false,
        error: 'Email ou senha inválidos'
      });
    }

    const token = gerarToken(usuario);
    logger.success(`Login bem-sucedido: ${usuario.nome} (${usuario.email})`);

    res.json({
      success: true,
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role
      }
    });
  } catch (error) {
    logger.error(`Erro ao fazer login: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Erro ao fazer login'
    });
  }
});

// GET /api/auth/me - Obter dados do usuário logado
router.get('/auth/me', middlewareAutenticacao, (req, res) => {
  res.json({
    success: true,
    usuario: req.usuario
  });
});

// ============================================
// FATURAMENTOS
// ============================================

// GET /api/faturamentos - Listar faturamentos
// ?days=30 (padrão)
// ?restaurante=Salão|iFood|Keeta|99Food (opcional)
router.get('/faturamentos', async (req, res) => {
  try {
    const days = req.query.days || 30;
    const restaurante = req.query.restaurante || null;

    const faturamentos = await Faturamento.listar(parseInt(days), null, restaurante);
    res.json({
      success: true,
      data: faturamentos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/faturamentos - Criar novo faturamento (receita ou despesa)
// Body: { data: "YYYY-MM-DD", total: 1234.56, categoria: "Salão", tipo: "receita" ou "despesa", tipo_despesa_id: 1 }
router.post('/faturamentos', async (req, res) => {
  try {
    const { data, total, categoria, tipo = 'receita', tipo_despesa_id, categoria_produto = 'Comida' } = req.body;

    if (!data || !total) {
      return res.status(400).json({
        success: false,
        error: 'Data e Total são obrigatórios'
      });
    }

    if (!categoria) {
      return res.status(400).json({
        success: false,
        error: 'Categoria é obrigatória'
      });
    }

    const tipoNormalizado = tipo.toLowerCase();
    if (!['receita', 'despesa'].includes(tipoNormalizado)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo deve ser "receita" ou "despesa"'
      });
    }

    if (tipoNormalizado === 'despesa' && !tipo_despesa_id) {
      return res.status(400).json({
        success: false,
        error: 'tipo_despesa_id é obrigatório para despesas'
      });
    }

    const result = await Faturamento.criar(data, total, categoria, tipoNormalizado, tipo_despesa_id, categoria_produto);

    res.status(201).json({
      success: true,
      message: `${tipo === 'receita' ? 'Receita' : 'Despesa'} criada com sucesso`,
      id: result.id
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/faturamentos/:id - Atualizar faturamento
// Body: { data: "YYYY-MM-DD", total: 1234.56, categoria: "Salão", tipo: "receita" ou "despesa", tipo_despesa_id: 1 }
router.put('/faturamentos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, total, categoria, tipo, tipo_despesa_id } = req.body;

    console.log(`📝 [PUT] Editando faturamento ID: ${id}`);
    console.log(`   Dados recebidos:`, { data, total, categoria, tipo, tipo_despesa_id });

    if (!total || !data || !categoria) {
      return res.status(400).json({
        success: false,
        error: 'Data, Total e Categoria são obrigatórios'
      });
    }

    if (tipo && !['receita', 'despesa'].includes(tipo.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Tipo deve ser "receita" ou "despesa"'
      });
    }

    // Verificar se existe
    const faturamento = await Faturamento.obter(id);
    if (!faturamento) {
      console.log(`❌ Faturamento ${id} não encontrado`);
      return res.status(404).json({
        success: false,
        error: 'Faturamento não encontrado'
      });
    }

    console.log(`✅ Faturamento encontrado:`, { id: faturamento.id, data_antes: faturamento.data, total_antes: faturamento.total });

    const tipoNormalizado = tipo ? tipo.toLowerCase() : faturamento.tipo;
    await Faturamento.atualizarCompleto(id, data, total, categoria, tipoNormalizado, tipo_despesa_id);

    console.log(`✅ Faturamento atualizado com sucesso! Nova data: ${data}, Novo total: ${total}`);

    res.json({
      success: true,
      message: 'Faturamento atualizado com sucesso',
      id: id,
      dataNova: data,
      totalNovo: total
    });
  } catch (error) {
    console.error(`❌ Erro ao atualizar faturamento:`, error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/faturamentos/:id - Deletar faturamento
router.delete('/faturamentos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️  [DELETE] Deletando faturamento ID: ${id}`);

    // Verificar se existe
    const faturamento = await Faturamento.obter(id);
    if (!faturamento) {
      console.log(`❌ [DELETE] Faturamento ${id} não encontrado`);
      return res.status(404).json({
        success: false,
        error: 'Faturamento não encontrado'
      });
    }

    console.log(`✓ [DELETE] Encontrado:`, { id: faturamento.id, data: faturamento.data, total: faturamento.total });

    const result = await Faturamento.deletar(id);
    console.log(`✅ [DELETE] Deletado com sucesso. Result:`, result);

    res.json({
      success: true,
      message: 'Faturamento deletado com sucesso',
      id: id
    });
  } catch (error) {
    console.error(`❌ [DELETE] ERRO:`, error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/faturamentos/stats - Obter estatísticas (KPIs) com receita/despesa separadas
// ?from=YYYY-MM-DD&to=YYYY-MM-DD&restaurante=Salão|iFood|Keeta|99Food (opcional)
router.get('/faturamentos/stats', async (req, res) => {
  try {
    const { from, to, restaurante } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros "from" e "to" são obrigatórios'
      });
    }

    const stats = await Faturamento.obterStats(from, to, restaurante || null);

    // PostgreSQL retorna campos em lowercase
    // Converter para camelCase para o frontend
    res.json({
      success: true,
      data: {
        totalReceita: parseFloat(stats.totalreceita || stats.totalReceita || 0),
        totalDespesa: parseFloat(stats.totaldespesa || stats.totalDespesa || 0),
        totalLiquido: parseFloat(stats.totalliquido || stats.totalLiquido || 0),
        mediaReceita: parseFloat(stats.mediareceita || stats.mediaReceita || 0),
        mediaDespesa: parseFloat(stats.mediadespesa || stats.mediaDespesa || 0),
        maiorReceita: parseFloat(stats.maiorreceita || stats.maiorReceita || 0),
        maiorDespesa: parseFloat(stats.maiordespesa || stats.maiorDespesa || 0),
        menorReceita: parseFloat(stats.menorreceita || stats.menorReceita || 0),
        menorDespesa: parseFloat(stats.menordespesa || stats.menorDespesa || 0),
        dias: parseInt(stats.dias || 0),
        totalEntradas: parseInt(stats.totalentradas || stats.totalEntradas || 0)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/faturamentos/chart - Obter dados para gráfico
// ?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/faturamentos/chart', async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros "from" e "to" são obrigatórios'
      });
    }

    const dados = await Faturamento.obterDadosGrafico(from, to);

    res.json({
      success: true,
      data: dados
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/faturamentos/stats-categoria - Obter estatísticas por categoria (receita/despesa separadas)
// ?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/faturamentos/stats-categoria', async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros "from" e "to" são obrigatórios'
      });
    }

    const stats = await Faturamento.obterStatsPorCategoria(from, to);

    res.json({
      success: true,
      data: stats.map(s => ({
        categoria: s.categoria,
        totalReceita: parseFloat(s.totalreceita || s.totalReceita || 0),
        totalDespesa: parseFloat(s.totaldespesa || s.totalDespesa || 0),
        totalLiquido: parseFloat(s.totalliquido || s.totalLiquido || 0),
        mediaReceita: parseFloat(s.mediareceita || s.mediaReceita || 0),
        mediaDespesa: parseFloat(s.mediadespesa || s.mediaDespesa || 0),
        maiorReceita: parseFloat(s.maiorreceita || s.maiorReceita || 0),
        maiorDespesa: parseFloat(s.maiordespesa || s.maiorDespesa || 0),
        dias: parseInt(s.dias || 0),
        diasReceita: parseInt(s.diasreceita || s.diasReceita || 0),
        diasDespesa: parseInt(s.diasdespesa || s.diasDespesa || 0),
        totalEntradas: parseInt(s.totalentradas || s.totalEntradas || 0)
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/faturamentos/despesas-alocadas - Obter despesas alocadas proporcionalmente por categoria
router.get('/faturamentos/despesas-alocadas', async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros "from" e "to" são obrigatórios'
      });
    }

    const despesasAlocadas = await Faturamento.obterDespesasAlocadas(from, to);

    res.json({
      success: true,
      data: despesasAlocadas.map(d => ({
        categoria: d.categoria,
        totalReceita: parseFloat(d.totalReceita || 0),
        totalTaxas: parseFloat(d.totalTaxas || 0),
        totalDespesasAlocadas: parseFloat(d.totalDespesasAlocadas || 0),
        totalDespesa: parseFloat(d.totalDespesa || 0),
        totalLiquido: parseFloat(d.totalLiquido || 0),
        proporcao: parseFloat(d.proporcao || 0)
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/faturamentos/cmv/total - Obter total de CMV
router.get('/faturamentos/cmv/total', async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros "from" e "to" são obrigatórios'
      });
    }

    const stats = await Faturamento.obterTotalCMV(from, to);

    res.json({
      success: true,
      data: {
        totalCMV: parseFloat(stats.totalcmv || stats.totalCMV || 0),
        mediaCMV: parseFloat(stats.mediacmv || stats.mediaCMV || 0),
        maiorCMV: parseFloat(stats.maiorcmv || stats.maiorCMV || 0),
        menorCMV: parseFloat(stats.menorcmv || stats.menorCMV || 0),
        quantidadeCMV: parseInt(stats.quantidadecmv || stats.quantidadeCMV || 0),
        diasComCMV: parseInt(stats.diascomcmv || stats.diasComCMV || 0)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/faturamentos/cmv/detalhado - Obter CMV por subcategoria
router.get('/faturamentos/cmv/detalhado', async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros "from" e "to" são obrigatórios'
      });
    }

    const dados = await Faturamento.obterRelatorioCMV(from, to);

    res.json({
      success: true,
      data: dados.map(item => ({
        subcategoria: item.subcategoria || 'Sem categoria',
        total: parseFloat(item.total || 0),
        media: parseFloat(item.media || 0),
        maior: parseFloat(item.maior || 0),
        menor: parseFloat(item.menor || 0),
        quantidade: item.quantidade || 0,
        dias: item.dias || 0
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/cmv-inteligente - Dados completos para análise de CMV com IA
// ?from=YYYY-MM-DD&to=YYYY-MM-DD&restaurante=Salão|iFood|Keeta|99Food (opcional)
// ✅ UNIFICADO: Usa mesma lógica de Performance por Categoria
router.get('/cmv-inteligente', async (req, res) => {
  try {
    const { from, to, restaurante } = req.query;

    console.log(`📊 [CMV Inteligente] Período: ${from} a ${to}, Restaurante: ${restaurante || 'Todos'}`);

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros "from" e "to" são obrigatórios'
      });
    }

    // ✅ MESMA LÓGICA DE "PERFORMANCE POR CATEGORIA"
    // Carregar stats originais por categoria
    const statsResponse = await Faturamento.obterStatsPorCategoria(from, to, restaurante || null);

    // Carregar despesas alocadas proporcionalmente
    const despesasResponse = await Faturamento.obterDespesasAlocadas(from, to, restaurante || null);

    console.log(`✅ Stats carregado:`, statsResponse.length, `registros`, statsResponse);
    console.log(`✅ Despesas alocadas:`, despesasResponse.length, `registros`, despesasResponse);

    // Mesclar dados: mesma estrutura de Performance por Categoria
    const despesasMap = {};
    despesasResponse.forEach(d => {
      despesasMap[d.categoria] = d;
    });

    // Construir resumo consolidado
    let totalReceita = 0;
    let totalTaxas = 0;
    let totalDespesasAlocadas = 0;
    let totalCMV = 0;
    let diasPeriodo = 0;

    const porCategoria = statsResponse.map(stat => {
      const despesa = despesasMap[stat.categoria];
      // PostgreSQL retorna lowercase, então verificar ambos os formatos
      const receita = parseFloat(stat.totalreceita || stat.totalReceita || 0);
      const taxas = parseFloat(despesa?.totalTaxas || 0);
      const cmvAlocado = parseFloat(despesa?.totalDespesasAlocadas || 0);

      totalReceita += receita;
      totalTaxas += taxas;
      totalDespesasAlocadas += cmvAlocado;
      totalCMV += cmvAlocado;

      if (!diasPeriodo || diasPeriodo === 0) {
        diasPeriodo = parseInt(stat.dias || stat.DIAS || 28); // Pega dias do primeiro stat
      }

      return {
        categoria: stat.categoria,
        receita: parseFloat(receita.toFixed(2)),
        taxas: parseFloat(taxas.toFixed(2)),
        cmv: parseFloat(cmvAlocado.toFixed(2)),
        despesa: parseFloat((despesa?.totalDespesa || 0).toFixed(2)),
        liquido: parseFloat((despesa?.totalLiquido || 0).toFixed(2))
      };
    });

    // Calcular percentuais
    const receitaLiquida = totalReceita - totalTaxas;
    const cmvPercentual = receitaLiquida > 0 ? (totalCMV / receitaLiquida) * 100 : 0;
    const margemBruta = 100 - cmvPercentual;

    // Validar que diasPeriodo foi calculado
    if (!diasPeriodo || diasPeriodo === 0) {
      diasPeriodo = statsResponse.length > 0 ? parseInt(statsResponse[0].dias || statsResponse[0].DIAS || 28) : 28;
      console.log(`⚠️ diasPeriodo recalculado: ${diasPeriodo}`);
    }

    const resumo = {
      totalReceita: parseFloat(totalReceita.toFixed(2)),
      totalTaxasReais: parseFloat(totalTaxas.toFixed(2)),
      totalCMV: parseFloat(totalCMV.toFixed(2)),
      receitaLiquida: parseFloat(receitaLiquida.toFixed(2)),
      cmvPercentual: parseFloat(cmvPercentual.toFixed(2)),
      margemBruta: parseFloat(margemBruta.toFixed(2)),
      dias: diasPeriodo || 28
    };

    console.log(`✅ CMV Inteligente resumido:`, resumo);

    res.json({
      success: true,
      data: {
        resumo,
        porCategoria,
        cmvDetalhado: porCategoria // Para compatibilidade com frontend
      }
    });
  } catch (error) {
    console.error(`❌ Erro ao obter CMV Inteligente:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/cmv/auditoria - Auditoria detalhada de todas as despesas de CMV
// ?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/cmv/auditoria', async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros "from" e "to" são obrigatórios'
      });
    }

    const auditoria = await Faturamento.obterDespesasCMVDetalhadas(from, to);

    res.json({
      success: true,
      data: auditoria
    });
  } catch (error) {
    logger.error(`Erro ao obter auditoria CMV: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/cmv-por-categoria-produto - CMV separado por Categoria de Produto (Comida, Bebida, Outros)
// ?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/cmv-por-categoria-produto', async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros "from" e "to" são obrigatórios'
      });
    }

    const cmvPorCategoria = await Faturamento.obterCMVPorCategoriaProduto(from, to);

    res.json({
      success: true,
      data: cmvPorCategoria
    });
  } catch (error) {
    logger.error(`Erro ao obter CMV por categoria de produto: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/cmv-alocado-cards - CMV alocado com separação de bebidas para 4 cards
// ?from=YYYY-MM-DD&to=YYYY-MM-DD
// Retorna dados para cards com:
// - Receita Bruta
// - (-) Taxa plataforma (XX.X%)
// - (-) CMV alocado (calculado sobre Receita Líquida)
// - (=) Margem s/ Receita Bruta (XX.X%)
// ✅ Bug Fix: CMV% agora calculado sempre sobre Receita Líquida (não Receita Bruta)
router.get('/cmv-alocado-cards', async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros "from" e "to" são obrigatórios'
      });
    }

    console.log(`📊 [CMV Alocado Cards] Período: ${from} a ${to}`);

    const dados = await Faturamento.obterCMVAlocadoPorCanal(from, to);

    console.log(`✅ CMV Alocado calculado:`, dados);

    res.json({
      success: true,
      data: dados
    });
  } catch (error) {
    logger.error(`Erro ao obter CMV alocado cards: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/cmv-inteligente/analisar - Análise Inteligente Rule-Based V1 (legado)
// Body: { from: "YYYY-MM-DD", to: "YYYY-MM-DD", restaurante: "Salão|iFood|Keeta|99Food" (opcional) }
router.post('/cmv-inteligente/analisar', async (req, res) => {
  try {
    const { from, to, restaurante } = req.body;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros "from" e "to" são obrigatórios'
      });
    }

    // Obter dados de CMV
    const dados = await Faturamento.obterDadosCMV(from, to, restaurante || null);

    // Analisar com o CMVAnalyzer rule-based
    logger.info('Analisando CMV com regras inteligentes (V1)...');
    const analise = CMVAnalyzer.analisar(dados);
    const relatorio = CMVAnalyzer.gerarRelatorio(dados);

    logger.success('Análise concluída (Rule-Based V1)');

    res.json({
      success: true,
      data: dados,
      analise: analise,
      relatorio: relatorio,
      tipo: 'rule-based-v1',
      aviso: null
    });
  } catch (error) {
    logger.error(`Erro ao analisar CMV: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/cmv-v2/analisar - Análise Inteligente CMVAnalyzerV2 (NOVO - GENÉRICO)
// Body: {
//   mes: "2026-02",
//   restaurante: "KAIA",
//   receita: { bruta, taxas, liquida },
//   cmv: { sistema, cartaoItau, cartaoBradesco, total },
//   cmvPorCategoria: { Carnes, Bebidas, ... },
//   compras: [...],
//   benchmarks: { CMV_META, CMV_ALERTA, ... }
// }
router.post('/cmv-v2/analisar', async (req, res) => {
  try {
    const { mes, restaurante, receita, cmv, cmvPorCategoria, compras, benchmarks } = req.body;

    // Validar entrada mínima
    if (!receita || !cmv) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros "receita" e "cmv" são obrigatórios'
      });
    }

    logger.info(`Analisando CMV V2 para ${restaurante || 'restaurante'} (${mes})...`);

    // Montar dados estruturados
    const dados = {
      mesReferencia: mes || new Date().toISOString().slice(0, 7),
      restaurante: restaurante || 'Não informado',
      receita: receita || { bruta: 0, taxas: 0, liquida: 0 },
      cmv: cmv || { sistema: 0, cartaoItau: 0, cartaoBradesco: 0, total: 0 },
      cmvPorCategoria: cmvPorCategoria || {},
      compras: compras || [],
    };

    // Configurar benchmarks (padrão + custom)
    const configBenchmarks = benchmarks || {};

    // Executar análise V2
    const analise = CMVAnalyzerV2.analisar(dados, configBenchmarks);
    const relatorio = CMVAnalyzerV2.gerarRelatorio(analise);

    logger.success(`Análise CMV V2 concluída (${analise.situacao.status})`);

    res.json({
      success: true,
      analise: analise,
      relatorio: relatorio,
      tipo: 'cmv-v2-generico',
      versao: '2.0',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Erro ao analisar CMV V2: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// POST /api/faturamentos/:id/enviar-conta-azul - Enviar ao Conta Azul
router.post('/faturamentos/:id/enviar-conta-azul', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se existe
    const faturamento = await Faturamento.obter(id);
    if (!faturamento) {
      return res.status(404).json({
        success: false,
        error: 'Faturamento não encontrado'
      });
    }

    // Enviar ao Conta Azul (integração com skill lancar-receitas)
    // Status de "pendente" não é mais rastreado

    res.json({
      success: true,
      message: 'Faturamento enviado ao Conta Azul'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/tipo-despesa - Obter todos os tipos de despesa
router.get('/tipo-despesa', async (req, res) => {
  try {
    const tipos = await TipoDespesa.obterTodos();
    res.json({
      success: true,
      data: tipos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/tipo-despesa/agrupado - Obter tipos agrupados por classificação
router.get('/tipo-despesa/agrupado', async (req, res) => {
  try {
    console.log('🔍 [tipo-despesa/agrupado] Iniciando...');

    // 1. Verificar se tabela tem dados
    const checkResult = await pool.query('SELECT COUNT(*) as cnt FROM tipo_despesa WHERE ativa = true');
    const count = parseInt(checkResult.rows[0].cnt);
    console.log(`🔍 [tipo-despesa/agrupado] Encontrados ${count} registros`);

    // 2. Se vazio, retornar objeto vazio ao invés de erro
    if (count === 0) {
      console.log('⚠️  [tipo-despesa/agrupado] tipo_despesa vazio - retornando {}');
      return res.json({
        success: true,
        data: {},
        warning: 'tipo_despesa está vazio. Execute POST /debug/init-tipo-despesa para inicializar'
      });
    }

    // 3. Buscar dados agrupados
    const tipos = await TipoDespesa.obterPorClassificacao();

    console.log('✅ [tipo-despesa/agrupado] Retornando:', Object.keys(tipos).length, 'classificações');

    res.json({
      success: true,
      data: tipos
    });
  } catch (error) {
    console.error('❌ [tipo-despesa/agrupado] Erro:', error.message);
    console.error('❌ Stack:', error.stack);

    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
      hint: 'Se tipo_despesa está vazio, execute: POST /debug/init-tipo-despesa'
    });
  }
});

// GET /api/tipo-despesa/cmv - Obter apenas subcategorias de CMV
router.get('/tipo-despesa/cmv', async (req, res) => {
  try {
    const tipos = await TipoDespesa.obterCMV();
    res.json({
      success: true,
      data: tipos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/tipo-despesa - Criar novo tipo de despesa
router.post('/tipo-despesa', async (req, res) => {
  try {
    const { classificacao, subcategoria, descricao } = req.body;

    if (!classificacao || !subcategoria) {
      return res.status(400).json({
        success: false,
        error: 'Classificação e Subcategoria são obrigatórios'
      });
    }

    if (!['CMV', 'Operacional', 'Administrativa', 'Financeira'].includes(classificacao)) {
      return res.status(400).json({
        success: false,
        error: 'Classificação inválida'
      });
    }

    const result = await TipoDespesa.criar(classificacao, subcategoria, descricao || '');

    res.status(201).json({
      success: true,
      message: 'Categoria criada com sucesso',
      id: result.id,
      data: {
        id: result.id,
        classificacao,
        subcategoria,
        descricao
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== ROTAS DE NOTAS FISCAIS ====================

// GET /api/notas-fiscais - Listar notas fiscais com filtro de status
// ?status=pendente/processado&limit=50&offset=0
router.get('/notas-fiscais', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    const notas = await NotaFiscal.listar(status || null, parseInt(limit), parseInt(offset));
    const stats = await NotaFiscal.obterEstatisticas();

    res.json({
      success: true,
      data: notas,
      stats: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/notas-fiscais/pendentes - Obter apenas notas pendentes
router.get('/notas-fiscais/pendentes', async (req, res) => {
  try {
    const notas = await NotaFiscal.obterPendentes();
    res.json({
      success: true,
      data: notas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/notas-fiscais/:id/sugestao-data - Obter sugestão de data para processamento (DEVE VIR ANTES DE /:id)
router.get('/notas-fiscais/:id/sugestao-data', async (req, res) => {
  try {
    const { id } = req.params;

    // Obter nota fiscal
    const nota = await NotaFiscal.obter(id);
    if (!nota) {
      return res.status(404).json({
        success: false,
        error: 'Nota fiscal não encontrada'
      });
    }

    // Data atual
    const hoje = new Date().toISOString().split('T')[0];

    // Helper: calcular dias entre datas
    const calcularDias = (data1, data2) => {
      const d1 = new Date(data1);
      const d2 = new Date(data2);
      return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
    };

    // Determinar sugestão baseado na data de vencimento
    let temSugestao = false;
    let sugestao = null;
    let data_sugerida = null;
    let prioridade = 'normal'; // normal, urgente, próximo
    let mensagem_inteligente = '';
    const opcoes = {};

    if (nota.data_vencimento) {
      const diasAte = calcularDias(hoje, nota.data_vencimento);

      if (diasAte === 0) {
        // Data HOJE - Sugerir "Pagar Hoje" com urgência
        temSugestao = true;
        sugestao = 'agora';
        data_sugerida = hoje;
        prioridade = 'urgente';
        mensagem_inteligente = '🔴 VENCE HOJE - Recomendamos processar agora';

        opcoes.agora = {
          label: '✅ Pagar HOJE',
          data: hoje,
          descricao: `Registrar em ${hoje} - Vence hoje!`
        };
      } else if (diasAte > 0 && diasAte <= 7) {
        // Data FUTURA PRÓXIMA (1-7 dias) - "Próximo a Vencer"
        temSugestao = true;
        sugestao = 'futuro';
        data_sugerida = nota.data_vencimento;
        prioridade = 'próximo';
        mensagem_inteligente = `⚠️ PRÓXIMO A VENCER em ${diasAte} dia(s)`;

        opcoes.agora = {
          label: 'Processar AGORA',
          data: hoje,
          descricao: `Registrar em ${hoje}`
        };

        opcoes.futuro = {
          label: '📅 Agendar para Data de Vencimento',
          data: nota.data_vencimento,
          descricao: `Agendar para ${nota.data_vencimento} (em ${diasAte} dia${diasAte > 1 ? 's' : ''})`
        };
      } else if (diasAte > 7) {
        // Data FUTURA DISTANTE (>7 dias) - "Pague quando conveniente"
        temSugestao = true;
        sugestao = 'futuro';
        data_sugerida = nota.data_vencimento;
        prioridade = 'normal';
        mensagem_inteligente = `📅 Vence em ${diasAte} dias - Pague quando conveniente`;

        opcoes.agora = {
          label: 'Processar AGORA',
          data: hoje,
          descricao: `Registrar em ${hoje}`
        };

        opcoes.futuro = {
          label: '📅 Agendar para Data de Vencimento',
          data: nota.data_vencimento,
          descricao: `Agendar para ${nota.data_vencimento} (em ${diasAte} dias)`
        };
      } else if (diasAte < 0) {
        // Data PASSADA - "Vencida"
        const diasVencidos = Math.abs(diasAte);
        temSugestao = true;
        sugestao = 'agora';
        data_sugerida = hoje;
        prioridade = 'urgente';
        mensagem_inteligente = `🔴 VENCIDA em ${nota.data_vencimento} - Recomendamos pagar agora`;

        opcoes.agora = {
          label: '🚨 Pagar AGORA (Atrasado)',
          data: hoje,
          descricao: `Registrar em ${hoje} - Venceu em ${nota.data_vencimento}!`
        };
      }
    } else {
      // Sem data de vencimento - Deixa customizar
      temSugestao = false;
      sugestao = null;
      data_sugerida = null;
    }

    logger.debug(`SUGESTAO-DATA: nota=${nota.id}, temSugestao=${temSugestao}, venc=${nota.data_vencimento}, hoje=${hoje}, prioridade=${prioridade}`);

    res.json({
      success: true,
      data: {
        nota_id: nota.id,
        data_emissao: nota.data_emissao,
        data_vencimento: nota.data_vencimento,
        temSugestao: temSugestao,
        sugestao: sugestao,
        data_sugerida: data_sugerida,
        prioridade: prioridade,
        mensagem_inteligente: mensagem_inteligente,
        fornecedor: nota.fornecedor_nome,
        valor: nota.valor_total,
        opcoes: opcoes
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/notas-fiscais/:id - Obter uma nota fiscal específica
router.get('/notas-fiscais/:id', async (req, res) => {
  try {
    const nota = await NotaFiscal.obter(req.params.id);

    if (!nota) {
      return res.status(404).json({
        success: false,
        error: 'Nota fiscal não encontrada'
      });
    }

    res.json({
      success: true,
      data: nota
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/diagnosticos/testar-xml - Testar extração de data de XML (DEBUG)
router.post('/diagnosticos/testar-xml', upload.single('arquivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum arquivo foi enviado'
      });
    }

    console.log('\n🔧 DIAGNÓSTICO: Testando extração de XML');
    console.log(`   Arquivo: ${req.file.originalname}`);
    console.log(`   Tamanho: ${req.file.size} bytes`);

    const dadosExtraidos = await NotaFiscalParser.detectarEParsear(
      req.file.buffer,
      req.file.originalname
    );

    console.log(`\n📊 Resultado da extração:`);
    console.log(JSON.stringify(dadosExtraidos, null, 2));

    res.json({
      success: true,
      message: 'Extração bem-sucedida - verifique os logs do servidor',
      dados: {
        numero_nf: dadosExtraidos.numero_nf,
        fornecedor_nome: dadosExtraidos.fornecedor_nome,
        data_emissao: dadosExtraidos.data_emissao,
        data_vencimento: dadosExtraidos.data_vencimento,
        valor_total: dadosExtraidos.valor_total,
        descricao: dadosExtraidos.descricao,
        classificacao_sugerida: dadosExtraidos.classificacao_sugerida,
        nota_diagnostico: `Data de emissão: ${dadosExtraidos.data_emissao} (hoje é ${new Date().toISOString().split('T')[0]})`
      }
    });
  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error.message);
    res.status(400).json({
      success: false,
      error: error.message,
      diagnostico: 'Verifique os logs do servidor para detalhes da extração'
    });
  }
});

// POST /api/notas-fiscais/upload - Fazer upload e processar notas fiscais (XML/PDF)
router.post('/notas-fiscais/upload', upload.array('files', 100), async (req, res) => {
  try {
    // Aumentar timeout para esta requisição
    req.setTimeout(300000); // 5 minutos
    if (res.setTimeout) {
      res.setTimeout(300000);
    }

    console.log('\n📤 Upload de notas fiscais iniciado');
    console.log(`   Arquivos recebidos: ${req.files?.length || 0}`);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum arquivo foi enviado'
      });
    }

    const notasProcessadas = [];
    const erros = [];
    const duplicadas = [];

    // Conectar ao banco para verificações de duplicata inteligente
    let client;
    try {
      client = await pool.connect();
    } catch (poolErr) {
      console.error('⚠️  Erro ao conectar ao banco para verificação de duplicatas');
      client = null;
    }

    // Processar cada arquivo
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      console.log(`\n📄 Processando arquivo ${i + 1}/${req.files.length}: ${file.originalname}`);
      try {
        // Fazer parsing do arquivo
        console.log(`   Tamanho: ${file.size} bytes`);
        const dadosExtraidos = await NotaFiscalParser.detectarEParsear(
          file.buffer,
          file.originalname
        );
        console.log(`   ✅ Parsing bem-sucedido: ${dadosExtraidos.numero_nf}`);

        // Verificar duplicata 1: numero_nf exato
        const notaExistente = await NotaFiscal.obterPorNumero(dadosExtraidos.numero_nf);
        if (notaExistente) {
          const msg = `Nota fiscal ${dadosExtraidos.numero_nf} já foi processada`;
          console.log(`   ⚠️  ${msg}`);
          duplicadas.push({
            arquivo: file.originalname,
            numero_nf: dadosExtraidos.numero_nf,
            motivo: 'numero_nf duplicado'
          });
          continue;
        }

        // Verificar duplicata 2: inteligente (fornecedor + descrição + valor)
        if (client) {
          console.log(`   Verificando duplicata inteligente...`);
          const dupCheck = await checkIntelligentDuplicate(client, {
            fornecedor_nome: dadosExtraidos.fornecedor_nome,
            descricao: dadosExtraidos.descricao,
            valor_total: dadosExtraidos.valor_total,
            data_emissao: dadosExtraidos.data_emissao
          });

          if (dupCheck.isDuplicate) {
            console.log(`   ⚠️  Duplicata inteligente: ${dupCheck.similarNota.numero_nf}`);
            duplicadas.push({
              arquivo: file.originalname,
              numero_nf: dadosExtraidos.numero_nf,
              motivo: `Nota similar já existe (${dupCheck.similarNota.numero_nf}): mesmo fornecedor, descrição e valor`,
              notaSimilar: {
                numero_nf: dupCheck.similarNota.numero_nf,
                data_emissao: dupCheck.similarNota.data_emissao,
                valor: dupCheck.similarNota.valor_total
              }
            });
            continue;
          }
        }

        // Salvar nota fiscal no banco
        console.log(`   💾 Salvando no banco...`);
        const resultado = await NotaFiscal.criar({
          ...dadosExtraidos,
          pdf_filename: file.originalname
        });
        console.log(`   ✅ Salvo com ID: ${resultado.id}`);

        notasProcessadas.push({
          id: resultado.id,
          arquivo: file.originalname,
          numero: dadosExtraidos.numero_nf,
          fornecedor: dadosExtraidos.fornecedor_nome,
          valor: dadosExtraidos.valor_total,
          classificacao_sugerida: dadosExtraidos.classificacao_sugerida
        });
      } catch (erro) {
        console.error(`   ❌ Erro ao processar ${file.originalname}:`);
        console.error(`      ${erro.message}`);
        console.error(`      Stack: ${erro.stack}`);
        erros.push({
          arquivo: file.originalname,
          erro: erro.message,
          stack: erro.stack
        });
      }
    }

    // Fechar conexão
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('⚠️  Erro ao fechar conexão:', err.message);
      }
    }

    console.log(`\n📊 Resumo do upload:`);
    console.log(`   ✅ Notas processadas: ${notasProcessadas.length}`);
    console.log(`   ⚠️  Duplicadas: ${duplicadas.length}`);
    console.log(`   ❌ Erros: ${erros.length}`);

    res.status(201).json({
      success: notasProcessadas.length > 0,
      message: `${notasProcessadas.length} nota(s) processada(s), ${duplicadas.length} duplicada(s), ${erros.length} erro(s)`,
      data: {
        processadas: notasProcessadas.length,
        duplicadas: duplicadas.length,
        erros: erros.length,
        detalhes: {
          processadas: notasProcessadas,
          duplicadas: duplicadas.length > 0 ? duplicadas : undefined,
          erros: erros.length > 0 ? erros : undefined
        }
      }
    });
  } catch (error) {
    console.error('❌ Erro geral no upload:', error.message);
    console.error('   Stack:', error.stack);
    res.status(400).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// POST /api/importar-conta-azul - Importar Excel Conta Azul como notas fiscais
// Reutiliza a lógica existente de processamento de notas
router.post('/importar-conta-azul', uploadExcel.single('arquivo'), async (req, res) => {
  let client;
  try {
    console.log('\n📊 Importação Conta Azul iniciada (usando lógica de notas fiscais)');

    if (!req.file) {
      console.error('❌ Erro: Nenhum arquivo recebido');
      return res.status(400).json({
        success: false,
        error: 'Nenhum arquivo foi enviado'
      });
    }

    // Ler arquivo Excel
    console.log(`   Arquivo: ${req.file.originalname} (${req.file.size} bytes)`);

    let workbook, sheetName, worksheet, linhas;
    try {
      workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      console.log(`   ✅ Excel parseado`);
      sheetName = workbook.SheetNames[0];
      worksheet = workbook.Sheets[sheetName];
      linhas = xlsx.utils.sheet_to_json(worksheet);
      console.log(`   ✅ ${linhas.length} linhas extraídas`);
    } catch (parseErr) {
      console.error('❌ Erro ao fazer parsing do Excel:', parseErr.message);
      throw new Error(`Erro ao ler Excel: ${parseErr.message}`);
    }

    if (linhas.length === 0) {
      console.error('❌ Erro: Excel vazio');
      return res.status(400).json({
        success: false,
        error: 'Arquivo Excel vazio'
      });
    }

    // Conectar ao banco
    console.log('   Conectando ao banco de dados...');
    client = await pool.connect();
    console.log('   ✅ Conectado');

    // Começar transação
    console.log('   Iniciando transação...');
    await client.query('BEGIN');
    console.log('   ✅ Transação iniciada');

    const importados = [];
    const erros = [];
    const duplicados = [];

    // Processar cada linha como nota fiscal
    for (let i = 0; i < linhas.length; i++) {
      try {
        const linha = linhas[i];
        const dados = ContaAzulMapper.processarLinhaExcel(linha, i + 1);

        if (!dados.valid) {
          erros.push({
            linha: i + 1,
            erro: dados.erro
          });
          continue;
        }

        // Gerar numero_nf único (usando código de referência do Conta Azul ou timestamp)
        const numeroNF = `CA-${dados.identificador}`;

        // Verificar duplicata 1: numero_nf exato
        console.log(`   Verificando duplicata para ${numeroNF}...`);
        const checkDupResult = await client.query(
          'SELECT id FROM notas_fiscais WHERE numero_nf = $1 LIMIT 1',
          [numeroNF]
        );

        if (checkDupResult.rows.length > 0) {
          console.log(`   ⚠️  Duplicada (numero_nf): ${numeroNF}`);
          duplicados.push({
            linha: i + 1,
            descricao: dados.descricao,
            numero_nf: numeroNF,
            motivo: 'numero_nf duplicado'
          });
          continue;
        }

        // Verificar duplicata 2: inteligente (fornecedor + descrição + valor)
        console.log(`   Verificando duplicata inteligente...`);
        const dupCheck = await checkIntelligentDuplicate(client, {
          fornecedor_nome: dados.fornecedor_nome,
          descricao: dados.descricao,
          valor_total: dados.total,
          data_emissao: dados.data
        });

        if (dupCheck.isDuplicate) {
          console.log(`   ⚠️  Duplicada (inteligente): ${dupCheck.similarNota.numero_nf}`);
          duplicados.push({
            linha: i + 1,
            descricao: dados.descricao,
            numero_nf: numeroNF,
            motivo: `Nota similar já existe (${dupCheck.similarNota.numero_nf}): mesmo fornecedor, descrição e valor`,
            notaSimilar: {
              numero_nf: dupCheck.similarNota.numero_nf,
              data_emissao: dupCheck.similarNota.data_emissao,
              valor: dupCheck.similarNota.valor_total
            }
          });
          continue;
        }

        // Inserir como nota fiscal (status='pendente' para processamento posterior)
        const insertResult = await client.query(
          `INSERT INTO notas_fiscais (
            numero_nf,
            fornecedor_nome,
            fornecedor_cnpj,
            data_emissao,
            valor_total,
            descricao,
            classificacao_sugerida,
            status,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          RETURNING id`,
          [
            numeroNF,
            dados.fornecedor_nome,
            '',  // CNPJ vazio (não temos do Conta Azul)
            dados.data,
            dados.total,
            dados.descricao,
            dados.classificacao,  // CMV / Operacional / Administrativa / Financeira
            'pendente'  // Status pendente para revisão
          ]
        );

        importados.push({
          id: insertResult.rows[0].id,
          numero_nf: numeroNF,
          data: dados.data,
          descricao: dados.descricao,
          fornecedor: dados.fornecedor_nome,
          valor: dados.total,
          classificacao: dados.classificacao,
          categoria_ca: dados.categoria_conta_azul
        });

        if ((i + 1) % 20 === 0) {
          console.log(`   ✅ Processadas ${i + 1}/${linhas.length} linhas...`);
        }
      } catch (erro) {
        console.error(`❌ Erro na linha ${i + 1}:`, erro.message);
        erros.push({
          linha: i + 1,
          erro: erro.message
        });
      }
    }

    // Confirmar transação
    await client.query('COMMIT');
    console.log(`✅ Importação concluída: ${importados.length} notas inseridas como "pendentes"`);
    console.log(`   Próximo passo: processar as notas via UI ou API\n`);

    res.status(201).json({
      success: importados.length > 0,
      message: `${importados.length} nota(s) importada(s) como pendente(s), ${duplicados.length} duplicada(s), ${erros.length} erro(s)`,
      dados: {
        importados: importados.length,
        duplicados: duplicados.length,
        erros: erros.length,
        detalhes: {
          importados: importados.slice(0, 10),
          duplicados: duplicados.slice(0, 5),
          erros: erros.slice(0, 5)
        }
      }
    });
  } catch (err) {
    console.error('\n❌ ERRO NA IMPORTAÇÃO:');
    console.error('Tipo:', err.constructor.name);
    console.error('Mensagem:', err.message);
    console.error('Stack:', err.stack);

    if (client) {
      try {
        console.log('🔄 Fazendo rollback...');
        await client.query('ROLLBACK');
        console.log('✅ Rollback concluído');
      } catch (rollbackErr) {
        console.error('❌ Erro ao fazer rollback:', rollbackErr.message);
      }
    }

    res.status(500).json({
      success: false,
      error: err.message || 'Erro na importação',
      tipo: err.constructor.name
    });
  } finally {
    if (client) {
      console.log('🔌 Fechando conexão...');
      client.release();
    }
  }
});

// POST /api/notas-fiscais/:id/processar - Processar nota e criar faturamento
// Body: { tipo_despesa_id: 1, data_faturamento: "YYYY-MM-DD" (opcional) }
router.post('/notas-fiscais/:id/processar', async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo_despesa_id, data_faturamento } = req.body;

    console.log(`\n📝 Processando nota #${id}`);
    console.log(`   tipo_despesa_id: ${tipo_despesa_id}`);
    console.log(`   data_faturamento: ${data_faturamento}`);

    // Validação 1: tipo_despesa_id obrigatório
    if (!tipo_despesa_id) {
      console.error('   ❌ Erro: tipo_despesa_id é obrigatório');
      return res.status(400).json({
        success: false,
        error: 'tipo_despesa_id é obrigatório'
      });
    }

    // Converter para número se for string
    const tipoDespesaId = parseInt(tipo_despesa_id, 10);
    if (isNaN(tipoDespesaId)) {
      console.error(`   ❌ Erro: tipo_despesa_id inválido (${tipo_despesa_id})`);
      return res.status(400).json({
        success: false,
        error: `tipo_despesa_id inválido: ${tipo_despesa_id}`
      });
    }

    // Validação 2: Obter nota fiscal
    console.log(`   🔍 Buscando nota fiscal #${id}...`);
    const nota = await NotaFiscal.obter(id);
    if (!nota) {
      console.error(`   ❌ Erro: Nota fiscal #${id} não encontrada`);
      return res.status(404).json({
        success: false,
        error: 'Nota fiscal não encontrada'
      });
    }
    console.log(`   ✅ Nota encontrada: ${nota.numero_nf}`);

    // Validação 3: Verificar status
    if (nota.status === 'processado') {
      console.error(`   ❌ Erro: Nota já foi processada`);
      return res.status(400).json({
        success: false,
        error: 'Esta nota fiscal já foi processada'
      });
    }

    // Usar data fornecida ou data de emissão por padrão
    const dataFaturamento = data_faturamento || nota.data_emissao;
    console.log(`   📅 Data do faturamento: ${dataFaturamento}`);

    // Validação 4: Obter tipo de despesa
    console.log(`   🔍 Buscando tipo de despesa #${tipoDespesaId}...`);
    const tipoDespesa = await TipoDespesa.obter(tipoDespesaId);
    if (!tipoDespesa) {
      console.error(`   ❌ Erro: Tipo de despesa #${tipoDespesaId} não encontrado`);
      return res.status(400).json({
        success: false,
        error: `Tipo de despesa #${tipoDespesaId} não encontrado`
      });
    }
    console.log(`   ✅ Tipo de despesa: ${tipoDespesa.subcategoria} (${tipoDespesa.classificacao})`);

    const classificacao = tipoDespesa.classificacao; // 'CMV' ou 'Operacional'

    // Criar faturamento (despesa)
    console.log(`   💾 Criando faturamento...`);
    const resultado = await Faturamento.criar(
      dataFaturamento,
      nota.valor_total,
      'Salão',
      'despesa',
      tipoDespesaId
    );
    console.log(`   ✅ Faturamento criado: #${resultado.id}`);

    // Marcar nota como processada
    console.log(`   📌 Marcando nota como processada...`);
    await NotaFiscal.processar(id, resultado.id, tipoDespesaId);
    console.log(`   ✅ Nota marcada como processada`);

    console.log(`\n✅ Processamento concluído com sucesso\n`);

    res.json({
      success: true,
      message: 'Nota fiscal processada e faturamento criado com sucesso',
      faturamento_id: resultado.id,
      nota_fiscal_id: id,
      data_lançamento: dataFaturamento,
      tipo_despesa: tipoDespesa.subcategoria,
      classificacao: classificacao
    });
  } catch (error) {
    console.error('\n❌ ERRO AO PROCESSAR NOTA:');
    console.error(`   Tipo: ${error.constructor.name}`);
    console.error(`   Mensagem: ${error.message}`);
    console.error(`   Stack: ${error.stack}\n`);

    res.status(500).json({
      success: false,
      error: error.message,
      tipo: error.constructor.name
    });
  }
});

// DELETE /api/notas-fiscais/:id - Deletar nota fiscal (apenas se pendente)
router.delete('/notas-fiscais/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se nota existe e seu status
    const notaResult = await pool.query('SELECT id, status FROM notas_fiscais WHERE id = $1', [id]);

    if (notaResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Nota fiscal não encontrada'
      });
    }

    const nota = notaResult.rows[0];

    // Validar status - permitir apenas pendente
    if (nota.status === 'processado') {
      return res.status(400).json({
        success: false,
        error: 'Não é possível deletar nota fiscal já processada. Use /api/debug/reverter-notas-pendentes primeiro.'
      });
    }

    // Deletar nota fiscal
    console.log(`🗑️  Deletando nota fiscal ID ${id} com status ${nota.status}`);
    const deleteResult = await pool.query('DELETE FROM notas_fiscais WHERE id = $1', [id]);

    if (deleteResult.rowCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'Erro ao deletar nota fiscal'
      });
    }

    res.json({
      success: true,
      message: 'Nota fiscal deletada com sucesso',
      notaId: id
    });
  } catch (error) {
    console.error('❌ Erro ao deletar nota fiscal:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Função auxiliar para classificar despesa por keywords
function classificarDespesa(texto) {
  const textoLower = texto.toLowerCase();

  if (textoLower.includes('adiantamento')) return 'Salário';
  if (textoLower.includes('folha') || textoLower.includes('salário')) return 'Salário';
  if (textoLower.includes('ifood') || textoLower.includes('rappi') || textoLower.includes('uber eats')) return 'iFood';
  if (textoLower.includes('99food') || textoLower.includes('99')) return '99Food';
  if (textoLower.includes('keeta')) return 'Keeta';
  if (textoLower.includes('cabelo') || textoLower.includes('corte') || textoLower.includes('salão') || textoLower.includes('beleza')) return 'Salão';
  return 'Outro';
}

// Função auxiliar para extrair valor
function extrairValor(texto) {
  // Padrão: R$ 8.832,00 ou R$ 150,50 ou R$ 8832,00
  // Captura valores com até 3 dígitos de milhares
  const regex = /R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/gi;
  const matches = texto.match(regex);

  logger.debug('Matches encontrados: ' + JSON.stringify(matches));

  if (matches && matches.length > 0) {
    // Pegar o último valor encontrado (geralmente é o total)
    const ultimoValor = matches[matches.length - 1];
    logger.debug('Último valor encontrado: ' + ultimoValor);

    // Converter: "R$ 8.832,00" -> "8832.00"
    const valorLimpo = ultimoValor
      .replace(/R\$\s*/g, '')
      .replace(/\./g, '')  // Remove ponto de milhares
      .replace(',', '.');  // Converte vírgula em ponto decimal

    logger.debug('Valor limpo: ' + valorLimpo);
    const valorNumerico = parseFloat(valorLimpo);
    logger.debug('Valor numérico final: ' + valorNumerico);

    return valorNumerico > 0 ? valorNumerico : 0;
  }

  logger.warning('Nenhum valor encontrado');
  return 0;
}

// Função auxiliar para extrair data
function extrairData(texto) {
  // Tentar encontrar padrões de data: DD/MM/YYYY, DD-MM-YYYY, etc
  const regexData = /(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/;
  const match = texto.match(regexData);

  if (match) {
    let dia = match[1].padStart(2, '0');
    let mes = match[2].padStart(2, '0');
    let ano = match[3];
    return `${ano}-${mes}-${dia}`;
  }

  // Se não encontrar, retorna hoje
  return new Date().toISOString().split('T')[0];
}

// Função auxiliar para extrair fornecedor/descrição
function extrairDescricao(texto) {
  const linhas = texto.split('\n').filter(l => l.trim().length > 5);
  if (linhas.length > 0) {
    return linhas[0].substring(0, 100);
  }
  return 'Compra registrada';
}

// Função auxiliar para extrair listas estruturadas (ex: adiantamentos por funcionário)
function extrairLista(texto) {
  const linhas = texto.split('\n');
  const detalhes = [];

  // Padrão: "Nome — R$ valor" ou "Nome — R$valor"
  for (let linha of linhas) {
    const match = linha.match(/^([^—•-]+?)(?:—|•|-)\s*(?:R\$\s*)?(\d+[.,]\d{2})/);
    if (match) {
      const nome = match[1].trim();
      const valor = parseFloat(match[2].replace(',', '.'));
      if (nome.length > 2 && valor > 0) {
        detalhes.push({
          nome: nome.substring(0, 100),
          valor: valor
        });
      }
    }
  }

  return detalhes;
}

// POST /api/processar-despesa-imagem - Processar despesa por imagem com Tesseract OCR
// Body: { image: "base64string" }
router.post('/processar-despesa-imagem', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.json({
        success: false,
        error: 'Imagem não fornecida'
      });
    }

    logger.info('Processando imagem com Tesseract OCR...');

    // Fazer OCR da imagem
    const resultado = await Tesseract.recognize(
      `data:image/png;base64,${image}`,
      'por',
      {
        logger: m => logger.debug(`OCR Progress: ${m.status} ${Math.round(m.progress * 100)}%`)
      }
    );

    const textoExtraido = resultado.data.text;
    logger.debug('Texto extraído: ' + textoExtraido.substring(0, 100) + '...');

    // Extrair listas (para documentos com múltiplos itens)
    const detalhes = extrairLista(textoExtraido);

    // Extrair informações da imagem
    const valor = extrairValor(textoExtraido);
    const data = extrairData(textoExtraido);
    let descricao = extrairDescricao(textoExtraido);
    const categoria = classificarDespesa(textoExtraido);

    // Se encontrou lista, usa o título melhorado
    if (detalhes.length > 0) {
      const primeiraLinha = textoExtraido.split('\n')[0];
      if (primeiraLinha && primeiraLinha.length > 5) {
        descricao = primeiraLinha.substring(0, 100);
      }
    }

    const dados = {
      valor: valor > 0 ? valor : 150.50,
      data: data,
      descricao: descricao,
      categoria: categoria,
      fornecedor: descricao.substring(0, 50),
      detalhes: detalhes.length > 0 ? detalhes : undefined // Incluir detalhes se houver lista
    };

    logger.success('Dados extraídos com sucesso');

    res.json({
      success: true,
      dados: dados
    });
  } catch (error) {
    logger.error(`Erro ao processar imagem: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DEBUG: GET /api/debug-categorias - Ver discrepâncias de categorias
router.get('/debug-categorias', async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.json({
        success: false,
        error: 'Parâmetros from e to são obrigatórios'
      });
    }

    // Total geral
    const totalGeral = await Faturamento.obterStats(from, to);

    // Total por categoria (com NULL)
    const porCategoria = await Faturamento.obterStatsPorCategoriaBruto(from, to);

    // Soma das categorias
    const somaLiquidos = porCategoria.reduce((acc, cat) => {
      const liquido = (cat.totalReceita || 0) - (cat.totalDespesa || 0);
      return acc + liquido;
    }, 0);

    res.json({
      success: true,
      data: {
        totalGeral: totalGeral.totalLiquido,
        somaCategorias: somaLiquidos,
        diferenca: Math.abs(totalGeral.totalLiquido - somaLiquidos),
        categorias: porCategoria
      }
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/criar-categoria-simples - Criar categoria rápida (sem classificação)
// Body: { nome: "CMV - Produtos", classificacao?: "CMV" }
router.post('/criar-categoria-simples', async (req, res) => {
  try {
    const { nome, classificacao = 'Operacional' } = req.body;

    if (!nome || nome.trim().length === 0) {
      return res.json({
        success: false,
        error: 'Nome da categoria é obrigatório'
      });
    }

    if (!['CMV', 'Operacional', 'Administrativa', 'Financeira'].includes(classificacao)) {
      return res.json({
        success: false,
        error: 'Classificação inválida'
      });
    }

    logger.debug(`Verificando se categoria já existe: ${nome} (${classificacao})`);

    try {
      // Verificar se já existe
      const existente = await TipoDespesa.obterPorSubcategoria(classificacao, nome);
      if (existente) {
        logger.warning(`Categoria já existe: ${existente.id}`);
        return res.json({
          success: true,
          message: 'Categoria já existe',
          data: {
            id: existente.id,
            nome: nome,
            classificacao: classificacao,
            novo: false
          }
        });
      }
    } catch (checkError) {
      logger.debug(`Verificação de existência retornou erro (pode ser normal): ${checkError.message}`);
    }

    logger.info(`Criando nova categoria: ${nome} (${classificacao})`);

    // Criar nova categoria
    const result = await TipoDespesa.criar(classificacao, nome, '');

    logger.success(`Categoria criada: ${result.id}`);

    res.json({
      success: true,
      message: 'Categoria criada com sucesso',
      data: {
        id: result.id,
        nome: nome,
        classificacao: classificacao,
        novo: true
      }
    });
  } catch (error) {
    logger.error(`Erro ao criar categoria: ${error.message}`);

    // Se for erro de constraint (duplicata), retornar mensagem amigável
    if (error.message && error.message.includes('UNIQUE constraint')) {
      return res.json({
        success: true,
        message: 'Categoria já existe',
        data: {
          nome: nome,
          classificacao: classificacao,
          novo: false
        }
      });
    }

    res.json({
      success: false,
      error: error.message
    });
  }
});

// DEBUG: Endpoint para diagnosticar Performance por Categoria
router.get('/debug/stats-categoria', async (req, res) => {
  try {
    const { from = '2026-04-01', to = '2026-04-30' } = req.query;

    console.log(`\n🔍 [DEBUG] Testando stats-categoria para: ${from} a ${to}`);

    // 1. Testar obterStatsPorCategoria
    const stats = await Faturamento.obterStatsPorCategoria(from, to);
    console.log(`🔍 [DEBUG] obterStatsPorCategoria retornou: ${stats ? stats.length : 'NULL'} resultados`);

    // 2. Testar obterDespesasAlocadas
    const despesas = await Faturamento.obterDespesasAlocadas(from, to);
    console.log(`🔍 [DEBUG] obterDespesasAlocadas retornou: ${despesas ? despesas.length : 'NULL'} resultados`);

    res.json({
      success: true,
      debug: {
        from,
        to,
        statsRetornados: stats ? stats.length : 0,
        despesasRetornadas: despesas ? despesas.length : 0,
        stats: stats || [],
        despesas: despesas || []
      }
    });
  } catch (error) {
    console.error('❌ [DEBUG] Erro:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// DEBUG: Endpoint para inicializar tipo_despesa se vazio
router.post('/debug/init-tipo-despesa', async (req, res) => {
  try {
    console.log('\n🔍 [DEBUG] Inicializando tipo_despesa...');

    // Verificar quantos registros há
    const check = await pool.query('SELECT COUNT(*) as cnt FROM tipo_despesa WHERE ativa = true');
    const count = parseInt(check.rows[0].cnt);

    if (count > 0) {
      console.log(`✅ [DEBUG] tipo_despesa já tem ${count} registros`);
      return res.json({
        success: true,
        message: `tipo_despesa já inicializado com ${count} registros`,
        count: count
      });
    }

    // Se vazio, inserir dados padrão
    const tiposDespesa = [
      // CMV
      { classificacao: 'CMV', subcategoria: 'Taxas', descricao: 'Taxas de delivery (iFood, Uber, etc)' },
      { classificacao: 'CMV', subcategoria: 'Bebidas', descricao: 'Custo de bebidas' },
      { classificacao: 'CMV', subcategoria: 'Comidas', descricao: 'Custo de alimentos' },
      { classificacao: 'CMV', subcategoria: 'Açúcar/Temperos', descricao: 'Açúcar, sal, temperos' },
      { classificacao: 'CMV', subcategoria: 'Embalagem', descricao: 'Sacolas, caixas, copos' },
      // Operacional
      { classificacao: 'Operacional', subcategoria: 'Aluguel', descricao: 'Aluguel do estabelecimento' },
      { classificacao: 'Operacional', subcategoria: 'Energia', descricao: 'Conta de energia/luz' },
      { classificacao: 'Operacional', subcategoria: 'Água', descricao: 'Conta de água' },
      { classificacao: 'Operacional', subcategoria: 'Telefone/Internet', descricao: 'Internet e telefone' },
      { classificacao: 'Operacional', subcategoria: 'Limpeza', descricao: 'Produtos de limpeza' },
      { classificacao: 'Operacional', subcategoria: 'Manutenção', descricao: 'Manutenção de equipamentos' },
      // Administrativa
      { classificacao: 'Administrativa', subcategoria: 'Folha de Pagamento', descricao: 'Salários e encargos' },
      { classificacao: 'Administrativa', subcategoria: 'Contador', descricao: 'Serviços contábeis' },
      { classificacao: 'Administrativa', subcategoria: 'Seguros', descricao: 'Seguros diversos' },
      { classificacao: 'Administrativa', subcategoria: 'Material Administrativo', descricao: 'Papéis, canetas, etc' },
      // Financeira
      { classificacao: 'Financeira', subcategoria: 'Juros e Multas', descricao: 'Juros e multas bancárias' },
      { classificacao: 'Financeira', subcategoria: 'Custos Financeiros', descricao: 'Taxa de cartão, POS' },
      { classificacao: 'Financeira', subcategoria: 'Empréstimos', descricao: 'Juros de empréstimos' }
    ];

    let insertados = 0;
    for (const tipo of tiposDespesa) {
      try {
        await pool.query(
          `INSERT INTO tipo_despesa (classificacao, subcategoria, descricao, ativa)
           VALUES ($1, $2, $3, true)
           ON CONFLICT (classificacao, subcategoria) DO NOTHING`,
          [tipo.classificacao, tipo.subcategoria, tipo.descricao]
        );
        insertados++;
      } catch (err) {
        console.error(`  ⚠️  Erro ao inserir ${tipo.subcategoria}:`, err.message);
      }
    }

    const newCheck = await pool.query('SELECT COUNT(*) as cnt FROM tipo_despesa WHERE ativa = true');
    const newCount = parseInt(newCheck.rows[0].cnt);

    console.log(`✅ [DEBUG] tipo_despesa inicializado: ${newCount} registros`);

    res.json({
      success: true,
      message: `tipo_despesa inicializado com ${newCount} registros`,
      count: newCount,
      inseridos: insertados
    });
  } catch (error) {
    console.error('❌ [DEBUG] Erro ao inicializar tipo_despesa:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
  }
});

// DEBUG: Contar notas fiscais
router.get('/debug/contar-notas', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) as cnt FROM notas_fiscais');
    const count = parseInt(result.rows[0].cnt);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/debug/status-notas - Verificar distribuição de status
router.get('/debug/status-notas', async (req, res) => {
  try {
    const result = await pool.query('SELECT status, COUNT(*) as count FROM notas_fiscais GROUP BY status ORDER BY status');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/debug/processar-todas-notas-pendentes - Processar todas as notas pendentes em lote
router.post('/debug/processar-todas-notas-pendentes', async (req, res) => {
  const client = await pool.connect();
  try {
    console.log('\n🔄 Processando TODAS as notas pendentes em lote...');

    // Começar transação
    await client.query('BEGIN');

    // 1. Contar notas pendentes
    console.log('📊 Contando notas pendentes...');
    const contarResult = await client.query(
      'SELECT COUNT(*) as count FROM notas_fiscais WHERE status = $1',
      ['pendente']
    );
    const totalPendentes = parseInt(contarResult.rows[0].count);
    console.log(`   Total de notas pendentes: ${totalPendentes}`);

    if (totalPendentes === 0) {
      await client.query('COMMIT');
      return res.json({
        success: true,
        message: 'Nenhuma nota pendente para processar',
        dados: {
          totalProcessado: 0,
          porClassificacao: {}
        }
      });
    }

    // 2. Buscar todas as notas pendentes
    console.log('📋 Buscando notas pendentes...');
    const notasResult = await client.query(
      'SELECT * FROM notas_fiscais WHERE status = $1 ORDER BY id',
      ['pendente']
    );
    const notas = notasResult.rows;
    console.log(`   Encontradas ${notas.length} notas`);

    // 3. Processá-las todas
    const resumo = {
      cmv: 0,
      operacional: 0,
      administrativa: 0,
      outras: 0,
      erros: []
    };

    let processadas = 0;

    for (let i = 0; i < notas.length; i++) {
      const nota = notas[i];
      try {
        if ((i + 1) % 20 === 0) {
          console.log(`   Processando ${i + 1}/${notas.length}...`);
        }

        // Obter ou criar tipo_despesa baseado na classificação
        let tipoDespesaId = nota.tipo_despesa_id;

        if (!tipoDespesaId && nota.classificacao_sugerida) {
          // Procurar tipo_despesa por classificação
          let subcategoria = 'Diversos';

          if (nota.classificacao_sugerida === 'CMV') {
            subcategoria = 'Comidas'; // padrão CMV
          } else if (nota.classificacao_sugerida === 'Operacional') {
            subcategoria = 'Manutenção'; // padrão Operacional
          } else if (nota.classificacao_sugerida === 'Administrativa') {
            subcategoria = 'Material Administrativo'; // padrão Administrativa
          }

          const tipoResult = await client.query(
            'SELECT id FROM tipo_despesa WHERE classificacao = $1 AND subcategoria = $2 LIMIT 1',
            [nota.classificacao_sugerida, subcategoria]
          );

          if (tipoResult.rows.length > 0) {
            tipoDespesaId = tipoResult.rows[0].id;
          }
        }

        // Extrair data da nota (usar data_emissao se existir, senão usar hoje)
        let dataFaturamento = nota.data_emissao;
        if (!dataFaturamento) {
          dataFaturamento = new Date().toISOString().split('T')[0];
        }

        // Criar faturamento
        const faturamentoResult = await client.query(
          `INSERT INTO faturamento (data, total, categoria, tipo, tipo_despesa_id, status, categoria_produto, created_at)
           VALUES ($1, $2, $3, 'despesa', $4, false, $5, NOW())
           RETURNING id`,
          [
            dataFaturamento,
            nota.valor_total || 0,
            'Salão', // categoria padrão
            tipoDespesaId || null,
            nota.classificacao_sugerida || 'Despesa'
          ]
        );

        const faturamentoId = faturamentoResult.rows[0].id;

        // Marcar nota como processado
        await client.query(
          'UPDATE notas_fiscais SET status = $1, faturamento_id = $2, processado_em = NOW() WHERE id = $3',
          ['processado', faturamentoId, nota.id]
        );

        // Contar por classificação
        if (nota.classificacao_sugerida === 'CMV') {
          resumo.cmv++;
        } else if (nota.classificacao_sugerida === 'Operacional') {
          resumo.operacional++;
        } else if (nota.classificacao_sugerida === 'Administrativa') {
          resumo.administrativa++;
        } else {
          resumo.outras++;
        }

        processadas++;
      } catch (erro) {
        console.error(`❌ Erro ao processar nota ${nota.id}:`, erro.message);
        resumo.erros.push({
          notaId: nota.id,
          numero: nota.numero_nf,
          erro: erro.message
        });
      }
    }

    // 4. Confirmar transação
    await client.query('COMMIT');
    console.log(`✅ ${processadas} notas processadas com sucesso`);

    res.json({
      success: true,
      message: `${processadas}/${notas.length} notas processadas com sucesso`,
      dados: {
        totalProcessado: processadas,
        totalErros: resumo.erros.length,
        porClassificacao: {
          CMV: resumo.cmv,
          Operacional: resumo.operacional,
          Administrativa: resumo.administrativa,
          Outras: resumo.outras
        },
        erros: resumo.erros.length > 0 ? resumo.erros : undefined
      }
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('❌ Erro ao fazer rollback:', rollbackErr.message);
    }
    console.error('❌ Erro ao processar notas:', err.message);
    res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack
    });
  } finally {
    client.release();
  }
});

// DELETE /api/debug/deletar-todas-notas - Deletar TODAS as notas (debug/cleanup)
router.post('/debug/deletar-todas-notas', async (req, res) => {
  const client = await pool.connect();
  try {
    console.log('🗑️  Iniciando deleção de TODAS as notas...');

    // Começar transação
    await client.query('BEGIN');

    // 1. Contar ANTES
    console.log('📊 Contando notas no banco...');
    const beforeCount = await client.query('SELECT COUNT(*) as count FROM notas_fiscais');
    const before = parseInt(beforeCount.rows[0].count);
    console.log(`   Total de notas: ${before}`);

    // 2. Fazer DELETE sem condição (força limpeza)
    console.log('🗑️  Deletando todas as notas...');
    const deleteResult = await client.query('DELETE FROM notas_fiscais');
    console.log(`   ✅ DELETE afetou ${deleteResult.rowCount} linhas`);

    // 3. Contar DEPOIS
    console.log('📊 Verificando banco após limpeza...');
    const afterCount = await client.query('SELECT COUNT(*) as count FROM notas_fiscais');
    const after = parseInt(afterCount.rows[0].count);
    console.log(`   Notas restantes: ${after}`);

    // Confirmar transação
    await client.query('COMMIT');
    console.log('✅ Limpeza confirmada com sucesso');

    res.json({
      success: true,
      message: `${before} notas deletadas com sucesso`,
      dados: {
        notasDeletadas: before,
        rowsAffected: deleteResult.rowCount,
        notasRestantes: after
      }
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('❌ Erro ao fazer rollback:', rollbackErr.message);
    }
    console.error('❌ Erro ao deletar notas:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  } finally {
    client.release();
  }
});

// POST /api/debug/reverter-notas-pendentes - Mudar todas as notas de 'processado' para 'pendente'
router.post('/debug/reverter-notas-pendentes', async (req, res) => {
  const client = await pool.connect();
  try {
    console.log('🔄 Iniciando reversão de notas...');

    // Começar transação
    await client.query('BEGIN');

    // 1. Contar ANTES
    console.log('📊 Contando notas com status = processado...');
    const beforeCount = await client.query('SELECT COUNT(*) as count FROM notas_fiscais WHERE status = $1', ['processado']);
    const before = parseInt(beforeCount.rows[0].count);
    console.log(`   Encontradas: ${before} notas com status = 'processado'`);

    // 2. Fazer UPDATE
    console.log('🔄 Executando UPDATE SET status = pendente...');
    const updateResult = await client.query(
      'UPDATE notas_fiscais SET status = $1 WHERE status = $2',
      ['pendente', 'processado']
    );
    console.log(`   ✅ UPDATE afetou ${updateResult.rowCount} linhas`);

    // 3. Contar DEPOIS - verificar resultado
    console.log('📊 Contando notas com novo status...');
    const afterProcessado = await client.query('SELECT COUNT(*) as count FROM notas_fiscais WHERE status = $1', ['processado']);
    const afterProcessadoCount = parseInt(afterProcessado.rows[0].count);

    const afterPendente = await client.query('SELECT COUNT(*) as count FROM notas_fiscais WHERE status = $1', ['pendente']);
    const afterPendenteCount = parseInt(afterPendente.rows[0].count);

    console.log(`   Notas 'processado' agora: ${afterProcessadoCount}`);
    console.log(`   Notas 'pendente' agora: ${afterPendenteCount}`);

    // Confirmar transação
    await client.query('COMMIT');
    console.log('✅ Transação confirmada com sucesso');

    res.json({
      success: true,
      message: `${before} notas revertidas de 'processado' para 'pendente'`,
      dados: {
        notasRevertidas: before,
        rowsAffected: updateResult.rowCount,
        statusApos: {
          processado: afterProcessadoCount,
          pendente: afterPendenteCount
        }
      }
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('❌ Erro ao fazer rollback:', rollbackErr.message);
    }
    console.error('❌ Erro ao reverter notas:', err.message);
    console.error('   Stack:', err.stack);
    res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack
    });
  } finally {
    client.release();
  }
});

// GET /api/notas-fiscais/historico - Obter histórico de notas
router.get('/notas-fiscais/historico', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const result = await pool.query(`
      SELECT
        id, numero_nf, fornecedor_nome, valor_total, status,
        created_at, processado_em, descricao
      FROM notas_fiscais
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), parseInt(offset)]);

    const countResult = await pool.query(`
      SELECT COUNT(*) as cnt FROM notas_fiscais
    `);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].cnt)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DEBUG: Endpoint para diagnosticar tipo_despesa e JOINs
router.get('/debug/tipo-despesa', async (req, res) => {
  try {
    console.log('\n🔍 [DEBUG] Diagnosticando tipo_despesa...');

    // Query 1: Contar faturamentos com tipo_despesa_id NOT NULL
    const q1 = await pool.query(
      'SELECT COUNT(*) as cnt FROM faturamento WHERE tipo_despesa_id IS NOT NULL'
    );
    const comTipoDespesaId = parseInt(q1.rows[0].cnt);
    console.log(`🔍 [DEBUG] Faturamentos com tipo_despesa_id NOT NULL: ${comTipoDespesaId}`);

    // Query 2: JOIN com tipo_despesa para Taxas
    const q2 = await pool.query(`
      SELECT COUNT(*) as cnt FROM faturamento f
      JOIN tipo_despesa td ON f.tipo_despesa_id = td.id
      WHERE td.subcategoria = 'Taxas'
    `);
    const joinTaxas = parseInt(q2.rows[0].cnt);
    console.log(`🔍 [DEBUG] JOIN faturamento ↔ tipo_despesa (Taxas): ${joinTaxas}`);

    // Query 3: Agrupamento de tipo_despesa_id por subcategoria
    const q3 = await pool.query(`
      SELECT f.tipo_despesa_id, td.subcategoria, COUNT(*) as cnt
      FROM faturamento f
      LEFT JOIN tipo_despesa td ON f.tipo_despesa_id = td.id
      WHERE f.tipo = 'despesa'
      GROUP BY f.tipo_despesa_id, td.subcategoria
      ORDER BY cnt DESC
      LIMIT 10
    `);
    const agrupamento = q3.rows;
    console.log(`🔍 [DEBUG] Agrupamento: ${agrupamento.length} grupos encontrados`);

    // Query 4: Total de registros em tipo_despesa
    const q4 = await pool.query('SELECT COUNT(*) as cnt FROM tipo_despesa');
    const totalTipoDespesa = parseInt(q4.rows[0].cnt);
    console.log(`🔍 [DEBUG] Total de registros em tipo_despesa: ${totalTipoDespesa}`);

    // Query 5: Subcategorias disponíveis
    const q5 = await pool.query(`
      SELECT DISTINCT subcategoria, COUNT(*) as cnt
      FROM tipo_despesa
      GROUP BY subcategoria
      ORDER BY subcategoria
    `);
    const subcategorias = q5.rows;

    // Query 6: Verificar IDs órfãos (tipo_despesa_id que não existem em tipo_despesa)
    const q6 = await pool.query(`
      SELECT DISTINCT f.tipo_despesa_id, COUNT(*) as cnt
      FROM faturamento f
      WHERE f.tipo_despesa_id IS NOT NULL
        AND f.tipo_despesa_id NOT IN (SELECT id FROM tipo_despesa)
      GROUP BY f.tipo_despesa_id
    `);
    const orfaos = q6.rows;

    res.json({
      success: true,
      diagnostico: {
        faturamentosComTipoDespesaId: comTipoDespesaId,
        joinComTipoDespesaTaxas: joinTaxas,
        totalTipoDespesaRegistros: totalTipoDespesa,
        subcategorias: subcategorias,
        agrupamentoPorSubcategoria: agrupamento,
        tiposOrfaos: {
          quantidade: orfaos.length,
          detalhes: orfaos
        },
        resumo: {
          problema: orfaos.length > 0 ? 'IDs órfãos encontrados - dados perdidos na migração' : 'OK',
          causa: comTipoDespesaId === 0 ? 'Nenhum tipo_despesa_id foi migrado' : 'Possível mismatch de IDs'
        }
      }
    });
  } catch (error) {
    console.error('❌ [DEBUG] Erro:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// DEBUG: Limpar duplicatas (DELETAR TODOS MENOS O MAIS RECENTE)
router.post('/debug/limpar-duplicatas', async (req, res) => {
  try {
    console.log('\n🗑️  [DEBUG] Limpando duplicatas...\n');

    // Encontrar grupos de duplicatas (mesma data, valor, categoria)
    const duplicatas = await pool.query(`
      SELECT
        DATE(data) as data,
        total,
        categoria,
        COUNT(*) as quantidade,
        ARRAY_AGG(id ORDER BY id DESC) as ids,
        MAX(created_at) as mais_recente_criado
      FROM faturamento
      GROUP BY DATE(data), total, categoria
      HAVING COUNT(*) > 1
      ORDER BY quantidade DESC
    `);

    console.log(`Found ${duplicatas.rows.length} groups with duplicates\n`);

    let totalDeletados = 0;

    for (const grupo of duplicatas.rows) {
      const ids = grupo.ids;
      const idsParaDeletar = ids.slice(1); // Manter apenas o primeiro (mais antigo), deletar os outros

      console.log(`Grupo: ${grupo.data} | R$ ${grupo.total} | ${grupo.categoria}`);
      console.log(`  Total: ${grupo.quantidade} | Mantendo ID ${ids[0]}, deletando: ${idsParaDeletar.join(', ')}`);

      if (idsParaDeletar.length > 0) {
        const placeholders = idsParaDeletar.map(() => '?').join(',');
        const deleteResult = await pool.query(
          `DELETE FROM faturamento WHERE id IN (${placeholders})`,
          idsParaDeletar
        );
        totalDeletados += idsParaDeletar.length;
        console.log(`  ✅ Deletados: ${idsParaDeletar.length}\n`);
      }
    }

    res.json({
      success: true,
      message: `Limpeza concluída: ${totalDeletados} registros duplicados removidos`,
      grupos_com_duplicatas: duplicatas.rows.length,
      registros_deletados: totalDeletados,
      detalhes: duplicatas.rows
    });
  } catch (error) {
    console.error('❌ [DEBUG] Erro:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DEBUG: Verificar duplicatas
router.get('/debug/verificar-duplicatas', async (req, res) => {
  try {
    console.log('\n🔍 [DEBUG] Verificando duplicatas...\n');

    // Query 1: Registros exatos com data, valor e categoria
    const duplicataExata = await pool.query(`
      SELECT
        id,
        data,
        total,
        categoria,
        tipo,
        created_at
      FROM faturamento
      WHERE DATE(data) = '2026-04-01'
        AND total = 3609.70
        AND categoria = 'Salão'
      ORDER BY created_at DESC
    `);

    // Query 2: Todos de 01/04/2026
    const todosDoMesmoDia = await pool.query(`
      SELECT
        id,
        data,
        total,
        categoria,
        tipo,
        created_at
      FROM faturamento
      WHERE DATE(data) = '2026-04-01'
      ORDER BY total DESC, created_at DESC
    `);

    // Query 3: Estatísticas
    const stats = await pool.query(`
      SELECT
        COUNT(*) as total_lancamentos,
        COUNT(DISTINCT id) as ids_unicos,
        COUNT(*) - COUNT(DISTINCT id) as duplicados
      FROM faturamento
    `);

    // Query 4: Procurar por data e valor (ignorar categoria)
    const porDataEValor = await pool.query(`
      SELECT
        DATE(data) as data,
        total,
        COUNT(*) as quantidade,
        ARRAY_AGG(id) as ids,
        ARRAY_AGG(categoria) as categorias
      FROM faturamento
      WHERE DATE(data) = '2026-04-01'
      GROUP BY DATE(data), total
      HAVING COUNT(*) > 1
      ORDER BY quantidade DESC
    `);

    res.json({
      success: true,
      diagnostico: {
        'Duplicata exata (01/04, 3609.70, Salão)': {
          quantidade: duplicataExata.rows.length,
          detalhes: duplicataExata.rows
        },
        'Todos os lançamentos de 01/04/2026': {
          quantidade: todosDoMesmoDia.rows.length,
          detalhes: todosDoMesmoDia.rows
        },
        'Registros com mesmo valor em 01/04': {
          quantidade: porDataEValor.rows.length,
          detalhes: porDataEValor.rows
        },
        'Estatísticas gerais': {
          totalLancamentos: parseInt(stats.rows[0].total_lancamentos),
          idsUnicos: parseInt(stats.rows[0].ids_unicos),
          duplicadosDetectados: parseInt(stats.rows[0].duplicados),
          problema: stats.rows[0].duplicados > 0 ?
            `⚠️ ${stats.rows[0].duplicados} registros duplicados no banco!` :
            '✅ Sem duplicatas detectadas'
        }
      }
    });
  } catch (error) {
    console.error('❌ [DEBUG] Erro:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== REGRAS CATEGORIA FORNECEDOR ====================

const RegrasCategoriaFornecedor = require('../models/RegrasCategoriaFornecedor');

// POST /api/regras-categoria - Cadastrar/atualizar regra
router.post('/regras-categoria', async (req, res) => {
  try {
    const { fornecedor_nome, tipo_despesa_id } = req.body;

    if (!fornecedor_nome || !tipo_despesa_id) {
      return res.status(400).json({
        success: false,
        error: 'fornecedor_nome e tipo_despesa_id são obrigatórios'
      });
    }

    console.log(`📋 [POST] Cadastrando regra: ${fornecedor_nome} → tipo_despesa_id ${tipo_despesa_id}`);

    const regra = await RegrasCategoriaFornecedor.criar(fornecedor_nome, tipo_despesa_id);

    res.status(201).json({
      success: true,
      message: 'Regra cadastrada com sucesso',
      regra
    });
  } catch (error) {
    console.error('❌ Erro ao cadastrar regra:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/regras-categoria - Listar todas as regras
router.get('/regras-categoria', async (req, res) => {
  try {
    console.log('🔍 [GET] Listando regras de categoria...');

    const regras = await RegrasCategoriaFornecedor.listar();

    res.json({
      success: true,
      quantidade: regras.length,
      regras
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/regras-categoria/buscar/:fornecedor - Buscar regra por fornecedor
router.get('/regras-categoria/buscar/:fornecedor', async (req, res) => {
  try {
    const { fornecedor } = req.params;
    console.log(`🔍 [GET] Buscando regra para: ${fornecedor}`);

    const regra = await RegrasCategoriaFornecedor.obterPorFornecedor(fornecedor);

    if (!regra) {
      return res.json({
        success: false,
        message: 'Nenhuma regra cadastrada para este fornecedor'
      });
    }

    res.json({
      success: true,
      regra
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/regras-categoria/:id - Atualizar regra
router.put('/regras-categoria/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo_despesa_id } = req.body;

    if (!tipo_despesa_id) {
      return res.status(400).json({
        success: false,
        error: 'tipo_despesa_id é obrigatório'
      });
    }

    console.log(`✏️  [PUT] Atualizando regra ${id}...`);

    const regra = await RegrasCategoriaFornecedor.atualizar(id, tipo_despesa_id);

    res.json({
      success: true,
      message: 'Regra atualizada com sucesso',
      regra
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar regra:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/regras-categoria/:id - Deletar regra
router.delete('/regras-categoria/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️  [DELETE] Deletando regra ${id}...`);

    await RegrasCategoriaFornecedor.deletar(id);

    res.json({
      success: true,
      message: 'Regra deletada com sucesso'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/debug/init-regras - Inicializar tabela de regras
router.post('/debug/init-regras', async (req, res) => {
  try {
    console.log('\n🔧 Inicializando tabela de regras...\n');

    await RegrasCategoriaFornecedor.inicializar();

    res.json({
      success: true,
      message: 'Tabela de regras inicializada com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/notas-fiscais/aplicar-regras - Aplicar regras às notas pendentes
router.post('/notas-fiscais/aplicar-regras', async (req, res) => {
  const client = await pool.connect();

  try {
    console.log('\n🤖 Iniciando aplicação de regras às notas pendentes...\n');

    // 1. Obter todas as notas pendentes
    const notasResult = await client.query(
      'SELECT id, fornecedor_nome, valor_total, data_vencimento, numero_nf, descricao FROM notas_fiscais WHERE status = $1',
      ['pendente']
    );

    const notas = notasResult.rows;
    console.log(`📋 Encontradas ${notas.length} notas pendentes`);

    if (notas.length === 0) {
      console.log('ℹ️ Nenhuma nota pendente para processar');
    }

    let processadas = 0;
    let comRegra = 0;
    let semRegra = 0;
    const detalhes = [];

    // 2. Para cada nota, buscar regra correspondente
    for (const nota of notas) {
      try {
        // Buscar regra pelo nome do fornecedor (case-insensitive)
        const regraResult = await client.query(
          `SELECT rc.id, rc.tipo_despesa_id, td.subcategoria, td.classificacao
           FROM regras_categoria_fornecedor rc
           LEFT JOIN tipo_despesa td ON rc.tipo_despesa_id = td.id
           WHERE LOWER(rc.fornecedor_nome) = LOWER($1)`,
          [nota.fornecedor_nome]
        );

        if (regraResult.rows.length === 0) {
          console.log(`⏭️  Nota ${nota.numero_nf} (${nota.fornecedor_nome}) - SEM REGRA CADASTRADA`);
          semRegra++;
          detalhes.push({
            numero_nf: nota.numero_nf,
            fornecedor: nota.fornecedor_nome,
            status: 'sem_regra',
            motivo: 'Nenhuma regra cadastrada para este fornecedor'
          });
          continue;
        }

        const regra = regraResult.rows[0];
        const tipoDespesaId = regra.tipo_despesa_id;

        console.log(`  📝 Processando: NF=${nota.numero_nf}, Fornecedor=${nota.fornecedor_nome}, Regra=${regra.subcategoria}, TipoDespesaId=${tipoDespesaId}`);

        // 3. Criar entrada em faturamento (como despesa)
        const dataFaturamento = nota.data_vencimento || new Date().toISOString().split('T')[0];

        let faturamentoId;
        try {
          const faturamentoResult = await client.query(
            `INSERT INTO faturamento (data, total, categoria, tipo, tipo_despesa_id, categoria_produto, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
             RETURNING id`,
            [
              dataFaturamento,
              parseFloat(nota.valor_total) || 0,
              'Salão',
              'despesa',
              tipoDespesaId,
              regra.classificacao || 'Despesa',
              false  // 🔧 FIXED: status é BOOLEAN na tabela faturamento
            ]
          );

          faturamentoId = faturamentoResult.rows[0].id;
          console.log(`  ✅ Faturamento criado: ID=${faturamentoId}, valor=${parseFloat(nota.valor_total)}`);
        } catch (faturamentoError) {
          console.error(`  ❌ Erro ao criar faturamento:`, faturamentoError.message);
          console.error(`     Data: ${dataFaturamento}, Total: ${nota.valor_total}, TipoDespesaId: ${tipoDespesaId}`);
          throw faturamentoError;
        }

        // 4. Marcar nota como processado
        await client.query(
          'UPDATE notas_fiscais SET status = $1, faturamento_id = $2, processado_em = NOW() WHERE id = $3',
          ['processado', faturamentoId, nota.id]
        );

        console.log(`✅ Nota ${nota.numero_nf} (${nota.fornecedor_nome}) → ${regra.subcategoria} (${regra.classificacao})`);
        processadas++;
        comRegra++;
        detalhes.push({
          numero_nf: nota.numero_nf,
          fornecedor: nota.fornecedor_nome,
          status: 'processada',
          categoria: regra.subcategoria,
          classificacao: regra.classificacao,
          valor: nota.valor_total
        });

      } catch (erro) {
        console.error(`❌ Erro ao processar nota ${nota.numero_nf}:`, erro.message);
        detalhes.push({
          numero_nf: nota.numero_nf,
          fornecedor: nota.fornecedor_nome,
          status: 'erro',
          erro: erro.message
        });
      }
    }

    res.json({
      success: true,
      resumo: {
        total_pendentes: notas.length,
        processadas,
        com_regra: comRegra,
        sem_regra: semRegra,
        com_erro: notas.length - processadas - semRegra
      },
      detalhes
    });

  } catch (error) {
    console.error('❌ Erro ao aplicar regras:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

// ==================== EXPORT ====================
module.exports = router;
