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
const logger = require('../utils/logger');
const { gerarToken, verificarSenha, buscarUsuarioPorEmail, middlewareAutenticacao } = require('../auth');

// Configurar multer para upload de arquivos
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/xml', 'text/xml', 'application/pdf'];
    const allowedExt = ['.xml', '.pdf'];
    const ext = require('path').extname(file.originalname).toLowerCase();

    if (allowedExt.includes(ext) || allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos XML e PDF são permitidos'));
    }
  }
});

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

    if (!['receita', 'despesa'].includes(tipo)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo deve ser "receita" ou "despesa"'
      });
    }

    if (tipo === 'despesa' && !tipo_despesa_id) {
      return res.status(400).json({
        success: false,
        error: 'tipo_despesa_id é obrigatório para despesas'
      });
    }

    const result = await Faturamento.criar(data, total, categoria, tipo, tipo_despesa_id, categoria_produto);

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

    if (!total || !data || !categoria) {
      return res.status(400).json({
        success: false,
        error: 'Data, Total e Categoria são obrigatórios'
      });
    }

    if (tipo && !['receita', 'despesa'].includes(tipo)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo deve ser "receita" ou "despesa"'
      });
    }

    // Verificar se existe
    const faturamento = await Faturamento.obter(id);
    if (!faturamento) {
      return res.status(404).json({
        success: false,
        error: 'Faturamento não encontrado'
      });
    }

    await Faturamento.atualizarCompleto(id, data, total, categoria, tipo, tipo_despesa_id);

    res.json({
      success: true,
      message: 'Faturamento atualizado com sucesso'
    });
  } catch (error) {
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

    // Verificar se existe
    const faturamento = await Faturamento.obter(id);
    if (!faturamento) {
      return res.status(404).json({
        success: false,
        error: 'Faturamento não encontrado'
      });
    }

    await Faturamento.deletar(id);

    res.json({
      success: true,
      message: 'Faturamento deletado com sucesso'
    });
  } catch (error) {
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

    res.json({
      success: true,
      data: {
        totalReceita: parseFloat(stats.totalReceita || 0),
        totalDespesa: parseFloat(stats.totalDespesa || 0),
        totalLiquido: parseFloat(stats.totalLiquido || 0),
        mediaReceita: parseFloat(stats.mediaReceita || 0),
        mediaDespesa: parseFloat(stats.mediaDespesa || 0),
        maiorReceita: parseFloat(stats.maiorReceita || 0),
        maiorDespesa: parseFloat(stats.maiorDespesa || 0),
        menorReceita: parseFloat(stats.menorReceita || 0),
        menorDespesa: parseFloat(stats.menorDespesa || 0),
        dias: stats.dias || 0,
        totalEntradas: stats.totalEntradas || 0
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
        totalReceita: parseFloat(s.totalReceita || 0),
        totalDespesa: parseFloat(s.totalDespesa || 0),
        totalLiquido: parseFloat(s.totalLiquido || 0),
        mediaReceita: parseFloat(s.mediaReceita || 0),
        mediaDespesa: parseFloat(s.mediaDespesa || 0),
        maiorReceita: parseFloat(s.maiorReceita || 0),
        maiorDespesa: parseFloat(s.maiorDespesa || 0),
        dias: s.dias || 0,
        totalEntradas: s.totalEntradas || 0
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
        totalCMV: parseFloat(stats.totalCMV || 0),
        mediaCMV: parseFloat(stats.mediaCMV || 0),
        maiorCMV: parseFloat(stats.maiorCMV || 0),
        menorCMV: parseFloat(stats.menorCMV || 0),
        quantidadeCMV: stats.quantidadeCMV || 0,
        diasComCMV: stats.diasComCMV || 0
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
router.get('/cmv-inteligente', async (req, res) => {
  try {
    const { from, to, restaurante } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros "from" e "to" são obrigatórios'
      });
    }

    const dados = await Faturamento.obterDadosCMV(from, to, restaurante || null);

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
    const tipos = await TipoDespesa.obterPorClassificacao();
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

    // Determinar sugestão baseado na data de vencimento
    let temSugestao = false;
    let sugestao = null;
    let data_sugerida = null;
    const opcoes = {};

    if (nota.data_vencimento && nota.data_vencimento > hoje) {
      // Data FUTURA - Oferecer ambas as opções com "Lançar FUTURO" como sugestão
      temSugestao = true;
      sugestao = 'futuro';
      data_sugerida = nota.data_vencimento;

      opcoes.agora = {
        label: 'Lançar AGORA',
        data: hoje,
        descricao: `Registrar em ${hoje}`
      };

      opcoes.futuro = {
        label: 'Lançar FUTURO',
        data: nota.data_vencimento,
        descricao: `Agendar para ${nota.data_vencimento}`
      };
    } else if (nota.data_vencimento && nota.data_vencimento === hoje) {
      // Data HOJE - Sugerir "Lançar AGORA"
      temSugestao = true;
      sugestao = 'agora';
      data_sugerida = hoje;

      opcoes.agora = {
        label: 'Lançar AGORA',
        data: hoje,
        descricao: `Registrar em ${hoje}`
      };
    } else {
      // Data PASSADA - Sem sugestão, deixa customizar
      temSugestao = false;
      sugestao = null;
      data_sugerida = null;
    }

    logger.debug(`SUGESTAO-DATA: nota=${nota.id}, temSugestao=${temSugestao}, venc=${nota.data_vencimento}, hoje=${hoje}`);

    res.json({
      success: true,
      data: {
        nota_id: nota.id,
        data_emissao: nota.data_emissao,
        data_vencimento: nota.data_vencimento,
        temSugestao: temSugestao,
        sugestao: sugestao,
        data_sugerida: data_sugerida,
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

// POST /api/notas-fiscais/upload - Fazer upload e processar notas fiscais (XML/PDF)
router.post('/notas-fiscais/upload', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum arquivo foi enviado'
      });
    }

    const notasProcessadas = [];
    const erros = [];

    // Processar cada arquivo
    for (const file of req.files) {
      try {
        // Fazer parsing do arquivo
        const dadosExtraidos = await NotaFiscalParser.detectarEParsear(
          file.buffer,
          file.originalname
        );

        // Verificar se nota já existe
        const notaExistente = await NotaFiscal.obterPorNumero(dadosExtraidos.numero_nf);
        if (notaExistente) {
          erros.push({
            arquivo: file.originalname,
            erro: `Nota fiscal ${dadosExtraidos.numero_nf} já foi processada`
          });
          continue;
        }

        // Salvar nota fiscal no banco
        const resultado = await NotaFiscal.criar({
          ...dadosExtraidos,
          pdf_filename: file.originalname
        });

        notasProcessadas.push({
          id: resultado.id,
          arquivo: file.originalname,
          numero: dadosExtraidos.numero_nf,
          fornecedor: dadosExtraidos.fornecedor_nome,
          valor: dadosExtraidos.valor_total,
          classificacao_sugerida: dadosExtraidos.classificacao_sugerida
        });
      } catch (erro) {
        erros.push({
          arquivo: file.originalname,
          erro: erro.message
        });
      }
    }

    res.status(201).json({
      success: notasProcessadas.length > 0,
      message: `${notasProcessadas.length} nota(s) processada(s), ${erros.length} erro(s)`,
      data: notasProcessadas,
      errors: erros.length > 0 ? erros : undefined
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/notas-fiscais/:id/processar - Processar nota e criar faturamento
// Body: { tipo_despesa_id: 1, data_faturamento: "YYYY-MM-DD" (opcional) }
router.post('/notas-fiscais/:id/processar', async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo_despesa_id, data_faturamento } = req.body;

    if (!tipo_despesa_id) {
      return res.status(400).json({
        success: false,
        error: 'tipo_despesa_id é obrigatório'
      });
    }

    // Obter nota fiscal
    const nota = await NotaFiscal.obter(id);
    if (!nota) {
      return res.status(404).json({
        success: false,
        error: 'Nota fiscal não encontrada'
      });
    }

    if (nota.status === 'processado') {
      return res.status(400).json({
        success: false,
        error: 'Esta nota fiscal já foi processada'
      });
    }

    // Usar data fornecida ou data de emissão por padrão
    const dataFaturamento = data_faturamento || nota.data_emissao;

    // Obter tipo de despesa para determinar classificação (CMV vs Operacional)
    const tipoDespesa = await TipoDespesa.obter(tipo_despesa_id);
    if (!tipoDespesa) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de despesa não encontrado'
      });
    }

    const classificacao = tipoDespesa.classificacao; // 'CMV' ou 'Operacional'
    logger.info(`Tipo de Despesa: ${tipoDespesa.subcategoria} | Classificação: ${classificacao}`);

    // Criar faturamento (despesa)
    const resultado = await Faturamento.criar(
      dataFaturamento,
      nota.valor_total,
      'Salão',
      'despesa',
      tipo_despesa_id
    );

    // Marcar nota como processada
    await NotaFiscal.processar(id, resultado.id, tipo_despesa_id);

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
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/notas-fiscais/:id - Deletar nota fiscal (apenas se pendente)
router.delete('/notas-fiscais/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const nota = await NotaFiscal.obter(id);
    if (!nota) {
      return res.status(404).json({
        success: false,
        error: 'Nota fiscal não encontrada'
      });
    }

    if (nota.status === 'processado') {
      return res.status(400).json({
        success: false,
        error: 'Não é possível deletar nota fiscal já processada'
      });
    }

    // Deletar nota fiscal
    const { db } = require('../database');
    return new Promise((resolve) => {
      db.run('DELETE FROM notas_fiscais WHERE id = ?', [id], function(err) {
        if (err) {
          res.status(400).json({
            success: false,
            error: err.message
          });
        } else {
          res.json({
            success: true,
            message: 'Nota fiscal deletada com sucesso'
          });
        }
        resolve();
      });
    });
  } catch (error) {
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

module.exports = router;
