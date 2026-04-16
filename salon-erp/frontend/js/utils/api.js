// API Helper para comunicar com backend
const API_BASE = 'http://localhost:5004/api';

const api = {
  // GET /api/faturamentos
  listarFaturamentos(days = 30, status = null) {
    let url = `${API_BASE}/faturamentos?days=${days}`;
    if (status) {
      url += `&status=${status}`;
    }
    return axios.get(url);
  },

  // POST /api/faturamentos
  criarFaturamento(data, total, categoria = 'Salão', tipo = 'receita', tipoDespesaId = null) {
    return axios.post(`${API_BASE}/faturamentos`, { data, total, categoria, tipo, tipo_despesa_id: tipoDespesaId });
  },

  // GET /api/tipo-despesa
  obterTiposDespesa() {
    return axios.get(`${API_BASE}/tipo-despesa`);
  },

  // GET /api/tipo-despesa/agrupado
  obterTiposDespesaAgrupado() {
    return axios.get(`${API_BASE}/tipo-despesa/agrupado`);
  },

  // GET /api/tipo-despesa/cmv
  obterCMV() {
    return axios.get(`${API_BASE}/tipo-despesa/cmv`);
  },

  // POST /api/tipo-despesa - Criar novo tipo de despesa
  criarTipoDespesa(classificacao, subcategoria, descricao = '') {
    return axios.post(`${API_BASE}/tipo-despesa`, { classificacao, subcategoria, descricao });
  },

  // PUT /api/faturamentos/:id
  atualizarFaturamento(id, total) {
    return axios.put(`${API_BASE}/faturamentos/${id}`, { total });
  },

  // DELETE /api/faturamentos/:id
  deletarFaturamento(id) {
    return axios.delete(`${API_BASE}/faturamentos/${id}`);
  },

  // GET /api/faturamentos/stats
  obterStats(from, to) {
    return axios.get(`${API_BASE}/faturamentos/stats?from=${from}&to=${to}`);
  },

  // GET /api/faturamentos/chart
  obterDadosGrafico(from, to) {
    return axios.get(`${API_BASE}/faturamentos/chart?from=${from}&to=${to}`);
  },

  // POST /api/faturamentos/:id/enviar-conta-azul
  enviarContaAzul(id) {
    return axios.post(`${API_BASE}/faturamentos/${id}/enviar-conta-azul`);
  },

  // GET /api/faturamentos/stats-categoria
  obterStatsPorCategoria(from, to) {
    return axios.get(`${API_BASE}/faturamentos/stats-categoria?from=${from}&to=${to}`);
  },

  // ==================== NOTAS FISCAIS ====================

  // GET /api/notas-fiscais - Listar notas fiscais
  obterNotasFiscais(status = null) {
    let url = `${API_BASE}/notas-fiscais`;
    if (status) {
      url += `?status=${status}`;
    }
    return axios.get(url);
  },

  // GET /api/notas-fiscais/pendentes - Obter apenas pendentes
  obterNotasPendentes() {
    return axios.get(`${API_BASE}/notas-fiscais/pendentes`);
  },

  // GET /api/notas-fiscais/:id - Obter nota específica
  obterNotaFiscal(id) {
    return axios.get(`${API_BASE}/notas-fiscais/${id}`);
  },

  // POST /api/notas-fiscais/upload - Upload de arquivos XML/PDF
  enviarNotasFiscais(files) {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    return axios.post(`${API_BASE}/notas-fiscais/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  // GET /api/notas-fiscais/:id/sugestao-data - Obter sugestão de data
  obterSugestaoData(id) {
    return axios.get(`${API_BASE}/notas-fiscais/${id}/sugestao-data`);
  },

  // POST /api/notas-fiscais/:id/processar - Processar nota e criar faturamento
  processarNotaFiscal(id, tipoDespesaId, dataFaturamento = null) {
    return axios.post(`${API_BASE}/notas-fiscais/${id}/processar`, {
      tipo_despesa_id: tipoDespesaId,
      data_faturamento: dataFaturamento
    });
  },

  // DELETE /api/notas-fiscais/:id - Deletar nota
  deletarNotaFiscal(id) {
    return axios.delete(`${API_BASE}/notas-fiscais/${id}`);
  },

  // ==================== CMV ====================

  // GET /api/faturamentos/cmv/total - Obter total CMV
  obterTotalCMV(from, to) {
    return axios.get(`${API_BASE}/faturamentos/cmv/total?from=${from}&to=${to}`);
  },

  // GET /api/faturamentos/cmv/detalhado - Obter CMV por subcategoria
  obterCMVDetalhado(from, to) {
    return axios.get(`${API_BASE}/faturamentos/cmv/detalhado?from=${from}&to=${to}`);
  }
};

// Expor globalmente para componentes
window.api = api;
